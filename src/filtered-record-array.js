BD.SPARSE_PLACEHOLDER = {
    isLoaded: false
};

BD.FilteredRecordArray = BD.RecordArray.extend({

    /**
     The model class for records contained in this array.
     @property {constructor} 
     */
    type: null,

    /**
     An array of IDs to fill the array with initially. When used, no server requests will be made (unless
     individual IDs haven't been loaded yet)
     @property {Array<String>}
     */
    ids: null,

    /**
     A hash where the keys are record property names and values are matching values.
     `query` is sent with all server requests as-is. All records' properties will be observed, and automatically
     added to or removed from the record array depending on if they match.
     @property {Object}
     */
    query: null,

    /**
     Just like `query`, except that it will only be included in requests to the server, i.e. not filtered by locally.
     Use this for metadata you want to send to the server, such as a directive to tell the server which relationships
     to include.
     @property {Object}
     */
    remoteQuery: null,

    /**
     An optional URL where the records should be loaded from. Defaults to the conventional URL for `type`.
     @property {String}
     */
    url: null,

    /**
     String. Will be sent as its string value with all server requests. When matching local records `q` will be
     pattern matched on all property names defined in `type`'s `qProperties` property. Example:
     
     ```javascript
     App.Post.reopenClass(qProperties: ['title', 'content']});
     ```
     
     @property {String}
     */
    q: null,

    /**
     String. The name of a property to sort records by. Will be sent with all server requests, and
     records will also be sorted local.
     
     @property {String}
     */
    sortProperty: null,

    /**
     Should be either `ASC` or `DESC`. Works with `sortProperty`.

     @property {String}
     @default "ASC"
     */
    sortDirection: 'ASC',

    /**
     A comparator that's used to sort locally only. Can be any of:
     
     - String: The name of a property to sort by.
     - An object: Key value pairs of property names and directions to sort by. Example: `{name: 'ASC', birthdate: 'DESC'}
       will sort first by `name` ascending, then by `birthdate` descending.
     - A function that takes two records (`a` and `b`) and returns an integer. <0 means that `a` should be before `b`
       >0, the opposite. 

     @property {String|Object|Function}
     @default "ASC"
     */
    comparator: null,

    /**
     Integer. Determines how many records should be loaded at a time from the server. Only relevant if
     all records of `type` has not been loaded with `type.loadAll()`.
     @property {Number}
     */
    pageSize: 100,

    /**
     Tells the store which properties that decides whether or not a record belongs in this record array or not. Will
     automatically be filled by `query`, and the `qProperties` of `type` iff `q` is set.
     @property {Array<String>}
     */
    queryObservers: null,

    /**
     Tells the store which properties that the ordering of this record array depends on. Will be automatically filled
     based on the given `sortProperty` and `comparator`.
     @property {Array<String>}
     */
    comparatorObservers: null,

    /**
     The owner of a hasMany relationship. Should _only_ be used internally.
     @property {BD.Model}
     */
    parent: null,

    init: function() {
        this._requestedIndexes = {};
        this._pendingRequests = [];
        this.set('content', Em.A());
        this.set('length', 0);
        this._super();
        this._initData();
    },
    
    _initData: function() {
        var type = this.get('type'),
            ids = this.get('ids'),
            query = this.get('query'),
            q = this.get('q'),
            queryObservers = this.get('queryObservers'),
            sortProperty = this.get('sortProperty'),
            sortDirection = this.get('sortDirection'),
            comparator = this.get('comparator'),
            comparatorObservers = this.get('comparatorObservers');
        //Normalize query
        if (!_.isObject(query)) {
            Ember.assert('`query` must be either undefined or an object.', !query);
            query = {};
        }
        this.set('query', query);
        //Normalize query properties to observe
        queryObservers = queryObservers || [];
        queryObservers.push('_all');
        if (typeof query == 'object') {
            _.each(query, function(value, key) {
                queryObservers.push(key);
            });
        }
        if (!Em.isEmpty(q)) {
            queryObservers.pushObjects(Em.get(type, 'qProperties'));
        }
        this.set('queryObservers', queryObservers);
        //Sort
        if (!comparator && sortProperty) {
            comparator = {};
            comparator[sortProperty] = sortDirection;
            this.set('comparator', comparator);
        }
        //Normalize comparator properties to observe
        comparatorObservers = comparatorObservers || [];
        if (typeof comparator == 'object') {
            _.each(comparator, function(value, key) {
                comparatorObservers.push(key);
            });
        } else if (typeof comparator == 'string') {
            comparatorObservers.push(comparator);
        }
        this.set('comparatorObservers', comparatorObservers);
        //Populate the record array
        if (ids) {
            this._pushIds(ids);
        } else if (BD.store.allOfTypeIsLoaded(type)) {
            this._filterLocally();
        } else {
            this._requestOffset(0);
        }
    },

    _pushIds: function(ids) {
        var self = this,
            type = this.get('type'),
            pending = 0;
        ids.forEach(function(id) {
            var r;
            if (typeof id === 'object') {
                r = BD.store.findByClientId(id.clientId);
            } else {
                r = BD.store.find(type, id);
            }
            if (r.get('isLoaded')) {
                self._pushObjectSorted(r);
            } else {
                pending++;
                r.one('didLoad', function() {
                    pending--;
                    if (pending == 0) {
                        self.set('isLoaded', true);
                    }
                    self._pushObjectSorted(r);
                });
            }
        }, this);
        if (pending == 0) {
            this.set('isLoaded', true);
        }
    },

    _filterLocally: function() {
        var self = this,
            content = [];
        BD.store.eachRecordOfType(this.get('type'), function(r) {
            if (this._matchesQuery(r)) {
                content.push(r);
            }
        }, this);
        content.sort(function(a, b) {
            return self._compare(a, b);
        });
        this.set('length', content.length);
        this.set('content', content);
        this.set('isLoaded', true);
    },

    objectAt: function(index) {
        if (index > this.get('length')-1) {
            return null;
        }
        var r = this._super(index);
        if (r && r != BD.SPARSE_PLACEHOLDER) {
            return r;
        }
        if (index < 0 || this._requestOffsetIsSuspended || BD.store.get('isResetting') || this.get('isDestroying')) {
            return BD.SPARSE_PLACEHOLDER;
        }
        if (!this._requestedIndexes[index]) {
            var pageSize = this.get('pageSize'),
                offset = Math.max(0, index - Math.floor(pageSize/2));
            while (offset <= index) {
                if (!this._requestedIndexes[offset]) {
                    break;
                }
                offset++;
            }
            this._requestOffset(offset);
        }
        return BD.SPARSE_PLACEHOLDER;
    },

    removeObject: function(o) {
        this._requestOffsetIsSuspended = true;
        var ret = this._super(o);
        this._requestOffsetIsSuspended = false;
        return ret;
    },

    insertAt: function(index, r) {
        if (r != BD.SPARSE_PLACEHOLDER) {
            this.set('length', this.get('length') + 1);
        }
        var ret = this._super(index, r);
        return ret;
    },
    removeAt: function(index) {
        var r = this.objectAt(index);
        var ret = this._super(index);
        if (r != BD.SPARSE_PLACEHOLDER) {
            this.set('length', this.get('length') - 1);
        }
        return ret;
    },

    arrayContentDidChange: function(index, removed, added) {
        this._requestOffsetIsSuspended = true;
        var ret = this._super.apply(this, arguments);
        this._requestOffsetIsSuspended = false;
        return ret;
    },

    _requestOffset: function(offset) {
        var self = this,
            type = this.get('type'),
            url = this.get('url'),
            query = this._buildServerQuery(),
            pageSize = this.get('pageSize'),
            length = this.get('length'),
            records,
            i,
            contentLength = this.get('content.length');
        for (i = offset; i < offset + pageSize; i++) {
            this._requestedIndexes[i] = true;
        }
        if (offset + pageSize > contentLength) {
            var placeholders = [];
            for (i = contentLength; i <= offset + pageSize && i < length; i++) {
                placeholders.push(BD.SPARSE_PLACEHOLDER);
            }
            this._requestOffsetIsSuspended = true;
            this.replaceContent(offset + pageSize, contentLength, placeholders);
            this._requestOffsetIsSuspended = false;
        }
        query.offset = offset;
        if (url) {
            records = type.findByUrl(url, query);
        } else {
            records = type.findByQuery(query);
        }
        this._pendingRequests.push(records);
        records.one('willLoad', function() {
            self._rejectAll = true;
        })
        records.one('didLoad', function(payload) {
            self._rejectAll = false;
            //Handle total
            var total = Ember.get(payload, 'meta.paging.total') || records.get('length');
            self.set('length', total);
            //Replace content
            self._requestOffsetIsSuspended = true;
            self.replaceContent(offset, records.get('content.length'), records.get('content'));
            self._requestOffsetIsSuspended = false;
            //Set isLoaded state
            self.set('isLoaded', true);
            self.trigger('didLoad', payload);
            //Clean up
            self._pendingRequests.removeObject(records);
            records.destroy();
        });
    },
    
    _buildServerQuery: function() {
        var type = this.get('type'),
            query = Em.copy(this.get('query')),
            remoteQuery = this.get('remoteQuery'),
            q = this.get('q'),
            sortProperty = this.get('sortProperty'),
            sortDirection = this.get('sortDirection'),
            pageSize = this.get('pageSize');
        _.each(query, function(value, key) {
            query[key] = value;
            Ember.get(type, 'belongsToRelationships').forEach(function(belongsToKey, meta) {
                if (belongsToKey == key) {
                    delete query[key];
                    meta.addToQuery(query, key, value);
                }
            })
        });
        if (q) {
            query.q = q;
        }
        if (sortProperty) {
            query.sortProperty = sortProperty;
            query.sortDirection = sortDirection;
        }
        if (pageSize) {
            query.pageSize = pageSize;
        }
        if (remoteQuery) {
            Em.merge(query, remoteQuery);
        }
        return query;
    },

    qCallback: function() {
        var q = this.get('q'),
            regex,
            qProperties;
        if (Em.isEmpty(q)) {
            return null;
        }
        regex = new RegExp(q, 'i');
        qProperties = Em.get(type, 'qProperties');
        return function(r) {
            var match = true;
            qProperties.find(function(k) {
                if (!regex.test(r.get(k))) {
                    match = false;
                    return true;
                }
                return false;
            });
            return match;
        };
    }.property('q'),

    _matchesQuery: function(r) {
        var query = this.get('query'),
            qCallback = this.get('qCallback'),
            match;
        if (typeof query === 'object') {
            match = true;
            _.find(query, function(v, k) {
                if (r.get(k) !== v) {
                    match = false;
                    return true;
                }
                return false;
            });
            if (!match) {
                return false;
            }
        }
        if (qCallback) {
            if (!qCallback(r)) {
                return false;
            }
        }
        return true;
    },
    _compare: function(a, b) {
        var self = this,
            comparator = this.get('comparator');
        if (typeof comparator === 'function') {
            return comparator(a, b);
        }
        if (typeof comparator === 'string') {
            var temp = comparator;
            comparator = {};
            comparator[temp] = 'ASC';
        }
        if (typeof comparator === 'object') {
            var result = 0;
            _.find(comparator, function(direction, property) {
                result = self._compareValues(a.get(property), b.get(property));
                if (direction === 'DESC') {
                    result *= -1;
                }
                if (result == 0) {
                    //Take next sort parameter
                    return false;
                }
                //End with this result
                return true;
            });
            return result;
        }
        return 0;
    },
    _compareValues: function(a, b) {
        if (typeof a !== 'string' || typeof b !== 'string') {
            return a - b;
        }
        return a.localeCompare(b);
    },

    checkRecordAgainstQuery: function(r) {
        if (this._rejectAll) {
            return;
        }
        var match = this._matchesQuery(r),
            isContained = this.contains(r),
            parent = this.get('parent'); //hasMany parent
        if (match && !isContained) {
            this._pushObjectSorted(r);
            if (parent) {
                parent.checkEmbeddedChildrenDirty();
            }
        } else if (!match && isContained) {
            this.removeObject(r);
            if (parent) {
                parent.checkEmbeddedChildrenDirty();
            }
        }
    },

    checkRecordAgainstComparator: function(r) {
        //If the record array does not contain the record, then don't do anything
        if (!r.isInRecordArray(this)) {
            return;
        }
        var index = this.indexOf(r),
            result;
        //Check the previous and next records. If the order of those 3 don't match, then reinsert the record.
        if (index > 0) {
            result = this._compare(r, this.objectAt(index-1));
            if (result < 0) {
                this.removeObject(r);
                this._pushObjectSorted(r);
                return;
            }
        }
        if (index < this.get('length') - 1) {
            result = this._compare(r, this.objectAt(index+1));
            if (result > 0) {
                this.removeObject(r);
                this._pushObjectSorted(r);
            }
        }
    },

    _pushObjectSorted: function(r) {
        var insertIndex = null,
            length = this.get('length');
        if (this.get('comparator') && length) {
            insertIndex = this._findInsertionPoint(r, 0, this.get('length')-1);
        }
        if (insertIndex === null) {
            this.pushObject(r);
        } else {
            this.insertAt(insertIndex, r);
        }
    },
    _findInsertionPoint: function(r, min, max) {
        var mid = Math.floor((min + max) / 2);
        var o = this.objectAt(mid);
        var s = this._compare(r, o)
        if (s < 0) {
            if (mid == min) {
                return mid;
            }
            return this._findInsertionPoint(r, min, mid-1);
        } else if (s > 0) {
            if (mid == max) {
                return mid+1;
            }
            return this._findInsertionPoint(r, mid+1, max);
        } else  {
            return mid;
        }
    },

    willDestroy: function() {
        BD.store.willDestroyRecordArray(this);
        this._pendingRequests.forEach(function(records) {
            records.destroy();
        });
        this._super();
    }
    
});