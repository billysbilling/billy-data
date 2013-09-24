module('BD.AnonymousRecord', {
    setup: function() {
        App.Post = BD.Model.extend({
            title: BD.attr('string')
        });
        BD.store.loadMany(App.Post, [
            {
                id: 101,
                title: 'Milk is for babies'
            }
        ]);
    },
    teardown: function() {
        BD.store.reset();
    }
});

test('returns a correct value for a Moment object', function() {
    expect(1);
    var r = BD.AnonymousRecord.createRecord({
        date: moment(new Date('2000/01/01'))
    });
    BD.ajax = function(hash) {
        equal(hash.data.record.date, '2000-01-01');
    };
    r.save('/stories/milk');
});

test('Sends correct AJAX options', function() {
    expect(4);
    var r = BD.AnonymousRecord.createRecord({
        name: 'Arnold',
        isBig: true
    });
    BD.ajax = function(hash) {
        equal(hash.type, 'POST');
        equal(hash.url, '/stories');
        deepEqual(hash.data, {
            record: {
                name: 'Arnold',
                isBig: true
            }
        });
    };
    var ret = r.save('/stories');
    ok(ret instanceof BD.ModelOperationPromise);
});

test('Can specify root key', function() {
    expect(4);
    var r = BD.AnonymousRecord.createRecord({
        name: 'Arnold',
        isBig: true
    });
    BD.ajax = function(hash) {
        equal(hash.type, 'POST');
        equal(hash.url, '/stories');
        deepEqual(hash.data, {
            story: {
                name: 'Arnold',
                isBig: true
            }
        });
    };
    var ret = r.save('/stories', {root: 'story'});
    ok(ret instanceof BD.ModelOperationPromise);
});

test('Sends correct AJAX options with model', function() {
    expect(3);
    var r = BD.AnonymousRecord.createRecord({
        post: App.Post.find(101)
    });
    BD.ajax = function(hash) {
        equal(hash.type, 'POST');
        equal(hash.url, '/stories/milk');
        deepEqual(hash.data, {
            record: {
                postId: 101
            }
        });
    };
    r.save('/stories/milk', {
        models: ['post']
    });
});

test('Sends correct AJAX options with null model', function() {
    expect(3);
    var r = BD.AnonymousRecord.createRecord({
        post: null
    });
    BD.ajax = function(hash) {
        equal(hash.type, 'POST');
        equal(hash.url, '/stories/milk');
        deepEqual(hash.data, {
            record: {
                postId: null
            }
        });
    };
    r.save('/stories/milk', {
        models: ['post']
    });
});

test('calls `sideload` after a successful response', function() {
  expect(1);
  var oldSideload = BD.store.sideload;
  BD.store.sideload = function() {
      ok(true);
  };
  BD.ajax = function(hash) {
      hash.success({});
      BD.store.sideload = oldSideload;
  };
  BD.AnonymousRecord.createRecord().save('/somewhere');
});

test('`_handleValidationErrors` serializes the models errors', function() {
    expect(2);
    var record = BD.AnonymousRecord.createRecord({ post: null });
    BD.ajax = function(opts) {
        opts.error({
            status: 422,
            responseText: JSON.stringify({
                validationErrors: {
                    record: {
                        attributes: {
                            postId: 'This field must not be blank.',
                            unitPrice: 'This field must not be blank.'
                        }
                    }
                }
            })
        });
        equal(record.get('errors.post'), 'This field must not be blank.');
        equal(record.get('errors.unitPrice'), 'This field must not be blank.');
    };
    record.save('/stories/milk', { models: ['post'] });
});

test('`_handleValidationErrors` triggers `didValidate` event', function() {
    expect(1);
    var record = BD.AnonymousRecord.createRecord({ name: null });
    record.on('didValidate', function() {
        ok(true);
    });
    BD.ajax = function(opts) {
        opts.error({
            status: 422,
            responseText: JSON.stringify({
                validationErrors: {
                    record: {
                        attributes: {
                            name: 'This field must not be blank.'
                        }
                    }
                }
            })
        });
    };
    record.save('/stories/milk');
});

test('`_handleValidationErrors` serializes the models errors with specified root', function() {
    expect(1);
    var record = BD.AnonymousRecord.createRecord();
    BD.ajax = function(opts) {
        opts.error({
            status: 422,
            responseText: JSON.stringify({
                validationErrors: {
                    john: {
                        attributes: {
                            name: 'This field must not be blank.'
                        }
                    }
                }
            })
        });
        equal(record.get('errors.name'), 'This field must not be blank.');
    };
    record.save('/stories/milk', {root: 'john'});
});