BD.Store = Em.Object.extend({

    init: function() {
        this._super();
        this.resetContainers();
    },
    
    typeMapFor: function(type) {
        type = this.resolveType(type);
        var guidForType = Ember.guidFor(type);
        if (!this.typeMaps[guidForType]) {
            this.typeMaps[guidForType] = {
                idToRecord: {},
                hasManyRecordArrays: {}
            };
        }
        return this.typeMaps[guidForType];
    },
    recordForTypeAndId: function(type, id) {
        return this.typeMapFor(type).idToRecord[id];
    },

    resolveType: function(type) {
        if (typeof type === 'string') {
            type = Em.get(Em.lookup, type);
        }
        return type;
    },

    findByClientId: function(clientId) {
        var r = this.cidToRecord[clientId];
        Ember.assert('No record with clientId "'+clientId+'" has been loaded.', r);
        return r;
    },
    instantiateUnloadedRecord: function(type, id) {
        var r = type._create({});
        this.didUpdateId(r, id);
        return r;
    },
    find: function(type, id) {
        if (typeof id === 'object') {
            return this.findByQuery(type, id);
        }
        type = this.resolveType(type);
        var r = this.recordForTypeAndId(type, id);
        if (r) {
            return r;
        }
        r = this.instantiateUnloadedRecord(type, id);
        this._findOne(type, r, id);
        return r;
    },
    findByReference: function(reference) {
        var p = this.parseReference(reference);
        return this.find(p.type, p.id);
    },
    findByIdQuery: function(type, id, query) {
        type = this.resolveType(type);
        var r = this.recordForTypeAndId(type, id);
        if (!r) {
            r = this.instantiateUnloadedRecord(type, id);
        }
        this._findOne(type, r, id, query);
        return r;
    },
    findByIdInclude: function(type, id, include) {
        return this.findByIdQuery(type, id, {include: include});
    },
    _findOne: function(type, r, id, query) {
        r.set('isLoading', true);
        this.ajax({
            type: 'GET',
            url: '/' + BD.pluralize(this.rootForType(type)) + '/' + id,
            data: query,
            success: function(payload) {
                r.set('isLoading', false);
                this.sideload(payload);
            },
            error: function(xhr) {
                if (xhr.status == 422) {
                    var payload = JSON.parse(xhr.responseText);
                    this.printServerError(payload.errorMessage);
                } else {
                    this.printServerError('We\'re sorry, but the record could currently not be loaded. Please try again.');
                }
            }
        });
    },
    findMany: function(type, ids) {
        type = this.resolveType(type);
        var records = [];
        ids.forEach(function(id) {
            if (typeof id === 'object') {
                records.push(this.findByClientId(id.clientId));
            } else {
                records.push(this.find(type, id));
            }
        }, this);
        var recordArray = BD.RecordArray.create({
            type: type,
            isLoaded: true,
            content: Em.A(records)
        });
        return recordArray;
    },
    findByUrl: function(type, url, query) {
        type = this.resolveType(type);
        var recordArray = BD.RecordArray.create({
            type: type,
            content: Em.A()
        });
        this.ajax({
            type: 'GET',
            url: '/' + url,
            data: query,
            success: function(payload) {
                this.sideload(payload, BD.pluralize(this.rootForType(type)), recordArray);
                recordArray.set('isLoaded', true);
                recordArray.trigger('didLoad', payload);
            },
            error: function(xhr) {
                if (xhr.status == 422) {
                    var payload = JSON.parse(xhr.responseText);
                    this.printServerError(payload.errorMessage);
                } else {
                    this.printServerError('We\'re sorry, but the records could currently not be loaded. Please try again.');
                }
            }
        });
        return recordArray;
    },
    findByQuery: function(type, query) {
        type = this.resolveType(type);
        return this.findByUrl(type, BD.pluralize(this.rootForType(type)), query);
    },
    all: function(type) {
        type = this.resolveType(type);
        var records = _.values(this.typeMapFor(type).idToRecord);
        var recordArray = BD.RecordArray.create({
            type: type,
            content: Em.A(records)
        });
        return recordArray;
    },

    registerHasManyRecordArray: function(parent, recordArray, type, hasManyKey, belongsToKey) {
        var typeMap = this.typeMapFor(type),
            parentCid = parent.get('clientId');
        recordArray.set('parent', parent);
        recordArray.set('hasManyKey', hasManyKey);
        if (!typeMap.hasManyRecordArrays[belongsToKey]) {
            typeMap.hasManyRecordArrays[belongsToKey] = {};
        }
        typeMap.hasManyRecordArrays[belongsToKey][parentCid] = recordArray;
    },
    //Currently not used
//    getHasManyRecordArray: function(parent, type, belongsToKey) {
//        var typeMap = this.typeMapFor(type);
//        if (!typeMap.hasManyRecordArrays[belongsToKey]) {
//            return null;
//        }
//        return typeMap.hasManyRecordArrays[belongsToKey][parent.get('clientId')];
//    },
    belongsToDidChange: function(r, belongsToKey, newCid, oldCid, dirty) {
        if (this.belongsToDidChangeIsSuspended) {
            this.belongsToDidChangeQueue.push(arguments);
            return;
        }
        if (newCid === oldCid) {
            return;
        }
        var typeMap = this.typeMapFor(r.constructor),
            recordArrays = typeMap.hasManyRecordArrays[belongsToKey],
            oldRecordArray,
            newRecordArray;
        if (!recordArrays) {
            return;
        }
        oldRecordArray = recordArrays[oldCid];
        newRecordArray = recordArrays[newCid];
        if (oldRecordArray) {
            oldRecordArray.removeObject(r);
            if (dirty) {
                oldRecordArray.get('parent').checkEmbeddedChildrenDirty();
            }
        }
        if (newRecordArray) {
            if (!newRecordArray.contains(r)) {
                newRecordArray.pushObject(r);
            }
            if (dirty) {
                newRecordArray.get('parent').checkEmbeddedChildrenDirty();
            }
        }
    },
    suspendBelongsToDidChange: function() {
        this.belongsToDidChangeIsSuspended = true;
    },
    resumeBelongsToDidChange: function() {
        this.belongsToDidChangeIsSuspended = false;
        this.belongsToDidChangeQueue.forEach(function(args) {
            this.belongsToDidChange.apply(this, args);
        }, this);
        this.belongsToDidChangeQueue = [];
    },

    createRecord: function(type, properties) {
        //Instantiate record
        properties = properties || {};
        var r = type._create({
            isNew: true
        });
        //Make sure that each hasMany relationship is registered as an empty RecordArray
        var data = r.get('data');
        r.eachHasMany(function(name) {
            data.hasMany[name] = [];
            r.get(name);
        }, this);
        //Mark the record as dirty and update properties
        r.becomeDirty();
        this.suspendBelongsToDidChange();
        r.setProperties(properties);
        this.resumeBelongsToDidChange();
        return r;
    },
    
    saveRecord: function(r, embeddedKeys) {
        var promise = BD.ModelOperationPromise.create();
        //Don't save if the record is clean
        if (!r.get('isDirty')) {
            setTimeout(function() {
                promise.trigger('complete');
                promise.trigger('success');
            }, 1);
            return promise;
        }
        //Make sure that embeddedKeys is either null or an array
        if (embeddedKeys && !Em.isArray(embeddedKeys)) {
            embeddedKeys = [embeddedKeys];
        } else if (!embeddedKeys) {
            embeddedKeys = [];
        }
        //Construct URL
        var isNew = r.get('isNew'),
            root = this.rootForType(r.constructor),
            url = '/' + BD.pluralize(root);
        if (!isNew) {
            url += '/' + r.get('id');
        }
        //Payload
        var data = {};
        data[root] = r.serialize({
            embeddedKeys: embeddedKeys
        });
        //Make PUT/POST request
        this.ajax({
            type: isNew ? 'POST' : 'PUT',
            url: url,
            data: data,
            success: function(payload) {
                r.didCommit(embeddedKeys);
                this.sideload(payload);
                promise.trigger('complete');
                promise.trigger('success', payload);
            },
            error: function(xhr) {
                this.handleModelOperationError(promise, xhr, 'We\'re sorry but we couldn\'t successfully save your data. Please try again.');
            }
        });
        return promise;
    },
    handleValidationErrors: function(xhr) {
        var data = JSON.parse(xhr.responseText);
        if (!data.validationErrors) {
            return;
        }
        _.each(data.validationErrors, function(rawErrors, clientId) {
            var r = BD.store.findByClientId(clientId);
            if (!r) {
                return;
            }
            var attributeErrors = Ember.Object.create();
            var rawAttributeErrors = rawErrors.attributes;
            if (rawAttributeErrors) {
                r.eachAttribute(function(key) {
                    if (rawAttributeErrors[key]) {
                        attributeErrors.set(key, rawAttributeErrors[key]);
                    }
                }, this);
                r.eachBelongsTo(function(key) {
                    if (rawAttributeErrors[key+'Id']) {
                        attributeErrors.set(key, rawAttributeErrors[key+'Id']);
                    }
                }, this);
            }
            r.set('error', rawErrors.message);
            r.set('errors', attributeErrors);
        });
    },

    deleteRecord: function(r) {
        var id = r.get('id'),
            isEmbedded = r.get('isEmbedded');
        //Set the record as dirty
        r.becomeDirty();
        r.set('isDeleted');
        //Dirty the parent, if embedded
        if (isEmbedded) {
            r.getParent().didDeleteEmbeddedRecord(r);
        }
        //Remove all belongsTo
        r.eachBelongsTo(function(key) {
            r.set(key, null);
        }, this);
        //If the record hasn't been created yet, there is no need to contact the server
        if (r.get('isNew')) {
            r.unload();
            return;
        }
        //If the record is embedded, then don't send DELETE request
        if (isEmbedded) {
            return;
        }
        //Make DELETE request
        var promise = BD.ModelOperationPromise.create();
        this.ajax({
            type: 'DELETE',
            url: '/' + BD.pluralize(this.rootForType(r.constructor)) + '/' + r.get('id'),
            success: function(payload) {
                r.unload();
                this.markDeletedRecords(payload);
                promise.trigger('complete');
                promise.trigger('success');
            },
            error: function(xhr) {
                this.handleModelOperationError(promise, xhr, 'We\'re sorry, but the record could currently not be deleted. Please try again.');
            }
        });
        return promise;
    },
    markDeletedRecords: function(payload) {
        var meta = payload.meta,
            deletedRecords;
        if (meta) {
            deletedRecords = meta.deletedRecords;
            if (deletedRecords) {
                _.each(deletedRecords, function(ids, typeName) {
                    var type = BD.lookupTypeByName(typeName);
                    if (!type) {
                        return;
                    }
                    ids.forEach(function(id) {
                        var deletedRecord = this.recordForTypeAndId(type, id);
                        if (deletedRecord) {
                            deletedRecord.unload();
                        }
                    }, this);
                }, this);
            }
        }
    },
    didUnloadRecord: function(r) {
        var cid = r.get('clientId'),
            id = r.get('id');
        delete this.cidToRecord[cid];
        delete this.typeMapFor(r.constructor).idToRecord[id];
    },

    rootForType: function(type) {
        return Ember.get(type, 'root');
    },
    
    sideload: function(payload, root, recordArray) {
        var allRecords = [], rootRecords;
        for (var key in payload) {
            //Skip some properties
            if (!payload.hasOwnProperty(key)) continue;
            if (key === 'meta') continue;
            //Find type
            var type = BD.lookupTypeByName(key);
            Ember.assert('JSON payload had unknown key "'+key+'"', type);
            //Load records of this type
            var records = this._loadMany(type, payload[key]);
            allRecords.push(records);
            if (root == key) {
                rootRecords = records;
            }
        }
        //Materialize records
        this.materializeRecords();
        //Add root records, if any, to the RecordArray, but only if it's not a hasMany array
        if (rootRecords && !recordArray.get('parent')) {
            recordArray.set('content', rootRecords);
        }
    },
    loadMany: function(type, dataItems) {
        var records = this._loadMany(type, dataItems);
        this.materializeRecords();
        return records;
    },
    _loadMany: function(type, dataItems) {
        var records = [];
        if (Em.isArray(dataItems)) {
            for (var i = 0; i < dataItems.length; i++) {
                records.push(this._load(type, dataItems[i]));
            }
        } else {
            records.push(this._load(type, dataItems));
        }
        return records;
    },
    load: function(type, data) {
        var r = this._load(type, data);
        this.materializeRecords();
        return r;
    },
    _load: function(type, data) {
        var id = data.id,
            cid = data._clientId,
            r;
        //Try to find record based on clientId or id
        if (cid) {
            r = this.findByClientId(cid);
        } else {
            r = this.recordForTypeAndId(type, id);
        }
        //If record was found, then update its isLoaded and isNew states
        if (r) {
            //Created
            if (r.get('isNew')) {
                r.set('isNew', false);
                this.didUpdateId(r, id);
                r.trigger('didCreate');
            }
        } else {
            //If no record was found, then instantiate a new one
            r = type._create({
                isLoaded: true
            });
            this.didUpdateId(r, id);
        }
        //Update data
        r.loadData(data);
        this.unmaterializedRecords.push(r);
        return r;
    },
    materializeRecords: function() {
        this.unmaterializedRecords.forEach(function(r) {
            r.materializeData();
        });
        this.unmaterializedRecords.forEach(function(r) {
            if (!r.get('isLoaded')) {
                r.set('isLoaded', true);
            }
            r.trigger('didLoad');
        });
        this.unmaterializedRecords = [];
    },

    didInstantiateRecord: function(r) {
        this.clientIdCounter++;
        var clientId = this.clientIdCounter;
        r.set('clientId', clientId);
        this.cidToRecord[clientId] = r;
    },
    didUpdateId: function(r, id) {
        r.set('id', id);
        this.typeMapFor(r.constructor).idToRecord[id] = r;
    },

    ajax: function(hash) {
        hash.context = this;
        return BD.ajax(hash);
    },
    
    filter: function(type, filter, comparator) {
        type = this.resolveType(type);
        var typeMap = this.typeMapFor(type),
            recordArray,
            content = [];
        _.each(typeMap.idToRecord, function(r) {
            if (this.matchesFilter(r, filter)) {
                content.push(r);
            }
        }, this);
        this.sortRecords(content, comparator);
        recordArray = BD.RecordArray.create({
            content: Em.A(content)
        });
        return recordArray;
    },
    matchesFilter: function(r, filter) {
        if (typeof filter === 'object') {
            var match = true;
            _.find(filter, function(v, k) {
                if (r.get(k) !== v) {
                    match = false;
                    return true;
                }
                return false;
            });
            return match;
        } else if (typeof filter === 'function') {
            return filter(r);
        } else {
            return true;
        }
    },
    sortRecords: function(content, comparator) {
        var self = this;
        if (typeof comparator === 'function') {
            content.sort(comparator);
            return;
        }
        if (typeof comparator === 'string') {
            var temp = comparator;
            comparator = {};
            comparator[temp] = 'ASC';
        }
        if (typeof comparator === 'object') {
            content.sort(function(a, b) {
                var result = 0;
                _.find(comparator, function(direction, property) {
                    result = self.compareValues(a.get(property), b.get(property));
                    if (direction === 'DESC') {
                        result *= -1;
                    }
                    if (result == 0) {
                        //Take next sort parameter
                        return false;
                    }
                    //End with this result
                    return true;
                });
                return result;
            });
        }
    },
    compareValues: function(a, b) {
        if (typeof a !== 'string' || typeof b !== 'string') {
            return a - b;
        }
        a = a+'';
        b = b+'';
        return a.localeCompare(b);
    },

    parseReference: function(reference) {
        var s = reference.split(':'),
            type = BD.lookupTypeByName(s[0]),
            id = s[1];
        Ember.assert('Unknown type in API reference "'+reference+'".', type);
        Ember.assert('No ID contained in API reference "'+reference+'".', id);
        return {
            type: type,
            id: s[1]
        };
    },
    
    reset: function() {
        _.each(this.cidToRecord, function(r) {
            r.unload();
        });
        this.resetContainers();
    },
    resetContainers: function() {
        this.clientIdCounter = 0;
        this.cidToRecord = {};
        this.typeMaps = {};
        this.unmaterializedRecords = [];
        this.belongsToDidChangeQueue = [];
    },

    handleModelOperationError: function(promise, xhr, defaultMessage) {
        promise.trigger('complete');
        if (promise.has('error')) {
            promise.trigger('error', xhr);
        } else {
            if (xhr.status == 422) {
                var payload = JSON.parse(xhr.responseText);
                this.printServerError(payload.errorMessage);
            } else {
                this.printServerError(defaultMessage);
            }
        }
    },
    printServerError: function(message) {
        console.error('Server error: ' + message);
    }
    
});

BD.store = BD.Store.create({});