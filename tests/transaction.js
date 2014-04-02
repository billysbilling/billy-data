QUnit.module('Transaction', {
    setup: function() {
        App.Post = BD.Model.extend({
            title: BD.attr('string'),
            state: BD.attr('string')
        });
        App.Post.reopenClass({
            supportsBulkSave: true
        });
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

test('Check AJAX options for transaction for model that supports bulk updates', function() {
    expect(3);
    var post1 = App.Post.find(101);
    var post2 = App.Post.find(102);
    BD.ajax = function(hash) {
        equal(hash.type, 'PATCH');
        equal(hash.url, '/posts');
        deepEqual(JSON.parse(hash.data), {
            posts: [
                {
                    _clientId: post1.clientId,
                    id: 101,
                    state: 'public'
                },
                {
                    _clientId: post2.clientId,
                    id: 102,
                    state: 'public'
                }
            ]
        });
    };
    BD.transaction()
        .add(post1, {
            properties: {
                state: 'public'
            }
        })
        .add(post2, {
            properties: {
                state: 'public'
            }
        })
        .commit();
});

test('Transaction for model that supports bulk updates', function() {
    expect(9);
    var post1 = App.Post.find(101);
    var post2 = App.Post.find(102);
    var req = fakeAjax(200);
    BD.transaction()
        .add(post1, {
            properties: {
                state: 'public'
            }
        })
        .add(post2, {
            properties: {
                state: 'public'
            }
        })
        .commit()
        .success(function() {
            ok(true, 'Success should be fired once');
        });
    equal(post1.get('isDirty'), false);
    equal(post1.get('state'), 'hidden');
    equal(post2.get('isDirty'), false);
    equal(post2.get('state'), 'hidden');
    req.respond();
    equal(post1.get('isDirty'), false);
    equal(post1.get('state'), 'public');
    equal(post2.get('isDirty'), false);
    equal(post2.get('state'), 'public');
});

test('saveRecords() transaction shortcut', function() {
    expect(9);
    var post1 = App.Post.find(101);
    var post2 = App.Post.find(102);
    var req = fakeAjax(200);
    BD
        .saveRecords([post1, post2], {
            properties: {
                state: 'public'
            }
        })
        .success(function() {
            ok(true, 'Success should be fired once');
        });
    equal(post1.get('isDirty'), false);
    equal(post1.get('state'), 'hidden');
    equal(post2.get('isDirty'), false);
    equal(post2.get('state'), 'hidden');
    req.respond();
    equal(post1.get('isDirty'), false);
    equal(post1.get('state'), 'public');
    equal(post2.get('isDirty'), false);
    equal(post2.get('state'), 'public');
});