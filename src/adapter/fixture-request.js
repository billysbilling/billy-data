BD.FixtureRequest = Ember.Object.extend({

    DELAY: 500,

    init: function() {
        this.timeoutId = null;
    },

    abort: function() {
        if (!this.timeoutId) {
            Ember.warn('There is no scheduled callback');
        }

        this.triggerAjaxStop();
        this.clearTimeout(this.timeoutId);
        this.timeoutId = null;
    },

    schedule: function(cb) {
        var self = this;
        this.triggerAjaxStart();
        this.timeoutId = this.setTimeout(function() {
            self.triggerAjaxStop();
            cb();
        }, this.DELAY);
    },

    clearTimeout: function(id) {
        return window.clearTimeout(id);
    },

    setTimeout: function(cb, delay) {
        return window.setTimeout(cb, delay);
    },

    triggerAjaxStart: function() {
        jQuery.event.trigger('ajaxStart');
    },

    triggerAjaxStop: function() {
        jQuery.event.trigger('ajaxStop');
    }

});
