/**
 *  Returns a list of every registered menu.
 *  https://wordpress.org/plugins/wp-api-menus/
 *
 **/
angular.module('app.resources').factory('GetMenusFactory', function($resource) {
  return $resource('/wordpress/wp-json/menus/:menuId', {menuId: '@id'});
});
