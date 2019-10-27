module.exports = function(grunt) {

  require('load-grunt-tasks')(grunt);

  grunt.loadNpmTasks('grunt-execute');
  grunt.loadNpmTasks('grunt-contrib-clean');
  grunt.loadNpmTasks('grunt-build-number');

  grunt.initConfig({

    clean: ["dist"],

    copy: {
      src_to_dist: {
        cwd: 'src',
        expand: true,
        src: [
          '**/*',
          '!*.js',
          '!module.js',
          '!**/*.scss'
        ],
        dest: 'dist/'
      },
      pluginDef: {
        expand: true,
        src: ['plugin.json'],
        dest: 'dist/',
      }
    },

    watch: {
      rebuild_all: {
        files: ['src/**/*', 'plugin.json'],
        tasks: ['default'],
        options: {spawn: false}
      },
    },

    babel: {
      options: {
        sourceMap: true,
        presets:  ["es2015"],
        plugins: ['transform-es2015-modules-systemjs', "transform-es2015-for-of"],
      },
      dist: {
        files: [{
          cwd: 'src',
          expand: true,
          src: [
            '*.js',
            'module.js',
          ],
          dest: 'dist/'
        }]
      },
    },

    sass: {
      options: {
        sourceMap: true
      },
      dist: {
        files: {
          
        }
      }
    }

  });

  grunt.registerTask('default', [
    'clean',
    'copy:src_to_dist',
    'copy:pluginDef',
    'babel'
  ]);
};