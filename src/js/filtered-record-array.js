var _ = require('lodash');

BD.SPARSE_PLACEHOLDER = Ember.Object.create({
    isLoaded: false
});

BD.FilteredRecordArray = Em.Object.extend(Em.Array, BD.RecordArray, {

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
    sortDirection: null,

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
        this._content = {};
        this._indexForRecord = {};
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
            comparatorObservers = this.get('comparatorObservers') || [];
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
        if (Em.isEmpty(sortDirection)) {
            sortDirection = 'ASC';
        }
        if (!comparator && sortProperty) {
            var sortMacro = type.getSortMacro(sortProperty);
            if (sortMacro) {
                comparator = function(a, b) {
                    return (sortDirection === 'DESC' ? -1 : 1) * sortMacro.comparator(a, b);
                };
                comparatorObservers.pushObjects(sortMacro.dependencies);
            } else {
                comparator = {};
                comparator[sortProperty] = sortDirection;
            }
            this.set('comparator', comparator);
        }
        //Normalize comparator properties to observe
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
            if (!r.get('isLoaded')) {
                pending++;
                r.promise.then(function() {
                    pending--;
                    if (pending == 0) {
                        self._triggerDidLoadAsync();
                    }
                }, function(err) {
                    self._triggerDidLoadAsync(err);
                });
            }
            self._pushObjectSorted(r);
        }, this);
        if (pending == 0) {
            self._triggerDidLoadAsync();
        }
    },

    _filterLocally: function() {
        var self = this,
            records = [],
            length;
        BD.store.eachRecordOfType(this.get('type'), function(r) {
            if (this._matchesQuery(r)) {
                records.push(r);
            }
        }, this);
        records.sort(function(a, b) {
            return self._compare(a, b);
        });
        length = records.length;
        this.set('length', length);
        self._replace(0, records);
        self._triggerDidLoadAsync();
    },

    _triggerDidLoadAsync: function() {
        var self = this;
        Em.run.next(function() {
            self.trigger('didLoad');
        });
    },

    _triggerDidErrorAsync: function(err) {
        var self = this;
        Em.run.next(function() {
            self.trigger('didError', err);
        });
    },

    objectAt: function(index) {
        if (index < 0 || index > this.get('length')-1) {
            return null;
        }
        var r = this._content[index];
        if (r) {
            return r;
        }
        if (this._requestOffsetIsSuspended || BD.store.get('isResetting') || this.get('isDestroying')) {
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
    
    indexOf: function(r) {
        return this._indexForRecord[r.clientId];
    },
    removeObject: function(r) {
        this.removeAt(this.indexOf(r));
    },
    removeAt: function(index) {
        var r = this._content[index];
        if (r) {
            this._requestOffsetIsSuspended = true;
            this.arrayContentWillChange(index, 1, 0);
            delete this._content[index];
            delete this._indexForRecord[r.clientId];
            var length = this.get('length');
            for (var i = index+1; i < length; i++) {
                this._move(i, i-1);
            }
            this.decrementProperty('length');
            this.arrayContentDidChange(index, 1, 0);
            this._requestOffsetIsSuspended = false;
        }
    },
    _move: function(from, to) {
        var r = this._content[from];
        if (r) {
            delete this._content[from];
            this._content[to] = r;
            this._indexForRecord[r.clientId] = to;
        }
    },
    pushObject: function(r) {
        var insertIndex = this.get('length');
        //Length might be greater than the actual last element (if the array is sparse)
        //So we need to decrement insertIndex until right before we hit another element
        while (insertIndex > 0 && !this._content[insertIndex-1]) {
            insertIndex--;
        }
        this.insertAt(insertIndex, r);
    },
    insertAt: function(index, r) {
        this._requestOffsetIsSuspended = true;
        this.arrayContentWillChange(index, 0, 1);
        var length = this.get('length');
        for (var i = length-1; i >= index; i--) {
            this._move(i, i+1);
        }
        this._content[index] = r;
        this._indexForRecord[r.clientId] = index;
        if (!this._isReplacing) {
            this.incrementProperty('length');
        }
        this.arrayContentDidChange(index, 0, 1);
        this._requestOffsetIsSuspended = false;
    },
    _replace: function(index, records) {
        var length = records.get('length'),
            i,
            hasRecords = false;
        //Figure out if the record array has any records at the indexes where we're about to insert records
        for (i = 0; i < length; i++) {
            if (this._content[index + i]) {
                hasRecords = true;
                break;
            }
        }
        if (hasRecords) {
            //If the record array already contains records at the given indexes, then we need to push the new records sorted
            this._isReplacing = true;
            records.forEach(function(r) {
                if (Em.isEmpty(this._indexForRecord[r.clientId])) {
                    this._pushObjectSorted(r);
                }
            }, this);
            this._isReplacing = false;
        } else {
            //Otherwise we can just add all the records
            this.arrayContentWillChange(index, 0, length);
            records.forEach(function(r, recordIndex) {
                this._content[index + recordIndex] = r;
                this._indexForRecord[r.clientId] = index + recordIndex;
            }, this);
            this.arrayContentDidChange(index, 0, length);
        }
    },
    reinsertObject: function(r) {
        var oldIndex = this._indexForRecord[r.clientId],
            newIndex = this._findInsertIndex(r),
            i,
            diff,
            changeIndex;
        //We need to subtract one from the newIndex if it's greater than the old index, since one of those spots in between is itself
        if (newIndex > oldIndex) {
            newIndex--;
        }
        //Only reinsert the object if it has been moved
        if (oldIndex != newIndex) {
            this._requestOffsetIsSuspended = true;
            changeIndex = Math.min(newIndex, oldIndex);
            diff = Math.abs(newIndex - oldIndex) + 1;
            this.arrayContentWillChange(changeIndex, diff, diff);
            if (newIndex > oldIndex) {
                //If an item is moved to the right
                for (i = oldIndex+1; i <= newIndex; i++) {
                    this._move(i, i-1);
                }
            } else {
                //If an item is moved to the left
                for (i = oldIndex-1; i >= newIndex; i--) {
                    this._move(i, i+1);
                }
            }
            this._content[newIndex] = r;
            this._indexForRecord[r.clientId] = newIndex;
            this.arrayContentDidChange(changeIndex, diff, diff);
            this._requestOffsetIsSuspended = false;
        }
    },
    forEach: function(callback, context) {
        var content = this._content,
            index;
        for (index in content) {
            if (!content.hasOwnProperty(index)) continue;
            callback.call(context, content[index], index);
        }
    },

    _requestOffset: function(offset) {
        var self = this,
            type = this.get('type'),
            query = this._buildServerQuery(),
            pageSize = this.get('pageSize'),
            length = this.get('length'),
            records,
            i;
        for (i = offset; i < offset + pageSize; i++) {
            this._requestedIndexes[i] = true;
        }
        query.offset = offset;
        records = type.findByQuery(query);
        this._pendingRequests.push(records);
        records.one('willLoad', function() {
            self._rejectAll = true;
        });
        records.on('didLoad', function(payload) {
            self._rejectAll = false;
            //Handle total
            var recordsLength = records.get('length'),
                total = Ember.get(payload, 'meta.paging.total') || recordsLength;
            self.set('length', total);
            //Add records
            self._requestOffsetIsSuspended = true;
            self._replace(offset, records);
            self._requestOffsetIsSuspended = false;
            //Trigger didLoad event
            self.trigger('didLoad', payload);
            //Clean up
            self._pendingRequests.removeObject(records);
            records.destroy();
        });
        records.on('didError', function() {
            self._rejectAll = false;
            self.trigger('didError');
        });
    },
    
    _buildServerQuery: function() {
        var type = this.get('type'),
            query = _.extend({}, this.get('query'), this.get('remoteQuery')),
            q = this.get('q'),
            sortProperty = this.get('sortProperty'),
            sortDirection = this.get('sortDirection'),
            pageSize = this.get('pageSize');
        _.each(query, function(value, key) {
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
        return query;
    },

    qCallback: function() {
        var type = this.get('type'),
            q = this.get('q'),
            regex,
            qProperties;
        if (Em.isEmpty(q)) {
            return null;
        }
        q = (q+'').replace(/([.?*+^$[\]\\(){}|-])/g, "\\$1");
        regex = new RegExp(q, 'i');
        qProperties = Em.get(type, 'qProperties');
        Em.assert("You need to set `qProperties` on the model class "+type.toString()+". As in `"+type.toString()+".reopenClass({qProperties: ['prop1', 'prop2']})`", Em.isArray(qProperties));
        return function(r) {
            var match = false;
            qProperties.find(function(k) {
                if (regex.test(r.get(k))) {
                    match = true;
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
                if (Ember.isArray(v)) {
                    if (!v.contains(r.get(k))) {
                        match = false;
                        return true;
                    }
                } else {
                    if (r.get(k) !== v) {
                        match = false;
                        return true;
                    }
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
        if (this._rejectAll) {
            return;
        }
        //If the record array does not contain the record, then don't do anything
        if (!r.isInRecordArray(this)) {
            return;
        }
        var index = this.indexOf(r),
            o; //Other record
        //Check the previous and next records. If the order of those 3 don't match, then reinsert the record.
        if (index > 0) {
            //If the record on the left is sparse, or this record is less than it, then reinsert
            o = this._content[index-1];
            if (!o || this._compare(r, o) < 0) {
                this.reinsertObject(r);
                return;
            }
        }
        if (index < this.get('length') - 1) {
            //If the record on the right is sparse, or this record is greater than it, then reinsert
            o = this._content[index+1];
            if (!o || this._compare(r, o) > 0) {
                this.reinsertObject(r);
            }
        }
    },

    _pushObjectSorted: function(r) {
        var insertIndex = this._findInsertIndex(r);
        if (insertIndex === null) {
            this.pushObject(r);
        } else {
            this.insertAt(insertIndex, r);
        }
    },
    _findInsertIndex: function(r) {
        var insertIndex = null,
            length = this.get('length');
        if (this.get('comparator') && length) {
            insertIndex = this._binarySearch(r, 0, length-1);
        }
        return insertIndex;
    },
    _binarySearch: function(r, min, max) {
        var mid = Math.floor((min + max) / 2),
            o, //Other record
            s, //Sort value
            b; //Sub binary search result
        o = this._content[mid];
        //If other record is equal to this record, then don't use it
        if (o === r) {
            o = null;
        }
        //If no o was found, then its either because mid is the current record or we've hit a sparse index
        if (!o) {
            //If mid is max, then mid is the final result
            if (mid == max) {
                return mid;
            }
            //Do a binary search to the right (in the interval from mid (excluding mid) to max). If the insertion point is after this, then just return it 
            b = this._binarySearch(r, mid+1, max);
            if (b > mid+1) {
                return b;
            }
            //If mid is min, then mid is the final result
            if (mid == min) {
                return mid;
            }
            //Otherwise do a binary search to the left (in the interval from min to mid (excluding mid)) and use this result no matter what
            b = this._binarySearch(r, min, mid-1);
            return b;
        }
        //Compare normally
        s = this._compare(r, o)
        if (s < 0) {
            if (mid == min) {
                return mid;
            }
            return this._binarySearch(r, min, mid-1);
        } else if (s > 0) {
            if (mid == max) {
                return mid+1;
            }
            return this._binarySearch(r, mid+1, max);
        } else  {
            return mid;
        }
    },

    willDestroy: function() {
        BD.store.willDestroyFilteredRecordArray(this);
        this._pendingRequests.forEach(function(records) {
            records.destroy();
        });
        this._super();
    }
    
});
