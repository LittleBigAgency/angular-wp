/**
 *  Returns 302 when user is found, 403 when not authenticated
 *
 **/
angular.module('app.resources').factory('GetCurrentUserFactory', function($resource) {
  return $resource('/wordpress/wp-json/users/me');
});
