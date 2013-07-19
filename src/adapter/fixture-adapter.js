BD.FixtureAdapter = Em.Object.extend({

    init: function() {
        this._super();
        this._fixtures = {};
    },
    
    reset: function() {
        this._fixtures = {};
    },

    fixturesForType: function(type) {
        var guidForType = Ember.guidFor(type);
        if (!this._fixtures[guidForType]) {
            this._fixtures[guidForType] = [];
        }
        return this._fixtures[guidForType];
    },
    
    setFixtures: function(type, fixtures) {
        this._fixtures[Ember.guidFor(type)] = fixtures;
    },

    loadRecord: function(store, record) {
        this._persist(record.constructor, record.serialize());
    },

    deleteRecords: function(store, type, records, success, error) {
        return this._simulateRemoteCall(function() {
            this._didDeleteRecords(store, type, records, success, error);
        }, this);
    },

    _didDeleteRecords: function(store, type, records, success, error) {
        records.forEach(function(record) {
            this._remove(type, record.get('id'));
        }, this);
        success({ meta: { status: 200, success: true } });
    },

    deleteRecord: function(store, r, id, success, error) {
        return this._simulateRemoteCall(function() {
            this._didDeleteRecord(store, r, id, success, error);
        }, this);
    },

    _didDeleteRecord: function(store, r, id, success, error) {
        this._remove(r.constructor, id);
        success({ meta: { status: 200, success: true } });
    },

    findOne: function(store, type, r, id, query, success, error) {
        return this._simulateRemoteCall(function() {
            this._didFindOne(store, type, r, id, query, success, error);
        }, this);
    },

    _didFindOne: function(store, type, r, id, query, success, error) {
        var fixtures = this.fixturesForType(type),
            fixture,
            payload;
        fixture = fixtures.find(function(item) {
            return item.id == id
        });
        if (fixture) {
            payload = { meta: { statusCode: 200, success: true } };
            payload[store._rootForType(type)] = JSON.parse(JSON.stringify(fixture));
            success(payload);
        } else {
            payload = {
                meta: {
                    statusCode: 404,
                    success: false
                },
                errorMessage: 'The record was not found.'
            };
            error(payload, 404)
        }
    },

    findByQuery: function(store, type, query, success, error, complete) {
        return this._simulateRemoteCall(function() {
            this._didFindByQuery(store, type, query, success, error, complete);
        }, this);
    },

    _didFindByQuery: function(store, type, query, success, error, complete) {
        complete();
        var payload = {},
            records = [],
            name,
            sortProperty = query.sortProperty,
            sortFactor = query.sortDirection === 'DESC' ? -1 : 1;
        payload.meta = { statusCode: 200, success: true };
        this.fixturesForType(type).forEach(function(data) {
            var match = true;
            if (query) {
                for (name in query) {
                    if (!query.hasOwnProperty(name) || name === 'pageSize' || name === 'offset' || name === 'include' || name === 'sortProperty' || name === 'sortDirection') continue;
                    if (data[name] !== query[name]) {
                        match = false;
                        break;
                    }
                }
            }
            if (match) {
                records.push(JSON.parse(JSON.stringify(data)));
            }
        });
        if (sortProperty) {
            records.sort(function(a, b) {
                var av = a[sortProperty],
                    bv = b[sortProperty];
                if (typeof av === 'string' && typeof bv === 'string') {
                    return sortFactor * av.localeCompare(bv);
                } else {
                    return sortFactor * (av - bv);
                }
            });
        }
        payload[BD.pluralize(store._rootForType(type))] = records;
        success(payload);
    },

    saveRecord: function(store, r, data, options, success, error) {
        var self = this,
            type = r.constructor,
            childType;
        return this._simulateRemoteCall(function() {
            data = data[BD.store._rootForType(type)];
            self._persist(type, data);
            if (options.embed) {
                options.embed.forEach(function(name) {
                    childType = BD.resolveType(Em.get(type, 'hasManyRelationships').get(name).type);
                    data[name].forEach(function(childData) {
                        self._persist(childType, childData);
                    });
                });
            }
            success({
                meta: {
                    statusCode: 200,
                    success: true
                }
            });
        }, this);
    },

    commitTransactionBulk: function(store, type, rootPlural, data, success, error) {
        return this._simulateRemoteCall(function() {
            this._didCommitTransactionBulk(store, type, rootPlural, data, success, error);
        }, this);
    },

    _didCommitTransactionBulk: function(store, type, rootPlural, data, success, error) {
        data[rootPlural].forEach(function(obj) {
            this._persist(type, obj);
        }, this);
        success({ meta: { statusCode: 200, success: true } });
    },

    _remove: function(type, id) {
        var fixtures = this.fixturesForType(type);
        fixtures.find(function(item, idx) {
            if (item.id == id) {
                fixtures.splice(idx, 1);
                return true;
            }
        });
    },

    _persist: function(type, obj) {
        var fixtures = this.fixturesForType(type);

        if (obj.id) {
            var fixture = fixtures.find(function(item, idx) {
                if (item.id == obj.id) {
                    fixtures[idx] = $.extend({}, item, obj);
                    return true;
                }
            });

            // Means we are coming from `loadRecord`, also means that
            // we got a response from BD.AnonymousRecord#save and we
            // want to load the data into the fixtures.
            if (!fixture) {
                fixtures.push(obj);
            }
        } else {
            obj.id = this._incrementIdInFixtures(type);
            fixtures.push(obj);
        }
    },

    _incrementIdInFixtures: function(type) {
        var fixtures = this.fixturesForType(type);
        return fixtures.length > 1 ? fixtures[fixtures.length - 1].id + 1 : 1;

    },

    _simulateRemoteCall: function(callback, context) {        
        var ajax = BD.FixtureRequest.create();
        ajax.schedule(function() {
            callback.apply(context);
        });
        return ajax;
    }

});
