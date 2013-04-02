module.exports = function(grunt) {

    grunt.initConfig({
        meta: {
            name: 'Billy Data'
        },
        concat: {
            dist: {
                separator: '\n\n',
                src: [
                    'src/bd.js',
                    'src/store.js',
                    'src/anonymous-record.js',
                    'src/model.js',
                    'src/attributes.js',
                    'src/model-operation-promise.js',
                    'src/record-array.js',
                    'src/find-record-array.js',
                    'src/filtered-record-array.js',
                    'src/sparse-record-array.js',
                    'src/transaction.js',
                    'src/transforms.js'
                ],
                dest: 'dist/billy-data.js'
            }
        },
        uglify: {
            dist: {
                src: ['dist/billy-data.js'],
                dest: 'dist/billy-data.min.js'
            }
        }
    });

    grunt.loadNpmTasks('grunt-contrib-concat');
    grunt.loadNpmTasks('grunt-contrib-uglify');
    grunt.registerTask('default', ['concat', 'uglify']);

};