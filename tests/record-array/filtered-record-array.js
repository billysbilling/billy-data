QUnit.module('Filtered record array', {
    setup: function() {
        App.Post = BD.Model.extend({
            title: BD.attr('string')
        });
    },
    teardown: function() {
        BD.store.reset();
    }
});

test('Array observers when matching records are loaded before filtered record array is loaded', function() {
    var events = [];
    //Do a regular .find
    var req1 = fakeAjax(200, {
        posts: [
            {
                id: 1,
                title: 'Hi'
            },
            {
                id: 2,
                title: 'Bye'
            }
        ]
    });
    App.Post.find({
        something: 'doesnt matter'
    });
    //Do a .filter
    var req2 = fakeAjax(200, {
        posts: [
            {
                id: 1,
                title: 'Hi'
            },
            {
                id: 2,
                title: 'Bye'
            }
        ]
    });
    var posts = App.Post.all();
    //Listen for array observers
    var observer = {
        arrayWillChange: function(content, start, removed, added) {
            events.push(['will', start, removed, added]);
        },
        arrayDidChange: function(content, start, removed, added) {
            events.push(['did', start, removed, added]);
        }
    };
    posts.addArrayObserver(observer);
    //Respond to requests
    req1.respond();
    req2.respond();
    //Check events
    equal(posts.get('length'), 2);
    var expectedEvents = [
        ['will', 0, 0, 1],
        ['did', 0, 0, 1],
        ['will', 1, 0, 1],
        ['did', 1, 0, 1]
    ];
    deepEqual(events, expectedEvents);
    //Clean up
    posts.removeArrayObserver(observer);
});

test('When a record is added while a remote filter request is underway, the length should be correct', function() {
    var req = fakeAjax(200, {
        posts: [
            {
                id: 1,
                title: 'Hi'
            },
            {
                id: 2,
                title: 'Bye'
            }
        ]
    });
    var posts = App.Post.all();
    App.Post.load({
        id: 1,
        title: 'Hi'
    });
    req.respond();
    equal(posts.get('length'), 2, 'There should be two posts');
});