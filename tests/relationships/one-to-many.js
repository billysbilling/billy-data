QUnit.module('One-to-many relationships', {
    setup: function() {
        App.Person = BD.Model.extend({
            parent: BD.belongsTo('App.Person', {isParent: true}),
            age: BD.attr('number'),
            children: BD.hasMany('App.Person', 'parent', {sortProperty: 'age', sortDirection: 'DESC'})
        });
        
        App.Person.loadAll([
            {
                id: 1,
                parentId: null,
                age: 42
            },
            {
                id: 2,
                parentId: 1,
                age: 12
            },
            {
                id: 3,
                parentId: 1,
                age: 17
            }
        ]);
    },
    teardown: function() {
        BD.store.reset();
    }
});

test('Has-many sorting', function() {
    var children = App.Person.find(1).get('children');

    deepEqual(children.mapBy('id'), [3, 2]);

    App.Person.find(2).set('age', 108);
    deepEqual(children.mapBy('id'), [2, 3]);
});

test('Has-many relationships not fire @each observers when loading the owner record', function() {
    expect(0);
    
    var r = App.Person.find(1);
    r.get('children'); //init property
    
    Em.addObserver(r, 'children.@each', function() {
        ok(false, 'Should not fire any observers when loaded');
    });
    
    Em.run(function() {
        App.Person.load({
            id: 1,
            age: 0
        });
    });
});