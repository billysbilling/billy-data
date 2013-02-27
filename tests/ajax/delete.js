module('Ajax delete', {
    setup: function() {
        App.Post = BD.Model.extend({
            title: BD.attr('string'),
            comments: BD.hasMany('App.Comment', 'post')
        });
        App.Comment = BD.Model.extend({
            post: BD.belongsTo('App.Post', {isParent: true}),
            text: BD.attr('string')
        });
        BD.store.loadMany(App.Post, [
            {
                id: 101,
                title: 'Delete yes, yes'
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

test('Test ajax request options', function() {
    expect(2);
    BD.ajax = function(hash) {
        equal(hash.type, 'DELETE');
        equal(hash.url, '/posts/101');
    };
    var post = App.Post.find(101);
    post.deleteRecord();
    flushAjax();
});

test('Other records that were also deleted by the API should be removed from the store', function() {
    fakeAjaxSuccess({
        meta: {
            success: true,
            statusCode: 200,
            deletedRecords: {
                comments: [
                    201,
                    202
                ]
            }
        }
    });
    var post = App.Post.find(101);
    post.deleteRecord();
    flushAjax();
    equal(BD.store.recordForTypeAndId(App.Post, 101), null, 'Post should have been deleted');
    equal(BD.store.recordForTypeAndId(App.Comment, 201), null, 'Comment should have been deleted');
    equal(BD.store.recordForTypeAndId(App.Comment, 202), null, 'Comment should have been deleted');
});