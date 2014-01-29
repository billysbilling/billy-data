var _ = require('lodash'),
    moment = require('momentjs');

BD.AnonymousRecord = Em.ObjectProxy.extend(Em.Evented, {

    error: null,
    
    errors: null,

    init: function() {
        this._super();
        this.set('errors', {});
    },
    
    save: function(url, options) {
        options = options || {};
        var self = this,
            promise = BD.ModelOperationPromise.create(),
            data = {},
            serialized = {};
        options.root = options.root || 'record';
        //Payload
        _.each(this.get('content'), function(value, key) {
            if (options.models && options.models.contains(key)) {
                key = key + 'Id';
                value = value ? value.get('id') : null;
            }

            // Moment Object
            if (moment.isMoment(value)) {
                value = value.format('YYYY-MM-DD');
            }
            serialized[key] = value;
        });
        data[options.root] = serialized;
        //Make PUT/POST request
        BD.ajax({
            type: 'POST',
            url: url,
            data: data,
            success: function(payload) {
                BD.store.sideload(payload);
                promise.trigger('complete');
                promise.trigger('success', payload);
            },
            error: function(xhr) {
                var errorMessage,
                    payload = null;
                try {
                    payload = JSON.parse(xhr.responseText);
                } catch (e) {
                }
                if (xhr.status === 422 && payload) {
                    errorMessage = payload.errorMessage;
                    self._handleValidationErrors(payload, options);
                } else {
                    errorMessage = 'We\'re sorry but we couldn\'t successfully send your request. Please try again.';
                    self.set('error', errorMessage);
                }
                promise.trigger('complete');
                promise.trigger('error', errorMessage, xhr);
            },
            context: this
        });
        return promise;
    },
    _handleValidationErrors: function(payload, options) {
        var i,
            models = options.models,
            model,
            rawErrors;

        if (!payload || !payload.validationErrors) {
            return;
        }
        rawErrors = payload.validationErrors[options.root];
        if (!rawErrors) {
            return;
        }

        if (models && rawErrors.attributes) {
            for (i = 0; i < models.length; i += 1) {
                model = models[0];
                if (rawErrors.attributes.hasOwnProperty(model + 'Id')) {
                    rawErrors.attributes[model] = rawErrors.attributes[model + 'Id'];
                    delete rawErrors.attributes[model + 'Id'];
                }
            }
        }

        this.set('error', rawErrors.message);
        this.set('errors', rawErrors.attributes);
        this.trigger('didValidate');
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
