var Category,
    Post;

module('Billy Data filtered queries', {
    setup: function() {
        Category = BD.Model.extend({
            name: BD.attr('string')
        });
        Post = BD.Model.extend({
            category: BD.belongsTo(Category),
            author: BD.attr('string'),
            isPublic: BD.attr('boolean')
        });
        BD.store.loadMany(Category, [
            {
                id: 201,
                name: 'Tech'
            },
            {
                id: 202,
                name: 'Business'
            }
        ]);
        BD.store.loadMany(Post, [
            {
                id: 1,
                categoryId: 201,
                author: 'Sebastian',
                isPublic: true
            },
            {
                id: 2,
                categoryId: 201,
                author: 'Adam',
                isPublic: false
            },
            {
                id: 3,
                categoryId: 202,
                author: 'Noah',
                isPublic: true
            }
        ]);
    },
    teardown: function() {
        BD.store.reset();
    }
});

test('Test filter', function() {
    var allPosts = Post.filter();
    var publicPosts = Post.filter({
        isPublic: true
    });
    var sebastianPosts = Post.filter({
        author: 'Sebastian'
    });
    var sAuthorPosts = Post.filter(function(r) {
        return r.get('author').substring(0, 1).toLowerCase() == 's';
    });
    var techPosts = Post.filter({
        category: Category.find(201)
    });
    var businessPosts = Post.filter({
        category: Category.find(202)
    });
    equal(allPosts.get('length'), 3, 'Expect three posts in total');
    equal(publicPosts.get('length'), 2, 'Expect two public posts');
    equal(sebastianPosts.get('length'), 1, 'Expect one post authored by Sebastian');
    equal(sAuthorPosts.get('length'), 1, 'Expect one post with author starting with s');
    equal(techPosts.get('length'), 2, 'Expect two Tech posts');
    equal(businessPosts.get('length'), 1, 'Expect one Business post');
//    Post.find(1).set('isPublic', false);
//    Post.find(2).set('author', 'Sebastian');
//    Post.find(2).set('category', Category.find(202));
//    Post.find(3).set('author', 'Storgaard');
//    equal(allPosts.get('length'), 3, 'Expect three posts in total');
//    equal(publicPosts.get('length'), 1, 'Expect only one public post');
//    equal(sebastianPosts.get('length'), 2, 'Expect two posts authored by Sebastian');
//    equal(sAuthorPosts.get('length'), 3, 'Expect three posts authored by Sebastian');
//    equal(techPosts.get('length'), 1, 'Expect one Tech post');
//    equal(businessPosts.get('length'), 2, 'Expect two Business posts');
});

test('Test sorting', function() {
    var callbackComparatorPosts = Post.filter(null, function(a, b) {
        return a.get('author').localeCompare(b.get('author'));
    });
    var stringComparatorPosts = Post.filter(null, 'author');
    var stringDescComparatorPosts = Post.filter(null, {'author': 'DESC'});
    var multipleStringComparatorPosts = Post.filter(null, {'category.name': 'ASC', 'author': 'ASC'});
    deepEqual(callbackComparatorPosts.mapProperty('id'), [2, 3, 1], 'Order should be correct');
    deepEqual(stringComparatorPosts.mapProperty('id'), [2, 3, 1], 'Order should be correct');
    deepEqual(stringDescComparatorPosts.mapProperty('id'), [1, 3, 2], 'Order should be correct');
    deepEqual(multipleStringComparatorPosts.mapProperty('id'), [3, 2, 1], 'Order should be correct');
});