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

test('findByQuery() should return a record array that has a `query` and `url` property.', function() {
    var req = fakeAjax(200);
    var records = App.Post.findByQuery({
        something: 123
    });
    deepEqual(records.get('query'), {something: 123});
    equal(records.get('url'), 'posts');
    req.respond();
});

test('findByUrl() should return a record array that has a `query` and `url` property.', function() {
    var req = fakeAjax(200);
    var records = App.Post.findByUrl('weirdurl', {
        something: 123
    });
    deepEqual(records.get('query'), {something: 123});
    equal(records.get('url'), 'weirdurl');
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
