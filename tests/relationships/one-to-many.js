var Post,
    Category;

module('Billy Data one-to-many relationships', {
    setup: function() {
        Category = BD.Model.extend({
            name: BD.attr('string')
        });
        Post = BD.Model.extend({
            category: BD.belongsTo(Category, {parent: true}),
            author: BD.attr('string'),
            isPublic: BD.attr('boolean')
        });
        Category.reopen({
            posts: BD.hasMany(Post, 'category')
        });
        BD.store.loadMany(Category, [
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
        BD.store.loadMany(Post, [
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
    var tech = Category.find(201);
    var biz = Category.find(202);
    var post = Post.find(1);
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
    var tech = Category.find(201);
    var post = Post.find(1);
    fakeAjaxSuccess();
    post.deleteRecord();
    equal(tech.get('posts.length'), 0, 'Tech should not have anymore posts now');
});

test('When loading a child record, its parent should be updated', function() {
    var tech = Category.find(201);
    var biz = Category.find(202);
    var post = Post.find(1);
    BD.store.load(Post, {
        id: 1,
        categoryId: 202
    });
    equal(tech.get('posts.length'), 0, 'Tech should not have anymore posts now');
    equal(biz.get('posts.length'), 1, 'Business should have the post now');
});