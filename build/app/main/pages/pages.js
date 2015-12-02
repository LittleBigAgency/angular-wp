(function() {
  'use strict';

  /**
   *  Define all modules for the pages module
   */
  angular.module('pages', [
    'littleBigConstants',
    'ngResource',
    'ngSanitize',
    'ui.router',
    'app.resources',
    ])
    .config(['$stateProvider', 'config', function($stateProvider, config) {
      $stateProvider
        .state('pages', {
          url: '/page/:pageSlug',
          templateUrl: config.main + '/pages/pages.html',
          controller: 'PagesController as page'
        });
    }]);

})();
