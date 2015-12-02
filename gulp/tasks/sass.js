var gutil = require('gulp-util');
var autoprefixer = require('gulp-autoprefixer');
var bless = require('gulp-bless');
var gulp = require('gulp');
var handleErrors = require('../util/handleErrors');
var sass = require('gulp-sass');
var uglifycss = require('gulp-uglifycss');

gulp.task('sass', function() {
  'use strict';

  return gulp.src('./src/assets/css/**/**/!(_).scss')
    .pipe(sass())
    .on('error', handleErrors)
    .pipe(autoprefixer())
    .pipe(bless())
    .pipe(process.env.NODE_ENV === 'production' ? uglifycss() : gutil.noop())
    .pipe(gulp.dest('./build/assets/css'));
});