var gulp = require('gulp');
var changed = require('gulp-changed');
var es = require('event-stream');
var minifyHtml = require('gulp-minify-html');
var dest = './build/app';


gulp.task('copy', function () {
  'use strict';

  return es.merge(
    getHtml()
  ).pipe(gulp.dest(dest));
});


function getHtml() {
  'use strict';

  return gulp.src([
    './src/app/**/**/*.html',
    './src/app/**/**/**/*.html'
  ])
  .pipe(changed(dest))
  .pipe(minifyHtml({
    empty  : true,
    spare  : true,
    quotes : true
  }));

}
