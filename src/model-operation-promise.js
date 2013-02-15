BD.ModelOperationPromise = Em.Object.extend(Em.Evented, {

    on: function() {
        this._super.apply(this, arguments);
        return this;
    }

});