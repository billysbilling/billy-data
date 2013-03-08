module('One-to-many relationships', {
    setup: function() {
        App.Category = BD.Model.extend({
            name: BD.attr('string'),
            posts: BD.hasMany('App.Post', 'category', {isEmbedded: true})
        });
        App.Post = BD.Model.extend({
            category: BD.belongsTo('App.Category', {isParent: true}),
            title: BD.attr('string')
        });
        BD.store.loadMany(App.Post, [
            {
                id: 1,
                categoryId: 201,
                title: 'There are so many posts'
            }
        ]);
        BD.store.loadMany(App.Category, [
            {
                id: 201,
                name: 'Tech',
                postIds: [1]
            },
            {
                id: 202,
                name: 'Business',
                postIds: []
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

test('When deleting a child record, it should be removed from the parent and parent should be dirty', function() {
    var tech = App.Category.find(201);
    var post = App.Post.find(1);
    fakeAjaxSuccess();
    post.deleteRecord();
    equal(tech.get('posts.length'), 0, 'Tech should not have anymore posts now');
    equal(tech.get('isDirty'), true, 'Parent should be dirty');
});

test('When adding a child record, parent should be dirty and the child should be added to the parent collection', function() {
    var category = App.Category.find(201);
    var newPost = App.Post.createRecord({
        category: category
    });
    equal(category.get('isDirty'), true, 'Parent should be dirty');
    equal(category.get('selfIsDirty'), false, 'Parent (self) should be clean');
    equal(newPost.get('isDirty'), true, 'Child should be dirty');
    equal(newPost.get('selfIsDirty'), true, 'Child (self) should be dirty');
    equal(category.get('posts.length'), 2, 'Parent should have two posts now');
});

test('When adding a child record, then deleting another child record, then rolling back the parent, the parent should something', function() {
    var category = App.Category.find(201);
    var oldPost = App.Post.find(1);
    equal(category.get('posts.length'), 1, 'Count matches');
    var newPost = App.Post.createRecord({
        category: category
    });
    equal(category.get('posts.length'), 2, 'Count matches');
    oldPost.deleteRecord();
    equal(category.get('posts.length'), 1, 'Count matches');
    equal(category.get('posts.firstObject'), newPost, 'New post is the only child');
    category.rollback();
    equal(category.get('posts.length'), 1, 'Count matches');
    equal(category.get('posts.firstObject'), oldPost, 'Old post is the only child');
});

test('When loading a child record, its parent\'s hasMany should be updated', function() {
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

test('Loading a parent, and then its children', function() {
    fakeAjaxSuccess({
        category: {
            id: 203,
            name: 'Startup'
        }
    });
    var category = App.Category.find(203);
    flushAjax();
    fakeAjaxSuccess({
        posts: [
            {
                id: 2,
                categoryId: 203
            }
        ]
    });
    category.get('posts');
    flushAjax();
    equal(category.get('posts.length'), 1);
});

test('When deleting an embedded child record, and then rolling back the parent, it should rollback the child too', function() {
    var category = App.Category.find(201);
    var post = App.Post.find(1);
    post.deleteRecord();
    category.rollback();
    equal(category.get('isDirty'), false, 'Parent should be clean');
    equal(post.get('isDirty'), false, 'Child should be clean');
    equal(category.get('posts.length'), 1);
    equal(category.get('posts.firstObject'), post);
});

test('When deleting an embedded child record, and then rolling back the parent, the child should have all its attributes set before parent hasMany relationship change event fires', function() {
    expect(1);
    var doCheck = false;
    var category = App.Category.find(201);
    var post = App.Post.find(1);
    var o = Em.ObjectProxy.extend({
        postsObserver: function() {
            if (doCheck) {
                equal(this.get('posts.firstObject.category'), category);
                doCheck = false;
            }
        }.observes('posts.@each')
    }).create({content: category});
    post.deleteRecord();
    doCheck = true;
    category.rollback();
    o.destroy();
});

test('When saving a parent with a dirty child, the whole tree should be clean afterwards', function() {
    var category = App.Category.find(201);
    var post = App.Post.find(1);
    post.set('title', 'Changy changong');
    equal(category.get('isDirty'), true, 'Parent should be dirty');
    equal(category.get('selfIsDirty'), false, 'Parent should not be self-dirty');
    equal(category.get('childIsDirty'), true, 'Parent should have a dirty child');
    equal(post.get('isDirty'), true, 'Child should be dirty');
    equal(post.get('selfIsDirty'), true, 'Child should be be self-dirty');
    fakeAjaxSuccess();
    category.save({
        embed: ['posts']
    });
    flushAjax();
    equal(category.get('isDirty'), false, 'Parent should be clean');
    equal(category.get('selfIsDirty'), false, 'Parent should be self-clean');
    equal(category.get('childIsDirty'), false, 'Parent should not have any dirty children');
    equal(post.get('isDirty'), false, 'Child should be clean');
    equal(post.get('selfIsDirty'), false, 'Child should be self-clean');
});