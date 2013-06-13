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

test('loadAll() should throw error with blank payload', function() {
    throws(
        function() {
            App.Post.loadAll();
        },
        /You must pass an array when using loadAll\./,
        "throws with just a message, no expected"
    );
});