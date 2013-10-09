QUnit.module('Data materialization', {
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

test('All attributes, belongsTo and hasMany should be setup before firing belongsToDidChange when loading child records from server', function() {
    expect(2);
    var post = App.Post.find(101);
    var req = fakeAjax(200, {
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
            equal(comment.get('author.id'), 201, 'Author should match');
            equal(comment.get('text'), 'I agree!', 'Text should match');
        }.observes('post.comments.@each')
    }).create({post: post});
    post.get('comments');
    req.respond();
    o.destroy();
});

test('All attributes, belongsTo and hasMany should be setup before firing belongsToDidChange when creating new record', function() {
    expect(2);
    var post = App.Post.find(101);
    var author = App.Author.find(201);
    //First make sure that comments are loaded, and are empty
    var req = fakeAjax(200, {
        comments: []
    });
    post.get('comments');
    req.respond();
    //Then do the real test
    var o = Ember.Object.extend({
        post: null,
        commentsDidChange: function() {
            var comment = this.get('post.comments.firstObject');
            equal(comment.get('author.id'), 201, 'Author should match');
            equal(comment.get('text'), 'I agree!', 'Text should match');
        }.observes('post.comments.@each')
    }).create({post: post});
    App.Comment.createRecord({
        post: post,
        author: author,
        text: 'I agree!'
    });
    o.destroy();
});