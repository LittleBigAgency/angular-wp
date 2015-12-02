(function() {
  'use strict';

  /**
   *  Define all constants
   */
  angular.module('littleBigConstants', []).constant('config', {
    'main': '../build/app/main',
    'resources': '../build/app/resources',
    'components': '../build/app/components'
  });
  
})();