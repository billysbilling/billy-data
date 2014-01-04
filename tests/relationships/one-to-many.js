var parent,
    child1,
    child2;

QUnit.module('One-to-many relationships', {
    setup: function() {
        App.Person = BD.Model.extend({
            parent: BD.belongsTo('App.Person', {isParent: true}),
            age: BD.attr('number'),
            children: BD.hasMany('App.Person', 'parent', {sortProperty: 'age', sortDirection: 'DESC'})
        });

        parent = App.Person.createRecord({
        });

        child1 = App.Person.createRecord({
            parent: parent,
            age: 12
        });

        child2 = App.Person.createRecord({
            parent: parent,
            age: 17
        });
    },
    teardown: function() {
        BD.store.reset();
    }
});

test('Has-many sorting', function() {
    var children = parent.get('children');
    
    strictEqual(children.objectAt(0), child2);
    strictEqual(children.objectAt(1), child1);
    
    child1.set('age', 108);
    strictEqual(children.objectAt(0), child1);
    strictEqual(children.objectAt(1), child2);
});