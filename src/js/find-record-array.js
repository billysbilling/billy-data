BD.FindRecordArray = Em.ArrayProxy.extend(BD.RecordArray, {

    ajaxRequest: null,

    willDestroy: function() {
        var ajaxRequest = this.get('ajaxRequest');
        if (ajaxRequest) {
            ajaxRequest.abort();
        }
        this._super();
    }

});
