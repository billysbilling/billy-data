BD.RecordArray = Em.ArrayProxy.extend(Em.Evented, {

    isLoaded: false,
    content: null,

    ajaxRequest: null,

    init: function() {
        this._super();
        this.forEach(function(r) {
            r.didAddToRecordArray(this);
        }, this);
    },
    
    arrayContentWillChange: function(index, removed, added) {
        var ret = this._super.apply(this, arguments);
        var r,
            i;
        if (removed) {
            for (i = 0; i < removed; i++) {
                r = this.objectAt(index + i);
                if (r !== BD.SPARSE_PLACEHOLDER) {
                    r.didRemoveFromRecordArray(this);
                }
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
                if (r !== BD.SPARSE_PLACEHOLDER) {
                    r.didAddToRecordArray(this);
                }
            }
        }
        return ret;
    },
    
    willDestroy: function() {
        this._super();
        var ajaxRequest = this.get('ajaxRequest');
        if (ajaxRequest) {
            ajaxRequest.abort();
        }
        this.forEach(function(r) {
            if (r !== BD.SPARSE_PLACEHOLDER) {
                r.didRemoveFromRecordArray(this);
            }
        }, this);
        this._super();
    },
    
    whenLoaded: function(callback) {
        if (this.get('isLoaded')) {
            callback();
        } else {
            this.one('didLoad', callback);
        }
    }

});