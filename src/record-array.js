BD.RecordArray = Em.Mixin.create(Em.Evented, {

    isLoaded: false,

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

    whenLoaded: function(callback) {
        if (this.get('isLoaded')) {
            callback();
        } else {
            this.one('didLoad', callback);
        }
    },

    willDestroy: function() {
        this.forEach(function(r) {
            r.didRemoveFromRecordArray(this);
        }, this);
    }

});