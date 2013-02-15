BD.attr = function(type, options) {
    Ember.assert('Unknown attribute type "'+type+'"', BD.transforms[type]);
    options = options || {};
    var meta = {
        isAttribute: true,
        type: type,
        options: options
    };
    return function(key, value) {
        var data = this.get('data'),
            oldValue;
        oldValue = data.attributes[key];
        if (oldValue === undefined) {
            oldValue = options.defaultValue;
        }
        if (arguments.length >= 2) {
            if (value !== oldValue) {
                this.becomeDirty();
                data.attributes[key] = value;
            }
        } else {
            value = oldValue;
        }
        return value;
    }.property('data').meta(meta);
};

function belongsTo(meta, options) {
    options = options || {};
    meta.isBelongsTo = true;
    meta.options = options;
    return function(key, value) {
        var data = this.get('data'),
            oldValue,
            id;
        id = data.belongsTo[key];
        if (id) {
            if (typeof id === 'object') {
                oldValue = BD.store.findByClientId(id.clientId);
            } else {
                oldValue = meta.find(id);
            }
        } else {
            oldValue = null;
        }
        if (arguments.length >= 2) {
            if (value != oldValue) {
                this.becomeDirty();
                data.belongsTo[key] = value ? value.clientIdObj : null;
                BD.store.belongsToDidChange(this, key, value ? value.get('clientId') : null, oldValue ? oldValue.get('clientId') : null, true);
            }
        } else {
            value = oldValue;
        }
        return value;
    }.property('data').meta(meta);
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
        hasManyQuery: function(parent, query, belongsToKey) {
            query[belongsToKey+'Id'] = parent.get('id');
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
        hasManyQuery: function(parent, query, belongsToKey) {
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
        var data = this.get('data'),
            ids = data.hasMany[key],
            recordArray;
        if (ids) {
            recordArray = BD.store.findMany(type, ids);
            BD.store.registerHasManyRecordArray(this, recordArray, type, key, belongsToKey);
        } else {
            if (this.get('isLoading')) {
                recordArray = BD.RecordArray.create({content: Em.A()});
            } else {
                type = BD.store.resolveType(type);
                var query = {};
                var belongsToMeta = Ember.get(type, 'belongsToRelationships').get(belongsToKey);
                belongsToMeta.hasManyQuery(this, query, belongsToKey);
                recordArray = BD.store.find(type, query);
                BD.store.registerHasManyRecordArray(this, recordArray, type, key, belongsToKey);
            }
        }
        return recordArray;
    }.property('data').meta(meta);
};