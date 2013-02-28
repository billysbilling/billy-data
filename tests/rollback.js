module('Rollback', {
    setup: function() {
        App.Post = BD.Model.extend({
            title: BD.attr('string'),
            date: BD.attr('date')
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

test('Test rollback', function() {
    var post = App.Post.find(101);
    post.set('title', 'Something new');
    post.set('date', moment('2013-12-24T00:00:00'));
    post.rollback();
    equal(post.get('title'), 'Dirty secrets', 'Title should have been rolled back');
    equal(post.get('date').format('YYYY-MM-DD'), '2013-02-14', 'Date should have been rolled back');
});