(function() {
  'use strict';

  /**
   *  Define all modules that the app uses
   */
  angular.module('littleBigApplication', [
    'ngRoute',
    'pascalprecht.translate',
    
    'app.components',
    'app.main'
  ]);
  
})();