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
    }
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
    fakeAjaxSuccess();
    post.set('title', 'This is a good day to die');
    equal(post.get('isDirty'), true);
    post.save();
    flushAjax();
    equal(post.get('isDirty'), false);
    equal(post.get('title'), 'This is a good day to die');
});

test('Test save() with properties, normal attribute', function() {
    var post = App.Post.find(101);
    fakeAjaxSuccess();
    post.save({
        properties: {
            title: 'This is a good day to die'
        }
    });
    equal(post.get('isDirty'), false);
    equal(post.get('title'), 'This is a good day to live');
    post.save();
    flushAjax();
    equal(post.get('isDirty'), false);
    equal(post.get('title'), 'This is a good day to die');
});

test('Test save() with properties, belongsTo', function() {
    var commonCategory = App.Category.find(301);
    var uncommonCategory = App.Category.find(302);
    var post = App.Post.find(101);
    fakeAjaxSuccess();
    post.save({
        properties: {
            category: uncommonCategory
        }
    });
    equal(post.get('isDirty'), false);
    equal(post.get('category'), commonCategory);
    post.save();
    flushAjax();
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
    fakeAjaxError(422, {
        validationErrors: expectedValidationErrors
    });
    post.set('title', 'This is a good day to die'); //Set something so .save() actually commits the record
    post.save();
    flushAjax();
    equal(post.get('error'), 'All of it is wrong.');
    equal(post.get('errors.title'), 'This is wrong.');
});