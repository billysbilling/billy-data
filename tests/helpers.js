if (window.isCli) {
    window.cliResults = {
        failures: [],
        isDone: false
    };
    QUnit.testDone(function(details) {
        if (details.failed) {
            window.cliResults.failures.push(details);
        }
    });
    QUnit.done(function(details) {
        window.cliResults.details = details;
        window.cliResults.isDone = true;
    });
}

App = Ember.Application.create({});
App.deferReadiness();
BD.registerTypeNamespace(App);

var ajaxQueue;
QUnit.config.testStart.push(function() {
    resetAjax();
    ajaxQueue = [];
});

window.fakeAjaxSuccess = function(payload) {
    payload = payload || {};
    payload.meta = payload.meta || {
        success: true,
        statusCode: 200
    };
    var xhr = {
        status: 200,
        responseText: JSON.stringify(payload)
    };
    BD.ajax = function(hash) {
        resetAjax();
        var item = function() {
            if (hash.complete) {
                hash.complete.call(hash.context, xhr);
            }
            hash.success.call(hash.context, payload);
        };
        ajaxQueue.push(item);
        var request = {
            abort: function() {
                ajaxQueue.removeObject(item);
            }
        };
        return request;
    };
};

window.fakeAjaxError = function(statusCode, payload) {
    payload = payload || {};
    payload.meta = {
        success: false,
        statusCode: statusCode
    };
    var xhr = {
        status: statusCode,
        responseText: JSON.stringify(payload)
    };
    BD.ajax = function(hash) {
        resetAjax();
        var item = function() {
            if (hash.complete) {
                hash.complete.call(hash.context, xhr);
            }
            hash.error.call(hash.context, xhr);
        };
        ajaxQueue.push(item);
        var request = {
            abort: function() {
                ajaxQueue.removeObject(item);
            }
        };
        return request;
    };
};

window.flushAjax = function() {
    ajaxQueue.forEach(function(fn) {
        fn();
    });
    ajaxQueue = [];
    resetAjax();
};

window.resetAjax = function() {
    BD.ajax = function(hash) {
        console.log('BD.ajax hash and for debugging:');
        console.log(hash);
        console.trace();
        throw new Error('BD.ajax should not be called.');
    };
};