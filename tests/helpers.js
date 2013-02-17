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

var originalBdAjax;
QUnit.config.begin.push(function() {
    originalBdAjax = BD.ajax;
});
QUnit.config.testStart.push(function() {
    resetAjax();
});

window.fakeAjaxSuccess = function(payload) {
    payload = payload || {};
    payload.meta = payload.meta || {
        success: true,
        statusCode: 200
    };
    BD.ajax = function(hash) {
        hash.success.call(hash.context, payload);
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
        hash.error.call(hash.context, xhr);
    };
};

window.resetAjax = function() {
    BD.ajax = originalBdAjax;
};