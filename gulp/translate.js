var gulp = require('gulp');
var gutil = require('gulp-util');
var angularTranslate = require('gulp-angular-translate');
var jsoncombine = require('gulp-jsoncombine');

/**
 * Concateneert alle json objecten uit de locale bestanden in de source tot een
 * json object, en schrijft deze weg in een tekstenbestand.
 */
gulp.task('translate-concat', function () {
  'use strict';

  var destFile = createFileName('lba', 'nl', 'json');

  return gulp.src([
    'src/main/angular/**/*-locale.json'
  ])
    .pipe(jsoncombine(destFile, mergeJsonCombine).on('error', function(err) {
      gutil.log(err);
      this.emit('end');
    }))
    .pipe(gulp.dest(TEXTS_DIR));
});

/**
 * Zet alle tekstbestanden (één per taal), om naar een angular module, en
 * schijft deze weg naar een javascript-bestand (één voor alle talen bij
 * elkaar) in de build folder. De module wordt in app.js als dependency
 * opgegeven.
 */
gulp.task('translate-2js', ['translate-concat'], function() {
  'use strict';

  gulp.src('./lba-*.json')
    .pipe(angularTranslate('lba.js', {module: 'lba.texts'}))
    .pipe(gulp.dest('./build'));
});

gulp.task('translate', ['translate-2js']);

/**
 * Maakt van het resultaatobject van de gulp module jsoncombine
 * een object dat een daadwerkelijke concatenering is
 * van de verschillende json objecten.
 * In plaats van elk object onder een eigen key in een nieuw object hangen.
 *
 * @param {Object} data Het resultaatobject van jsoncombine.
 * @return {Buffer} Een buffer van de json string van het omgezette object.
 */
function mergeJsonCombine(data) {
  'use strict';

  var result = {};
  var key;

  for (key in data) {
    removeComments(data[key]);
    if (!isSorted(data[key])) {
      console.warn('Het tekstenbestand ' + key +
          ' is niet alfabetisch gesorteerd op key');
    }
    _.merge(result, data[key]);
  }
  return new Buffer(JSON.stringify(result, null, 2));
}

// gulp.task('translate', function() {
//   return gulp.src([
//     './src/app/**/**/*-locale.json',
//     './src/app/**/**/**/*-locale.json'
//     ])
//     .pipe(angularTranslate())
//     .pipe(gulp.dest('build/app'));
// });