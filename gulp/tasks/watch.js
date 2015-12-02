var gulp = require('gulp');
var gutil = require('gulp-util');
var watch = require('gulp-watch');

gulp.task('watch', ['setWatch'], function() {
  'use strict';

  watch('src/assets/css/strapless/**/*.scss', {name: 'sass'}, function(events, done) {
    gulp.start('sass');
  });

  watch('src/assets/img/**', {name: 'image'}, function(events, done) {
    gulp.start('images');
  });

  watch('src/assets/fonts/**', {name: 'font'}, function(events, done) {
    gulp.start('fonts');
  });

  watch([
      'src/app/**/**/*.html', 
      'src/app/**/**/**/*.html'
    ], {name: 'template'}, function(events, done) {
    gulp.start('copy');
  });

  watch([
    './src/app/**'
    ], {name: 'javascript'}, function(events, done) {
    gulp.start('inject');
  });
});