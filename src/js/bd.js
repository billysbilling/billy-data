var inflectors = require('inflectors');

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

    addInflectorsRule: inflectors.addRule,
    removeInflectorsRule: inflectors.removeRule,
    pluralize: inflectors.pluralize,
    singularize: inflectors.singularize,
    classify: inflectors.classify,

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
                    complete.call(hash.context, xhr);
                }
            });
        };
        var success = hash.success;
        hash.success = function(payload) {
            Em.run(function() {
                if (success) {
                    success.call(hash.context, payload);
                }
            });
        };
        var error = hash.error;
        hash.error = function(xhr) {
            Em.run(function() {
                if (error) {
                    error.call(hash.context, xhr);
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

