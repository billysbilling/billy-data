var parentRecord,
    child1,
    child2;

QUnit.module('One-to-many relationships', {
    setup: function() {
        App.Person = BD.Model.extend({
            parent: BD.belongsTo('App.Person', {isParent: true}),
            age: BD.attr('number'),
            children: BD.hasMany('App.Person', 'parent', {sortProperty: 'age', sortDirection: 'DESC'})
        });

        parentRecord = App.Person.createRecord({
        });

        child1 = App.Person.createRecord({
            parent: parentRecord,
            age: 12
        });

        child2 = App.Person.createRecord({
            parent: parentRecord,
            age: 17
        });
    },
    teardown: function() {
        BD.store.reset();
    }
});

test('Has-many sorting', function() {
    var children = parentRecord.get('children');
    
    strictEqual(children.objectAt(0), child2);
    strictEqual(children.objectAt(1), child1);
    
    child1.set('age', 108);
    strictEqual(children.objectAt(0), child1);
    strictEqual(children.objectAt(1), child2);
});