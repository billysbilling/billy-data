BD.FindRecordArray = Em.ArrayProxy.extend(BD.RecordArray, {

    ajaxRequest: null,

    willDestroy: function() {
        var ajaxRequest = this.get('ajaxRequest');
        if (ajaxRequest) {
            ajaxRequest.abort();
        }
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