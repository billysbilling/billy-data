var ajax;

QUnit.module('BD.FixtureRequest', {
    setup: function() {
        BD.FixtureRequest.reopen({ DELAY: 0 });
    }
});

asyncTest('`schedule` schedules a callback to run later', function() {
    expect(1);
    ajax = BD.FixtureRequest.create();
    ajax.schedule(function() {
        ok(true);
        start();
    });
});

asyncTest('`schedule` triggers an ajax start', function() {
    expect(1);
    ajax = BD.FixtureRequest.create();
    ajax.triggerAjaxStart = function() {
        ok(true);
        start();
    };
    ajax.schedule($.noop);
});

asyncTest('`schedule` triggers an ajax stop', function() {
    expect(1);
    ajax = BD.FixtureRequest.create();
    ajax.triggerAjaxStop = function() {
        ok(true);
        start();
    };
    ajax.schedule($.noop);
});

asyncTest('`abort` triggers an ajax stop', function() {
    expect(1);
    ajax = BD.FixtureRequest.create();
    ajax.triggerAjaxStop = function() {
        ok(true);
        start();
    };
    ajax.schedule($.noop);
    ajax.abort();
});

asyncTest('`abort` removes the scheduled callback', function() {
    expect(1)
    ajax = BD.FixtureRequest.create();
    ajax.clearTimeout = function() {
        ok(true);
        start();
    };
    ajax.schedule($.noop);
    ajax.abort();
});
