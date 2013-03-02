BD.Model = Em.Object.extend(Em.Evented, {
    
    isLoaded: false,
    isNew: false,
    isDeleted: false,
    selfIsDirty: false,
    childIsDirty: false,
    
    clientId: null,
    id: null,
    data: null,
    error: null,
    errors: null,

    init: function() {
        BD.store.didInstantiateRecord(this);
        this.set('data', {
            attributes: {},
            belongsTo: {},
            hasMany: {}
        });
        this.clientIdObj = {
            clientId: this.get('clientId')
        };
        this.loadedHasMany = {};
        this.deletedEmbeddedRecords = [];
        this.inRecordArrays = {};
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
    parentRelationship: function() {
        var parentRelationship = null;
        this.eachBelongsTo(function(key, meta) {
            if (meta.options.isParent) {
                parentRelationship = key;
            }
        }, this);
        return parentRelationship;
    }.property(),
    isEmbedded: function() {
        return !!this.get('parentRelationship');
    }.property(),
    getParent: function() {
        var parentRelationship = this.get('parentRelationship');
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
        return this.loadedHasMany[key];
    },

    loadData: function(serialized) {
        this.serializedData = serialized;
    },
    materializeData: function() {
        var serialized = this.serializedData,
            data = this.get('data'),
            belongsToChanges = [];
        BD.store.suspendBelongsToDidChange();
        //Attributes
        this.eachAttribute(function(key, meta) {
            data.attributes[key] = BD.transforms[meta.type].deserialize(serialized[key]);
        }, this);
        //BelongsTo
        this.eachBelongsTo(function(key, meta) {
            var oldValue = data.belongsTo[key],
                oldClientId = meta.clientIdForValue(oldValue),
                newValue = meta.extractValue(serialized, key),
                newClientId = meta.clientIdForValue(newValue);
            data.belongsTo[key] = newValue;
            BD.store.belongsToDidChange(this, key, newClientId, oldClientId, false);
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
        Em.propertyDidChange(this, 'data');
        BD.store.resumeBelongsToDidChange();
        //
        delete this.serializedData;
    },

    include: function(include) {
        BD.store.findByIdInclude(this.constructor, this.get('id'), include);
    },
    
    isDirty: function() {
        return (this.get('selfIsDirty') || this.get('childIsDirty'));
    }.property('selfIsDirty', 'childIsDirty'),
    becomeDirty: function() {
        if (this.get('isUnloading') || this.get('selfIsDirty')) {
            return;
        }
        var data = this.get('data'),
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
        if (this.deletedEmbeddedRecords.length > 0) {
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
        this.deletedEmbeddedRecords.push(r);
    },
    becameClean: function() {
        this.checkEmbeddedChildrenDirty();
        if (!this.get('selfIsDirty')) {
            return;
        }
        delete this.clean;
        this.set('selfIsDirty', false);
    },
    didCommit: function(embeddedKeys) {
        this.eachHasMany(function(key) {
            if (embeddedKeys.contains(key)) {
                this.get(key).forEach(function(child) {
                    child.becameClean();
                });
            }
        }, this);
        this.becameClean();
    },
    rollback: function() {
        //Setup data variables
        var selfIsDirty = this.get('selfIsDirty'),
            dirtyData = this.get('data');
        //Rollback embedded records. We have to take these directly from BOTH the dirty- and clean data, if the record itself is dirty
        this.eachEmbeddedRecord(function(r) {
            r.rollback();
        }, this);
        this.deletedEmbeddedRecords.forEach(function(r) {
            r.rollback();
        });
        this.deletedEmbeddedRecords = [];
        this.checkEmbeddedChildrenDirty();
        //Don't continue if this record itself is not dirty
        if (!selfIsDirty) {
            return;
        }
        //Store dirty parent (before we might clean it and set it back the original parent)
        var dirtyParent = this.getParent();
        //Set the data to the clean data
        this.set('data', this.clean.data);
        //Update belongsTo relationships
        this.eachBelongsTo(function(key, meta) {
            var oldValue = dirtyData.belongsTo[key],
                oldClientId = meta.clientIdForValue(oldValue),
                newValue = this.clean.data.belongsTo[key],
                newClientId = meta.clientIdForValue(newValue);
            BD.store.belongsToDidChange(this, key, newClientId, oldClientId, false);
        }, this);
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
    
    save: function(embeddedKeys) {
        return BD.store.saveRecord(this, embeddedKeys);
    },
    
    deleteRecord: function() {
        return BD.store.deleteRecord(this);
    },
    
    serialize: function(options) {
        options = options || {};
        var serialized = {},
            data = this.get('data');
        serialized._clientId = this.get('clientId');
        if (!this.get('isNew')) {
            serialized.id = this.get('id');
        }
        this.eachAttribute(function(key, meta) {
            if (typeof data.attributes[key] != 'undefined') {
                serialized[key] = BD.transforms[meta.type].serialize(data.attributes[key]);
            }
        }, this);
        this.eachBelongsTo(function(key, meta) {
            if (!options.isEmbedded || !meta.options.isParent) {
                var id = data.belongsTo[key];
                if (id) {
                    if (typeof id === 'object') {
                        id = BD.store.findByClientId(id.clientId).get(meta.idProperty);
                    }
                    meta.serialize(serialized, key, id);
                }
            }
        }, this);
        if (options.embeddedKeys) {
            this.eachHasMany(function(key, meta) {
                if (options.embeddedKeys.contains(key)) {
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

    unload: function() {
        this.set('isUnloading', true);
        this.eachBelongsTo(function(name) {
            this.set(name, null);
        }, this);
        this.eachEmbeddedRecord(function(child) {
            child.unload();
        });
        _.each(this.inRecordArrays, function(recordArray) {
            recordArray.removeObject(this);
        }, this);
        BD.store.didUnloadRecord(this);
        this.destroy();
    },

    toString: function toString() {
        return '<'+this.constructor.toString()+':'+this.get('id')+'>';
    }
    
});

BD.Model.reopenClass({

    _create: BD.Model.create,
    create: function() {
        throw new Ember.Error("You should not call `create` on a model. Instead, call `createRecord` with the attributes you would like to set.");
    },
    createRecord: function(data) {
        return BD.store.createRecord(this, data);
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
    }
    
});