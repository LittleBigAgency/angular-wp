/**
 *  Returns a list of every registered menu.
 *  https://wordpress.org/plugins/wp-api-menus/
 *
 **/
angular.module('app.resources').factory('GetMenusFactory', ['$resource', function($resource) {
  return $resource('/wordpress/wp-json/menus/:menuId', {menuId: '@id'});
}]);
