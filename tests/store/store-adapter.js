QUnit.module('BD.Store adapter features');

test('should have default adapter of BD.RestAdapter', function() {
    ok(BD.store.get('adapter').toString().match(/BD.RestAdapter/));
});

test('should be able to set the adapter', function() {
    var oldAdapter = BD.store.get('adapter');
    BD.store.set('adapter', BD.FixtureAdapter.create({}));
    ok(BD.store.get('adapter').toString().match(/BD.FixtureAdapter/));
    BD.store.set('adapter', oldAdapter);
});