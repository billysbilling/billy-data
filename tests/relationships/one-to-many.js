module('Billy Data one-to-many relationships', {
    setup: function() {
        App.Category = BD.Model.extend({
            name: BD.attr('string'),
            posts: BD.hasMany('App.Post', 'category')
        });
        App.Post = BD.Model.extend({
            category: BD.belongsTo('App.Category', {parent: true}),
            author: BD.attr('string'),
            isPublic: BD.attr('boolean')
        });
        BD.store.loadMany(App.Category, [
            {
                id: 201,
                name: 'Tech',
                postIds: []
            },
            {
                id: 202,
                name: 'Business',
                postIds: []
            }
        ]);
        BD.store.loadMany(App.Post, [
            {
                id: 1,
                categoryId: 201
            }
        ]);
    },
    teardown: function() {
        BD.store.reset();
    }
});

test('Many arrays should update when child record changes its parent', function() {
    var tech = App.Category.find(201);
    var biz = App.Category.find(202);
    var post = App.Post.find(1);
    equal(tech.get('posts.length'), 1, 'Tech should have one post');
    equal(tech.get('posts.firstObject.clientId'), post.get('clientId'), 'The post should be correct');
    equal(biz.get('posts.length'), 0, 'Business should not have any posts');
    equal(post.get('category'), tech, 'Post category should match');
    post.set('category', biz);
    equal(tech.get('posts.length'), 0, 'Tech should have not have any posts');
    equal(biz.get('posts.length'), 1, 'Business should one post');
    equal(biz.get('posts.firstObject.clientId'), post.get('clientId'), 'The post should be correct');
    equal(post.get('category'), biz, 'Post category should match');
    post.rollback();
    equal(tech.get('posts.length'), 1, 'Tech should have one post');
    equal(biz.get('posts.length'), 0, 'Business should not have any posts');
});

test('When deleting a child record, it should be removed from the parent', function() {
    var tech = App.Category.find(201);
    var post = App.Post.find(1);
    fakeAjaxSuccess();
    post.deleteRecord();
    equal(tech.get('posts.length'), 0, 'Tech should not have anymore posts now');
});

test('When loading a child record, its parent should be updated', function() {
    var tech = App.Category.find(201);
    var biz = App.Category.find(202);
    var post = App.Post.find(1);
    BD.store.load(App.Post, {
        id: 1,
        categoryId: 202
    });
    equal(tech.get('posts.length'), 0, 'Tech should not have anymore posts now');
    equal(biz.get('posts.length'), 1, 'Business should have the post now');
});