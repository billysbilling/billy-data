BD.attr = function(type, options) {
    Ember.assert('Unknown attribute type "'+type+'"', BD.transforms[type]);
    options = options || {};
    var meta = {
        isAttribute: true,
        type: type,
        options: options
    };
    return function(key, value) {
        var data = this.get('_data'),
            oldValue;
        oldValue = data.attributes[key];
        if (arguments.length >= 2) {
            if (value !== oldValue) {
                this.becomeDirty();
                data.attributes[key] = value;
            }
        } else {
            value = oldValue;
        }
        return value;
    }.property('_data').meta(meta);
};

function belongsTo(meta, options) {
    options = options || {};
    meta.isBelongsTo = true;
    meta.options = options;
    return function(key, value) {
        var data = this.get('_data'),
            didChange,
            oldClientId,
            id;
        id = data.belongsTo[key];
        if (arguments.length >= 2) {
            if (id) {
                if (typeof id === 'object') { //then `id` is the record
                    didChange = (!value || value !== id);
                } else {
                    oldClientId = meta.clientIdForValue(id);
                    didChange = (!value || value.get('clientId') !== oldClientId);
                }
            } else {
                didChange = !!value;
                oldClientId = null;
            }
            if (didChange) {
                this.becomeDirty();
                data.belongsTo[key] = value;
            }
        } else {
            if (id) {
                if (typeof id === 'object') {
                    value = BD.store.findByClientId(id.clientId);
                } else {
                    value = meta.find(id);
                }
            } else {
                value = null;
            }
        }
        return value;
    }.property('_data').meta(meta);
}

BD.belongsTo = function(type, options) {
    return belongsTo({
        idProperty: 'id',
        find: function(id) {
            return BD.store.find(type, id);
        },
        extractValue: function(serialized, key) {
            return serialized[key+'Id'];
        },
        clientIdForValue: function(id) {
            if (!id) {
                return null;
            }
            if (typeof id === 'object') {
                return id.clientId;
            }
            var r = BD.store.recordForTypeAndId(type, id);
            return r ? r.get('clientId') : null;
        },
        serialize: function(serialized, key, id) {
            serialized[key+'Id'] = id;
        },
        addToQuery: function(query, belongsToKey, parent) {
            var id = parent ? parent.get('id') : null;
            query[belongsToKey+'Id'] = id;
        }
    }, options);
};

BD.belongsToReference = function(options) {
    return belongsTo({
        idProperty: 'reference',
        find: function(reference) {
            return BD.store.findByReference(reference);
        },
        extractValue: function(serialized, key) {
            return serialized[key+'Reference'];
        },
        clientIdForValue: function(reference) {
            if (!reference) {
                return null;
            }
            if (typeof reference === 'object') {
                return reference.clientId;
            }
            var ref = BD.store.parseReference(reference);
            var r = BD.store.recordForTypeAndId(ref.type, ref.id);
            return r ? r.get('clientId') : null;
        },
        serialize: function(serialized, key, reference) {
            serialized[key+'Reference'] = reference;
        },
        addToQuery: function(query, belongsToKey, parent) {
            query[belongsToKey+'Reference'] = parent.get('reference');
        }
    }, options);
};

BD.hasMany = function(type, belongsToKey, options) {
    options = options || {};
    var meta = {
        isHasMany: true,
        type: type,
        belongsToKey: belongsToKey,
        options: options
    };
    return function(key) {
        if (this._hasManyRecordArrays[key]) {
            return this._hasManyRecordArrays[key];
        }
        var data = this.get('_data'),
            resolvedType = BD.resolveType(type),
            ids = data.hasMany[key],
            recordArray,
            query = {},
            filterOptions;
        query[belongsToKey] = this;
        filterOptions = {
            parent: this,
            query: query,
            sortProperty: options.sortProperty,
            sortDirection: options.sortDirection
        };
        if (ids) {
            filterOptions.ids = ids;
        } else {
            filterOptions.remote = true;
        }
        recordArray = BD.store.filter(resolvedType, filterOptions);
        this._hasManyRecordArrays[key] = recordArray;
        return recordArray;
    }.property('_data').meta(meta);
};
