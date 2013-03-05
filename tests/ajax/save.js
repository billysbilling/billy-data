module('Ajax save', {
    setup: function() {
        App.Post = BD.Model.extend({
            title: BD.attr('string'),
            comments: BD.hasMany('App.Comment', 'post', {isEmbedded: true})
        });
        App.Comment = BD.Model.extend({
            post: BD.belongsTo('App.Post', {isParent: true}),
            text: BD.attr('string')
        });
        BD.store.loadMany(App.Post, [
            {
                id: 101,
                title: 'This is a good day to live'
            }
        ]);
        BD.store.loadMany(App.Comment, [
            {
                id: 201,
                postId: 101,
                text: 'I agree!'
            },
            {
                id: 202,
                postId: 101,
                text: 'I disagree!'
            }
        ]);
    },
    teardown: function() {
        
        BD.store.reset();
    }
});

test('Test PUT ajax request options', function() {
    expect(3);
    var post = App.Post.find(101);
    BD.ajax = function(hash) {
        equal(hash.type, 'PUT');
        equal(hash.url, '/posts/101');
        deepEqual(hash.data, {
            post: {
                _clientId: post.clientId,
                id: 101,
                title: 'This is a good day to die'
            }
        });
    };
    post.set('title', 'This is a good day to die');
    post.save();
});

test('Test PUT', function() {
    var post = App.Post.find(101);
    fakeAjaxSuccess();
    post.set('title', 'This is a good day to die');
    equal(post.get('isDirty'), true);
    post.save();
    flushAjax();
    equal(post.get('isDirty'), false);
    equal(post.get('title'), 'This is a good day to die');
});