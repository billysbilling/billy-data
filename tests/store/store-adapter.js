QUnit.module('BD.Store adapter features');

var TestAdapter = Em.Object.extend({
    toString: function() {
        return 'TestAdapter';
    }
});

test('should have default adapter of BD.RestAdapter', function() {
    ok(BD.store.get('adapter').toString().match(/BD.RestAdapter/));
});

test('should be able to set the adapter', function() {
    var oldAdapter = BD.store.get('adapter');
    BD.store.set('adapter', TestAdapter.create({}));
    ok(BD.store.get('adapter').toString().match(/TestAdapter/));
    BD.store.set('adapter', oldAdapter);
});