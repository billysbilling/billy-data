QUnit.module('Filtered queries with q', {
    setup: function() {
        App.Post = BD.Model.extend({
            title: BD.attr('string'),
            content: BD.attr('string')
        });
        App.Post.reopenClass({
            qProperties: ['title', 'content']
        });
        BD.store.loadAll(App.Post, [
            {
                id: 1,
                title: 'Implementing a tree in Ember.js',
                content: 'It is very easy. Yes it is. Even in an accounting app.'
            },
            {
                id: 2,
                title: 'Else is something else',
                content: 'Last time we talked about trees, now let\'s talk about something else.'
            },
            {
                id: 3,
                title: 'Accounting is fun',
                content: 'With Billy\'s Billing it\'s fun and easy.'
            }
        ]);
    },
    teardown: function() {
        BD.store.reset();
    }
});

test('Filter with q', function() {
    var treePosts = App.Post.filter({
        q: 'tree',
        sortProperty: 'id'
    });
    var accountingPosts = App.Post.filter({
        q: 'accounting',
        sortProperty: 'id'
    });
    deepEqual(treePosts.mapProperty('id'), [1, 2]);
    deepEqual(accountingPosts.mapProperty('id'), [1, 3]);
    var post2 = App.Post.find(2);
    post2.set('content', 'Accounting instead.');
    deepEqual(treePosts.mapProperty('id'), [1]);
    deepEqual(accountingPosts.mapProperty('id'), [1, 2, 3]);
});

test('Weird characters in q', function() {
    var weirdPosts = App.Post.filter({
        q: "weird\\"
    });
    deepEqual(weirdPosts.mapProperty('id'), []);
    var post = App.Post.find(1);
    post.set('title', "I am weird\\");
    deepEqual(weirdPosts.mapProperty('id'), [1]);
});

test('Regex chars do not have special meaning', function() {
    var posts = App.Post.filter({
        q: 'Ember.j.'
    });
    deepEqual(posts.mapProperty('id'), []);
});