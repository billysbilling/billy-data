window.BD = Ember.Namespace.create({

    typeNamespaces: [],
    registerTypeNamespace: function(namespace) {
        this.typeNamespaces.push(namespace);
    },

    lookupTypeByName: function(name) {
        var type;
        BD.typeNamespaces.find(function(namespace) {
            type = namespace[this.classify(this.singularize(name))];
            if (type) {
                return true;
            }
            type = namespace[this.classify(name)];
            if (type) {
                return true;
            }
        }, this);
        return type;
    },
    resolveType: function(type) {
        if (typeof type === 'string') {
            type = Em.get(Em.lookup, type);
        }
        return type;
    },

    plurals: {},
    pluralize: function(name) {
        if (this.plurals[name]) {
            return this.plurals[name];
        } else if (name.slice(-1) == 'y') {
            return name.substring(0, name.length - 1)+'ies';
        } else if (name.slice(-1) == 's') {
            return name+'es';
        } else if (name.slice(-3) == 'tch') {
            return name+'es';
        } else {
            return name+'s';
        }
    },
    singularize: function(name) {
        if (!this.singulars) {
            this.singulars = {};
            for (var k in this.plurals) {
                if (!this.plurals.hasOwnProperty(k)) continue;
                this.singulars[this.plurals[k]] = k;
            }
        }
        if (this.singulars[name]) {
            return this.singulars[name];
        } else if (name.slice(-3) == 'ies') {
            return name.substring(0, name.length-3)+'y';
        } else if (name.slice(-3) == 'ses') {
            return name.substring(0, name.length-2);
        } else if (name.slice(-5) == 'tches') {
            return name.substring(0, name.length-2);
        } else {
            return name.substring(0, name.length-1);
        }
    },
    classify: function(name) {
        return name.substring(0, 1).toUpperCase()+name.substring(1);
    },

    ajax: function(hash) {
        hash.url = BD.url(hash.url);
        hash.dataType = 'json';
        hash.contentType = 'application/json; charset=utf-8';
        if (hash.data && !(typeof hash.data === 'string') && hash.type !== 'GET') {
            hash.data = JSON.stringify(hash.data);
        }
        var complete = hash.complete;
        hash.complete = function(xhr) {
            Em.run(function() {
                if (complete) {
                    complete(xhr);
                }
            });
        };
        var success = hash.success;
        hash.success = function(payload) {
            Em.run(function() {
                if (success) {
                    success(payload);
                }
            });
        };
        var error = hash.error;
        hash.error = function(xhr) {
            Em.run(function() {
                if (error) {
                    error(xhr);
                }
            });
        };
        return $.ajax(hash);
    },

    urlPrefix: '',
    url: function(url) {
        return this.urlPrefix + url;
    },

    transaction: function() {
        return BD.Transaction.create();
    },
    saveRecords: function(records, options) {
        var transaction = this.transaction();
        records.forEach(function(r) {
            transaction.add(r, Em.copy(options, true));
        });
        transaction.commit();
        return transaction;
    },
    
    deleteRecords: function(records) {
        return BD.store.deleteRecords(records);
    },

    printServerError: function(message) {
        console.error('Server error: ' + message);
    },
    
    loadedAll: Em.Object.create()

});

