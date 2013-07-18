var User, adapter, oldAdapter;

module('BD.FixtureAdapter', {

    setup: function() {
        BD.FixtureRequest.reopen({ DELAY: 0 });
        oldAdapter = BD.store.get('adapter');
        adapter    = BD.FixtureAdapter.create();
        BD.store.set('adapter', adapter);
        App.Category = BD.Model.extend({
            name: BD.attr('string')
        });
        adapter.setFixtures(App.Category, [
            {
                id: 1,
                name: 'Billy'
            },
            {
                id: 2,
                name: 'Noah'
            }
        ]);
    },

    teardown: function() {
        BD.store.set('adapter', oldAdapter);
        BD.store.reset();
        App.Category = null;
    }

});

test('`load` persists the data in the fixtures', function() {
    adapter.setFixtures(App.Category, []);
    App.Category.load({
        id: 3,
        name: 'Sebastian'
    });
    var fixtures = adapter.fixturesForType(App.Category);
    equal(fixtures.length, 1);
    equal(fixtures[0].id, 3);
    equal(fixtures[0].name, 'Sebastian');
});

asyncTest('`deleteRecords` deletes multiple records', function() {
    var records = [App.Category.find(1), App.Category.find(2)];
    var success = function(payload) {
        equal(adapter.fixturesForType(App.Category).length, 0)
        start();
    };
    adapter.deleteRecords(BD.store, App.Category, records, success, $.noop);
});

asyncTest('`deleteRecord` deletes the record', function() {
    var category = App.Category.find(1);
    var success = function(payload) {
        var fixtures = adapter.fixturesForType(App.Category);
        equal(fixtures.length, 1)
        equal(fixtures[0].id, 2);
        start();
    };
    adapter.deleteRecord(BD.store, category, 1, success, $.noop);
});

asyncTest('`findOne` should return the found model', function() {
    var category = App.Category.createRecord();
    var success = function(payload) {
        notStrictEqual(payload.category, adapter.fixturesForType(App.Category)[0], 'data should be a copy');
        equal(payload.category.name, 'Billy');
        start();
    };
    adapter.findOne(BD.store, App.Category, category, 1, {}, success, $.noop);
});

asyncTest('`findOne` should call error if the model is not found in fixtures', function() {
    var category = App.Category.createRecord();
    var success = function() {
        throw new Error('Should not be called.');
    };
    var error = function(payload, statusCode) {
        equal(statusCode, 404);
        start();
    };
    adapter.findOne(BD.store, App.Category, category, 999, {}, success, error);
});

asyncTest('`saveRecord` adds one item when fixtures are empty', function() {
    expect(3);
    adapter.setFixtures(App.Category, []);
    var success = function(payload) {
        var fixtures = adapter.fixturesForType(App.Category);
        equal(fixtures.length, 1);
        equal(fixtures[0].id, 1);
        equal(fixtures[0].name, 'Adam');
        start();
    };
    var error = function() {};
    var record = App.Category.createRecord({ name: 'Adam' });
    var data = {};
    data[BD.store._rootForType(record.constructor)] = record.serialize();
    adapter.saveRecord(BD.store, record, data, success, error);
});

asyncTest('`saveRecord` adds one item when already fixtures exist', function() {
    expect(1);
    var success = function(payload) {
        equal(adapter.fixturesForType(App.Category).length, 3);
        start();
    };
    var error = function() {};
    var record = App.Category.createRecord({ name: 'Adam' });
    var data = {};
    data[BD.store._rootForType(record.constructor)] = record.serialize();
    adapter.saveRecord(BD.store, record, data, success, error);
});

asyncTest('`saveRecord` calls `success` with a payload', function() {
  expect(1);
  var error = function() {};
  var success = function(payload) {
      // Make sure we get called
      ok(true);
      start();
  };
  var record = App.Category.find(1);
  var data = {};
  data[BD.store._rootForType(record.constructor)] = record.serialize();
  adapter.saveRecord(BD.store, record, data, success, error);
});

asyncTest('`findByQuery` calls success with a filtered payload and ignores pageSize and offset', function() {
    var success = function(payload) {
        equal(payload.categories.length, 1);
        notStrictEqual(payload.categories[0], adapter.fixturesForType(App.Category)[1], 'data should be a copy');
        equal(payload.categories[0].id, 2);
        equal(payload.categories[0].name, 'Noah');
        start();
    };
    var query = {
        name: 'Noah',
        pageSize: 100,
        offset: 100,
        include: 'category.thing'
    };
    adapter.findByQuery(BD.store, App.Category, query, success, $.noop, $.noop);
});

asyncTest('`findByQuery` respects sortProperty', function() {
    var success = function(payload) {
        equal(payload.categories.length, 2);
        equal(payload.categories[0].name, 'Billy');
        equal(payload.categories[1].name, 'Noah');
        start();
    };
    var query = {
        sortProperty: 'name'
    };
    adapter.findByQuery(BD.store, App.Category, query, success, $.noop, $.noop);
});

asyncTest('`findByQuery` respects sortProperty and sortDirection', function() {
    var success = function(payload) {
        equal(payload.categories.length, 2);
        equal(payload.categories[0].name, 'Noah');
        equal(payload.categories[1].name, 'Billy');
        start();
    };
    var query = {
        sortProperty: 'name',
        sortDirection: 'DESC'
    };
    adapter.findByQuery(BD.store, App.Category, query, success, $.noop, $.noop);
});

asyncTest('`commitTransactionBulk` adds items not saved in the fixtures', function() {
    expect(1);
    var error = function() {};
    var data = { categories: [{name: 'Tesla'}, {name: 'Edison'}] };
    var success = function(payload) {
        equal(adapter.fixturesForType(App.Category).length, 4);
        start();
    };
    adapter.commitTransactionBulk(BD.store, App.Category, 'categories',
                                  data, success, error);
});

asyncTest('`commitTransactionBulk` updates items saved in the fixtures', function() {
    expect(2);
    var data = { categories: [{ id: 1, name: 'New Billy' }] };
    var success = function(payload) {
        var fixtures = adapter.fixturesForType(App.Category);
        equal(fixtures.length, 2);
        equal(fixtures[0].name, 'New Billy');
        start();
    };
    adapter.commitTransactionBulk(BD.store, App.Category, 'categories',
                                  data, success, $.noop);
});

asyncTest('`commitTransactionBulk` calls success with a payload', function() {
    expect(1);
    var success = function(payload) {
        ok(payload.hasOwnProperty('meta'));
        start();
    };
    var data = { categories: [] };
    adapter.commitTransactionBulk(BD.store, App.Category, 'categories',
                                  data, success, $.noop, $.noop);
});
