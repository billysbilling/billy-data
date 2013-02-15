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
        console.log(parentRelationship, parentRelationship ? this.get(parentRelationship) : null);
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
            var records = this.get(key);
            records.forEach(function(r) {
                callback.call(binding, r, key, meta);
            });
        }, this)
    },

    loadData: function(serialized) {
        this.serializedData = serialized;
    },
    materializeData: function() {
        var serialized = this.serializedData,
            data = this.get('data');
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
            var ids = serialized[BD.store.singularize(key)+'Ids'];
            if (ids) {
                data.hasMany[key] = ids;
                this.get(key);
            }
        }, this);
        //
        Em.propertyDidChange(this, 'data');
        //Handle dirty state
        this.becameClean();
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
        if (this.get('selfIsDirty')) {
            return;
        }
        this.clean = {
            isNew: this.get('isNew'),
            data: Em.copy(this.get('data'), true)
        };
        this.set('selfIsDirty', true);
        //Dirty parent
        var parent = this.getParent();
        if (parent) {
            parent.checkEmbeddedChildrenDirty();
        }
    },
    checkEmbeddedChildrenDirty: function() {
        var childIsDirty = false;
        this.eachEmbeddedRecord(function(r) {
            if (r.get('isDirty')) {
                childIsDirty = true;
            }
        });
        this.set('childIsDirty', childIsDirty);
    },
    becameClean: function() {
        if (!this.get('selfIsDirty')) {
            return;
        }
        delete this.clean;
        this.set('selfIsDirty', false);
    },
    rollback: function() {
        //Rollback embedded records
        console.log(this);
        this.eachEmbeddedRecord(function(r) {
            r.rollback();
        });
        //Don't continue if this record itself is not dirty
        if (!this.get('selfIsDirty')) {
            return;
        }
        //Store parent
        var parent = this.getParent();
        console.log('parent', parent);
        //Reset data
        var dirtyData = this.get('data'),
            cleanData = this.clean.data;
        this.set('data', cleanData);
        //Update belongsTo relationships
        this.eachBelongsTo(function(key, meta) {
            var oldValue = dirtyData.belongsTo[key],
                oldClientId = meta.clientIdForValue(oldValue),
                newValue = cleanData.belongsTo[key],
                newClientId = meta.clientIdForValue(newValue);
            BD.store.belongsToDidChange(this, key, newClientId, oldClientId, false);
        }, this);
        //Handle the case where the record already is created
        if (!this.clean.isNew) {
            if (this.get('isDeleted')) {
                this.set('isDeleted', false);
            }
            this.becameClean();
        } else {
            //Handle case where record never was created. Then we just delete it 
            BD.store.didDeleteRecord(this);
        }
        //Let parent check child dirtyness
        if (parent) {
            parent.checkEmbeddedChildrenDirty();
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
        BD.store.didDeleteRecord(this);
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