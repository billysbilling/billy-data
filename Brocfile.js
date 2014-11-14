var pickFiles = require('broccoli-static-compiler')
var mergeTrees = require('broccoli-merge-trees')
var billyBuilder = require('broccoli-billy-builder')

var src = pickFiles('src/js', {
    srcDir: '/',
    destDir: '/billy-data'
});

var dependencies = 'bower_components';

srcAndDeps = mergeTrees([src, dependencies])

var js = billyBuilder(srcAndDeps, {
    outputFile: 'billy-data.js',
    modules: {
        'billy-data': {
            include: ['/'],
            main: 'index'
        },
        inflectors: true
    },
    legacyFiles: [
        'jquery/jquery.js',
        'handlebars/handlebars.js',
        'ember/ember.js',
        'lodash/dist/lodash.js',
        'momentjs/moment.js'
    ]
})

module.exports = js
