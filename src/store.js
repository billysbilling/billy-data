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
                recordArrayQueryObservers: {},
                recordArrayComparatorObservers: {}
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
        return this.filter(type);
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
        this.suspendRecordAttributeDidChange();
        r.setProperties(properties);
        this.resumeRecordAttributeDidChange();
        return r;
    },

    _normalizeSaveOptions: function(options) {
        options = options || {};
        //Make sure that options.embed is an array
        if (options.embed && !Em.isArray(options.embed)) {
            options.embed = [options.embed];
        } else if (!options.embed) {
            options.embed = [];
        }
        return options;
    },
    saveRecord: function(r, options) {
        options = this._normalizeSaveOptions(options);
        var promise = BD.ModelOperationPromise.create();
        //Don't save if the record is clean
        if (!r.get('isDirty') && !options.properties) {
            setTimeout(function() {
                promise.trigger('complete');
                promise.trigger('success');
            }, 1);
            return promise;
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
        data[root] = r.serialize(options);
        //Make PUT/POST request
        this.ajax({
            type: isNew ? 'POST' : 'PUT',
            url: url,
            data: data,
            success: function(payload) {
                r.didCommit(options);
                this.sideload(payload);
                promise.trigger('complete');
                promise.trigger('success', payload);
            },
            error: function(xhr) {
                var errorMessage;
                if (xhr.status == 422) {
                    var payload = JSON.parse(xhr.responseText);
                    errorMessage = payload.errorMessage;
                    this.handleValidationErrors(payload);
                } else {
                    errorMessage = 'We\'re sorry but we couldn\'t save your data. Please try again.';
                    r.set('error', errorMessage);
                }
                promise.trigger('complete');
                promise.trigger('error', errorMessage, xhr);
            }
        });
        return promise;
    },
    _commitTransaction: function(transaction) {
        //If there are no records in the transaction we just stop here
        if (transaction.get('length') == 0) {
            setTimeout(function() {
                transaction.trigger('complete');
                transaction.trigger('success', null);
            }, 0);
            return;
        }
        //Check bulk support
        var type = transaction.get('type');
        Ember.assert(type.toString()+' does not support bulk saving. Try reopening the class with `supportsBulkSave: true`.', type.supportsBulkSave);
        //Commit the bulk transaction
        this._commitTransactionBulk(transaction);
    },
    _commitTransactionBulk: function(transaction) {
        var serializedItems = [],
            type = transaction.get('type'),
            rootPlural = BD.pluralize(this.rootForType(type)),
            data  = {};
        //Serialize records
        transaction.get('records').forEach(function(r, options) {
            //Don't add if the record is clean
            if (!r.get('isDirty') && !options.properties) {
                return;
            }
            serializedItems.push(r.serialize(options));
        }, this);
        //If there were no dirty records we just stop here
        if (serializedItems.length == 0) {
            setTimeout(function() {
                transaction.trigger('complete');
                transaction.trigger('success', null);
            }, 0);
            return;
        }
        //Payload
        data[rootPlural] = serializedItems;
        //Make PATCH request
        this.ajax({
            type: 'PATCH',
            url: '/' + rootPlural,
            data: data,
            success: function(payload) {
                transaction.get('records').forEach(function(r, options) {
                    r.didCommit(options);
                }, this);
                this.sideload(payload);
                transaction.trigger('complete');
                transaction.trigger('success', payload);
            },
            error: function(xhr) {
                var errorMessage;
                if (xhr.status == 422) {
                    var payload = JSON.parse(xhr.responseText);
                    errorMessage = payload.errorMessage;
                    this.handleValidationErrors(payload);
                } else {
                    errorMessage = 'We\'re sorry but we couldn\'t save your data. Please try again.';
                    transaction.get('records').forEach(function(r, options) {
                        r.set('error', errorMessage);
                    }, this);
                }
                transaction.trigger('complete');
                transaction.trigger('error', errorMessage, xhr);
            }
        });
    },
    handleValidationErrors: function(payload) {
        if (!payload.validationErrors) {
            return;
        }
        _.each(payload.validationErrors, function(rawErrors, clientId) {
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
                var errorMessage;
                if (xhr.status == 422) {
                    var payload = JSON.parse(xhr.responseText);
                    errorMessage = payload.errorMessage;
                } else {
                    errorMessage = 'We\'re sorry, but the record could currently not be deleted. Please try again.';
                }
                promise.trigger('complete');
                promise.trigger('error', errorMessage, xhr);
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
        if (rootRecords) {
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
        //If record was found, then update its isNew states
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
        this.checkRecordArrayObservers(r, '_all');
    },
    didUpdateId: function(r, id) {
        r.set('id', id);
        this.typeMapFor(r.constructor).idToRecord[id] = r;
    },

    ajax: function(hash) {
        hash.context = this;
        return BD.ajax(hash);
    },
    
    filterOptionsToString: function(o) {
        var self = this;
        if (Ember.isArray(o)) {
            return o.reduce(function(rest, value) {
                return rest + ',' + self.filterOptionsToString(value);
            }, '');
        } else if (o instanceof BD.Model) {
            return o.toString();
        } else if (typeof o == 'object') {
            return _.reduce(o, function(rest, value, key) {
                return rest + ',' + key + ':' + self.filterOptionsToString(value);
            }, '');
        } else if (typeof o == 'function') {
            return o.toString();
        } else {
            return o;
        }
    },
    filter: function(type, options) {
        type = this.resolveType(type);
        options = options || {};
        var typeMap = this.typeMapFor(type),
            recordArray,
            recordArrayId,
            query = options.query,
            queryObservers = options.queryObservers,
            comparator = options.comparator,
            comparatorObservers = options.comparatorObservers;
        //Normalize query properties to observe
        queryObservers = queryObservers || [];
        if (typeof query == 'object') {
            _.each(query, function(value, key) {
                queryObservers.push(key);
            });
        }
        if (queryObservers.length == 0) {
            queryObservers.push('_all');
        }
        //Normalize comparator properties to observe
        comparatorObservers = comparatorObservers || [];
        if (typeof comparator == 'string') {
            comparatorObservers.push(comparator);
        } else if (typeof comparator == 'object') {
            _.each(comparator, function(value, key) {
                comparatorObservers.push(key);
            });
        }
        if (comparatorObservers.length == 0) {
            comparatorObservers.push('_all');
        }
        //Create record array
        //TODO: Reuse similar filtered record arrays
//        recordArrayId = type.toString() + '-' + this.filterOptionsToString(query) + '-' + this.filterOptionsToString(comparator) + '-';
        recordArray = BD.FilteredRecordArray.create({
            id: recordArrayId,
            type: type,
            query: query,
            queryObservers: queryObservers,
            comparator: comparator,
            comparatorObservers: comparatorObservers,
            parent: options.parent,
            remoteQuery: options.remoteQuery,
            content: Em.A()
        });
        var guid = Em.guidFor(recordArray);
        this.recordArrays[ guid] = recordArray;
        //Add query properties to observe
        queryObservers.forEach(function(property) {
            if (!typeMap.recordArrayQueryObservers[property]) {
                typeMap.recordArrayQueryObservers[property] = {};
            }
            typeMap.recordArrayQueryObservers[property][guid] = recordArray;
        });
        //Add comparator properties to observe
        comparatorObservers.forEach(function(property) {
            if (!typeMap.recordArrayComparatorObservers[property]) {
                typeMap.recordArrayComparatorObservers[property] = {};
            }
            typeMap.recordArrayComparatorObservers[property][guid] = recordArray;
        });
        //Populate the record array
        if (options.remote) {
            recordArray.remoteRefresh();
        } else if (options.ids) {
            recordArray.pushIds(options.ids);
        } else {
            recordArray.refresh();
        }
        //Return the record array
        return recordArray;
    },
    recordAttributeDidChange: function(r, key) {
        if (this.recordAttributeDidChangeIsSuspended) {
            this.recordAttributeDidChangeQueue.push(arguments);
            return;
        }
        this.checkRecordArrayObservers(r, key);
    },
    checkRecordArrayObservers: function(r, key) {
        var type = r.constructor,
            typeMap = this.typeMapFor(type),
            queryObservers = typeMap.recordArrayQueryObservers[key],
            comparatorObservers = typeMap.recordArrayComparatorObservers[key];
        if (queryObservers) {
            _.each(queryObservers, function(recordArray) {
                recordArray.checkRecordAgainstQuery(r);
            });
        }
        if (comparatorObservers) {
            _.each(comparatorObservers, function(recordArray) {
                recordArray.checkRecordAgainstComparator(r);
            });
        }
    },
    suspendRecordAttributeDidChange: function() {
        this.recordAttributeDidChangeIsSuspended = true;
    },
    resumeRecordAttributeDidChange: function() {
        this.recordAttributeDidChangeIsSuspended = false;
        this.recordAttributeDidChangeQueue.forEach(function(args) {
            this.recordAttributeDidChange.apply(this, args);
        }, this);
        this.recordAttributeDidChangeQueue = [];
    },
    willDestroyRecordArray: function(recordArray) {
        var guid = Em.guidFor(recordArray),
            typeMap = this.typeMapFor(recordArray.get('type'));
        delete this.recordArrays[guid];
        recordArray.get('queryObservers').forEach(function(key) {
            delete typeMap.recordArrayQueryObservers[key][guid];
        })
        recordArray.get('comparatorObservers').forEach(function(key) {
            delete typeMap.recordArrayComparatorObservers[key][guid];
        })
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
        _.each(this.recordArrays, function(recordArray) {
            recordArray.destroy();
        });
        this.resetContainers();
    },
    resetContainers: function() {
        this.clientIdCounter = 0;
        this.cidToRecord = {};
        this.typeMaps = {};
        this.unmaterializedRecords = [];
        this.recordAttributeDidChangeQueue = [];
        this.recordArrays = {};
    },

    printServerError: function(message) {
        console.error('Server error: ' + message);
    }
    
});

BD.store = BD.Store.create({});