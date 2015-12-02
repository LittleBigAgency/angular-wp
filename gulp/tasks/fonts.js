var gulp = require('gulp');
var changed = require('gulp-changed');

gulp.task('fonts', function () {
  var dest = './build/assets/fonts';

  return gulp.src([
  		'./src/assets/fonts/**/*.*',
  		'./bower_components/components-font-awesome/fonts/*.*'
  	])
    .pipe(changed(dest))
    .pipe(gulp.dest(dest));
});