module('Filtered queries', {
    setup: function() {
        App.Category = BD.Model.extend({
            name: BD.attr('string')
        });
        App.Post = BD.Model.extend({
            category: BD.belongsTo('App.Category'),
            author: BD.attr('string'),
            title: BD.attr('string'),
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
                title: 'B',
                isPublic: true
            },
            {
                id: 2,
                categoryId: 201,
                author: 'Adam',
                title: 'B',
                isPublic: false
            },
            {
                id: 3,
                categoryId: 202,
                author: 'Noah',
                title: 'C',
                isPublic: true
            }
        ]);
    },
    teardown: function() {
        BD.store.reset();
    }
});

test('Test filter', function() {
    var publicPosts = App.Post.filter({
        query: {
            isPublic: true
        }
    });
    var sebastianPosts = App.Post.filter({
        query: {
            author: 'Sebastian'
        }
    });
    var sAuthorPosts = App.Post.filter({
        query: function(r) {
            return r.get('author').substring(0, 1).toLowerCase() == 's';
        },
        queryObservers: ['author']
    });
    var techPosts = App.Post.filter({
        query: {
            category: App.Category.find(201)
        }
    });
    var businessPosts = App.Post.filter({
        query: {
            category: App.Category.find(202)
        }
    });
    equal(publicPosts.get('length'), 2, 'Expect two public posts');
    equal(sebastianPosts.get('length'), 1, 'Expect one post authored by Sebastian');
    equal(sAuthorPosts.get('length'), 1, 'Expect one post with author starting with s');
    equal(techPosts.get('length'), 2, 'Expect two Tech posts');
    equal(businessPosts.get('length'), 1, 'Expect one Business post');
    App.Post.find(1).set('isPublic', false);
    App.Post.find(2).set('author', 'Sebastian');
    App.Post.find(2).set('category', App.Category.find(202));
    App.Post.find(3).set('author', 'Storgaard');
    equal(publicPosts.get('length'), 1, 'Expect only one public post');
    equal(sebastianPosts.get('length'), 2, 'Expect two posts authored by Sebastian');
    equal(sAuthorPosts.get('length'), 3, 'Expect three posts with author starting with s');
    equal(techPosts.get('length'), 1, 'Expect one Tech post');
    equal(businessPosts.get('length'), 2, 'Expect two Business posts');
});

test('Test all()', function() {
    var allPosts = App.Post.all(),
        post;
    equal(allPosts.get('length'), 3, 'Expect 3 posts in total');
    //Delete a record
    post = App.Post.find(1);
    fakeAjaxSuccess();
    post.deleteRecord();
    flushAjax();
    equal(allPosts.get('length'), 2, 'Expect 2 posts in total');
    //Create a new record
    App.Post.createRecord({
        category: 201
    });
    equal(allPosts.get('length'), 3, 'Expect 3 posts in total');
    //Load a new record
    BD.store.load(App.Post, {
        category: 201
    });
    equal(allPosts.get('length'), 4, 'Expect 4 posts in total');
});

test('Test rollback', function() {
    var publicPosts = App.Post.filter({
        query: {
            isPublic: true
        }
    });
    equal(publicPosts.get('length'), 2, 'Expect two public posts');
    var post = App.Post.find(1);
    post.set('isPublic', false);
    equal(publicPosts.get('length'), 1, 'Expect one public posts');
    post.rollback();
    equal(publicPosts.get('length'), 2, 'Expect two public posts again');
});

test('Deleting a new record should remove it from filtered arrays', function() {
    var publicPosts = App.Post.filter({
        query: {
            isPublic: true
        }
    });
    var post = App.Post.createRecord({
        isPublic: true
    });
    equal(publicPosts.get('length'), 3, 'There are three public posts');
    post.deleteRecord();
    equal(publicPosts.get('length'), 2, 'There are now two public posts');
});

test('Deleting an existing record should remove it from filtered arrays', function() {
    var publicPosts = App.Post.filter({
        query: {
            isPublic: true
        }
    });
    equal(publicPosts.get('length'), 2, 'There are three public posts');
    var post = App.Post.find(1);
    fakeAjaxSuccess();
    post.deleteRecord();
    equal(publicPosts.get('length'), 2, 'There are still two public posts');
    flushAjax();
    equal(publicPosts.get('length'), 1, 'There are now one public post');
});

test('Creating a record should add it to the filtered record array', function() {
    var publicPosts = App.Post.filter({
        query: {
            isPublic: true
        }
    });
    equal(publicPosts.get('length'), 2, 'There are two public posts');
    App.Post.createRecord({
        isPublic: true
    });
    equal(publicPosts.get('length'), 3, 'There are now three public posts');
    App.Post.createRecord({
        isPublic: false
    });
    equal(publicPosts.get('length'), 3, 'There are still three public posts');
});

test('Loading records via AJAX should add them to the filtered record array', function() {
    var publicPosts = App.Post.filter({
        query: {
            isPublic: true
        }
    });
    equal(publicPosts.get('length'), 2, 'There are two public posts');
    fakeAjaxSuccess({
        posts: [
            {
                id: 4,
                isPublic: true
            },
            {
                id: 5,
                isPublic: false
            }
        ]
    });
    App.Post.find({something: 1});
    flushAjax();
    equal(publicPosts.get('length'), 3, 'There are now three public posts');
});

test('Test AJAX options for remote filtered record arrays', function() {
    expect(3);
    BD.ajax = function(hash) {
        equal(hash.type, 'GET');
        equal(hash.url, '/posts');
        deepEqual(hash.data, {isPublic: true});
    };
    App.Post.filter({
        query: {
            isPublic: true
        },
        remote: true
    });
});

test('Test AJAX options for remote filtered record arrays with remoteQuery', function() {
    expect(3);
    BD.ajax = function(hash) {
        equal(hash.type, 'GET');
        equal(hash.url, '/posts');
        deepEqual(hash.data, {isPublic: true, include: 'post.category'});
    };
    App.Post.filter({
        query: {
            isPublic: true
        },
        remoteQuery: {
            include: 'post.category'
        },
        remote: true
    });
});

test('Remote filtered record arrays should be filled', function() {
    fakeAjaxSuccess({
        posts: [
            {
                id: 4,
                author: 'Bruce Wayne'
            },
            {
                id: 5,
                author: 'Bruce Wayne'
            },
            {
                id: 6,
                author: 'What am I doing here? Stupid server, but I should be added anyway'
            }
        ]
    })
    var brucePosts = App.Post.filter({
        query: {
            author: 'Bruce Wayne'
        },
        remote: true
    });
    equal(brucePosts.get('length'), 0, '0 posts before load');
    flushAjax();
    equal(brucePosts.get('length'), 3, '3 posts before load');
    deepEqual(brucePosts.mapProperty('id'), [4, 5, 6], 'The right posts');
});

test('Test AJAX options for remote filtered record arrays by belongsTo', function() {
    expect(3);
    BD.ajax = function(hash) {
        equal(hash.type, 'GET');
        equal(hash.url, '/posts');
        deepEqual(hash.data, {categoryId: 201});
    };
    App.Post.filter({
        query: {
            category: App.Category.find(201)
        },
        remote: true
    });
});

test('Remote filtered record arrays should be filled by belongsTo', function() {
    fakeAjaxSuccess({
        posts: [
            {
                id: 1,
                categoryId: 201
            },
            {
                id: 4,
                categoryId: 201
            },
            {
                id: 5,
                categoryId: 202
            }
        ]
    })
    var techPosts = App.Post.filter({
        query: {
            category: App.Category.find(201)
        },
        remote: true
    });
    equal(techPosts.get('length'), 0, '0 posts before load');
    flushAjax();
    equal(techPosts.get('length'), 3, '3 posts before load'); //Should ignore existing ones
    deepEqual(techPosts.mapProperty('id'), [1, 4, 5], 'The right posts');
});

test('Refresh after loading weird remote', function() {
    fakeAjaxSuccess({
        posts: [
            {
                id: 4,
                categoryId: 202
            }
        ]
    })
    var techPosts = App.Post.filter({
        query: {
            category: App.Category.find(201)
        },
        remote: true
    });
    equal(techPosts.get('length'), 0, '0 posts before load');
    flushAjax();
    deepEqual(techPosts.mapProperty('id'), [4], 'The right posts after load');
    techPosts.refresh();
    deepEqual(techPosts.mapProperty('id'), [1, 2], 'The right posts after refresh');
});

test('Creating a new record that\'s added to an empty filtered array with a comparator', function() {
    var dogCategories = App.Category.filter({
        query: {
            name: 'Dog'
        },
        comparator: 'name'
    });
    equal(dogCategories.get('length'), 0, 'There are no Dog categories');
    App.Category.createRecord({
        name: 'Dog'
    });
    equal(dogCategories.get('length'), 1, 'There is now one Dog category');
});

test('Test callback sorting', function() {
    var sebastian = App.Post.find(1);
    var adam = App.Post.find(2);
    var callbackComparatorPosts = App.Post.filter({
        comparator: function(a, b) {
            return a.get('author').localeCompare(b.get('author'));
        },
        comparatorObservers: ['author']
    });
    deepEqual(callbackComparatorPosts.mapProperty('id'), [2, 3, 1], 'Order should be correct');
    sebastian.set('author', 'Aase');
    adam.set('author', 'Zebra');
    deepEqual(callbackComparatorPosts.mapProperty('id'), [1, 3, 2], 'Order should be correct');
});

test('Test string sorting', function() {
    var sebastian = App.Post.find(1);
    var adam = App.Post.find(2);
    var stringComparatorPosts = App.Post.filter({
        comparator: 'author'
    });
    deepEqual(stringComparatorPosts.mapProperty('id'), [2, 3, 1], 'Order should be correct');
    sebastian.set('author', 'Aase');
    adam.set('author', 'Zebra');
    deepEqual(stringComparatorPosts.mapProperty('id'), [1, 3, 2], 'Order should be correct');
});

test('Test object sorting', function() {
    var sebastian = App.Post.find(1);
    var adam = App.Post.find(2);
    var noah = App.Post.find(3);
    var stringDescComparatorPosts = App.Post.filter({
        comparator: {'author': 'DESC'}
    });
    deepEqual(stringDescComparatorPosts.mapProperty('id'), [1, 3, 2], 'Order should be correct');
    sebastian.set('author', 'Aase');
    adam.set('author', 'Zebra');
    deepEqual(stringDescComparatorPosts.mapProperty('id'), [2, 3, 1], 'Order should be correct');
});

test('Test object with multiple keys sorting', function() {
    var adam = App.Post.find(2);
    var noah = App.Post.find(3);
    var multipleStringComparatorPosts = App.Post.filter({
        comparator: {'title': 'DESC', 'author': 'ASC'}
    });
    deepEqual(multipleStringComparatorPosts.mapProperty('id'), [3, 2, 1], 'Order should be correct');
    noah.set('title', 'A');
    adam.set('author', 'Zebra');
    deepEqual(multipleStringComparatorPosts.mapProperty('id'), [1, 2, 3], 'Order should be correct');
});

test('Test #bigdata sorting', function() {
    BD.store.reset();
    BD.store.loadMany(App.Category, [
        {
            id: 0,
            name: 'B'
        },
        {
            id: 1,
            name: 'D'
        },
        {
            id: 2,
            name: 'F'
        },
        {
            id: 3,
            name: 'H'
        },
        {
            id: 4,
            name: 'J'
        },
        {
            id: 5,
            name: 'L'
        },
        {
            id: 6,
            name: 'N'
        },
        {
            id: 7,
            name: 'P'
        },
        {
            id: 8,
            name: 'R'
        }
    ]);
    var all = App.Category.filter({
        comparator: 'name'
    });
    var category;
    //Insert first
    category = App.Category.createRecord({
        name: 'A'
    });
    equal(all.indexOf(category), 0, 'A goes first');
    //Insert middle
    category = App.Category.createRecord({
        name: 'G'
    });
    equal(all.indexOf(category), 4, 'G goes in the middle');
    //Insert Last
    category = App.Category.createRecord({
        name: 'Z'
    });
    equal(all.indexOf(category), 11, 'Z goes last');
});