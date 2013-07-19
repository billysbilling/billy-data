BD.RestAdapter = Em.Object.extend({

    reset: function() {
    },
    
    _ajax: function(hash) {
        hash.context = this;
        return BD.ajax(hash);
    },

    _parseResponseJson: function(responseText) {
        var payload = null;
        try {
            payload = JSON.parse(responseText);
        } catch (e) {
        }
        return payload;
    },

    loadRecord: function(store, record) {
    },

    deleteRecord: function(store, r, id, success, error) {
        var url = '/' + BD.pluralize(store._rootForType(r.constructor)) + '/' + encodeURIComponent(id);
        this._ajax({
            type: 'DELETE',
            url: url,
            success: success,
            error: function(xhr) {
                var payload = this._parseResponseJson(xhr.responseText);
                error(payload, xhr.status);
            }
        });
    },

    deleteRecords: function(store, type, recordsToDelete, success, error) {
        var idsQuery = recordsToDelete.map(function(r) {
            return 'ids[]='+encodeURIComponent(r.get('id'));
        }).join('&');
        var url = '/' + BD.pluralize(store._rootForType(type)) + '?' + idsQuery;
        this._ajax({
            type: 'DELETE',
            url: url,
            success: success,
            error: function(xhr) {
                var payload = this._parseResponseJson(xhr.responseText);
                error(payload, xhr.status);
            }
        });
    },

    findOne: function(store, type, r, id, query, success, error) {
        this._ajax({
            type: 'GET',
            url: '/' + BD.pluralize(store._rootForType(type)) + '/' + encodeURIComponent(id),
            data: query,
            success: success,
            error: function(xhr) {
                var payload = this._parseResponseJson(xhr.responseText);
                error(payload, xhr.status);
            }
        });
    },

    findByQuery: function(store, type,  data, success, error, complete) {
        var url  = '/' + BD.pluralize(store._rootForType(type))
        return this._ajax({
            type: 'GET',
            url: url,
            data: data,
            complete: complete,
            success: success,
            error: function(xhr) {
                if (xhr.status === 0) {
                    if (xhr.statusText === 'abort') {
                        return;
                    }
                    error({}, xhr.status);
                } else {
                    var payload = this._parseResponseJson(xhr.responseText);
                    error(payload, xhr.status);
                }
            }
        });
    },

    saveRecord: function(store, r, data, options, success, error) {
        //Construct URL
        var isNew = r.get('isNew'),
            root = store._rootForType(r.constructor),
            url = '/' + BD.pluralize(root),
            method = 'POST';
        if (!isNew) {
            method = 'PUT';
            url += '/' + encodeURIComponent(r.get('id'));
        }

        this._ajax({
            type: method,
            url: url,
            data: data,
            success: success,
            error: function(xhr) {
                var payload = this._parseResponseJson(xhr.responseText);
                error(payload, xhr.status);
            }
        });
    },

    commitTransactionBulk: function(store, type, rootPlural, data, success, error) {
        var url = '/' + rootPlural;
        this._ajax({
            type: 'PATCH',
            url: url,
            data: data,
            success: success,
            error: function(xhr) {
                var payload = this._parseResponseJson(xhr.responseText);
                error(payload, xhr.status);
            }
        });
    }

});
