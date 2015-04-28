var _ = require('lodash');

BD.Model = Em.Object.extend(Em.Evented, {

    isLoaded: false,
    isNew: false,
    isDeleted: false,
    selfIsDirty: false,
    childIsDirty: false,

    isNotLoaded: Em.computed.not('isLoaded'),

    clientId: null,
    id: null,
    _data: null,
    error: null,
    errors: null,

    init: function() {
        var self = this;
        this._hasManyRecordArrays = {};
        this._deletedEmbeddedRecords = [];
        this._inRecordArrays = {};
        this.set('_data', {
            attributes: {},
            belongsTo: {},
            hasMany: {}
        });
        this.set('errors', {});
        this.promise = new Em.RSVP.Promise(function(resolve, reject) {
            if (self.get('isLoaded')) {
                resolve(self);
            } else {
                self.one('didLoad', function() {
                    self.set('isLoaded', true);
                    resolve(self);
                });
                self.one('didError', reject);
            }
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
                callback.call(binding, key, meta);
            }
        });
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
        }, this);
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
            var serverValue = BD.transforms[meta.type].deserialize(serialized[key]);
            if (this.get('selfIsDirty')) {
                var cleanValue = this.clean.data.attributes[key] || null,
                    clientValue = data.attributes[key] || null;
                if (cleanValue !== clientValue) {
                    return;
                }
            }
            data.attributes[key] = serverValue;
            BD.store.recordAttributeDidChange(this, key);
        }, this);
        //BelongsTo
        this.eachBelongsTo(function(key, meta) {
            var serverValue = meta.extractValue(serialized, key);
            if (this.get('selfIsDirty')) {
                var cleanValue = this.clean.data.belongsTo[key],
                    clientValue = data.belongsTo[key];
                if (cleanValue !== clientValue) {
                    return;
                }
            }
            data.belongsTo[key] = serverValue;
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
        this._deletedEmbeddedRecords.push(r);
        this.checkEmbeddedChildrenDirty();
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
        this._deletedEmbeddedRecords.forEach(function(r) {
            r.unload();
        });
        this._deletedEmbeddedRecords = [];
        this.becameClean();
    },
    resetClean: function() {
        if (!this.get('isNew')) {
            throw new Error('Existing records can not be reset to clean');
        }
        this.eachEmbeddedRecord(function(r) {
            r.resetClean();
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
            //If the record is new, then we delete it
            if (this.get('isNew')) {
                this.deleteRecord();
            }
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

    didDelete: function() {
        this.eachEmbeddedRecord(function(child) {
            child.didDelete();
        });
        this.unload();
    },

    save: function(options) {
        return BD.store.saveRecord(this, options);
    },

    deleteRecord: function() {
        return BD.store.deleteRecord(this);
    },

    serialize: function(options) {
        options = options || {};
        var serialized = {},
            optionProperties = options.properties || {},
            data = this.get('_data'),
            cleanData = this.clean ? this.clean.data : data,
            isNew = this.get('isNew');
        serialized._clientId = this.get('clientId');
        if (!isNew) {
            serialized.id = this.get('id');
        }
        this.eachAttribute(function(key, meta) {
            var value = optionProperties.hasOwnProperty(key) ? optionProperties[key] : data.attributes[key],
                serialize = BD.transforms[meta.type].serialize,
                serializedValue = serialize(value);
            if (!options.includeAll) {
                if (meta.options.readonly) {
                    return;
                }
                if (typeof value === 'undefined') {
                    return;
                }
                if (!isNew && serializedValue === serialize(cleanData.attributes[key])) {
                    return;
                }
            }
            if (typeof serializedValue === 'undefined') {
                serializedValue = null;
            }
            serialized[key] = serializedValue;
        }, this);
        this.eachBelongsTo(function(key, meta) {
            var id;
            if (optionProperties.hasOwnProperty(key)) {
                id = optionProperties[key] ? optionProperties[key].get('id') : null;
            } else {
                id = data.belongsTo[key];
            }
            if (id && typeof id === 'object') {
                id = BD.store.findByClientId(id.clientId).get(meta.idProperty);
            }
            if (!options.includeAll) {
                if (options.isEmbedded && meta.options.isParent) {
                    return;
                }
                if (meta.options.readonly) {
                    return;
                }
                if (typeof id === 'undefined') {
                    return;
                }
                if (!isNew && id === cleanData.belongsTo[key]) {
                    return;
                }
            }
            if (typeof id === 'undefined') {
                id = null;
            }
            meta.serialize(serialized, key, id);
        }, this);
        if (options.embed) {
            this.eachHasMany(function(key) {
                if (options.embed.contains(key)) {
                    var embeddedRecords = [];
                    this.get(key).forEach(function(child) {
                        embeddedRecords.push(child.serialize({
                            isEmbedded: true,
                            includeAll: options.includeAll
                        }));
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
        return !!this._inRecordArrays[Em.guidFor(recordArray)];
    },

    unload: function() {
        //Stop if this record has already been unloaded
        if (this.get('isDestroying')) {
            return;
        }

        this.set('isUnloaded', true);

        //Destroy all has-many record arrays owned by this record
        this.eachHasMany(function(key) {
            if (this.hasManyIsLoaded(key)) {
                this.get(key).destroy();
            }
        }, this);

        //Unload all embeded children
        this.eachEmbeddedRecord(function(child) {
            child.unload();
        });

        //Unset all belongs-to relationships
        this.eachBelongsTo(function(name) {
            this.set(name, null);
        }, this);

        //Remove this record from all record arrays
        _.each(this._inRecordArrays, function(recordArray) {
            recordArray.removeObject(this);
        }, this);

        //Notify store of unload
        BD.store.didUnloadRecord(this);

        //Destroy the object
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
            isNew: true,
            isLoaded: true
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
        r.eachAttribute(function(key, meta) {
            var defaultValue = meta.options.defaultValue;
            if (typeof defaultValue !== 'undefined' && typeof properties[key] === 'undefined') {
                properties[key] = defaultValue;
            }
        });
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
    allLocal: function() {
        return BD.store.allLocal(this);
    },
    filter: function(options) {
        return BD.store.filter(this, options);
    },
    loadAll: function(dataItems) {
        return BD.store.loadAll(this, dataItems);
    },
    loadMany: function(dataItems) {
        return BD.store.loadMany(this, dataItems);
    },
    load: function(data) {
        return BD.store.load(this, data);
    },

    registerFilter: function(name, dependencies, callback) {
        if (!this.filters) {
            this.filters = {};
        }
        this.filters[name] = {
            dependencies: dependencies,
            callback: callback
        };
    },

    getFilter: function(name) {
        if (!this.filters) {
            return null;
        }
        return this.filters[name];
    },

    registerSortMacro: function(name, dependencies, comparator) {
        if (!this.sortMacros) {
            this.sortMacros = {};
        }
        this.sortMacros[name] = {
            dependencies: dependencies,
            comparator: comparator
        };
    },

    getSortMacro: function(name) {
        if (!this.sortMacros) {
            return null;
        }
        return this.sortMacros[name];
    }
});
