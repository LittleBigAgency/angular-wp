(function() {
  'use strict';
 
  angular.module('lba.ContentLoader', [
    'littleBigConstants'
  ])
  .directive('lbaContentLoader', function ($log, $rootScope, config) {
    return {
      restrict: 'E',
      scope: true,
      templateUrl: config.components + '/content-loader/content-loader.html',
      link: function (scope, element, attrs) {

        /**
         *  Activate loader
         **/
        $rootScope.$on('lbaContentLoader.activate', function(event) {
          scope.active = true;
        });

        /**
         *  Deactivate loader
         **/
        $rootScope.$on('lbaContentLoader.deactivate', function() {
          scope.active = false;
        });

        /**
         *  State change
         **/
        $rootScope.$on('$stateChangeStart', function() {
          scope.active = false;
        });
      }
    };
  });

})();