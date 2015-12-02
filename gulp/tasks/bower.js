var gulp = require('gulp');
var gutil = require('gulp-util');
var sourcemaps = require('gulp-sourcemaps');
var bowerFiles = require('main-bower-files');
var ignore = require('gulp-ignore');
var concat = require('gulp-concat');
var uglify = require('gulp-uglify');
var uglifycss = require('gulp-uglifycss');


gulp.task('bower', ['vendorJS', 'vendorCSS']);

gulp.task('vendorJS', function() {
  return gulp.src(bowerFiles())
    .pipe(sourcemaps.init())
    .pipe(process.env.NODE_ENV === 'production' ? concat('libraries.js') : gutil.noop())
    .pipe(process.env.NODE_ENV === 'production' ? uglify() : gutil.noop())
    .pipe(sourcemaps.write())
    .pipe(gulp.dest('./build/libs'));
});

gulp.task('vendorCSS', function() {
  return gulp.src([
      './bower_components/components-font-awesome/css/font-awesome.css'
    ])
    .pipe(sourcemaps.init())
    .pipe(process.env.NODE_ENV === 'production' ? concat('libraries.css') : gutil.noop())
    .pipe(process.env.NODE_ENV === 'production' ? uglifycss() : gutil.noop())
    .pipe(gulp.dest('./build/libs'));
});