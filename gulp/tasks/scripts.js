var gulp = require('gulp');
var gutil = require('gulp-util');
var ngAnnotate = require('gulp-ng-annotate');
var concat = require('gulp-concat');
var uglify = require('gulp-uglify');
var changed = require('gulp-changed');
var jshint = require('gulp-jshint');
var sourcemaps = require('gulp-sourcemaps');
//var debug = require('gulp-debug');
var lazypipe = require('lazypipe');
var app = require('../../package.json');
var dest = './build/app';

var productionChannel = lazypipe()
  .pipe(sourcemaps.init)
  .pipe(concat, 'lba_' + '.js')
  .pipe(uglify)
  .pipe(sourcemaps.write, 'maps');

var developmentChannel = lazypipe()
  .pipe(changed, dest);


gulp.task('scripts', function () {
  'use strict';

  return gulp.src([
    './src/app/*.js',
    './src/app/*/*.js',
    './src/app/*/*/*.js',
    './src/app/*/*/*/*.js',
    ], {debug: false})
    .pipe(jshint())
    .pipe(jshint.reporter('jshint-stylish'))
    .pipe(jshint.reporter('fail').on('error', function(err) {
      gutil.log(err.message);
      this.emit('end');
    }))
    .pipe(ngAnnotate({
      remove: true,
      add: true,
      single_quotes: true
    }))
    .pipe(process.env.NODE_ENV === 'production' ? productionChannel() : developmentChannel())
    .pipe(gulp.dest(dest));
});