//Should it remove all listeners on reset?

QUnit.module('BD.Store events', {
    setup: function() {
        App.CoolPerson = BD.Model.extend({
            name: BD.attr('string')
        });
        App.CoolPerson.reopenClass({
            supportsBulkSave: true
        });
        App.BlogPost = BD.Model.extend({
            title: BD.attr('string')
        });
        BD.store.loadMany(App.CoolPerson, [
            {
                id: 101,
                name: 'John'
            },
            {
                id: 102,
                name: 'Jane'
            }
        ]);
    },
    teardown: function() {
        BD.store.reset();
    }
});

test('BD.store.reset removes all listeners', function() {
    var calls = 0;
    
    BD.store.on('cool-person-created', function(r) {
        calls++;
    });
    
    BD.store.reset();

    var req = fakeAjax(200);
    App.CoolPerson.createRecord({
        name: 'Henry'
    })
        .save();
    req.respond();
    
    equal(calls, 0);
});

test('Emits event when created', function() {
    expect(1);

    var r = App.CoolPerson.createRecord({
        name: 'Henry'
    });

    var req = fakeAjax(200);

    r.save();

    BD.store.on('cool-person-created', function(r) {
        equal(r.get('name'), 'Henry');
    });

    req.respond();
});

test('Emits event when updated', function() {
    expect(1);

    var r = App.CoolPerson.find(101);
    r.set('name', 'John Dingo');

    var req = fakeAjax(200);

    r.save();

    BD.store.on('cool-person-updated', function(r) {
        equal(r.get('name'), 'John Dingo');
    });

    req.respond();
});

test('Emits updated events when save response contains updated records', function() {
    expect(1);

    var r = App.CoolPerson.find(101);
    r.set('name', 'John Dingo');

    var req = fakeAjax(200, {
        blogPosts: [
            {
                id: 201,
                title: 'Hello Jupiter'
            }
        ]
    });

    r.save();

    BD.store.on('blog-post-updated', function(r) {
        equal(r.get('title'), 'Hello Jupiter');
    });

    req.respond();
});

test('Emits deleted events when save response contains deleted records', function() {
    expect(1);

    var r = App.CoolPerson.find(101);
    r.set('name', 'John Dingo');

    var req = fakeAjax(200, {
        meta: {
            deletedRecords: {
                coolPersons: [
                    102
                ]
            }
        }
    });

    r.save();

    BD.store.on('cool-person-deleted', function(r) {
        equal(r.get('name'), 'Jane');
    });

    req.respond();
});

test('Emits created/updated events with transaction', function() {
    expect(2);

    BD.store.on('cool-person-created', function(r) {
        equal(r.get('name'), 'Henry');
    });
    BD.store.on('cool-person-updated', function(r) {
        equal(r.get('name'), 'John Dingo');
    });

    var r1 = App.CoolPerson.find(101);
    r1.set('name', 'John Dingo');

    var r2 = App.CoolPerson.createRecord({
        name: 'Henry'
    });

    var req = fakeAjax(200);
    BD.transaction()
        .add(r1)
        .add(r2)
        .commit();
    req.respond();
});

test('Emits event when deleted', function() {
    expect(1);

    var r = App.CoolPerson.find(101);

    var req = fakeAjax(200);

    r.deleteRecord();

    BD.store.on('cool-person-deleted', function(r) {
        equal(r.get('name'), 'John');
    });

    req.respond();
});

test('Emits event with multi delete', function() {
    var deletedNames = [];

    var req = fakeAjax(200);

    BD.store.deleteRecords([App.CoolPerson.find(101), App.CoolPerson.find(102)]);
    
    BD.store.on('cool-person-deleted', function(r) {
        deletedNames.push(r.get('name'));
    });

    req.respond();
    
    deepEqual(deletedNames, ['John', 'Jane']);
});

test('off removes listener', function() {
    var calls = 0;
    var listener = function() {
        calls++;
    };
    BD.store.on('cool-person-deleted', listener);
    BD.store.off('cool-person-deleted', listener);

    var req = fakeAjax(200);
    App.CoolPerson.find(101).deleteRecord();
    req.respond();

    equal(calls, 0);
});

test('one only calls listener once', function() {
    var calls = 0;
    var listener = function() {
        calls++;
    };
    BD.store.one('cool-person-deleted', listener);

    var req = fakeAjax(200);
    App.CoolPerson.find(101).deleteRecord();
    req.respond();

    var req2 = fakeAjax(200);
    App.CoolPerson.find(102).deleteRecord();
    req2.respond();

    equal(calls, 1);
});