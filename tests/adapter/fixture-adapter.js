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
        App.Category.FIXTURES = [
            {
                id: 1,
                name: 'Billy'
            },
            {
                id: 2,
                name: 'Noah'
            }
        ];
    },

    teardown: function() {
        BD.store.set('adapter', oldAdapter);
        BD.store.reset();
        App.Category = null;
    }

});

test('`load` persists the data in the fixtures', function() {
    App.Category.FIXTURES = [];
    App.Category.load({
        id: 3,
        name: 'Sebastian'
    });
    equal(App.Category.FIXTURES.length, 1);
    equal(App.Category.FIXTURES[0].id, 3);
    equal(App.Category.FIXTURES[0].name, 'Sebastian');
});

asyncTest('`deleteRecords` deletes multiple records', function() {
    var records = [App.Category.find(1), App.Category.find(2)];
    var success = function(payload) {
        var fixtures = Ember.A(App.Category.FIXTURES);
        var category1 = fixtures.find(function(item) { return item.id == 1 });
        var category2 = fixtures.find(function(item) { return item.id == 2 });
        equal(fixtures.length, 0)
        equal(category1, null);
        equal(category2, null);
        start();
    };
    adapter.deleteRecords(BD.store, App.Category, records, success, $.noop);
});

asyncTest('`deleteRecord` deletes the record', function() {
    var category = App.Category.find(1);
    var success = function(payload) {
        var fixtures = Ember.A(App.Category.FIXTURES);
        var fixture = fixtures.find(function(item) { return item.id == 1 });
        equal(fixtures.length, 1)
        equal(fixture, null);
        start();
    };
    adapter.deleteRecord(BD.store, category, 1, success, $.noop);
});

asyncTest('`findOne` should return the found model', function() {
    var category = App.Category.createRecord();
    var success = function(payload) {
        equal(payload.category.name, 'Billy');
        start();
    };
    adapter.findOne(BD.store, App.Category, category, 1, {}, success, $.noop);
});

asyncTest('`saveRecord` adds one item when fixtures are empty', function() {
    expect(3);
    App.Category.FIXTURES = [];
    var success = function(payload) {
        equal(App.Category.FIXTURES.length, 1);

        var category = App.Category.FIXTURES[0];
        equal(category.id, 1);
        equal(category.name, 'Adam');
        start();
    };
    var error = function() {};
    var record = App.Category.createRecord({ name: 'Adam' });
    var data = {};
    data[BD.store._rootForType(record.constructor)] = record.serialize();
    adapter.saveRecord(BD.store, record, data, success, error);
});

asyncTest('`saveRecord` adds one item when we fixtures exist', function() {
    expect(1);
    var oldLength = App.Category.FIXTURES.length;
    var success = function(payload) {
        equal(App.Category.FIXTURES.length, oldLength + 1);
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

asyncTest('`reset` resets the fixtures to the original content', function() {
    expect(1);
    var oldLength = App.Category.FIXTURES.length;
    var data = { categories: [{name: 'Tesla'}, {name: 'Edison'}] };
    var success = function(payload) {
        adapter.reset(BD.store, App.Category, function() {
            equal(App.Category.FIXTURES.length, 2);
            start();
        });
    };
    adapter.commitTransactionBulk(BD.store, App.Category, 'categories',
                                  data, success, $.noop);
});

asyncTest('`findByQuery` calls success with a filtered payload and ignores pageSize and offset', function() {
    expect(3);
    var success = function(payload) {
        equal(payload.categories.length, 1);
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

asyncTest('`commitTransactionBulk` adds items not saved in the fixtures', function() {
    expect(1);
    var oldLength = App.Category.FIXTURES.length;
    var error = function() {};
    var data = { categories: [{name: 'Tesla'}, {name: 'Edison'}] };
    var success = function(payload) {
        equal(App.Category.FIXTURES.length, oldLength + 2);
        start();
    };
    adapter.commitTransactionBulk(BD.store, App.Category, 'categories',
                                  data, success, error);
});

asyncTest('`commitTransactionBulk` updates items saved in the fixtures', function() {
    expect(2);
    var oldLength = App.Category.FIXTURES.length;
    var data = { categories: [{ id: 1, name: 'New Billy' }] };
    var success = function(payload) {
        equal(App.Category.FIXTURES.length, oldLength);
        equal(App.Category.FIXTURES[0].name, 'New Billy');
        start();
    };
    adapter.commitTransactionBulk(BD.store, App.Category, 'categories',
                                  data, success, $.noop);
});

asyncTest('`commitTransactionBulk` calls success with a payload', function() {
    expect(1);
    var record = App.Category.find(1);
    var success = function(payload) {
        ok(payload.hasOwnProperty('meta'));
        start();
    };
    var data = { categories: [] };
    adapter.commitTransactionBulk(BD.store, App.Category, 'categories',
                                  data, success, $.noop, $.noop);
});
