(function() {
  'use strict';

  /**
   *  Define all modules for the pages module
   */
  angular.module('blog', [
    'littleBigConstants',
    'ngResource',
    'ngSanitize',
    'ui.router',
    'app.resources'
    ])
    .config(['$stateProvider', '$translateProvider', 'config', function($stateProvider, $translateProvider, config) {
      $stateProvider
        .state('blog', {
          url: '/blog',
          templateUrl: config.main + '/blog/blog-overview/blog-overview.html',
          controller: 'BlogOverviewController as blog'
        })
        .state('blog-single', {
          url: '/blog/:postSlug',
          templateUrl: config.main + '/blog/blog-single/blog-single.html',
          controller: 'BlogSingleController as blog'
        });        

      /**
       *  Translations
       **/
      $translateProvider.translations('en', {
        BLOG_OVERVIEW_OTHER_CATEGORY: 'Select a different category',
        BLOG_OVERVIEW_NO_RESULTS: 'No posts found for this category'
      });
    }]);

})();
