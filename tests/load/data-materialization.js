module('Data materialization', {
    setup: function() {
        App.Post = BD.Model.extend({
            title: BD.attr('string'),
            comments: BD.hasMany('App.Comment', 'post')
        });
        App.Author = BD.Model.extend({
            name: BD.attr('string')
        });
        App.Comment = BD.Model.extend({
            post: BD.belongsTo('App.Post'),
            author: BD.belongsTo('App.Author'),
            text: BD.attr('string')
        });
        BD.store.loadMany(App.Post, [
            {
                id: 101,
                title: 'How to make this test work?'
            }
        ]);
        BD.store.loadMany(App.Author, [
            {
                id: 201,
                name: 'John'
            }
        ]);
    },
    teardown: function() {
        BD.store.reset();
    }
});

test('All attributes, belongsTo and hasMany should be setup before firing belongsToDidChange', function() {
    expect(2);
    var post = App.Post.find(101);
    fakeAjaxSuccess({
        comments: [
            {
                id: 301,
                postId: 101,
                authorId: 201,
                text: 'I agree!'
            }
        ]
    });
    var o = Ember.Object.extend({
        post: null,
        commentsDidChange: function() {
            var comment = this.get('post.comments.firstObject');
            equal(comment.get('author.id'), 201);
            equal(comment.get('text'), 'I agree!');
        }.observes('post.comments.@each')
    }).create({post: post});
    flushAjax();
});