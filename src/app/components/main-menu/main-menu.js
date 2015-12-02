(function() {
  'use strict';
 
  angular.module('lba.MainMenu', [
    'littleBigConstants'
  ])
  .directive('lbaMainMenu', function ($log, config, GetMenusFactory) {
    return {
      restrict: 'E',
      templateUrl: config.components + '/main-menu/main-menu.html',
      link: function (scope, element, attrs) {
        GetMenusFactory.get({menuId: 2}, function(data) {
          scope.menu = data;
        }, function() {

        });
      }
    };
  });

})();