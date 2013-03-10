BD.AnonymousRecord = Em.ObjectProxy.extend({

    error: null,
    
    errors: function() {
        return {};
    }.property(),
    
    save: function(url) {
        var promise = BD.ModelOperationPromise.create();
        //Payload
        var serialized = {};
        _.each(this.get('content'), function(value, key) {
            serialized[key] = value;
        });
        //Make PUT/POST request
        BD.ajax({
            type: 'POST',
            url: url,
            data: {
                record: serialized
            },
            success: function(payload) {
                promise.trigger('complete');
                promise.trigger('success', payload);
            },
            error: function(xhr) {
                if (xhr.status == 422) {
                    this._handleValidationErrors(xhr);
                } else {
                    this.set('error', 'We\'re sorry but we couldn\'t successfully send your request. Please try again.');
                }
                promise.trigger('complete');
                promise.trigger('error');
            },
            context: this
        });
        return promise;
    },
    _handleValidationErrors: function(xhr) {
        var data = JSON.parse(xhr.responseText);
        if (!data.validationErrors) {
            return;
        }
        var rawErrors = data.validationErrors.record;
        if (!rawErrors) {
            return;
        }
        this.set('error', rawErrors.message);
        this.set('errors', rawErrors.attributes);
    }

});

BD.AnonymousRecord.reopenClass({
    _create: BD.AnonymousRecord.create,
    create: function() {
        throw new Ember.Error("You should not call `create` on BD.AnonymousRecord. Instead, call createRecord` with the attributes you would like to set.");
    },
    createRecord: function(data) {
        return BD.AnonymousRecord._create({
            content: data
        });
    }
});