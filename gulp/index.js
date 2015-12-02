var fs = require('fs');
var onlyScripts = require('./util/scriptFilter');
var tasks = fs.readdirSync('./gulp/tasks/').filter(onlyScripts);
var gutil = require('gulp-util');

// set NODE_ENV environment variabele indien niet gezet of override indien gulp  met flag --PROD of --DEV is gestart.
if (gutil.env.prod || gutil.env.PROD) {
  process.env.NODE_ENV = 'production';
} else if (gutil.env.dev || gutil.env.DEV) {
  process.env.NODE_ENV = 'development';
}  else {
  process.env.NODE_ENV = process.env.NODE_ENV || 'development';
}

if (process.env.NODE_ENV==='production') {
  gutil.log(gutil.colors.green('PRODUCTION BUILD'));
} else if (process.env.NODE_ENV==='development') {
  gutil.log(gutil.colors.yellow('DEVELOPMENT BUILD'));
} else {
  gutil.log(gutil.colors.red('UNKNOWN BUILD TYPE:', process.env.NODE_ENV));
}

tasks.forEach(function (task) {
  'use strict';

  require('./tasks/' + task);
});