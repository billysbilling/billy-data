BD.transforms = {

    string: {
        deserialize: function(serialized) {
            return Em.isNone(serialized) ? null : String(serialized);
        },
        serialize: function(deserialized) {
            return Em.isNone(deserialized) ? null : String(deserialized);
        }
    },

    number: {
        deserialize: function(serialized) {
            return Em.isNone(serialized) ? null : Number(serialized);
        },
        serialize: function(deserialized) {
            return Em.isNone(deserialized) ? null : Number(deserialized);
        }
    },

    // Handles the following boolean inputs:
    // "TrUe", "t", "f", "FALSE", 0, (non-zero), or boolean true/false
    'boolean': {
        deserialize: function(serialized) {
            var type = typeof serialized;
            if (type === "boolean") {
                return serialized;
            } else if (type === "string") {
                return serialized.match(/^true$|^t$|^1$/i) !== null;
            } else if (type === "number") {
                return serialized === 1;
            } else {
                return false;
            }
        },
        serialize: function(deserialized) {
            return Boolean(deserialized);
        }
    },

    date: {
        deserialize: function(serialized) {
            if (Em.isEmpty(serialized)) {
                return null;
            }
            return moment.utc(serialized).startOf('day');
        },
        serialize: function(date) {
            if (!date) {
                return null;
            }
            return date.format('YYYY-MM-DD');
        }
    },

    datetime: {
        deserialize: function(serialized) {
            if (Em.isEmpty(serialized)) {
                return null;
            }
            return moment.utc(serialized);
        },
        serialize: function(date) {
            if (!date) {
                return null;
            }
            return date.format('YYYY-MM-DDTHH:mm:ss');
        }
    },

    object: {
        deserialize: function(serialized) {
            return serialized;
        },
        serialize: function(deserialized) {
            return deserialized;
        }
    }

};
