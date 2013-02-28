module('One-to-many relationships', {
    setup: function() {
        App.Category = BD.Model.extend({
            name: BD.attr('string'),
            posts: BD.hasMany('App.Post', 'category', {isEmbedded: true})
        });
        App.Post = BD.Model.extend({
            category: BD.belongsTo('App.Category', {isParent: true})
        });
        BD.store.loadMany(App.Post, [
            {
                id: 1,
                categoryId: 201
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