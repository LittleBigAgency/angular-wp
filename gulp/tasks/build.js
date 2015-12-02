var gulp = require('gulp');
var runSequence = require('run-sequence');

gulp.task('build', function(callback) {
  'use strict';

  runSequence('clean', [
    'bower',
    'scripts',
    'copy',
    'sass',
    'images',
    'fonts',
    'inject',
    // 'translate'
    ],
    callback);
});