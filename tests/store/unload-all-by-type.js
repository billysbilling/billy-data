QUnit.module('BD.store.unloadAllByType', {
    setup: function() {
        App.Person = BD.Model.extend({
            name: BD.attr('string')
        });
        App.Hobby = BD.Model.extend({
            name: BD.attr('string')
        });
        BD.store.loadMany(App.Person, [
            {
                id: 101,
                name: 'John'
            },
            {
                id: 102,
                name: 'Arnold'
            }
        ]);
        BD.store.loadMany(App.Hobby, [
            {
                id: 201,
                name: 'Stamp collecting'
            },
            {
                id: 202,
                name: 'Trainspotting'
            }
        ]);
    },
    teardown: function() {
        BD.store.reset();
    }
});

test('Test unloadAllByType', function() {
    var person1 = App.Person.load(101);
    var person2 = App.Person.load(102);
    BD.store.unloadAllByType(App.Person);
    ok(person1.get('isDestroying'), 'Person 1 should be destroyed');
    ok(person2.get('isDestroying'), 'Person 2 should be destroyed');
    equal(App.Person.allLocal().get('length'), 0, 'No people should be in store');
    equal(App.Hobby.allLocal().get('length'), 2, 'Hobbies should still be in store');
});
