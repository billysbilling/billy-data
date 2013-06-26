module('BD.Store');

test('should have default adapter of BD.RestAdapter', function() {
    ok(BD.store.get('adapter').toString().match(/BD.RestAdapter/));
});

test('should be able to set the adapter', function() {
    var oldAdapter = BD.store.get('adapter');
    BD.store.set('adapter', BD.FixtureAdapter.create({}));
    ok(BD.store.get('adapter').toString().match(/BD.FixtureAdapter/));
    BD.store.set('adapter', oldAdapter);
});

test('`_load` should save call the adapter `loadRecord` method', function() {
    var oldAdapter = BD.store.get('adapter');
    var adapter = BD.FixtureAdapter.create();
    adapter.loadRecord = function() {
        ok(true);
    };
    BD.store.set('adapter', adapter);
    App.Contact = BD.Model.extend({ name: BD.attr('string') });
    BD.store._load(App.Contact, { name: 'Seebass' });
});
