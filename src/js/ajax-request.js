module.exports = function(hash) {
    hash.url = BD.urlPrefix + hash.url;
    hash.dataType = 'json';
    hash.contentType = 'application/json; charset=utf-8';
    if (hash.data && typeof hash.data !== 'string' && hash.type !== 'GET') {
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
    return BD.ajax(hash);
};
