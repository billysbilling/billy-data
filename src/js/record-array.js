BD.RecordArray = Em.Mixin.create(Em.Evented, {

    isLoaded: false,

    isNotLoaded: Em.computed.not('isLoaded'),

    init: function() {
        this._super();
        var self = this;
        this.promise = new Em.RSVP.Promise(function(resolve, reject) {
            self.one('didLoad', function() {
                self.set('isLoaded', true);
                resolve(self);
            });
            self.one('didError', reject);
        });
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
        this.forEach(function(r) {
            r.didRemoveFromRecordArray(this);
        }, this);
            this._super();
    }

});
