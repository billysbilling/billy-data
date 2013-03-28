BD.Model = Em.Object.extend(Em.Evented, {
    
    isLoaded: false,
    isNew: false,
    isDeleted: false,
    selfIsDirty: false,
    childIsDirty: false,
    
    clientId: null,
    id: null,
    _data: null,
    error: null,
    errors: null,

    init: function() {
        this._hasManyRecordArrays = {};
        this._deletedEmbeddedRecords = [];
        this._inRecordArrays = {};
        this.set('_data', {
            attributes: {},
            belongsTo: {},
            hasMany: {}
        });
        BD.store.didInstantiateRecord(this);
        this._super();
    },
    
    reference: function() {
        return Ember.get(this.constructor, 'root') + ':' + this.get('id');
    }.property('id'),

    eachAttribute: function(callback, binding) {
        Em.get(this.constructor, 'attributes').forEach(function(key, meta) {
            callback.call(binding, key, meta);
        });
    },

    eachBelongsTo: function(callback, binding) {
        Em.get(this.constructor, 'belongsToRelationships').forEach(function(key, meta) {
            callback.call(binding, key, meta);
        });
    },
    _parentRelationship: function() {
        var parentRelationship = null;
        this.eachBelongsTo(function(key, meta) {
            if (meta.options.isParent) {
                parentRelationship = key;
            }
        }, this);
        return parentRelationship;
    }.property(),
    isEmbedded: function() {
        return !!this.get('_parentRelationship');
    }.property(),
    getParent: function() {
        var parentRelationship = this.get('_parentRelationship');
        return parentRelationship ? this.get(parentRelationship) : null;
    },

    eachHasMany: function(callback, binding) {
        Em.get(this.constructor, 'hasManyRelationships').forEach(function(key, meta) {
            callback.call(binding, key, meta);
        });
    },
    eachEmbeddedHasMany: function(callback, binding) {
        this.eachHasMany(function(key, meta) {
            if (meta.options.isEmbedded) {
                callback.call(binding, key, meta)
            }
        })
    },
    eachEmbeddedRecord: function(callback, binding) {
        this.eachEmbeddedHasMany(function(key, meta) {
            //Skip unloaded records
            if (!this.hasManyIsLoaded(key)) {
                return;
            }
            var records = this.get(key);
            records.forEach(function(r) {
                callback.call(binding, r, key, meta);
            });
        }, this)
    },
    hasManyIsLoaded: function(key) {
        return this._hasManyRecordArrays[key];
    },

    didDefineProperty: function(proto, key, value) {
        if (value instanceof Ember.Descriptor) {
            var meta = value.meta();
            if (meta.isAttribute || meta.isBelongsTo) {
                Ember.addObserver(proto, key, null, '_attributeDidChange');
            }
        }
    },
    _attributeDidChange: function(r, key) {
        BD.store.recordAttributeDidChange(this, key);
    },

    loadData: function(serialized) {
        this._serializedData = serialized;
    },
    materializeData: function() {
        var serialized = this._serializedData,
            data = this.get('_data');
        BD.store.suspendRecordAttributeDidChange();
        //Attributes
        this.eachAttribute(function(key, meta) {
            data.attributes[key] = BD.transforms[meta.type].deserialize(serialized[key]);
            BD.store.recordAttributeDidChange(this, key);
        }, this);
        //BelongsTo
        this.eachBelongsTo(function(key, meta) {
            var newValue = meta.extractValue(serialized, key);
            data.belongsTo[key] = newValue;
            BD.store.recordAttributeDidChange(this, key);
        }, this);
        //HasMany
        this.eachHasMany(function(key, meta) {
            var ids = serialized[BD.singularize(key)+'Ids'];
            if (ids) {
                data.hasMany[key] = ids;
                this.get(key);
            }
        }, this);
        //
        Em.propertyDidChange(this, '_data');
        BD.store.resumeRecordAttributeDidChange();
        //
        delete this._serializedData;
    },

    include: function(include) {
        BD.store.findByIdInclude(this.constructor, this.get('id'), include);
    },
    
    isDirty: function() {
        return (this.get('selfIsDirty') || this.get('childIsDirty'));
    }.property('selfIsDirty', 'childIsDirty'),
    becomeDirty: function() {
        if (this.get('isUnloaded') || this.get('selfIsDirty')) {
            return;
        }
        var data = this.get('_data'),
            parent;
        this.clean = {
            isNew: this.get('isNew'),
            data: {
                attributes: Em.copy(data.attributes),
                belongsTo: Em.copy(data.belongsTo),
                hasMany: Em.copy(data.hasMany, true)
            }
        };
        this.set('selfIsDirty', true);
        //Dirty parent
        parent = this.getParent();
        if (parent) {
            parent.checkEmbeddedChildrenDirty();
        }
    },
    checkEmbeddedChildrenDirty: function() {
        var childIsDirty = false;
        if (this._deletedEmbeddedRecords.length > 0) {
            childIsDirty = true;
        }
        this.eachEmbeddedRecord(function(r) {
            if (r.get('isDirty')) {
                childIsDirty = true;
            }
        });
        this.set('childIsDirty', childIsDirty);
    },
    didDeleteEmbeddedRecord: function(r) {
        this.checkEmbeddedChildrenDirty();
        this._deletedEmbeddedRecords.push(r);
    },
    becameClean: function() {
        this.checkEmbeddedChildrenDirty();
        if (!this.get('selfIsDirty')) {
            return;
        }
        delete this.clean;
        this.set('selfIsDirty', false);
    },
    didCommit: function(options) {
        this.setProperties(options.properties);
        this.eachHasMany(function(key) {
            if (options.embed.contains(key)) {
                this.get(key).forEach(function(child) {
                    child.becameClean();
                });
            }
        }, this);
        this.becameClean();
    },
    rollback: function() {
        //Setup data variables
        var selfIsDirty = this.get('selfIsDirty');
        //Rollback embedded records. We have to take these directly from BOTH the dirty- and clean data, if the record itself is dirty
        this.eachEmbeddedRecord(function(r) {
            r.rollback();
        }, this);
        this._deletedEmbeddedRecords.forEach(function(r) {
            r.rollback();
        });
        this._deletedEmbeddedRecords = [];
        this.checkEmbeddedChildrenDirty();
        //Don't continue if this record itself is not dirty
        if (!selfIsDirty) {
            return;
        }
        //Store dirty parent (before we might clean it and set it back the original parent)
        var dirtyParent = this.getParent();
        //Set the data to the clean data
        this.set('_data', this.clean.data);
        //Handle the case where the record is not newly created
        if (!this.clean.isNew) {
            if (this.get('isDeleted')) {
                this.set('isDeleted', false);
            }
            this.becameClean();
        } else {
            //Handle case where record never was created. Then we just unload it 
            this.unload();
        }
        //Let parent check child dirtiness
        if (dirtyParent) {
            dirtyParent.checkEmbeddedChildrenDirty();
        }
    },
    
    save: function(options) {
        return BD.store.saveRecord(this, options);
    },
    
    deleteRecord: function() {
        return BD.store.deleteRecord(this);
    },
    
    serialize: function(options) {
        options = options || {};
        options.properties = options.properties || {};
        var serialized = {},
            data = this.get('_data');
        serialized._clientId = this.get('clientId');
        if (!this.get('isNew')) {
            serialized.id = this.get('id');
        }
        this.eachAttribute(function(key, meta) {
            var value = options.properties[key] || data.attributes[key];
            if (typeof value != 'undefined') {
                serialized[key] = BD.transforms[meta.type].serialize(value);
            }
        }, this);
        this.eachBelongsTo(function(key, meta) {
            if (!options.isEmbedded || !meta.options.isParent) {
                var id;
                if (options.properties[key]) {
                    id = options.properties[key].get('id');
                } else {
                    id = data.belongsTo[key];
                }
                if (id) {
                    if (typeof id === 'object') {
                        id = BD.store.findByClientId(id.clientId).get(meta.idProperty);
                    }
                    meta.serialize(serialized, key, id);
                }
            }
        }, this);
        if (options.embed) {
            this.eachHasMany(function(key, meta) {
                if (options.embed.contains(key)) {
                    var embeddedRecords = [];
                    this.get(key).forEach(function(child) {
                        embeddedRecords.push(child.serialize({isEmbedded: true}));
                    });
                    serialized[key] = embeddedRecords;
                }
            }, this);
        }
        return serialized;
    },
    
    didAddToRecordArray: function(recordArray) {
        this._inRecordArrays[Em.guidFor(recordArray)] = recordArray;
    },
    didRemoveFromRecordArray: function(recordArray) {
        delete this._inRecordArrays[Em.guidFor(recordArray)];
    },
    isInRecordArray: function(recordArray) {
        return !!this._inRecordArrays[Em.guidFor(recordArray)]
    },

    unload: function() {
        this.set('isUnloaded', true);
        this.eachBelongsTo(function(name) {
            this.set(name, null);
        }, this);
        this.eachEmbeddedRecord(function(child) {
            child.unload();
        });
        _.each(this._inRecordArrays, function(recordArray) {
            recordArray.removeObject(this);
        }, this);
        BD.store.didUnloadRecord(this);
        this.destroy();
    },

    toString: function toString() {
        return '<'+this.constructor.toString()+':'+this.get('id')+':'+this.get('clientId')+'>';
    }
    
});

BD.Model.reopenClass({

    _create: BD.Model.create,
    create: function() {
        throw new Ember.Error("You should not call `create` on a model. Instead, call `createRecord` with the attributes you would like to set.");
    },
    createRecord: function(properties) {
        //Instantiate record
        properties = properties || {};
        var r = this._create({
            isNew: true
        });
        //Make sure that each hasMany relationship is registered as an empty RecordArray
        var data = r.get('_data');
        r.eachHasMany(function(name) {
            data.hasMany[name] = [];
            r.get(name);
        }, this);
        //Mark the record as dirty and update properties
        r.becomeDirty();
        BD.store.suspendRecordAttributeDidChange();
        r.setProperties(properties);
        BD.store.resumeRecordAttributeDidChange();
        return r;
    },
    
    root: function() {
        var typeString = this.toString();
        var parts = typeString.split(".");
        var name = parts[parts.length - 1];
        name = name.substring(0, 1).toLowerCase() + name.substring(1);
        return name;
    }.property(),
    
    attributes: function() {
        var map = Ember.Map.create();
        this.eachComputedProperty(function(key, meta) {
            if (meta.isAttribute) {
                meta.key = key;
                map.set(key, meta);
            }
        });
        return map;
    }.property(),
    
    belongsToRelationships: function() {
        var map = Ember.Map.create();
        this.eachComputedProperty(function(key, meta) {
            if (meta.isBelongsTo) {
                meta.key = key;
                map.set(key, meta);
            }
        });
        return map;
    }.property(),
    
    hasManyRelationships: function() {
        var map = Ember.Map.create();
        this.eachComputedProperty(function(key, meta) {
            if (meta.isHasMany) {
                meta.key = key;
                map.set(key, meta);
            }
        });
        return map;
    }.property(),

    find: function(id) {
        return BD.store.find(this, id);
    },
    findMany: function(ids) {
        return BD.store.findMany(this, ids);
    },
    findByUrl: function(url, query) {
        return BD.store.findByUrl(this, url, query);
    },
    findByQuery: function(query) {
        return BD.store.findByQuery(this, query);
    },
    findByIdQuery: function(id, query) {
        return BD.store.findByIdQuery(this, id, query);
    },
    findByIdInclude: function(id, include) {
        return BD.store.findByIdInclude(this, id, include);
    },
    all: function() {
        return BD.store.all(this);
    },
    filter: function(filter, comparator) {
        return BD.store.filter(this, filter, comparator);
    },
    loadAll: function(dataItems) {
        return BD.store.loadAll(this, dataItems);
    },
    loadMany: function(dataItems) {
        return BD.store.loadMany(this, dataItems);
    },
    load: function(data) {
        return BD.store.load(this, data);
    }
    
});