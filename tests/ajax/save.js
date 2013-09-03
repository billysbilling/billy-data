var originalAjax = BD.ajax;

module('Ajax save', {
    setup: function() {
        App.Category = BD.Model.extend({
            name: BD.attr('string')
        });
        App.Post = BD.Model.extend({
            category: BD.belongsTo('App.Category'),
            title: BD.attr('string'),
            comments: BD.hasMany('App.Comment', 'post', {isEmbedded: true}),
            createdTime: BD.attr('date', {readonly: true})
        });
        App.Comment = BD.Model.extend({
            post: BD.belongsTo('App.Post', {isParent: true}),
            text: BD.attr('string')
        });
        BD.store.loadMany(App.Category, [
            {
                id: 301,
                name: 'Common stuff'
            },
            {
                id: 302,
                name: 'Uncommon stuff'
            }
        ]);
        BD.store.loadMany(App.Post, [
            {
                id: 101,
                categoryId: 301,
                title: 'This is a good day to live'
            }
        ]);
        BD.store.loadMany(App.Comment, [
            {
                id: 201,
                postId: 101,
                text: 'I agree!'
            },
            {
                id: 202,
                postId: 101,
                text: 'I disagree!'
            }
        ]);
    },
    teardown: function() {
        BD.store.reset();
        BD.ajax = originalAjax;
    }
});

test('Do not a allow a record to be created twice', function() {
    var post = App.Post.createRecord({
        title: 'a'
    });
    fakeAjax(200, {
        posts: [
            {
                _clientId: post.get('clientId'),
                id: 1,
                title: 'a'
            }
        ]
    });
    post.save();
    throws(function() {
        post.save();
    }, /You can't save a new record that's already being saved. That would create two different records on the server./);
});

test('Test PUT ajax request options', function() {
    expect(3);
    var post = App.Post.find(101);
    BD.ajax = function(hash) {
        equal(hash.type, 'PUT');
        equal(hash.url, '/posts/101');
        deepEqual(hash.data, {
            post: {
                _clientId: post.clientId,
                id: 101,
                categoryId: 301,
                title: 'This is a good day to die'
            }
        });
    };
    post.set('title', 'This is a good day to die');
    post.save();
});

test('Test PUT', function() {
    var post = App.Post.find(101);
    var req = fakeAjax(200);
    post.set('title', 'This is a good day to die');
    equal(post.get('isDirty'), true);
    post.save();
    req.respond();
    equal(post.get('isDirty'), false);
    equal(post.get('title'), 'This is a good day to die');
});

test('Test save() with properties, normal attribute', function() {
    var post = App.Post.find(101);
    var req = fakeAjax(200);
    post.save({
        properties: {
            title: 'This is a good day to die'
        }
    });
    equal(post.get('isDirty'), false);
    equal(post.get('title'), 'This is a good day to live');
    post.save();
    req.respond();
    equal(post.get('isDirty'), false);
    equal(post.get('title'), 'This is a good day to die');
});

test('Test save() with properties, belongsTo', function() {
    var commonCategory = App.Category.find(301);
    var uncommonCategory = App.Category.find(302);
    var post = App.Post.find(101);
    var req = fakeAjax(200);
    post.save({
        properties: {
            category: uncommonCategory
        }
    });
    equal(post.get('isDirty'), false);
    equal(post.get('category'), commonCategory);
    post.save();
    req.respond();
    equal(post.get('isDirty'), false);
    equal(post.get('category'), uncommonCategory);
});

test('Test save() with properties, normal null attribute', function() {
    expect(1);
    var post = App.Post.find(101);
    BD.ajax = function(hash) {
        strictEqual(hash.data.post.title, null);
    };
    post.save({
        properties: {
            title: null
        }
    });
});

test('Test save() with payloadData, simple property and object', function() {
    expect(3);
    var post = App.Post.find(101);
    BD.ajax = function(hash) {
        strictEqual(hash.data.post.title, 'Post title');
        strictEqual(hash.data.randomProperty, 'Weee!');
        strictEqual(hash.data.randomObject.foo, 'bar');
    };
    post.save({
        properties: {
            title: 'Post title'
        },
        payloadData: {
            randomProperty: 'Weee!',
            randomObject: {
                foo: 'bar'
            }
        }
    });
});

test('Test save() with properties, null belongsTo', function() {
    expect(1);
    var post = App.Post.find(101);
    BD.ajax = function(hash) {
        strictEqual(hash.data.post.categoryId, null);
    };
    post.save({
        properties: {
            category: null
        }
    });
});

test('Test error validation', function() {
    var post = App.Post.find(101);
    var expectedValidationErrors = {};
    expectedValidationErrors[post.clientId] = {
        message: 'All of it is wrong.',
        attributes: {
            title: 'This is wrong.'
        }
    };
    var req = fakeAjax(422, {
        validationErrors: expectedValidationErrors
    });
    post.set('title', 'This is a good day to die'); //Set something so .save() actually commits the record
    post.save();
    req.respond();
    equal(post.get('error'), 'All of it is wrong.');
    equal(post.get('errors.title'), 'This is wrong.');
});