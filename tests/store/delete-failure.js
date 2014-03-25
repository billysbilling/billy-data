var post1, post2, post3, post4;

QUnit.module('Delete failure', {
    setup: function() {
        App.Post = BD.Model.extend({
            parent: BD.belongsTo('App.Post'),
            title: BD.attr('string'),
            state: BD.attr('string'),
            children: BD.hasMany('App.Post', 'parent', {sortProperty: 'title', sortDirection: 'ASC'})
        });
        App.Post.reopenClass({
            supportsBulkDelete: true
        });
        post1 = BD.store.load(App.Post, {
            id: 101,
            title: 'Dirty secrets'
        });
        post2 = BD.store.load(App.Post, {
            id: 102,
            title: 'Testacular sounds like Testicular'
        });
        post3 = BD.store.load(App.Post, {
            parentId: 101,
            id: 201,
            title: 'Why you should do this'
        });
        post4 = BD.store.load(App.Post, {
            parentId: 101,
            id: 202,
            title: 'Why you should not'
        });
    },
    teardown: function() {
        BD.store.reset();
    }
});

asyncTest('DELETE failure', function() {
    expect(5);
    var req = fakeAjax(422, {
        meta: {
            success: false,
            statusCode: 422
        }
    });
    post1
        .deleteRecord()
        .error(function() {
            ok(true, 'Error should be fired once');
        });
    equal(post1.get('isDirty'), true);
    equal(post1.get('isDeleted'), true);
    req.respond();
    equal(post1.get('isDirty'), false);
    equal(post1.get('isDeleted'), false);
    start();
});

asyncTest('Bulk DELETE failure', function() {
    expect(9);
    var req = fakeAjax(422, {
        meta: {
            success: false,
            statusCode: 422
        }
    });
    BD
        .deleteRecords([post1, post2])
        .error(function() {
            ok(true, 'Error should be fired once');
        });
    equal(post1.get('isDirty'), true);
    equal(post2.get('isDirty'), true);
    equal(post1.get('isDeleted'), true);
    equal(post2.get('isDeleted'), true);
    req.respond();
    equal(post1.get('isDirty'), false);
    equal(post2.get('isDirty'), false);
    equal(post1.get('isDeleted'), false);
    equal(post2.get('isDeleted'), false);
    start();
});

asyncTest('DELETE failure with relationships', function() {
    fakeAjax(200, {
        posts: [
            {
                id: 101,
                title: 'Dirty secrets'
            },
            {
                id: 102,
                title: 'Testacular sounds like Testicular'
            },
            {
                parentId: 101,
                id: 201,
                title: 'Why you should do this'
            },
            {
                parentId: 101,
                id: 202,
                title: 'Why you should not'
            }
        ]
    });
    var children = post1.get('children');
    expect(15);
    var req = fakeAjax(422, {
        meta: {
            success: false,
            statusCode: 422
        }
    });
    BD
        .deleteRecords([post3, post4])
        .error(function() {
            ok(true, 'Error should be fired once');
        });
    equal(post3.get('isDirty'), true);
    equal(post4.get('isDirty'), true);
    equal(post3.get('isDeleted'), true);
    equal(post4.get('isDeleted'), true);
    equal(post3.get('parent'), null);
    equal(post4.get('parent'), null);
    equal(children.length, 0);
    req.respond();
    equal(post3.get('isDirty'), false);
    equal(post4.get('isDirty'), false);
    equal(post3.get('isDeleted'), false);
    equal(post4.get('isDeleted'), false);
    equal(post3.get('parent'), post1);
    equal(post4.get('parent'), post1);
    equal(children.length, 2);
    start();
});
