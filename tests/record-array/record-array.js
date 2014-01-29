QUnit.module('RecordArray', {
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
    var req1 = fakeAjax(200, {
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
    });
    var posts1 = App.Post.find({
        something: 1
    });
    req1.respond();
    var req2 = fakeAjax(200, {
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
    });
    var posts2 = App.Post.find({
        somethingElse: 1
    });
    req2.respond();
    equal(posts1.get('length'), 2, 'Before deleting, there should be two posts in posts1');
    equal(posts2.get('length'), 2, 'Before deleting, there should be two posts in posts2');
    var post1 = App.Post.find(1);
    var post2 = App.Post.find(2);
    var post3 = App.Post.find(3);
    var req3 = fakeAjax(200);
    post1.deleteRecord();
    req3.respond();
    equal(posts1.get('length'), 1, 'After deleting, there should be one post in posts1');
    equal(posts1.get('firstObject'), post2, 'The only object in posts1 is post2');
    equal(posts2.get('length'), 1, 'After deleting, there should be one post in posts2');
    equal(posts2.get('firstObject'), post3, 'The only object in posts2 is post3');
});

test('When destroying a record array it should be removed from all records', function() {
    var post;
    Ember.run(function() {
        App.Post.loadAll([]);
        post = App.Post.find(101);
        var posts = App.Post.all();
        var expected = {};
        expected[Em.guidFor(posts)] = posts;
        deepEqual(post._inRecordArrays, expected, 'Post knows about its record array');
        posts.destroy();
    });
    Ember.run(function() {
        deepEqual(post._inRecordArrays, {}, 'Post no longer knows about its record array');
    });
});

test('Record arrays should be destroyed on reset', function() {
    expect(3);
    var publicPosts;
    Ember.run(function() {
        App.Post.loadAll([]);
        publicPosts = App.Post.filter({
            query: {
                isPublic: true
            }
        });
        equal(publicPosts.get('isDestroyed'), false, 'Record array should not be destroyed');
        BD.store.reset();
        equal(publicPosts.get('isDestroying'), true, 'Record array should be destroying');
    });
    Ember.run(function() {
        equal(publicPosts.get('isDestroyed'), true, 'Record array should be destroyed');
    });
});

test('Record arrays should be removed from store when destroyed', function() {
    Ember.run(function() {
        App.Post.loadAll([]);
        var publicPosts = App.Post.filter({
            query: {
                isPublic: true
            },
            comparator: 'isPublic'
        });
        var expectedRecordArrays = {};
        expectedRecordArrays[Em.guidFor(publicPosts)] = publicPosts;
        deepEqual(BD.store._recordArrays, expectedRecordArrays, 'There should be one record array');
        deepEqual(BD.store._typeMapFor(App.Post).recordArrayQueryObservers.isPublic, expectedRecordArrays, 'There should be one query observer');
        deepEqual(BD.store._typeMapFor(App.Post).recordArrayComparatorObservers.isPublic, expectedRecordArrays, 'There should be one comparator observer');
        publicPosts.destroy();
    });
    Ember.run(function() {
        deepEqual(BD.store._recordArrays, {}, 'There should not be any record arrays');
        deepEqual(BD.store._typeMapFor(App.Post).recordArrayQueryObservers.isPublic, {}, 'There should not be any query observers left');
        deepEqual(BD.store._typeMapFor(App.Post).recordArrayComparatorObservers.isPublic, {}, 'There should not be any comparator observers left');
    });
});