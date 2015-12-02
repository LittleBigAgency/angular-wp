var gulp = require('gulp');
var jshint = require('gulp-jshint');
var stylish = require('jshint-stylish');

gulp.task('jshint', function () {
  gulp.src([
  	'src/app/*.js',
    'src/app/**/*.js',
    'src/app/**/**/*.js',
    'src/app/**/**/**/*.js'
  ])
    .pipe(jshint())
    .pipe(jshint.reporter('jshint-stylish'))
    .pipe(jshint.reporter('fail'));
});