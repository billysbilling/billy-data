module('allLocal()', {
    setup: function() {
        App.Post = BD.Model.extend({
            title: BD.attr('string')
        });
        BD.store.loadMany(App.Post, [
            {
                id: 101,
                title: 'How to make this test work?'
            },
            {
                id: 102,
                title: 'Bananas'
            }
        ]);
    },
    teardown: function() {
        BD.store.reset();
    }
});

test('allLocal() should return all local records', function() {
    var records = App.Post.allLocal();
    equal(records.get('length'), 2);
    deepEqual(records.mapProperty('id'), [101, 102]);
});