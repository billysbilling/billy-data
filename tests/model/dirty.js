QUnit.module('BD.Model - dirty', {
    setup: function() {
        App.Post = BD.Model.extend({
            title: BD.attr('string'),
            date: BD.attr('date')
        });
    },
    teardown: function() {
        BD.store.reset();
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