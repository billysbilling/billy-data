QUnit.module('BD.Model - errors', {
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

test('Should always have `errors`', function() {
    var post = App.Post.load({
        id: 1
    });
    post.set('errors.title', 'This is wrong.');
    equal(post.get('errors.title'), 'This is wrong.');
});