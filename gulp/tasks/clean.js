var gulp = require('gulp');
var del = require('del');

gulp.task('clean', function (done) {
  'use strict';

  del([
  	'build/**'
  ], done);
});