module.exports = function(grunt) {

    // Project configuration.
    grunt.initConfig({
        pkg: grunt.file.readJSON('package.json'),
        src: {
            js: ['src/*.js']
        },
        concat: {
            options: {
            },
            dist: {
                src: ['<%= src.js %>'],
                dest: './<%= pkg.name %>.debug.js'
            }
        },
        uglify: {
            main: {
                src: ['<%= pkg.name %>.debug.js'],
                dest: '<%= pkg.name %>.min.js'
            }
        }
    });

    // Load the plugin that provides the "uglify" task.
    grunt.loadNpmTasks('grunt-contrib-concat');
    grunt.loadNpmTasks('grunt-contrib-uglify');
};
