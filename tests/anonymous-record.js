module('BD.AnonymousRecord', {
    setup: function() {
        App.Post = BD.Model.extend({
            title: BD.attr('string')
        });
        BD.store.loadMany(App.Post, [
            {
                id: 101,
                title: 'Milk is for babies'
            }
        ]);
    },
    teardown: function() {
        BD.store.reset();
    }
});

test('Sends correct AJAX options', function() {
    expect(4);
    var r = BD.AnonymousRecord.createRecord({
        name: 'Arnold',
        isBig: true
    });
    BD.ajax = function(hash) {
        equal(hash.type, 'POST');
        equal(hash.url, '/stories/milk');
        deepEqual(hash.data, {
            record: {
                name: 'Arnold',
                isBig: true
            }
        });
    };
    var ret = r.save('/stories/milk');
    ok(ret instanceof BD.ModelOperationPromise);
});

test('Sends correct AJAX options with model', function() {
    expect(3);
    var r = BD.AnonymousRecord.createRecord({
        post: App.Post.find(101)
    });
    BD.ajax = function(hash) {
        equal(hash.type, 'POST');
        equal(hash.url, '/stories/milk');
        deepEqual(hash.data, {
            record: {
                postId: 101
            }
        });
    };
    r.save('/stories/milk', {
        models: ['post']
    });
});

test('Sends correct AJAX options with null model', function() {
    expect(3);
    var r = BD.AnonymousRecord.createRecord({
        post: null
    });
    BD.ajax = function(hash) {
        equal(hash.type, 'POST');
        equal(hash.url, '/stories/milk');
        deepEqual(hash.data, {
            record: {
                postId: null
            }
        });
    };
    r.save('/stories/milk', {
        models: ['post']
    });
});