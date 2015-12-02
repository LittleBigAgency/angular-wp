var gulp = require('gulp');
var inject = require('gulp-inject');
var gutil = require('gulp-util');
var urlDev = 'http://lba.dev';
var urlPro = 'http://littlebigagency.com';

gulp.task('inject', ['inject-js', 'inject-css']);

gulp.task('inject-css', ['sass'], function () {
  'use strict';

  return gulp.src('./index.html') // edit to the file where the inject:css is
    .pipe(inject(
      gulp.src([
        './build/libs/*.css',
        './build/assets/css/**/*.css'
      ]),
      {
        starttag: '<!-- inject:css -->',
        addPrefix: process.env.NODE_ENV === 'production' ? urlPro : urlDev,
        addRootSlash: false,
        read: false
      }
    ))
    .pipe(gulp.dest(''));
});

gulp.task('inject-js', ['scripts'], function () {
  'use strict';

  return gulp.src('./index.html') // edit to the file where the inject:js is placed
    .pipe(inject(
      gulp.src([
        '!./build/libs/html5shiv.js',
        '!./build/libs/respond.src.js',
        './build/libs/jquery.js',
        './build/libs/angular.js',
        './build/libs/angular-resource.js',
        './build/libs/**.js',

        './build/app/*.modules.js',
        './build/app/*.config.js',
        './build/**/!(*-)*.js',
        './build/**/!(*-*-)*.js',
        './build/**/!(*-*-*-)*.js',
        './build/app/**/*.*.js',
        './build/app/**/**/*.js'
      ]),
      {
        starttag: '<!-- inject:js -->',
        addPrefix: process.env.NODE_ENV === 'production' ? urlPro : urlDev,
        addRootSlash: false,
        read: false
      }
    ))
    .pipe(gulp.dest(''));
});