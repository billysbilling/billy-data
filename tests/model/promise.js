QUnit.module('BD.Model', {
    setup: function() {
        App.Post = BD.Model.extend({
            title: BD.attr('string'),
            date: BD.attr('date')
        });
    },
    teardown: function() {
        BD.store.reset();
    }
});

asyncTest('Promise of loaded record should be resolved', function() {
    expect(1);
    var post = App.Post.load({
        id: 1
    });
    post.promise.then(function(resolvedPost) {
        strictEqual(resolvedPost, post, 'Should resolve with the post as the value');
        start();
    }, function() {
        ok(false, 'Should not be rejected');
    })
});

asyncTest('Promise of not found record should be rejected', function() {
    expect(1);
    var req = fakeAjax(404);
    var post = App.Post.find(1);
    req.respond()
    post.promise.then(function() {
        ok(false, 'Should not be resolved');
    }, function(e) {
        ok(e instanceof Error);
        start();
    })
});