BD.RecordArray = Em.ArrayProxy.extend(Em.Evented, {

    isLoaded: false,
    content: null,

    init: function() {
        this._super();
        this.forEach(function(r) {
            r.inRecordArrays[Em.guidFor(this)] = this;
        }, this);
    },
    
    arrayContentWillChange: function(index, removed, added) {
        var ret = this._super.apply(this, arguments);
        var r,
            i;
        if (removed) {
            for (i = 0; i < removed; i++) {
                r = this.objectAt(index + i);
                delete r.inRecordArrays[Em.guidFor(this)];
            }
        }
        return ret;
    },
    arrayContentDidChange: function(index, removed, added) {
        var ret = this._super.apply(this, arguments);
        var r,
            i;
        if (added) {
            for (i = 0; i < added; i++) {
                r = this.objectAt(index + i);
                r.inRecordArrays[Em.guidFor(this)] = this;
            }
        }
        return ret;
    },
    
    willDestroy: function() {
        this.forEach(function(r) {
            delete r.inRecordArrays[Em.guidFor(this)];
        }, this);
        this._super();
    }

});

BD.FilteredRecordArray = BD.RecordArray.extend({
    
    id: null,
    type: null,
    query: null,
    queryObservers: null,
    comparator: null,
    comparatorObservers: null,
    parent: null,
    
    rejectAll: false,
    
    refresh: function() {
        var typeMap = BD.store.typeMapFor(this.get('type')),
            content = []
        _.each(typeMap.idToRecord, function(r) {
            if (this.matchesQuery(r)) {
                content.push(r);
            }
        }, this);
        content.sort(this.compare.bind(this));
        this.set('content', content);
        this.set('isLoaded', true);
    },

    remoteRefresh: function() {
        var self = this,
            type = this.get('type'),
            query = this.get('query');
        Ember.assert('Query has to be an object to be able to call remoteRefresh() on a BD.FilteredRecordArray.', typeof query == 'object');
        this.set('rejectAll', true);
        var remoteQuery = {};
        _.each(query, function(value, key) {
            remoteQuery[key] = value;
            Ember.get(type, 'belongsToRelationships').forEach(function(belongsToKey, meta) {
                if (belongsToKey == key) {
                    delete remoteQuery[key];
                    meta.addToQuery(remoteQuery, key, value);
                }
            })
        });
        var recordArray = BD.store.findByQuery(type, remoteQuery);
        recordArray.one('didLoad', function() {
            var content = recordArray.get('content');
            self.set('content', content);
            self.set('isLoaded', true);
            recordArray.destroy();
            self.set('rejectAll', false);
        });
        recordArray.one('error', function() {
            self.set('rejectAll', false);
        });
    },

    pushIds: function(ids) {
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
                r.one('didLoad', function() {
                    pending--;
                    if (pending == 0) {
                        self.set('isLoaded', true);
                    }
                });
            }
            this.pushObjectSorted(r);
        }, this);
        if (pending == 0) {
            this.set('isLoaded', true);
        }
    },

    matchesQuery: function(r) {
        var query = this.get('query');
        if (typeof query === 'object') {
            var match = true;
            _.find(query, function(v, k) {
                if (r.get(k) !== v) {
                    match = false;
                    return true;
                }
                return false;
            });
            return match;
        } else if (typeof query === 'function') {
            return query(r);
        } else {
            return true;
        }
    },
    compare: function(a, b) {
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
                result = self.compareValues(a.get(property), b.get(property));
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
    compareValues: function(a, b) {
        if (typeof a !== 'string' || typeof b !== 'string') {
            return a - b;
        }
        return a.localeCompare(b);
    },

    checkRecordAgainstQuery: function(r) {
        if (this.get('rejectAll')) {
            return;
        }
        var match = this.matchesQuery(r),
            isContained = this.contains(r),
            parent = this.get('parent'); //hasMany parent
        if (match && !isContained) {
            this.pushObjectSorted(r);
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
        if (!r.inRecordArrays[Em.guidFor(this)]) {
            return;
        }
        var index = this.indexOf(r),
            result;
        //Check the previous and next records. If the order of those 3 don't match, then reinsert the record.
        if (index > 0) {
            result = this.compare(r, this.objectAt(index-1));
            if (result < 0) {
                this.removeObject(r);
                this.pushObjectSorted(r);
                return;
            }
        }
        if (index < this.get('length') - 1) {
            result = this.compare(r, this.objectAt(index+1));
            if (result > 0) {
                this.removeObject(r);
                this.pushObjectSorted(r);
            }
        }
    },

    pushObjectSorted: function(r) {
        var insertIndex = null;
        if (this.get('comparator')) {
            insertIndex = this.findInsertionPoint(r, 0, this.get('length')-1);
        }
        if (insertIndex === null) {
            this.pushObject(r);
        } else {
            this.insertAt(insertIndex, r);
        }
    },
    findInsertionPoint: function(r, min, max) {
        var mid = Math.floor((min + max) / 2);
        var o = this.objectAt(mid);
        var s = this.compare(r, o)
        if (s < 0) {
            if (mid == min) {
                return mid;
            }
            return this.findInsertionPoint(r, min, mid-1);
        } else if (s > 0) {
            if (mid == max) {
                return mid+1;
            }
            return this.findInsertionPoint(r, mid+1, max);
        } else  {
            return mid;
        }
    },

    willDestroy: function() {
        BD.store.willDestroyRecordArray(this);
        this._super();
    }
    
})