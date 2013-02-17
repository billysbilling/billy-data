module('Filtered queries', {
    setup: function() {
        App.Category = BD.Model.extend({
            name: BD.attr('string')
        });
        App.Post = BD.Model.extend({
            category: BD.belongsTo('App.Category'),
            author: BD.attr('string'),
            isPublic: BD.attr('boolean')
        });
        BD.store.loadMany(App.Category, [
            {
                id: 201,
                name: 'Tech'
            },
            {
                id: 202,
                name: 'Business'
            }
        ]);
        BD.store.loadMany(App.Post, [
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
    var allPosts = App.Post.filter();
    var publicPosts = App.Post.filter({
        isPublic: true
    });
    var sebastianPosts = App.Post.filter({
        author: 'Sebastian'
    });
    var sAuthorPosts = App.Post.filter(function(r) {
        return r.get('author').substring(0, 1).toLowerCase() == 's';
    });
    var techPosts = App.Post.filter({
        category: App.Category.find(201)
    });
    var businessPosts = App.Post.filter({
        category: App.Category.find(202)
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
    var callbackComparatorPosts = App.Post.filter(null, function(a, b) {
        return a.get('author').localeCompare(b.get('author'));
    });
    var stringComparatorPosts = App.Post.filter(null, 'author');
    var stringDescComparatorPosts = App.Post.filter(null, {'author': 'DESC'});
    var multipleStringComparatorPosts = App.Post.filter(null, {'category.name': 'ASC', 'author': 'ASC'});
    deepEqual(callbackComparatorPosts.mapProperty('id'), [2, 3, 1], 'Order should be correct');
    deepEqual(stringComparatorPosts.mapProperty('id'), [2, 3, 1], 'Order should be correct');
    deepEqual(stringDescComparatorPosts.mapProperty('id'), [1, 3, 2], 'Order should be correct');
    deepEqual(multipleStringComparatorPosts.mapProperty('id'), [3, 2, 1], 'Order should be correct');
});