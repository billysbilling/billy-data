module('loadAll()', {
    setup: function() {
        App.Post = BD.Model.extend({
            title: BD.attr('string')
        });
    },
    teardown: function() {
        BD.store.reset();
    }
});

test('loadAll() should update BD.allLoaded', function() {
    ok(!BD.get('loadedAll.posts'));
    App.Post.loadAll([]);
    ok(BD.get('loadedAll.posts'));
});