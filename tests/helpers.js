if (window.isCli) {
    window.cliResults = {
        failures: [],
        isDone: false
    };
    QUnit.log(function(details) {
        if (!details.result) {
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

QUnit.config.testStart.push(function() {
    resetAjax();
});

MockAjaxRequest = function() {
};
MockAjaxRequest.prototype = {
    statusCode: null,

    payload: null,
    
    hash: null,
    
    isAborted: false,
    
    respond: function() {
        var xhr = {
            status: this.statusCode,
            responseText: JSON.stringify(this.payload)
        }
        if (this.hash.complete) {
            this.hash.complete.call(this.hash.context, this.xhr);
        }
        if (this.statusCode >= 200 && this.statusCode < 300) {
            this.hash.success.call(this.hash.context, this.payload);
        } else {
            this.hash.error.call(this.hash.context, xhr);
        }
    }
}

function fakeAjax(statusCode, payload) {
    payload = payload || {};
    payload.meta = payload.meta || {
        success: statusCode >= 200 && statusCode < 300,
        statusCode: statusCode
    };
    var req = new MockAjaxRequest();
    req.statusCode = statusCode;
    req.payload = payload;
    BD.ajax = function(hash) {
        resetAjax();
        req.hash = hash;
        var request = {
            abort: function() {
                req.isAborted = true;
            }
        };
        return request;
    };
    return req;
}

function resetAjax() {
    BD.ajax = function(hash) {
        console.log('BD.ajax hash and for debugging:');
        console.log(hash);
        console.trace();
        throw new Error('BD.ajax should not be called.');
    };
}