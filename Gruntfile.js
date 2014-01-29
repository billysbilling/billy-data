module.exports = function(grunt) {
    grunt.initConfig({
        'billy-builder': {
            title: 'Billy Data',

            jshint: true
        }
    });

    grunt.loadNpmTasks('billy-builder');
};