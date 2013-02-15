var BD = Ember.Object.extend();

BD.reopenClass({

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

    plurals: {},
    pluralize: function(name) {
        return this.plurals[name] || name+'s';
    },
    singularize: function(name) {
        if (!this.singulars) {
            this.singulars = {};
            for (var k in this.plurals) {
                if (!this.plurals.hasOwnProperty(k)) continue;
                this.singulars[this.plurals[k]] = k;
            }
        }
        return this.singulars[name] || name.substring(0, name.length-1);
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
        $.ajax(hash);
    },

    url: function(url) {
        return url;
    }
    
});

