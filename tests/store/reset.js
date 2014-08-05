QUnit.module('BD.store.reset', {
    setup: function() {
        App.Person = BD.Model.extend({
            parent: BD.belongsTo('App.Person'),
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
            }
        ]);
    },
    teardown: function() {
        BD.store.reset();
    }
});

asyncTest('BD.store.reset works with deleted child records', function() {
    expect(0);

    var parent = App.Person.find(1),
        child = App.Person.find(2),
        req = fakeAjax(200, {});

    //Make sure children record-array has been initialized
    parent.get('children');

    parent.deleteRecord()
        .success(function() {
            //Wait a little, so the parent will be isDestroyed=true
            Em.run.next(function() {
                BD.store.reset();
                start();
            });
        });

    req.respond();
});
