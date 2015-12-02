/**
 *  Returns posts according to WordPress's WP_Query parameters. 
 *  The one default parameter is ignore_sticky_posts=1 (this can be overridden).
 *
 *  One of the following is required
 *  Invoking the JSON API implicitly (i.e., ?json=1) on a page URL
 *  id or page_id - set to the page's ID
 *  slug or page_slug - set to the page's URL slug
 *
 *  Optional arguments
 *  children - set to a non-empty value to include a recursive hierarchy of child pages
 *  post_type - used to retrieve custom post types
 *
 **/
angular.module('app.resources').factory('GetPageFactory', ['$resource', function($resource) {
  return $resource('/wordpress/wp-json/pages/:pageSlug', {pageSlug: '@slug'});
}]);
