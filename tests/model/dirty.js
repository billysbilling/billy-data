var originalAjax = BD.ajax;

QUnit.module('BD.Model - dirty', {
    setup: function() {
        App.Post = BD.Model.extend({
            title: BD.attr('string'),
            date: BD.attr('date')
        });
    },
    teardown: function() {
        BD.store.reset();
        BD.ajax = originalAjax;
    }
});

test('New record can be set as clean', function() {
    var post = App.Post.createRecord({
        title: 'Hey hey'
    });
    ok(post.get('isDirty'));
    post.resetClean();
    ok(!post.get('isDirty'));
});

test('Existing record can not be set as clean', function() {
    var post = App.Post.load({
        id: 1,
        title: 'Hey hey'
    });
    ok(!post.get('isDirty'));
    
    throws(function() {
        post.resetClean();
    }, /Existing records can not be reset to clean/);
});

test('Record that was called resetClean() on still saves itself', function() {
    expect(1);
    var post = App.Post.createRecord({
        title: 'Hey hey'
    });
    post.resetClean();
    BD.ajax = function() {
        ok(1);
    };
    post.save();
});

test('Record that was called resetClean() on still deletes itself on rollback', function() {
    var post = App.Post.createRecord({
        title: 'Hey hey'
    });
    post.resetClean();
    post.rollback();
    ok(post.get('isDeleted'), 'record should be deleted');
    ok(post.get('isDestroying'), 'record should be scheduled for destroy');
});