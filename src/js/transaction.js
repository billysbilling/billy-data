BD.Transaction = BD.ModelOperationPromise.extend({

    records: null,
    type: null,
    hasCommitted: false,

    init: function() {
        this._super();
        this.set('records', new Em.Map());
    },

    length: function() {
        return this.get('records.keys.list.length');
    }.property().volatile(),

    add: function(r, options) {
        Ember.assert('This transaction has already been committed.', !this.get('hasCommitted'));
        options = BD.store._normalizeSaveOptions(options);
        var records = this.get('records'),
            type = this.get('type');
        if (this.get('length') === 0) {
            this.set('type', r.constructor);
        } else {
            Ember.assert('A transaction can only contain records of the same type. This transaction already has '+type.toString()+' records, but you tried to add a '+r.constructor.toString()+' record.', r.constructor === type);
        }
        records.set(r, options);
        return this;
    },

    commit: function() {
        return BD.store.commitTransaction(this);
    }

});
