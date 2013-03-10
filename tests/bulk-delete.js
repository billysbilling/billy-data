module('Bulk delete', {
    setup: function() {
        App.Post = BD.Model.extend({
            title: BD.attr('string'),
            state: BD.attr('string')
        });
        App.Post.reopenClass({
            supportsBulkDelete: true
        })
        BD.store.loadMany(App.Post, [
            {
                id: 101,
                title: 'Dirty secrets',
                state: 'hidden'
            },
            {
                id: 102,
                title: 'Testacular sounds like Testicular',
                state: 'hidden'
            }
        ]);
    },
    teardown: function() {
        BD.store.reset();
    }
});

test('Check AJAX options for bulk DELETE for model that supports bulk deletes', function() {
    expect(3);
    var post1 = App.Post.find(101);
    var post2 = App.Post.find(102);
    BD.ajax = function(hash) {
        equal(hash.type, 'DELETE');
        equal(hash.url, '/posts');
        deepEqual(hash.data, {
            ids: [101, 102]
        });
    };
    BD.deleteRecords([post1, post2]);
});

asyncTest('Bulk DELETE for model that supports bulk deletes', function() {
    expect(7);
    var post1 = App.Post.find(101);
    var post2 = App.Post.find(102);
    fakeAjaxSuccess();
    BD
        .deleteRecords([post1, post2])
        .success(function() {
            ok(true, 'Success should be fired once');
        });
    equal(post1.get('isDeleted'), true);
    equal(post2.get('isDeleted'), true);
    flushAjax();
    equal(post1.get('isUnloaded'), true);
    equal(post2.get('isUnloaded'), true);
    setTimeout(function() {
        equal(post1.get('isDestroyed'), true);
        equal(post2.get('isDestroyed'), true);
        start();
    }, 1);
});