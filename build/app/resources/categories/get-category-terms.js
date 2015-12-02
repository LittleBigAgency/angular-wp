(function() {
  'use strict';

  angular.module('app.resources').factory('GetCategoryTerms', ['$resource', function($resource) {
    return $resource('/wordpress/wp-json/taxonomies/category/terms');
  }]);
})();