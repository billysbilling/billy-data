module('BD.Model', {
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
    expect(0);
    var post = App.Post.load({
        id: 1
    });
    post.promise.then(function() {
        start();
    })
});