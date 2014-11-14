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

    ajax: $.ajax,

    urlPrefix: '',

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
