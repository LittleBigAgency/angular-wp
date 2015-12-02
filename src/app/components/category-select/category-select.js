(function() {
  'use strict';
 
  angular.module('lba.CategorySelect', [
    'littleBigConstants'
  ])
  .config(function($translateProvider) {
    $translateProvider.translations('en', {
      UI_SELECT_CATEGORY_CURRENT: 'Current Category'
    });
  })
  .directive('lbaCategorySelect', function ($rootScope, config, GetCategoryTerms) {
    return {
      restrict: 'E',
      templateUrl: config.components + '/category-select/category-select.html',
      link: function (scope, element, attrs) {
        scope.currentCategory = {
          name: 'All'
        };

        GetCategoryTerms.query(function(result) {
          scope.categories = result;
        });

        scope.setCategory = function(index) {
          scope.isActive = !scope.isActive;

          if(typeof index === 'undefined') {
            scope.currentCategory = {
              name: 'All'
            };
          } else {
            scope.currentCategory = scope.categories[index];
          }
        };
      }
    };
  });

})();