module('findByQuery()', {
    setup: function() {
        App.Post = BD.Model.extend({
            title: BD.attr('string')
        });
    },
    teardown: function() {
        BD.store.reset();
    }
});

test('findByQuery() should return a record array that has a `query` property.', function() {
    var req = fakeAjax(200);
    var records = App.Post.findByQuery({
        something: 123
    });
    deepEqual(records.get('query'), {something: 123});
    req.respond();
});

test('find() should request all records', function() {
    expect(2);
    BD.ajax = function(hash) {
        equal(hash.type, 'GET');
        equal(hash.url, '/posts');
    };
    App.Post.find();
});

asyncTest('should support being destroyed before finishing loading', function() {
    expect(0);
    var req = fakeAjax(200);
    var posts = App.Post.find();
    posts.destroy();
    Em.run.next(function() {
        req.respond();
        start();
    }, 0);
});
