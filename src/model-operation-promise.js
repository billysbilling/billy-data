BD.ModelOperationPromise = Em.Object.extend(Em.Evented, {

    on: function() {
        this._super.apply(this, arguments);
        return this;
    },
    success: function(callback) {
        return this.on('success', callback);
    },
    error: function(callback) {
        return this.on('error', callback);
    }

});