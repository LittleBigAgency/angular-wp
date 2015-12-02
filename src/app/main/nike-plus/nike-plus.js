(function() {
  'use strict';

  /**
   *  Define all modules for the pages module
   */
  angular.module('nike-plus', [
    'littleBigConstants',
    'ngResource',
    'ngSanitize',
    'ui.router',
    'app.resources'
    ])
    .config(function($stateProvider, $translateProvider, config) {
      $stateProvider
        .state('nike-plus', {
          url: '/nike-plus',
          templateUrl: config.main + '/nike-plus/nike-plus.html',
          controller: 'NikePlusController as nike'
        });
        // .state('nike-plus-single', {
        //   url: '/nike-plus/:runSlug',
        //   templateUrl: config.main + '/blog/blog-single/blog-single.html',
        //   controller: 'BlogSingleController as blog'
        // });

      /**
       *  Translations
       **/
      $translateProvider.translations('en', {});
    });

})();
