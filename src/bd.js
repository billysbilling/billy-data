var BD = {};

BD.ajax = function(hash) {
    hash.url = BD.url(hash.url);
    hash.dataType = 'json';
    hash.contentType = 'application/json; charset=utf-8';
    if (hash.data && !(typeof hash.data === 'string') && hash.type !== 'GET') {
        hash.data = JSON.stringify(hash.data);
    }
    $.ajax(hash);
};

BD.url = function(url) {
    return url;
};

BD.typeNamespaces = [];

BD.each = function(collection, callback, context) {
    var key;
    for (key in collection) {
        if (!collection.hasOwnProperty(key)) continue;
        callback.call(context, collection[key], key);
    }
};