var gulp = require('gulp');
var changed = require('gulp-changed');
var imagemin = require('gulp-imagemin');

gulp.task('images', function () {
  var dest = './build/assets/img';

  return gulp.src('./src/assets/img/*')
    .pipe(changed(dest))
    .pipe(imagemin())
    .pipe(gulp.dest(dest));
});