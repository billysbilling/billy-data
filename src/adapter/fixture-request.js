BD.FixtureRequest = Ember.Object.extend({

    DELAY: 500,

    init: function() {
        this.timeoutId = null;
    },

    abort: function() {
        if (!this.timeoutId) {
            Ember.warn('There is no scheduled callback');
        }

        this.clearTimeout(this.timeoutId);
        this.timeoutId = null;
    },

    schedule: function(cb) {
        this.timeoutId = this.setTimeout(cb, this.DELAY);
    },

    clearTimeout: function(id) {
        return window.clearTimeout(id);
    },

    setTimeout: function(cb, delay) {
        return window.setTimeout(cb, delay);
    }

});