BD.SPARSE_PLACEHOLDER = {
    isLoaded: false
};

BD.SparseRecordArray = BD.RecordArray.extend({
    
    type: null,
    query: null,
    url: null,
    pageSize: 100,
    
    init: function() {
        this.requestedIndexes = {};
        this.set('content', Em.A());
        this.set('length', 0);
        this._super();
        this.pendingRequests = [];
        this.requestOffset(0);
    },
    
    objectAt: function(index) {
        var r = this._super(index);
        if (r && r != BD.SPARSE_PLACEHOLDER) {
            return r;
        }
        if (index < 0 || this.requestOffsetIsSuspended || BD.store.get('isResetting') || this.get('isDestroying')) {
            return BD.SPARSE_PLACEHOLDER;
        }
        if (!this.requestedIndexes[index]) {
            var pageSize = this.get('pageSize'),
                offset = Math.max(0, index - Math.floor(pageSize/2));
            while (offset <= index) {
                if (!this.requestedIndexes[offset]) {
                    break;
                }
                offset++;
            }
            this.requestOffset(offset);
        }
        return BD.SPARSE_PLACEHOLDER;
    },

    removeObject: function(o) {
        this.requestOffsetIsSuspended = true;
        this._super(o);
        this.requestOffsetIsSuspended = false;
    },

    removeAt: function(index) {
        var r = this.objectAt(index);
        this._super(index);
        if (r != BD.SPARSE_PLACEHOLDER) {
            this.set('length', this.get('length') - 1);
        }
    },

    arrayContentDidChange: function(index, removed, added) {
        this.requestOffsetIsSuspended = true;
        var ret = this._super.apply(this, arguments);
        this.requestOffsetIsSuspended = false;
        return ret;
    },


    requestOffset: function(offset) {
        var self = this,
            type = this.get('type'),
            url = this.get('url'),
            query = Em.copy(this.get('query')) || {},
            pageSize = this.get('pageSize'),
            records,
            i,
            contentLength = this.get('content.length');
        for (i = offset; i < offset + pageSize; i++) {
            this.requestedIndexes[i] = true;
        }
        if (offset + pageSize > contentLength) {
            var placeholders = [];
            for (i = contentLength; i <= offset + pageSize; i++) {
                placeholders.push(BD.SPARSE_PLACEHOLDER);
            }
            this.requestOffsetIsSuspended = true;
            this.replaceContent(offset + pageSize, contentLength, placeholders);
            this.requestOffsetIsSuspended = false;
        }
        query.offset = offset;
        query.pageSize = pageSize;
        if (url) {
            records = type.findByUrl(url, query);
        } else {
            records = type.findByQuery(query);
        }
        this.pendingRequests.push(records);
        records.one('didLoad', function(payload) {
            //Handle total
            var total = Ember.get(payload, 'meta.paging.total');
            Em.assert('No `total` property returned from server.', !Em.isEmpty(total));
            self.set('length', total);
            //Replace content
            self.requestOffsetIsSuspended = true;
            self.replaceContent(offset, records.get('content.length'), records.get('content'));
            self.requestOffsetIsSuspended = false;
            //Set isLoaded state
            self.set('isLoaded', true);
            self.trigger('didLoad', payload);
            //Clean up
            self.pendingRequests.removeObject(records);
            records.destroy();
        });
    },

    willDestroy: function() {
        this._super();
        this.pendingRequests.forEach(function(records) {
            records.destroy();
        });
    }
    
});