module('Sparse record array', {
    setup: function() {
        App.Post = BD.Model.extend({
            title: BD.attr('string')
        });
    },
    teardown: function() {
        BD.store.reset();
    }
});

test('Test AJAX options', function() {
    expect(6);
    BD.ajax = function(hash) {
        equal(hash.type, 'GET');
        equal(hash.url, '/posts');
        deepEqual(hash.data, {
            offset: 0,
            pageSize: 3,
            state: 'draft'
        });
    };
    var records = BD.SparseRecordArray.create({
        type: App.Post,
        pageSize: 3,
        query: {
            state: 'draft'
        }
    });
    BD.ajax = function(hash) {
        equal(hash.type, 'GET');
        equal(hash.url, '/posts');
        deepEqual(hash.data, {
            offset: 9,
            pageSize: 3,
            state: 'draft'
        });
    };
    records.objectAt(10);
});

test('Test AJAX options with special url', function() {
    expect(6);
    BD.ajax = function(hash) {
        equal(hash.type, 'GET');
        equal(hash.url, '/weirdposts');
        deepEqual(hash.data, {
            offset: 0,
            pageSize: 3,
            state: 'draft'
        });
    };
    var records = BD.SparseRecordArray.create({
        type: App.Post,
        pageSize: 3,
        url: 'weirdposts',
        query: {
            state: 'draft'
        }
    });
    BD.ajax = function(hash) {
        equal(hash.type, 'GET');
        equal(hash.url, '/weirdposts');
        deepEqual(hash.data, {
            offset: 9,
            pageSize: 3,
            state: 'draft'
        });
    };
    records.objectAt(10);
});

test('Requesting indexes should load from server', function() {
    fakeAjaxSuccess({
        meta: {
            paging: {
                total: 23
            }
        },
        posts: [
            {
                id: 0,
                title: 'Post 0'
            },
            {
                id: 1,
                title: 'Post 1'
            },
            {
                id: 2,
                title: 'Post 2'
            }
        ]
    });
    var records = BD.SparseRecordArray.create({
        type: App.Post,
        pageSize: 3
    })
    resetAjax();
    equal(records.objectAt(0), BD.SPARSE_PLACEHOLDER); //These indexes should already be loading
    equal(records.objectAt(1), BD.SPARSE_PLACEHOLDER);
    flushAjax();
    equal(records.get('length'), 23);
    deepEqual(records.objectAt(0).getProperties(['id', 'title']), {id: 0, title: 'Post 0'});
    deepEqual(records.objectAt(1).getProperties(['id', 'title']), {id: 1, title: 'Post 1'});
    deepEqual(records.objectAt(2).getProperties(['id', 'title']), {id: 2, title: 'Post 2'});
    //Trigger a load of another set
    fakeAjaxSuccess({
        meta: {
            paging: {
                total: 23
            }
        },
        posts: [
            {
                id: 9,
                title: 'Post 9'
            },
            {
                id: 10,
                title: 'Post 10'
            },
            {
                id: 11,
                title: 'Post 11'
            }
        ]
    });
    equal(records.objectAt(10), BD.SPARSE_PLACEHOLDER);
    resetAjax();
    equal(records.objectAt(9), BD.SPARSE_PLACEHOLDER); //These two should not trigger a request
    equal(records.objectAt(11), BD.SPARSE_PLACEHOLDER);
    flushAjax();
    deepEqual(records.objectAt(9).getProperties(['id', 'title']), {id: 9, title: 'Post 9'});
    deepEqual(records.objectAt(10).getProperties(['id', 'title']), {id: 10, title: 'Post 10'});
    deepEqual(records.objectAt(11).getProperties(['id', 'title']), {id: 11, title: 'Post 11'});
});

test('Triggers didLoad every time something is loaded', function() {
    var didLoadCount = 0;
    fakeAjaxSuccess({
        meta: {
            paging: {
                total: 23
            }
        }
    });
    var records = BD.SparseRecordArray.create({
        type: App.Post,
        pageSize: 3
    });
    records.on('didLoad', function() {
        didLoadCount++;
    });
    flushAjax();
    fakeAjaxSuccess({
        meta: {
            paging: {
                total: 23
            }
        }
    });
    records.objectAt(9);
    flushAjax();
    equal(didLoadCount, 2);
});

test('Destroying a loading sparse array', function() {
    fakeAjaxSuccess();
    var records = BD.SparseRecordArray.create({
        type: App.Post,
        pageSize: 3
    });
    records.on('didLoad', function() {
        fail('Should not be called.');
    });
    records.destroy();
    flushAjax();
    equal(records.get('isDestroying'), true);
});

test('Deleting a record that is in a sparse array', function() {
    fakeAjaxSuccess({
        meta: {
            paging: {
                total: 23
            }
        },
        posts: [
            {
                id: 0,
                title: 'Post 0'
            }
        ]
    });
    var records = BD.SparseRecordArray.create({
        type: App.Post,
        pageSize: 1
    });
    equal(records.get('length'), 0);
    flushAjax();
    equal(records.get('length'), 23);
    var r = App.Post.find(0);
    fakeAjaxSuccess();
    r.deleteRecord();
    flushAjax();
    equal(records.get('length'), 22);
});