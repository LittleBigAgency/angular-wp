/**
 *  Returns posts according to WordPress's WP_Query parameters. 
 *  The one default parameter is ignore_sticky_posts=1 (this can be overridden).
 *
 *  Optional arguments
 *  count - determines how many posts per page are returned (default value is 10)
 *  page - return a specific page number from the results
 *  post_type - used to retrieve custom post types
 *
 **/
angular.module('app.resources').factory('GetPostsByTypeFactory', ['$resource', function($resource) {
  return $resource('/wordpress/wp-json/posts/?type=:postType', {postType: '@type'});
}]);
