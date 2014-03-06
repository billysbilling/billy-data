QUnit.module('Filtered queries', {
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
        App.Post.registerFilter('authorStartsWith', ['author'], function(data, authorStartsWith, query) {
            equal(authorStartsWith, query.authorStartsWith);
            return Em.get(data, 'author').substring(0, authorStartsWith.length) === authorStartsWith;
        });
        App.Post.registerSortMacro('macroTest', ['author', 'title'], function(a, b) {
            //Sort by combined char length of author and title
            return (a.get('author').length + a.get('title').length) - (b.get('author').length + b.get('title').length);
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
                author: 'Adam R',
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

test('Test local filter()', function() {
    App.Post.loadAll([]);
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
    equal(techPosts.get('length'), 2, 'Expect two Tech posts');
    equal(businessPosts.get('length'), 1, 'Expect one Business post');
    App.Post.find(1).set('isPublic', false);
    App.Post.find(2).set('author', 'Sebastian');
    App.Post.find(2).set('category', App.Category.find(202));
    App.Post.find(3).set('author', 'Storgaard');
    equal(publicPosts.get('length'), 1, 'Expect only one public post');
    equal(sebastianPosts.get('length'), 2, 'Expect two posts authored by Sebastian');
    equal(techPosts.get('length'), 1, 'Expect one Tech post');
    equal(businessPosts.get('length'), 2, 'Expect two Business posts');
});

test('Test local all()', function() {
    App.Post.loadAll([]);
    var allPosts = App.Post.all(),
        post;
    equal(allPosts.get('length'), 3, 'Expect 3 posts in total');
    //Delete a record
    post = App.Post.find(1);
    var req = fakeAjax(200);
    post.deleteRecord();
    req.respond();
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
    App.Post.loadAll([]);
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
    App.Post.loadAll([]);
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
    App.Post.loadAll([]);
    var publicPosts = App.Post.filter({
        query: {
            isPublic: true
        }
    });
    equal(publicPosts.get('length'), 2, 'There are three public posts');
    var post = App.Post.find(1);
    var req = fakeAjax(200);
    post.deleteRecord();
    equal(publicPosts.get('length'), 2, 'There are still two public posts');
    req.respond();
    equal(publicPosts.get('length'), 1, 'There are now one public post');
});

test('Creating a record should add it to the filtered record array', function() {
    App.Post.loadAll([]);
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
    App.Post.loadAll([]);
    var publicPosts = App.Post.filter({
        query: {
            isPublic: true
        }
    });
    equal(publicPosts.get('length'), 2, 'There are two public posts');
    var req = fakeAjax(200, {
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
    req.respond();
    equal(publicPosts.get('length'), 3, 'There are now three public posts');
});

test('Test remote filter()', function() {
    expect(3);
    BD.ajax = function(hash) {
        equal(hash.type, 'GET');
        equal(hash.url, '/posts');
        deepEqual(hash.data, {isPublic: true, offset: 0, pageSize: 100});
    };
    App.Post.filter({
        query: {
            isPublic: true
        },
        pageSize: 100
    });
});

test('Test AJAX options for remote filtered record arrays with remoteQuery', function() {
    expect(3);
    BD.ajax = function(hash) {
        equal(hash.type, 'GET');
        equal(hash.url, '/posts');
        deepEqual(hash.data, {isPublic: true, include: 'post.category', pageSize: 100, offset: 0});
    };
    App.Post.filter({
        query: {
            isPublic: true
        },
        remoteQuery: {
            include: 'post.category'
        },
        pageSize: 100
    });
});

test('Remote filtered record arrays should be filled', function() {
    var req = fakeAjax(200, {
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
    });
    var brucePosts = App.Post.filter({
        query: {
            author: 'Bruce Wayne'
        }
    });
    equal(brucePosts.get('length'), 0, '0 posts before load');
    req.respond();
    equal(brucePosts.get('length'), 3, '3 posts before load');
    deepEqual(brucePosts.mapProperty('id'), [4, 5, 6], 'The right posts');
});

test('Test AJAX options for remote filtered record arrays by belongsTo', function() {
    expect(3);
    BD.ajax = function(hash) {
        equal(hash.type, 'GET');
        equal(hash.url, '/posts');
        deepEqual(hash.data, {categoryId: 201, offset: 0, pageSize: 100});
    };
    App.Post.filter({
        query: {
            category: App.Category.find(201)
        },
        pageSize: 100
    });
});

test('Remote filtered record arrays should be filled by belongsTo', function() {
    var req = fakeAjax(200, {
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
    });
    var techPosts = App.Post.filter({
        query: {
            category: App.Category.find(201)
        }
    });
    equal(techPosts.get('length'), 0, '0 posts before load');
    req.respond();
    equal(techPosts.get('length'), 3, '3 posts before load'); //Should ignore existing ones
    deepEqual(techPosts.mapProperty('id'), [1, 4, 5], 'The right posts');
});

test('Creating a new record that\'s added to an empty local filtered record array with a comparator', function() {
    App.Category.loadAll([]);
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

test('Query works with array values', function() {
    App.Post.loadAll([]);
    var postsByAmericans = App.Post.filter({
        query: {
            author: ['Adam R', 'Noah']
        }
    });
    equal(postsByAmericans.get('length'), 2);
});

test('Test callback sorting', function() {
    App.Post.loadAll([]);
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
    App.Post.loadAll([]);
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
    App.Post.loadAll([]);
    var sebastian = App.Post.find(1);
    var adam = App.Post.find(2);
    var noah = App.Post.find(3);
    var stringDescComparatorPosts = App.Post.filter({
        comparator: {'author': 'DESC'}
    });
    deepEqual(stringDescComparatorPosts.mapProperty('author'), ['Sebastian', 'Noah', 'Adam R'], 'Order should be correct');
    sebastian.set('author', 'Aase');
    deepEqual(stringDescComparatorPosts.mapProperty('author'), ['Noah', 'Adam R', 'Aase'], 'Order should be correct');
    adam.set('author', 'Zebra');
    deepEqual(stringDescComparatorPosts.mapProperty('author'), ['Zebra', 'Noah', 'Aase'], 'Order should be correct');
});

test('Test object with multiple keys sorting', function() {
    App.Post.loadAll([]);
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

test('Test macro sorting ASC', function() {
    App.Post.loadAll([]);
    var sebastian = App.Post.find(1);
    var posts = App.Post.filter({
        sortProperty: 'macroTest'
    });
    deepEqual(posts.get('comparatorObservers'), ['author', 'title']);
    deepEqual(posts.mapProperty('id'), [3, 2, 1], 'Order should be correct');
    sebastian.set('author', '1');
    deepEqual(posts.mapProperty('id'), [1, 3, 2], 'Order should be correct');
});

test('Test macro sorting DESC', function() {
    App.Post.loadAll([]);
    var sebastian = App.Post.find(1);
    var posts = App.Post.filter({
        sortProperty: 'macroTest',
        sortDirection: 'DESC'
    });
    deepEqual(posts.get('comparatorObservers'), ['author', 'title']);
    deepEqual(posts.mapProperty('id'), [1, 2, 3], 'Order should be correct');
    sebastian.set('author', '1');
    deepEqual(posts.mapProperty('id'), [2, 3, 1], 'Order should be correct');
});

test('Test custom filter', function() {
    App.Post.loadAll([]);
    
    var adam = App.Post.find(2);
    
    var posts = App.Post.filter({
        query: {
            authorStartsWith: 'Seb'
        }
    });
    
    deepEqual(posts.get('queryObservers'), ['_all', 'author']);
    deepEqual(posts.mapProperty('id'), [1], 'Sebastian should be there');
    
    adam.set('author', 'Sebulba');
    
    deepEqual(posts.mapProperty('id'), [1, 2], 'Sebastian and Sebulba should be there');
});

test('Test #bigdata sorting', function() {
    BD.store.reset();
    BD.store.loadAll(App.Category, [
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

asyncTest('Local filter should fire didLoad event async', function() {
    expect(1);
    App.Post.loadAll([]);
    App.Post.filter().one('didLoad', function() {
        ok(true, 'didLoad was triggered');
        start();
    });
});

asyncTest('Local filter should fire promise.then async', function() {
    expect(1);
    App.Post.loadAll([]);
    App.Post.filter().promise.then(function() {
        ok(true, 'didLoad was triggered');
        start();
    });
});

asyncTest('should be able to find a belongs to association with null', function() {
    BD.ajax = function(hash) {
        equal(hash.data.categoryId, null);
        start();
    };
    App.Post.filter({ query: { category: null }});
});
