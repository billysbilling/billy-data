BD.FixtureRequest = Ember.Object.extend({

    DELAY: 500,

    init: function() {
        this.timeoutId = null;
    },

    abort: function() {
        if (this.timeoutId) {
            this.triggerAjaxStop();
            this.clearTimeout(this.timeoutId);
            this.timeoutId = null;
        } else {
            Ember.warn('There is no scheduled callback');
        }
    },

    schedule: function(cb) {
        var self = this;
        this.triggerAjaxStart();
        this.timeoutId = this.setTimeout(function() {
            Em.run(function() {
                cb();
                self.timeoutId = null;
                self.triggerAjaxStop();
            });
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
