module('RecordArray', {
    setup: function() {
        App.Post = BD.Model.extend({
            title: BD.attr('string')
        });
        BD.store.loadMany(App.Post, [
            {
                id: 101,
                title: 'Dirty secrets',
                date: '2013-02-14T00:00:00'
            }
        ]);
    },
    teardown: function() {
        BD.store.reset();
    }
});

test('When deleting a record, it should be removed from all record arrays containing it', function() {
    fakeAjaxSuccess({
        posts: [
            {
                id: 1,
                title: 'Hello'
            },
            {
                id: 2,
                title: 'Hey'
            }
        ]
    })
    var posts1 = App.Post.find({
        something: 1
    });
    flushAjax();
    fakeAjaxSuccess({
        posts: [
            {
                id: 1,
                title: 'Hello'
            },
            {
                id: 3,
                title: 'Howdy'
            }
        ]
    })
    var posts2 = App.Post.find({
        somethingElse: 1
    });
    flushAjax();
    equal(posts1.get('length'), 2, 'Before deleting, there should be two posts in posts1');
    equal(posts2.get('length'), 2, 'Before deleting, there should be two posts in posts2');
    var post1 = App.Post.find(1);
    var post2 = App.Post.find(2);
    var post3 = App.Post.find(3);
    fakeAjaxSuccess();
    post1.deleteRecord();
    flushAjax();
    equal(posts1.get('length'), 1, 'After deleting, there should be one post in posts1');
    equal(posts1.get('firstObject'), post2, 'The only object in posts1 is post2');
    equal(posts2.get('length'), 1), 'After deleting, there should be one post in posts2';
    equal(posts2.get('firstObject'), post3, 'The only object in posts2 is post3');
});

test('When destroying a record array it should be removed from all records', function() {
    var post = App.Post.find(101);
    var posts = App.Post.all();
    var expected = {};
    expected[Em.guidFor(posts)] = posts;
    deepEqual(post.inRecordArrays, expected, 'Post knows about its record array');
    posts.destroy();
    deepEqual(post.inRecordArrays, {}, 'Post no longer knows about its record array');
});