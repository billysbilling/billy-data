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

test('whenLoaded() with findByQuery() before loaded', function() {
    expect(1);
    fakeAjaxSuccess({
        posts: [
            {
                id: 999
            }
        ]
    });
    var posts = App.Post.findByQuery({
        something: 1
    });
    flushAjax();
    posts.whenLoaded(function() {
        equal(posts.get('length'), 1);
    });
});

test('whenLoaded() with findByQuery() after loaded', function() {
    expect(1);
    fakeAjaxSuccess({
        posts: [
            {
                id: 999
            }
        ]
    });
    var posts = App.Post.findByQuery({
        something: 1
    });
    posts.whenLoaded(function() {
        equal(posts.get('length'), 1);
    });
    flushAjax();
});

test('whenLoaded() with findMany() before loaded', function() {
    expect(1);
    fakeAjaxSuccess({
        posts: [
            {
                id: 999
            }
        ]
    });
    var posts = App.Post.findMany([999]);
    posts.whenLoaded(function() {
        equal(posts.get('length'), 1);
    });
    flushAjax();
});

test('whenLoaded() with findMany() after loaded', function() {
    expect(1);
    fakeAjaxSuccess({
        posts: [
            {
                id: 999
            }
        ]
    });
    var posts = App.Post.findMany([999]);
    flushAjax();
    posts.whenLoaded(function() {
        equal(posts.get('length'), 1);
    });
});

test('whenLoaded() with filter() local', function() {
    expect(1);
    App.Post.loadAll([]);
    var posts = App.Post.filter({
        query: {
            title: 'Dirty secrets'
        }
    });
    posts.whenLoaded(function() {
        equal(posts.get('length'), 1);
    });
});

test('whenLoaded() with filter() remote before loaded', function() {
    expect(1);
    fakeAjaxSuccess({
        posts: [
            {
                id: 999
            }
        ]
    });
    var posts = App.Post.filter({
        query: {
            title: 'Dirty secrets'
        }
    });
    posts.whenLoaded(function() {
        equal(posts.get('length'), 1);
    });
    flushAjax();
});

test('whenLoaded() with filter() remote after loaded', function() {
    expect(1);
    fakeAjaxSuccess({
        posts: [
            {
                id: 999
            }
        ]
    });
    var posts = App.Post.filter({
        query: {
            title: 'Dirty secrets'
        }
    });
    flushAjax();
    posts.whenLoaded(function() {
        equal(posts.get('length'), 1);
    });
});