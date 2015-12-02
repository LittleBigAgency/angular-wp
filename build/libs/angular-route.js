/**
 * @license AngularJS v1.3.17
 * (c) 2010-2014 Google, Inc. http://angularjs.org
 * License: MIT
 */
(function(window, angular, undefined) {'use strict';

/**
 * @ngdoc module
 * @name ngRoute
 * @description
 *
 * # ngRoute
 *
 * The `ngRoute` module provides routing and deeplinking services and directives for angular apps.
 *
 * ## Example
 * See {@link ngRoute.$route#example $route} for an example of configuring and using `ngRoute`.
 *
 *
 * <div doc-module-components="ngRoute"></div>
 */
 /* global -ngRouteModule */
var ngRouteModule = angular.module('ngRoute', ['ng']).
                        provider('$route', $RouteProvider),
    $routeMinErr = angular.$$minErr('ngRoute');

/**
 * @ngdoc provider
 * @name $routeProvider
 *
 * @description
 *
 * Used for configuring routes.
 *
 * ## Example
 * See {@link ngRoute.$route#example $route} for an example of configuring and using `ngRoute`.
 *
 * ## Dependencies
 * Requires the {@link ngRoute `ngRoute`} module to be installed.
 */
function $RouteProvider() {
  function inherit(parent, extra) {
    return angular.extend(Object.create(parent), extra);
  }

  var routes = {};

  /**
   * @ngdoc method
   * @name $routeProvider#when
   *
   * @param {string} path Route path (matched against `$location.path`). If `$location.path`
   *    contains redundant trailing slash or is missing one, the route will still match and the
   *    `$location.path` will be updated to add or drop the trailing slash to exactly match the
   *    route definition.
   *
   *    * `path` can contain named groups starting with a colon: e.g. `:name`. All characters up
   *        to the next slash are matched and stored in `$routeParams` under the given `name`
   *        when the route matches.
   *    * `path` can contain named groups starting with a colon and ending with a star:
   *        e.g.`:name*`. All characters are eagerly stored in `$routeParams` under the given `name`
   *        when the route matches.
   *    * `path` can contain optional named groups with a question mark: e.g.`:name?`.
   *
   *    For example, routes like `/color/:color/largecode/:largecode*\/edit` will match
   *    `/color/brown/largecode/code/with/slashes/edit` and extract:
   *
   *    * `color: brown`
   *    * `largecode: code/with/slashes`.
   *
   *
   * @param {Object} route Mapping information to be assigned to `$route.current` on route
   *    match.
   *
   *    Object properties:
   *
   *    - `controller` – `{(string|function()=}` – Controller fn that should be associated with
   *      newly created scope or the name of a {@link angular.Module#controller registered
   *      controller} if passed as a string.
   *    - `controllerAs` – `{string=}` – A controller alias name. If present the controller will be
   *      published to scope under the `controllerAs` name.
   *    - `template` – `{string=|function()=}` – html template as a string or a function that
   *      returns an html template as a string which should be used by {@link
   *      ngRoute.directive:ngView ngView} or {@link ng.directive:ngInclude ngInclude} directives.
   *      This property takes precedence over `templateUrl`.
   *
   *      If `template` is a function, it will be called with the following parameters:
   *
   *      - `{Array.<Object>}` - route parameters extracted from the current
   *        `$location.path()` by applying the current route
   *
   *    - `templateUrl` – `{string=|function()=}` – path or function that returns a path to an html
   *      template that should be used by {@link ngRoute.directive:ngView ngView}.
   *
   *      If `templateUrl` is a function, it will be called with the following parameters:
   *
   *      - `{Array.<Object>}` - route parameters extracted from the current
   *        `$location.path()` by applying the current route
   *
   *    - `resolve` - `{Object.<string, function>=}` - An optional map of dependencies which should
   *      be injected into the controller. If any of these dependencies are promises, the router
   *      will wait for them all to be resolved or one to be rejected before the controller is
   *      instantiated.
   *      If all the promises are resolved successfully, the values of the resolved promises are
   *      injected and {@link ngRoute.$route#$routeChangeSuccess $routeChangeSuccess} event is
   *      fired. If any of the promises are rejected the
   *      {@link ngRoute.$route#$routeChangeError $routeChangeError} event is fired. The map object
   *      is:
   *
   *      - `key` – `{string}`: a name of a dependency to be injected into the controller.
   *      - `factory` - `{string|function}`: If `string` then it is an alias for a service.
   *        Otherwise if function, then it is {@link auto.$injector#invoke injected}
   *        and the return value is treated as the dependency. If the result is a promise, it is
   *        resolved before its value is injected into the controller. Be aware that
   *        `ngRoute.$routeParams` will still refer to the previous route within these resolve
   *        functions.  Use `$route.current.params` to access the new route parameters, instead.
   *
   *    - `redirectTo` – {(string|function())=} – value to update
   *      {@link ng.$location $location} path with and trigger route redirection.
   *
   *      If `redirectTo` is a function, it will be called with the following parameters:
   *
   *      - `{Object.<string>}` - route parameters extracted from the current
   *        `$location.path()` by applying the current route templateUrl.
   *      - `{string}` - current `$location.path()`
   *      - `{Object}` - current `$location.search()`
   *
   *      The custom `redirectTo` function is expected to return a string which will be used
   *      to update `$location.path()` and `$location.search()`.
   *
   *    - `[reloadOnSearch=true]` - {boolean=} - reload route when only `$location.search()`
   *      or `$location.hash()` changes.
   *
   *      If the option is set to `false` and url in the browser changes, then
   *      `$routeUpdate` event is broadcasted on the root scope.
   *
   *    - `[caseInsensitiveMatch=false]` - {boolean=} - match routes without being case sensitive
   *
   *      If the option is set to `true`, then the particular route can be matched without being
   *      case sensitive
   *
   * @returns {Object} self
   *
   * @description
   * Adds a new route definition to the `$route` service.
   */
  this.when = function(path, route) {
    //copy original route object to preserve params inherited from proto chain
    var routeCopy = angular.copy(route);
    if (angular.isUndefined(routeCopy.reloadOnSearch)) {
      routeCopy.reloadOnSearch = true;
    }
    if (angular.isUndefined(routeCopy.caseInsensitiveMatch)) {
      routeCopy.caseInsensitiveMatch = this.caseInsensitiveMatch;
    }
    routes[path] = angular.extend(
      routeCopy,
      path && pathRegExp(path, routeCopy)
    );

    // create redirection for trailing slashes
    if (path) {
      var redirectPath = (path[path.length - 1] == '/')
            ? path.substr(0, path.length - 1)
            : path + '/';

      routes[redirectPath] = angular.extend(
        {redirectTo: path},
        pathRegExp(redirectPath, routeCopy)
      );
    }

    return this;
  };

  /**
   * @ngdoc property
   * @name $routeProvider#caseInsensitiveMatch
   * @description
   *
   * A boolean property indicating if routes defined
   * using this provider should be matched using a case insensitive
   * algorithm. Defaults to `false`.
   */
  this.caseInsensitiveMatch = false;

   /**
    * @param path {string} path
    * @param opts {Object} options
    * @return {?Object}
    *
    * @description
    * Normalizes the given path, returning a regular expression
    * and the original path.
    *
    * Inspired by pathRexp in visionmedia/express/lib/utils.js.
    */
  function pathRegExp(path, opts) {
    var insensitive = opts.caseInsensitiveMatch,
        ret = {
          originalPath: path,
          regexp: path
        },
        keys = ret.keys = [];

    path = path
      .replace(/([().])/g, '\\$1')
      .replace(/(\/)?:(\w+)([\?\*])?/g, function(_, slash, key, option) {
        var optional = option === '?' ? option : null;
        var star = option === '*' ? option : null;
        keys.push({ name: key, optional: !!optional });
        slash = slash || '';
        return ''
          + (optional ? '' : slash)
          + '(?:'
          + (optional ? slash : '')
          + (star && '(.+?)' || '([^/]+)')
          + (optional || '')
          + ')'
          + (optional || '');
      })
      .replace(/([\/$\*])/g, '\\$1');

    ret.regexp = new RegExp('^' + path + '$', insensitive ? 'i' : '');
    return ret;
  }

  /**
   * @ngdoc method
   * @name $routeProvider#otherwise
   *
   * @description
   * Sets route definition that will be used on route change when no other route definition
   * is matched.
   *
   * @param {Object|string} params Mapping information to be assigned to `$route.current`.
   * If called with a string, the value maps to `redirectTo`.
   * @returns {Object} self
   */
  this.otherwise = function(params) {
    if (typeof params === 'string') {
      params = {redirectTo: params};
    }
    this.when(null, params);
    return this;
  };


  this.$get = ['$rootScope',
               '$location',
               '$routeParams',
               '$q',
               '$injector',
               '$templateRequest',
               '$sce',
      function($rootScope, $location, $routeParams, $q, $injector, $templateRequest, $sce) {

    /**
     * @ngdoc service
     * @name $route
     * @requires $location
     * @requires $routeParams
     *
     * @property {Object} current Reference to the current route definition.
     * The route definition contains:
     *
     *   - `controller`: The controller constructor as define in route definition.
     *   - `locals`: A map of locals which is used by {@link ng.$controller $controller} service for
     *     controller instantiation. The `locals` contain
     *     the resolved values of the `resolve` map. Additionally the `locals` also contain:
     *
     *     - `$scope` - The current route scope.
     *     - `$template` - The current route template HTML.
     *
     * @property {Object} routes Object with all route configuration Objects as its properties.
     *
     * @description
     * `$route` is used for deep-linking URLs to controllers and views (HTML partials).
     * It watches `$location.url()` and tries to map the path to an existing route definition.
     *
     * Requires the {@link ngRoute `ngRoute`} module to be installed.
     *
     * You can define routes through {@link ngRoute.$routeProvider $routeProvider}'s API.
     *
     * The `$route` service is typically used in conjunction with the
     * {@link ngRoute.directive:ngView `ngView`} directive and the
     * {@link ngRoute.$routeParams `$routeParams`} service.
     *
     * @example
     * This example shows how changing the URL hash causes the `$route` to match a route against the
     * URL, and the `ngView` pulls in the partial.
     *
     * <example name="$route-service" module="ngRouteExample"
     *          deps="angular-route.js" fixBase="true">
     *   <file name="index.html">
     *     <div ng-controller="MainController">
     *       Choose:
     *       <a href="Book/Moby">Moby</a> |
     *       <a href="Book/Moby/ch/1">Moby: Ch1</a> |
     *       <a href="Book/Gatsby">Gatsby</a> |
     *       <a href="Book/Gatsby/ch/4?key=value">Gatsby: Ch4</a> |
     *       <a href="Book/Scarlet">Scarlet Letter</a><br/>
     *
     *       <div ng-view></div>
     *
     *       <hr />
     *
     *       <pre>$location.path() = {{$location.path()}}</pre>
     *       <pre>$route.current.templateUrl = {{$route.current.templateUrl}}</pre>
     *       <pre>$route.current.params = {{$route.current.params}}</pre>
     *       <pre>$route.current.scope.name = {{$route.current.scope.name}}</pre>
     *       <pre>$routeParams = {{$routeParams}}</pre>
     *     </div>
     *   </file>
     *
     *   <file name="book.html">
     *     controller: {{name}}<br />
     *     Book Id: {{params.bookId}}<br />
     *   </file>
     *
     *   <file name="chapter.html">
     *     controller: {{name}}<br />
     *     Book Id: {{params.bookId}}<br />
     *     Chapter Id: {{params.chapterId}}
     *   </file>
     *
     *   <file name="script.js">
     *     angular.module('ngRouteExample', ['ngRoute'])
     *
     *      .controller('MainController', function($scope, $route, $routeParams, $location) {
     *          $scope.$route = $route;
     *          $scope.$location = $location;
     *          $scope.$routeParams = $routeParams;
     *      })
     *
     *      .controller('BookController', function($scope, $routeParams) {
     *          $scope.name = "BookController";
     *          $scope.params = $routeParams;
     *      })
     *
     *      .controller('ChapterController', function($scope, $routeParams) {
     *          $scope.name = "ChapterController";
     *          $scope.params = $routeParams;
     *      })
     *
     *     .config(function($routeProvider, $locationProvider) {
     *       $routeProvider
     *        .when('/Book/:bookId', {
     *         templateUrl: 'book.html',
     *         controller: 'BookController',
     *         resolve: {
     *           // I will cause a 1 second delay
     *           delay: function($q, $timeout) {
     *             var delay = $q.defer();
     *             $timeout(delay.resolve, 1000);
     *             return delay.promise;
     *           }
     *         }
     *       })
     *       .when('/Book/:bookId/ch/:chapterId', {
     *         templateUrl: 'chapter.html',
     *         controller: 'ChapterController'
     *       });
     *
     *       // configure html5 to get links working on jsfiddle
     *       $locationProvider.html5Mode(true);
     *     });
     *
     *   </file>
     *
     *   <file name="protractor.js" type="protractor">
     *     it('should load and compile correct template', function() {
     *       element(by.linkText('Moby: Ch1')).click();
     *       var content = element(by.css('[ng-view]')).getText();
     *       expect(content).toMatch(/controller\: ChapterController/);
     *       expect(content).toMatch(/Book Id\: Moby/);
     *       expect(content).toMatch(/Chapter Id\: 1/);
     *
     *       element(by.partialLinkText('Scarlet')).click();
     *
     *       content = element(by.css('[ng-view]')).getText();
     *       expect(content).toMatch(/controller\: BookController/);
     *       expect(content).toMatch(/Book Id\: Scarlet/);
     *     });
     *   </file>
     * </example>
     */

    /**
     * @ngdoc event
     * @name $route#$routeChangeStart
     * @eventType broadcast on root scope
     * @description
     * Broadcasted before a route change. At this  point the route services starts
     * resolving all of the dependencies needed for the route change to occur.
     * Typically this involves fetching the view template as well as any dependencies
     * defined in `resolve` route property. Once  all of the dependencies are resolved
     * `$routeChangeSuccess` is fired.
     *
     * The route change (and the `$location` change that triggered it) can be prevented
     * by calling `preventDefault` method of the event. See {@link ng.$rootScope.Scope#$on}
     * for more details about event object.
     *
     * @param {Object} angularEvent Synthetic event object.
     * @param {Route} next Future route information.
     * @param {Route} current Current route information.
     */

    /**
     * @ngdoc event
     * @name $route#$routeChangeSuccess
     * @eventType broadcast on root scope
     * @description
     * Broadcasted after a route dependencies are resolved.
     * {@link ngRoute.directive:ngView ngView} listens for the directive
     * to instantiate the controller and render the view.
     *
     * @param {Object} angularEvent Synthetic event object.
     * @param {Route} current Current route information.
     * @param {Route|Undefined} previous Previous route information, or undefined if current is
     * first route entered.
     */

    /**
     * @ngdoc event
     * @name $route#$routeChangeError
     * @eventType broadcast on root scope
     * @description
     * Broadcasted if any of the resolve promises are rejected.
     *
     * @param {Object} angularEvent Synthetic event object
     * @param {Route} current Current route information.
     * @param {Route} previous Previous route information.
     * @param {Route} rejection Rejection of the promise. Usually the error of the failed promise.
     */

    /**
     * @ngdoc event
     * @name $route#$routeUpdate
     * @eventType broadcast on root scope
     * @description
     * The `reloadOnSearch` property has been set to false, and we are reusing the same
     * instance of the Controller.
     *
     * @param {Object} angularEvent Synthetic event object
     * @param {Route} current Current/previous route information.
     */

    var forceReload = false,
        preparedRoute,
        preparedRouteIsUpdateOnly,
        $route = {
          routes: routes,

          /**
           * @ngdoc method
           * @name $route#reload
           *
           * @description
           * Causes `$route` service to reload the current route even if
           * {@link ng.$location $location} hasn't changed.
           *
           * As a result of that, {@link ngRoute.directive:ngView ngView}
           * creates new scope and reinstantiates the controller.
           */
          reload: function() {
            forceReload = true;
            $rootScope.$evalAsync(function() {
              // Don't support cancellation of a reload for now...
              prepareRoute();
              commitRoute();
            });
          },

          /**
           * @ngdoc method
           * @name $route#updateParams
           *
           * @description
           * Causes `$route` service to update the current URL, replacing
           * current route parameters with those specified in `newParams`.
           * Provided property names that match the route's path segment
           * definitions will be interpolated into the location's path, while
           * remaining properties will be treated as query params.
           *
           * @param {!Object<string, string>} newParams mapping of URL parameter names to values
           */
          updateParams: function(newParams) {
            if (this.current && this.current.$$route) {
              newParams = angular.extend({}, this.current.params, newParams);
              $location.path(interpolate(this.current.$$route.originalPath, newParams));
              // interpolate modifies newParams, only query params are left
              $location.search(newParams);
            } else {
              throw $routeMinErr('norout', 'Tried updating route when with no current route');
            }
          }
        };

    $rootScope.$on('$locationChangeStart', prepareRoute);
    $rootScope.$on('$locationChangeSuccess', commitRoute);

    return $route;

    /////////////////////////////////////////////////////

    /**
     * @param on {string} current url
     * @param route {Object} route regexp to match the url against
     * @return {?Object}
     *
     * @description
     * Check if the route matches the current url.
     *
     * Inspired by match in
     * visionmedia/express/lib/router/router.js.
     */
    function switchRouteMatcher(on, route) {
      var keys = route.keys,
          params = {};

      if (!route.regexp) return null;

      var m = route.regexp.exec(on);
      if (!m) return null;

      for (var i = 1, len = m.length; i < len; ++i) {
        var key = keys[i - 1];

        var val = m[i];

        if (key && val) {
          params[key.name] = val;
        }
      }
      return params;
    }

    function prepareRoute($locationEvent) {
      var lastRoute = $route.current;

      preparedRoute = parseRoute();
      preparedRouteIsUpdateOnly = preparedRoute && lastRoute && preparedRoute.$$route === lastRoute.$$route
          && angular.equals(preparedRoute.pathParams, lastRoute.pathParams)
          && !preparedRoute.reloadOnSearch && !forceReload;

      if (!preparedRouteIsUpdateOnly && (lastRoute || preparedRoute)) {
        if ($rootScope.$broadcast('$routeChangeStart', preparedRoute, lastRoute).defaultPrevented) {
          if ($locationEvent) {
            $locationEvent.preventDefault();
          }
        }
      }
    }

    function commitRoute() {
      var lastRoute = $route.current;
      var nextRoute = preparedRoute;

      if (preparedRouteIsUpdateOnly) {
        lastRoute.params = nextRoute.params;
        angular.copy(lastRoute.params, $routeParams);
        $rootScope.$broadcast('$routeUpdate', lastRoute);
      } else if (nextRoute || lastRoute) {
        forceReload = false;
        $route.current = nextRoute;
        if (nextRoute) {
          if (nextRoute.redirectTo) {
            if (angular.isString(nextRoute.redirectTo)) {
              $location.path(interpolate(nextRoute.redirectTo, nextRoute.params)).search(nextRoute.params)
                       .replace();
            } else {
              $location.url(nextRoute.redirectTo(nextRoute.pathParams, $location.path(), $location.search()))
                       .replace();
            }
          }
        }

        $q.when(nextRoute).
          then(function() {
            if (nextRoute) {
              var locals = angular.extend({}, nextRoute.resolve),
                  template, templateUrl;

              angular.forEach(locals, function(value, key) {
                locals[key] = angular.isString(value) ?
                    $injector.get(value) : $injector.invoke(value, null, null, key);
              });

              if (angular.isDefined(template = nextRoute.template)) {
                if (angular.isFunction(template)) {
                  template = template(nextRoute.params);
                }
              } else if (angular.isDefined(templateUrl = nextRoute.templateUrl)) {
                if (angular.isFunction(templateUrl)) {
                  templateUrl = templateUrl(nextRoute.params);
                }
                if (angular.isDefined(templateUrl)) {
                  nextRoute.loadedTemplateUrl = $sce.valueOf(templateUrl);
                  template = $templateRequest(templateUrl);
                }
              }
              if (angular.isDefined(template)) {
                locals['$template'] = template;
              }
              return $q.all(locals);
            }
          }).
          // after route change
          then(function(locals) {
            if (nextRoute == $route.current) {
              if (nextRoute) {
                nextRoute.locals = locals;
                angular.copy(nextRoute.params, $routeParams);
              }
              $rootScope.$broadcast('$routeChangeSuccess', nextRoute, lastRoute);
            }
          }, function(error) {
            if (nextRoute == $route.current) {
              $rootScope.$broadcast('$routeChangeError', nextRoute, lastRoute, error);
            }
          });
      }
    }


    /**
     * @returns {Object} the current active route, by matching it against the URL
     */
    function parseRoute() {
      // Match a route
      var params, match;
      angular.forEach(routes, function(route, path) {
        if (!match && (params = switchRouteMatcher($location.path(), route))) {
          match = inherit(route, {
            params: angular.extend({}, $location.search(), params),
            pathParams: params});
          match.$$route = route;
        }
      });
      // No route matched; fallback to "otherwise" route
      return match || routes[null] && inherit(routes[null], {params: {}, pathParams:{}});
    }

    /**
     * @returns {string} interpolation of the redirect path with the parameters
     */
    function interpolate(string, params) {
      var result = [];
      angular.forEach((string || '').split(':'), function(segment, i) {
        if (i === 0) {
          result.push(segment);
        } else {
          var segmentMatch = segment.match(/(\w+)(?:[?*])?(.*)/);
          var key = segmentMatch[1];
          result.push(params[key]);
          result.push(segmentMatch[2] || '');
          delete params[key];
        }
      });
      return result.join('');
    }
  }];
}

ngRouteModule.provider('$routeParams', $RouteParamsProvider);


/**
 * @ngdoc service
 * @name $routeParams
 * @requires $route
 *
 * @description
 * The `$routeParams` service allows you to retrieve the current set of route parameters.
 *
 * Requires the {@link ngRoute `ngRoute`} module to be installed.
 *
 * The route parameters are a combination of {@link ng.$location `$location`}'s
 * {@link ng.$location#search `search()`} and {@link ng.$location#path `path()`}.
 * The `path` parameters are extracted when the {@link ngRoute.$route `$route`} path is matched.
 *
 * In case of parameter name collision, `path` params take precedence over `search` params.
 *
 * The service guarantees that the identity of the `$routeParams` object will remain unchanged
 * (but its properties will likely change) even when a route change occurs.
 *
 * Note that the `$routeParams` are only updated *after* a route change completes successfully.
 * This means that you cannot rely on `$routeParams` being correct in route resolve functions.
 * Instead you can use `$route.current.params` to access the new route's parameters.
 *
 * @example
 * ```js
 *  // Given:
 *  // URL: http://server.com/index.html#/Chapter/1/Section/2?search=moby
 *  // Route: /Chapter/:chapterId/Section/:sectionId
 *  //
 *  // Then
 *  $routeParams ==> {chapterId:'1', sectionId:'2', search:'moby'}
 * ```
 */
function $RouteParamsProvider() {
  this.$get = function() { return {}; };
}

ngRouteModule.directive('ngView', ngViewFactory);
ngRouteModule.directive('ngView', ngViewFillContentFactory);


/**
 * @ngdoc directive
 * @name ngView
 * @restrict ECA
 *
 * @description
 * # Overview
 * `ngView` is a directive that complements the {@link ngRoute.$route $route} service by
 * including the rendered template of the current route into the main layout (`index.html`) file.
 * Every time the current route changes, the included view changes with it according to the
 * configuration of the `$route` service.
 *
 * Requires the {@link ngRoute `ngRoute`} module to be installed.
 *
 * @animations
 * enter - animation is used to bring new content into the browser.
 * leave - animation is used to animate existing content away.
 *
 * The enter and leave animation occur concurrently.
 *
 * @scope
 * @priority 400
 * @param {string=} onload Expression to evaluate whenever the view updates.
 *
 * @param {string=} autoscroll Whether `ngView` should call {@link ng.$anchorScroll
 *                  $anchorScroll} to scroll the viewport after the view is updated.
 *
 *                  - If the attribute is not set, disable scrolling.
 *                  - If the attribute is set without value, enable scrolling.
 *                  - Otherwise enable scrolling only if the `autoscroll` attribute value evaluated
 *                    as an expression yields a truthy value.
 * @example
    <example name="ngView-directive" module="ngViewExample"
             deps="angular-route.js;angular-animate.js"
             animations="true" fixBase="true">
      <file name="index.html">
        <div ng-controller="MainCtrl as main">
          Choose:
          <a href="Book/Moby">Moby</a> |
          <a href="Book/Moby/ch/1">Moby: Ch1</a> |
          <a href="Book/Gatsby">Gatsby</a> |
          <a href="Book/Gatsby/ch/4?key=value">Gatsby: Ch4</a> |
          <a href="Book/Scarlet">Scarlet Letter</a><br/>

          <div class="view-animate-container">
            <div ng-view class="view-animate"></div>
          </div>
          <hr />

          <pre>$location.path() = {{main.$location.path()}}</pre>
          <pre>$route.current.templateUrl = {{main.$route.current.templateUrl}}</pre>
          <pre>$route.current.params = {{main.$route.current.params}}</pre>
          <pre>$routeParams = {{main.$routeParams}}</pre>
        </div>
      </file>

      <file name="book.html">
        <div>
          controller: {{book.name}}<br />
          Book Id: {{book.params.bookId}}<br />
        </div>
      </file>

      <file name="chapter.html">
        <div>
          controller: {{chapter.name}}<br />
          Book Id: {{chapter.params.bookId}}<br />
          Chapter Id: {{chapter.params.chapterId}}
        </div>
      </file>

      <file name="animations.css">
        .view-animate-container {
          position:relative;
          height:100px!important;
          background:white;
          border:1px solid black;
          height:40px;
          overflow:hidden;
        }

        .view-animate {
          padding:10px;
        }

        .view-animate.ng-enter, .view-animate.ng-leave {
          -webkit-transition:all cubic-bezier(0.250, 0.460, 0.450, 0.940) 1.5s;
          transition:all cubic-bezier(0.250, 0.460, 0.450, 0.940) 1.5s;

          display:block;
          width:100%;
          border-left:1px solid black;

          position:absolute;
          top:0;
          left:0;
          right:0;
          bottom:0;
          padding:10px;
        }

        .view-animate.ng-enter {
          left:100%;
        }
        .view-animate.ng-enter.ng-enter-active {
          left:0;
        }
        .view-animate.ng-leave.ng-leave-active {
          left:-100%;
        }
      </file>

      <file name="script.js">
        angular.module('ngViewExample', ['ngRoute', 'ngAnimate'])
          .config(['$routeProvider', '$locationProvider',
            function($routeProvider, $locationProvider) {
              $routeProvider
                .when('/Book/:bookId', {
                  templateUrl: 'book.html',
                  controller: 'BookCtrl',
                  controllerAs: 'book'
                })
                .when('/Book/:bookId/ch/:chapterId', {
                  templateUrl: 'chapter.html',
                  controller: 'ChapterCtrl',
                  controllerAs: 'chapter'
                });

              $locationProvider.html5Mode(true);
          }])
          .controller('MainCtrl', ['$route', '$routeParams', '$location',
            function($route, $routeParams, $location) {
              this.$route = $route;
              this.$location = $location;
              this.$routeParams = $routeParams;
          }])
          .controller('BookCtrl', ['$routeParams', function($routeParams) {
            this.name = "BookCtrl";
            this.params = $routeParams;
          }])
          .controller('ChapterCtrl', ['$routeParams', function($routeParams) {
            this.name = "ChapterCtrl";
            this.params = $routeParams;
          }]);

      </file>

      <file name="protractor.js" type="protractor">
        it('should load and compile correct template', function() {
          element(by.linkText('Moby: Ch1')).click();
          var content = element(by.css('[ng-view]')).getText();
          expect(content).toMatch(/controller\: ChapterCtrl/);
          expect(content).toMatch(/Book Id\: Moby/);
          expect(content).toMatch(/Chapter Id\: 1/);

          element(by.partialLinkText('Scarlet')).click();

          content = element(by.css('[ng-view]')).getText();
          expect(content).toMatch(/controller\: BookCtrl/);
          expect(content).toMatch(/Book Id\: Scarlet/);
        });
      </file>
    </example>
 */


/**
 * @ngdoc event
 * @name ngView#$viewContentLoaded
 * @eventType emit on the current ngView scope
 * @description
 * Emitted every time the ngView content is reloaded.
 */
ngViewFactory.$inject = ['$route', '$anchorScroll', '$animate'];
function ngViewFactory($route, $anchorScroll, $animate) {
  return {
    restrict: 'ECA',
    terminal: true,
    priority: 400,
    transclude: 'element',
    link: function(scope, $element, attr, ctrl, $transclude) {
        var currentScope,
            currentElement,
            previousLeaveAnimation,
            autoScrollExp = attr.autoscroll,
            onloadExp = attr.onload || '';

        scope.$on('$routeChangeSuccess', update);
        update();

        function cleanupLastView() {
          if (previousLeaveAnimation) {
            $animate.cancel(previousLeaveAnimation);
            previousLeaveAnimation = null;
          }

          if (currentScope) {
            currentScope.$destroy();
            currentScope = null;
          }
          if (currentElement) {
            previousLeaveAnimation = $animate.leave(currentElement);
            previousLeaveAnimation.then(function() {
              previousLeaveAnimation = null;
            });
            currentElement = null;
          }
        }

        function update() {
          var locals = $route.current && $route.current.locals,
              template = locals && locals.$template;

          if (angular.isDefined(template)) {
            var newScope = scope.$new();
            var current = $route.current;

            // Note: This will also link all children of ng-view that were contained in the original
            // html. If that content contains controllers, ... they could pollute/change the scope.
            // However, using ng-view on an element with additional content does not make sense...
            // Note: We can't remove them in the cloneAttchFn of $transclude as that
            // function is called before linking the content, which would apply child
            // directives to non existing elements.
            var clone = $transclude(newScope, function(clone) {
              $animate.enter(clone, null, currentElement || $element).then(function onNgViewEnter() {
                if (angular.isDefined(autoScrollExp)
                  && (!autoScrollExp || scope.$eval(autoScrollExp))) {
                  $anchorScroll();
                }
              });
              cleanupLastView();
            });

            currentElement = clone;
            currentScope = current.scope = newScope;
            currentScope.$emit('$viewContentLoaded');
            currentScope.$eval(onloadExp);
          } else {
            cleanupLastView();
          }
        }
    }
  };
}

// This directive is called during the $transclude call of the first `ngView` directive.
// It will replace and compile the content of the element with the loaded template.
// We need this directive so that the element content is already filled when
// the link function of another directive on the same element as ngView
// is called.
ngViewFillContentFactory.$inject = ['$compile', '$controller', '$route'];
function ngViewFillContentFactory($compile, $controller, $route) {
  return {
    restrict: 'ECA',
    priority: -400,
    link: function(scope, $element) {
      var current = $route.current,
          locals = current.locals;

      $element.html(locals.$template);

      var link = $compile($element.contents());

      if (current.controller) {
        locals.$scope = scope;
        var controller = $controller(current.controller, locals);
        if (current.controllerAs) {
          scope[current.controllerAs] = controller;
        }
        $element.data('$ngControllerController', controller);
        $element.children().data('$ngControllerController', controller);
      }

      link(scope);
    }
  };
}


})(window, window.angular);

//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiIiwic291cmNlcyI6WyJhbmd1bGFyLXJvdXRlLmpzIl0sInNvdXJjZXNDb250ZW50IjpbIi8qKlxuICogQGxpY2Vuc2UgQW5ndWxhckpTIHYxLjMuMTdcbiAqIChjKSAyMDEwLTIwMTQgR29vZ2xlLCBJbmMuIGh0dHA6Ly9hbmd1bGFyanMub3JnXG4gKiBMaWNlbnNlOiBNSVRcbiAqL1xuKGZ1bmN0aW9uKHdpbmRvdywgYW5ndWxhciwgdW5kZWZpbmVkKSB7J3VzZSBzdHJpY3QnO1xuXG4vKipcbiAqIEBuZ2RvYyBtb2R1bGVcbiAqIEBuYW1lIG5nUm91dGVcbiAqIEBkZXNjcmlwdGlvblxuICpcbiAqICMgbmdSb3V0ZVxuICpcbiAqIFRoZSBgbmdSb3V0ZWAgbW9kdWxlIHByb3ZpZGVzIHJvdXRpbmcgYW5kIGRlZXBsaW5raW5nIHNlcnZpY2VzIGFuZCBkaXJlY3RpdmVzIGZvciBhbmd1bGFyIGFwcHMuXG4gKlxuICogIyMgRXhhbXBsZVxuICogU2VlIHtAbGluayBuZ1JvdXRlLiRyb3V0ZSNleGFtcGxlICRyb3V0ZX0gZm9yIGFuIGV4YW1wbGUgb2YgY29uZmlndXJpbmcgYW5kIHVzaW5nIGBuZ1JvdXRlYC5cbiAqXG4gKlxuICogPGRpdiBkb2MtbW9kdWxlLWNvbXBvbmVudHM9XCJuZ1JvdXRlXCI+PC9kaXY+XG4gKi9cbiAvKiBnbG9iYWwgLW5nUm91dGVNb2R1bGUgKi9cbnZhciBuZ1JvdXRlTW9kdWxlID0gYW5ndWxhci5tb2R1bGUoJ25nUm91dGUnLCBbJ25nJ10pLlxuICAgICAgICAgICAgICAgICAgICAgICAgcHJvdmlkZXIoJyRyb3V0ZScsICRSb3V0ZVByb3ZpZGVyKSxcbiAgICAkcm91dGVNaW5FcnIgPSBhbmd1bGFyLiQkbWluRXJyKCduZ1JvdXRlJyk7XG5cbi8qKlxuICogQG5nZG9jIHByb3ZpZGVyXG4gKiBAbmFtZSAkcm91dGVQcm92aWRlclxuICpcbiAqIEBkZXNjcmlwdGlvblxuICpcbiAqIFVzZWQgZm9yIGNvbmZpZ3VyaW5nIHJvdXRlcy5cbiAqXG4gKiAjIyBFeGFtcGxlXG4gKiBTZWUge0BsaW5rIG5nUm91dGUuJHJvdXRlI2V4YW1wbGUgJHJvdXRlfSBmb3IgYW4gZXhhbXBsZSBvZiBjb25maWd1cmluZyBhbmQgdXNpbmcgYG5nUm91dGVgLlxuICpcbiAqICMjIERlcGVuZGVuY2llc1xuICogUmVxdWlyZXMgdGhlIHtAbGluayBuZ1JvdXRlIGBuZ1JvdXRlYH0gbW9kdWxlIHRvIGJlIGluc3RhbGxlZC5cbiAqL1xuZnVuY3Rpb24gJFJvdXRlUHJvdmlkZXIoKSB7XG4gIGZ1bmN0aW9uIGluaGVyaXQocGFyZW50LCBleHRyYSkge1xuICAgIHJldHVybiBhbmd1bGFyLmV4dGVuZChPYmplY3QuY3JlYXRlKHBhcmVudCksIGV4dHJhKTtcbiAgfVxuXG4gIHZhciByb3V0ZXMgPSB7fTtcblxuICAvKipcbiAgICogQG5nZG9jIG1ldGhvZFxuICAgKiBAbmFtZSAkcm91dGVQcm92aWRlciN3aGVuXG4gICAqXG4gICAqIEBwYXJhbSB7c3RyaW5nfSBwYXRoIFJvdXRlIHBhdGggKG1hdGNoZWQgYWdhaW5zdCBgJGxvY2F0aW9uLnBhdGhgKS4gSWYgYCRsb2NhdGlvbi5wYXRoYFxuICAgKiAgICBjb250YWlucyByZWR1bmRhbnQgdHJhaWxpbmcgc2xhc2ggb3IgaXMgbWlzc2luZyBvbmUsIHRoZSByb3V0ZSB3aWxsIHN0aWxsIG1hdGNoIGFuZCB0aGVcbiAgICogICAgYCRsb2NhdGlvbi5wYXRoYCB3aWxsIGJlIHVwZGF0ZWQgdG8gYWRkIG9yIGRyb3AgdGhlIHRyYWlsaW5nIHNsYXNoIHRvIGV4YWN0bHkgbWF0Y2ggdGhlXG4gICAqICAgIHJvdXRlIGRlZmluaXRpb24uXG4gICAqXG4gICAqICAgICogYHBhdGhgIGNhbiBjb250YWluIG5hbWVkIGdyb3VwcyBzdGFydGluZyB3aXRoIGEgY29sb246IGUuZy4gYDpuYW1lYC4gQWxsIGNoYXJhY3RlcnMgdXBcbiAgICogICAgICAgIHRvIHRoZSBuZXh0IHNsYXNoIGFyZSBtYXRjaGVkIGFuZCBzdG9yZWQgaW4gYCRyb3V0ZVBhcmFtc2AgdW5kZXIgdGhlIGdpdmVuIGBuYW1lYFxuICAgKiAgICAgICAgd2hlbiB0aGUgcm91dGUgbWF0Y2hlcy5cbiAgICogICAgKiBgcGF0aGAgY2FuIGNvbnRhaW4gbmFtZWQgZ3JvdXBzIHN0YXJ0aW5nIHdpdGggYSBjb2xvbiBhbmQgZW5kaW5nIHdpdGggYSBzdGFyOlxuICAgKiAgICAgICAgZS5nLmA6bmFtZSpgLiBBbGwgY2hhcmFjdGVycyBhcmUgZWFnZXJseSBzdG9yZWQgaW4gYCRyb3V0ZVBhcmFtc2AgdW5kZXIgdGhlIGdpdmVuIGBuYW1lYFxuICAgKiAgICAgICAgd2hlbiB0aGUgcm91dGUgbWF0Y2hlcy5cbiAgICogICAgKiBgcGF0aGAgY2FuIGNvbnRhaW4gb3B0aW9uYWwgbmFtZWQgZ3JvdXBzIHdpdGggYSBxdWVzdGlvbiBtYXJrOiBlLmcuYDpuYW1lP2AuXG4gICAqXG4gICAqICAgIEZvciBleGFtcGxlLCByb3V0ZXMgbGlrZSBgL2NvbG9yLzpjb2xvci9sYXJnZWNvZGUvOmxhcmdlY29kZSpcXC9lZGl0YCB3aWxsIG1hdGNoXG4gICAqICAgIGAvY29sb3IvYnJvd24vbGFyZ2Vjb2RlL2NvZGUvd2l0aC9zbGFzaGVzL2VkaXRgIGFuZCBleHRyYWN0OlxuICAgKlxuICAgKiAgICAqIGBjb2xvcjogYnJvd25gXG4gICAqICAgICogYGxhcmdlY29kZTogY29kZS93aXRoL3NsYXNoZXNgLlxuICAgKlxuICAgKlxuICAgKiBAcGFyYW0ge09iamVjdH0gcm91dGUgTWFwcGluZyBpbmZvcm1hdGlvbiB0byBiZSBhc3NpZ25lZCB0byBgJHJvdXRlLmN1cnJlbnRgIG9uIHJvdXRlXG4gICAqICAgIG1hdGNoLlxuICAgKlxuICAgKiAgICBPYmplY3QgcHJvcGVydGllczpcbiAgICpcbiAgICogICAgLSBgY29udHJvbGxlcmAg4oCTIGB7KHN0cmluZ3xmdW5jdGlvbigpPX1gIOKAkyBDb250cm9sbGVyIGZuIHRoYXQgc2hvdWxkIGJlIGFzc29jaWF0ZWQgd2l0aFxuICAgKiAgICAgIG5ld2x5IGNyZWF0ZWQgc2NvcGUgb3IgdGhlIG5hbWUgb2YgYSB7QGxpbmsgYW5ndWxhci5Nb2R1bGUjY29udHJvbGxlciByZWdpc3RlcmVkXG4gICAqICAgICAgY29udHJvbGxlcn0gaWYgcGFzc2VkIGFzIGEgc3RyaW5nLlxuICAgKiAgICAtIGBjb250cm9sbGVyQXNgIOKAkyBge3N0cmluZz19YCDigJMgQSBjb250cm9sbGVyIGFsaWFzIG5hbWUuIElmIHByZXNlbnQgdGhlIGNvbnRyb2xsZXIgd2lsbCBiZVxuICAgKiAgICAgIHB1Ymxpc2hlZCB0byBzY29wZSB1bmRlciB0aGUgYGNvbnRyb2xsZXJBc2AgbmFtZS5cbiAgICogICAgLSBgdGVtcGxhdGVgIOKAkyBge3N0cmluZz18ZnVuY3Rpb24oKT19YCDigJMgaHRtbCB0ZW1wbGF0ZSBhcyBhIHN0cmluZyBvciBhIGZ1bmN0aW9uIHRoYXRcbiAgICogICAgICByZXR1cm5zIGFuIGh0bWwgdGVtcGxhdGUgYXMgYSBzdHJpbmcgd2hpY2ggc2hvdWxkIGJlIHVzZWQgYnkge0BsaW5rXG4gICAqICAgICAgbmdSb3V0ZS5kaXJlY3RpdmU6bmdWaWV3IG5nVmlld30gb3Ige0BsaW5rIG5nLmRpcmVjdGl2ZTpuZ0luY2x1ZGUgbmdJbmNsdWRlfSBkaXJlY3RpdmVzLlxuICAgKiAgICAgIFRoaXMgcHJvcGVydHkgdGFrZXMgcHJlY2VkZW5jZSBvdmVyIGB0ZW1wbGF0ZVVybGAuXG4gICAqXG4gICAqICAgICAgSWYgYHRlbXBsYXRlYCBpcyBhIGZ1bmN0aW9uLCBpdCB3aWxsIGJlIGNhbGxlZCB3aXRoIHRoZSBmb2xsb3dpbmcgcGFyYW1ldGVyczpcbiAgICpcbiAgICogICAgICAtIGB7QXJyYXkuPE9iamVjdD59YCAtIHJvdXRlIHBhcmFtZXRlcnMgZXh0cmFjdGVkIGZyb20gdGhlIGN1cnJlbnRcbiAgICogICAgICAgIGAkbG9jYXRpb24ucGF0aCgpYCBieSBhcHBseWluZyB0aGUgY3VycmVudCByb3V0ZVxuICAgKlxuICAgKiAgICAtIGB0ZW1wbGF0ZVVybGAg4oCTIGB7c3RyaW5nPXxmdW5jdGlvbigpPX1gIOKAkyBwYXRoIG9yIGZ1bmN0aW9uIHRoYXQgcmV0dXJucyBhIHBhdGggdG8gYW4gaHRtbFxuICAgKiAgICAgIHRlbXBsYXRlIHRoYXQgc2hvdWxkIGJlIHVzZWQgYnkge0BsaW5rIG5nUm91dGUuZGlyZWN0aXZlOm5nVmlldyBuZ1ZpZXd9LlxuICAgKlxuICAgKiAgICAgIElmIGB0ZW1wbGF0ZVVybGAgaXMgYSBmdW5jdGlvbiwgaXQgd2lsbCBiZSBjYWxsZWQgd2l0aCB0aGUgZm9sbG93aW5nIHBhcmFtZXRlcnM6XG4gICAqXG4gICAqICAgICAgLSBge0FycmF5LjxPYmplY3Q+fWAgLSByb3V0ZSBwYXJhbWV0ZXJzIGV4dHJhY3RlZCBmcm9tIHRoZSBjdXJyZW50XG4gICAqICAgICAgICBgJGxvY2F0aW9uLnBhdGgoKWAgYnkgYXBwbHlpbmcgdGhlIGN1cnJlbnQgcm91dGVcbiAgICpcbiAgICogICAgLSBgcmVzb2x2ZWAgLSBge09iamVjdC48c3RyaW5nLCBmdW5jdGlvbj49fWAgLSBBbiBvcHRpb25hbCBtYXAgb2YgZGVwZW5kZW5jaWVzIHdoaWNoIHNob3VsZFxuICAgKiAgICAgIGJlIGluamVjdGVkIGludG8gdGhlIGNvbnRyb2xsZXIuIElmIGFueSBvZiB0aGVzZSBkZXBlbmRlbmNpZXMgYXJlIHByb21pc2VzLCB0aGUgcm91dGVyXG4gICAqICAgICAgd2lsbCB3YWl0IGZvciB0aGVtIGFsbCB0byBiZSByZXNvbHZlZCBvciBvbmUgdG8gYmUgcmVqZWN0ZWQgYmVmb3JlIHRoZSBjb250cm9sbGVyIGlzXG4gICAqICAgICAgaW5zdGFudGlhdGVkLlxuICAgKiAgICAgIElmIGFsbCB0aGUgcHJvbWlzZXMgYXJlIHJlc29sdmVkIHN1Y2Nlc3NmdWxseSwgdGhlIHZhbHVlcyBvZiB0aGUgcmVzb2x2ZWQgcHJvbWlzZXMgYXJlXG4gICAqICAgICAgaW5qZWN0ZWQgYW5kIHtAbGluayBuZ1JvdXRlLiRyb3V0ZSMkcm91dGVDaGFuZ2VTdWNjZXNzICRyb3V0ZUNoYW5nZVN1Y2Nlc3N9IGV2ZW50IGlzXG4gICAqICAgICAgZmlyZWQuIElmIGFueSBvZiB0aGUgcHJvbWlzZXMgYXJlIHJlamVjdGVkIHRoZVxuICAgKiAgICAgIHtAbGluayBuZ1JvdXRlLiRyb3V0ZSMkcm91dGVDaGFuZ2VFcnJvciAkcm91dGVDaGFuZ2VFcnJvcn0gZXZlbnQgaXMgZmlyZWQuIFRoZSBtYXAgb2JqZWN0XG4gICAqICAgICAgaXM6XG4gICAqXG4gICAqICAgICAgLSBga2V5YCDigJMgYHtzdHJpbmd9YDogYSBuYW1lIG9mIGEgZGVwZW5kZW5jeSB0byBiZSBpbmplY3RlZCBpbnRvIHRoZSBjb250cm9sbGVyLlxuICAgKiAgICAgIC0gYGZhY3RvcnlgIC0gYHtzdHJpbmd8ZnVuY3Rpb259YDogSWYgYHN0cmluZ2AgdGhlbiBpdCBpcyBhbiBhbGlhcyBmb3IgYSBzZXJ2aWNlLlxuICAgKiAgICAgICAgT3RoZXJ3aXNlIGlmIGZ1bmN0aW9uLCB0aGVuIGl0IGlzIHtAbGluayBhdXRvLiRpbmplY3RvciNpbnZva2UgaW5qZWN0ZWR9XG4gICAqICAgICAgICBhbmQgdGhlIHJldHVybiB2YWx1ZSBpcyB0cmVhdGVkIGFzIHRoZSBkZXBlbmRlbmN5LiBJZiB0aGUgcmVzdWx0IGlzIGEgcHJvbWlzZSwgaXQgaXNcbiAgICogICAgICAgIHJlc29sdmVkIGJlZm9yZSBpdHMgdmFsdWUgaXMgaW5qZWN0ZWQgaW50byB0aGUgY29udHJvbGxlci4gQmUgYXdhcmUgdGhhdFxuICAgKiAgICAgICAgYG5nUm91dGUuJHJvdXRlUGFyYW1zYCB3aWxsIHN0aWxsIHJlZmVyIHRvIHRoZSBwcmV2aW91cyByb3V0ZSB3aXRoaW4gdGhlc2UgcmVzb2x2ZVxuICAgKiAgICAgICAgZnVuY3Rpb25zLiAgVXNlIGAkcm91dGUuY3VycmVudC5wYXJhbXNgIHRvIGFjY2VzcyB0aGUgbmV3IHJvdXRlIHBhcmFtZXRlcnMsIGluc3RlYWQuXG4gICAqXG4gICAqICAgIC0gYHJlZGlyZWN0VG9gIOKAkyB7KHN0cmluZ3xmdW5jdGlvbigpKT19IOKAkyB2YWx1ZSB0byB1cGRhdGVcbiAgICogICAgICB7QGxpbmsgbmcuJGxvY2F0aW9uICRsb2NhdGlvbn0gcGF0aCB3aXRoIGFuZCB0cmlnZ2VyIHJvdXRlIHJlZGlyZWN0aW9uLlxuICAgKlxuICAgKiAgICAgIElmIGByZWRpcmVjdFRvYCBpcyBhIGZ1bmN0aW9uLCBpdCB3aWxsIGJlIGNhbGxlZCB3aXRoIHRoZSBmb2xsb3dpbmcgcGFyYW1ldGVyczpcbiAgICpcbiAgICogICAgICAtIGB7T2JqZWN0LjxzdHJpbmc+fWAgLSByb3V0ZSBwYXJhbWV0ZXJzIGV4dHJhY3RlZCBmcm9tIHRoZSBjdXJyZW50XG4gICAqICAgICAgICBgJGxvY2F0aW9uLnBhdGgoKWAgYnkgYXBwbHlpbmcgdGhlIGN1cnJlbnQgcm91dGUgdGVtcGxhdGVVcmwuXG4gICAqICAgICAgLSBge3N0cmluZ31gIC0gY3VycmVudCBgJGxvY2F0aW9uLnBhdGgoKWBcbiAgICogICAgICAtIGB7T2JqZWN0fWAgLSBjdXJyZW50IGAkbG9jYXRpb24uc2VhcmNoKClgXG4gICAqXG4gICAqICAgICAgVGhlIGN1c3RvbSBgcmVkaXJlY3RUb2AgZnVuY3Rpb24gaXMgZXhwZWN0ZWQgdG8gcmV0dXJuIGEgc3RyaW5nIHdoaWNoIHdpbGwgYmUgdXNlZFxuICAgKiAgICAgIHRvIHVwZGF0ZSBgJGxvY2F0aW9uLnBhdGgoKWAgYW5kIGAkbG9jYXRpb24uc2VhcmNoKClgLlxuICAgKlxuICAgKiAgICAtIGBbcmVsb2FkT25TZWFyY2g9dHJ1ZV1gIC0ge2Jvb2xlYW49fSAtIHJlbG9hZCByb3V0ZSB3aGVuIG9ubHkgYCRsb2NhdGlvbi5zZWFyY2goKWBcbiAgICogICAgICBvciBgJGxvY2F0aW9uLmhhc2goKWAgY2hhbmdlcy5cbiAgICpcbiAgICogICAgICBJZiB0aGUgb3B0aW9uIGlzIHNldCB0byBgZmFsc2VgIGFuZCB1cmwgaW4gdGhlIGJyb3dzZXIgY2hhbmdlcywgdGhlblxuICAgKiAgICAgIGAkcm91dGVVcGRhdGVgIGV2ZW50IGlzIGJyb2FkY2FzdGVkIG9uIHRoZSByb290IHNjb3BlLlxuICAgKlxuICAgKiAgICAtIGBbY2FzZUluc2Vuc2l0aXZlTWF0Y2g9ZmFsc2VdYCAtIHtib29sZWFuPX0gLSBtYXRjaCByb3V0ZXMgd2l0aG91dCBiZWluZyBjYXNlIHNlbnNpdGl2ZVxuICAgKlxuICAgKiAgICAgIElmIHRoZSBvcHRpb24gaXMgc2V0IHRvIGB0cnVlYCwgdGhlbiB0aGUgcGFydGljdWxhciByb3V0ZSBjYW4gYmUgbWF0Y2hlZCB3aXRob3V0IGJlaW5nXG4gICAqICAgICAgY2FzZSBzZW5zaXRpdmVcbiAgICpcbiAgICogQHJldHVybnMge09iamVjdH0gc2VsZlxuICAgKlxuICAgKiBAZGVzY3JpcHRpb25cbiAgICogQWRkcyBhIG5ldyByb3V0ZSBkZWZpbml0aW9uIHRvIHRoZSBgJHJvdXRlYCBzZXJ2aWNlLlxuICAgKi9cbiAgdGhpcy53aGVuID0gZnVuY3Rpb24ocGF0aCwgcm91dGUpIHtcbiAgICAvL2NvcHkgb3JpZ2luYWwgcm91dGUgb2JqZWN0IHRvIHByZXNlcnZlIHBhcmFtcyBpbmhlcml0ZWQgZnJvbSBwcm90byBjaGFpblxuICAgIHZhciByb3V0ZUNvcHkgPSBhbmd1bGFyLmNvcHkocm91dGUpO1xuICAgIGlmIChhbmd1bGFyLmlzVW5kZWZpbmVkKHJvdXRlQ29weS5yZWxvYWRPblNlYXJjaCkpIHtcbiAgICAgIHJvdXRlQ29weS5yZWxvYWRPblNlYXJjaCA9IHRydWU7XG4gICAgfVxuICAgIGlmIChhbmd1bGFyLmlzVW5kZWZpbmVkKHJvdXRlQ29weS5jYXNlSW5zZW5zaXRpdmVNYXRjaCkpIHtcbiAgICAgIHJvdXRlQ29weS5jYXNlSW5zZW5zaXRpdmVNYXRjaCA9IHRoaXMuY2FzZUluc2Vuc2l0aXZlTWF0Y2g7XG4gICAgfVxuICAgIHJvdXRlc1twYXRoXSA9IGFuZ3VsYXIuZXh0ZW5kKFxuICAgICAgcm91dGVDb3B5LFxuICAgICAgcGF0aCAmJiBwYXRoUmVnRXhwKHBhdGgsIHJvdXRlQ29weSlcbiAgICApO1xuXG4gICAgLy8gY3JlYXRlIHJlZGlyZWN0aW9uIGZvciB0cmFpbGluZyBzbGFzaGVzXG4gICAgaWYgKHBhdGgpIHtcbiAgICAgIHZhciByZWRpcmVjdFBhdGggPSAocGF0aFtwYXRoLmxlbmd0aCAtIDFdID09ICcvJylcbiAgICAgICAgICAgID8gcGF0aC5zdWJzdHIoMCwgcGF0aC5sZW5ndGggLSAxKVxuICAgICAgICAgICAgOiBwYXRoICsgJy8nO1xuXG4gICAgICByb3V0ZXNbcmVkaXJlY3RQYXRoXSA9IGFuZ3VsYXIuZXh0ZW5kKFxuICAgICAgICB7cmVkaXJlY3RUbzogcGF0aH0sXG4gICAgICAgIHBhdGhSZWdFeHAocmVkaXJlY3RQYXRoLCByb3V0ZUNvcHkpXG4gICAgICApO1xuICAgIH1cblxuICAgIHJldHVybiB0aGlzO1xuICB9O1xuXG4gIC8qKlxuICAgKiBAbmdkb2MgcHJvcGVydHlcbiAgICogQG5hbWUgJHJvdXRlUHJvdmlkZXIjY2FzZUluc2Vuc2l0aXZlTWF0Y2hcbiAgICogQGRlc2NyaXB0aW9uXG4gICAqXG4gICAqIEEgYm9vbGVhbiBwcm9wZXJ0eSBpbmRpY2F0aW5nIGlmIHJvdXRlcyBkZWZpbmVkXG4gICAqIHVzaW5nIHRoaXMgcHJvdmlkZXIgc2hvdWxkIGJlIG1hdGNoZWQgdXNpbmcgYSBjYXNlIGluc2Vuc2l0aXZlXG4gICAqIGFsZ29yaXRobS4gRGVmYXVsdHMgdG8gYGZhbHNlYC5cbiAgICovXG4gIHRoaXMuY2FzZUluc2Vuc2l0aXZlTWF0Y2ggPSBmYWxzZTtcblxuICAgLyoqXG4gICAgKiBAcGFyYW0gcGF0aCB7c3RyaW5nfSBwYXRoXG4gICAgKiBAcGFyYW0gb3B0cyB7T2JqZWN0fSBvcHRpb25zXG4gICAgKiBAcmV0dXJuIHs/T2JqZWN0fVxuICAgICpcbiAgICAqIEBkZXNjcmlwdGlvblxuICAgICogTm9ybWFsaXplcyB0aGUgZ2l2ZW4gcGF0aCwgcmV0dXJuaW5nIGEgcmVndWxhciBleHByZXNzaW9uXG4gICAgKiBhbmQgdGhlIG9yaWdpbmFsIHBhdGguXG4gICAgKlxuICAgICogSW5zcGlyZWQgYnkgcGF0aFJleHAgaW4gdmlzaW9ubWVkaWEvZXhwcmVzcy9saWIvdXRpbHMuanMuXG4gICAgKi9cbiAgZnVuY3Rpb24gcGF0aFJlZ0V4cChwYXRoLCBvcHRzKSB7XG4gICAgdmFyIGluc2Vuc2l0aXZlID0gb3B0cy5jYXNlSW5zZW5zaXRpdmVNYXRjaCxcbiAgICAgICAgcmV0ID0ge1xuICAgICAgICAgIG9yaWdpbmFsUGF0aDogcGF0aCxcbiAgICAgICAgICByZWdleHA6IHBhdGhcbiAgICAgICAgfSxcbiAgICAgICAga2V5cyA9IHJldC5rZXlzID0gW107XG5cbiAgICBwYXRoID0gcGF0aFxuICAgICAgLnJlcGxhY2UoLyhbKCkuXSkvZywgJ1xcXFwkMScpXG4gICAgICAucmVwbGFjZSgvKFxcLyk/OihcXHcrKShbXFw/XFwqXSk/L2csIGZ1bmN0aW9uKF8sIHNsYXNoLCBrZXksIG9wdGlvbikge1xuICAgICAgICB2YXIgb3B0aW9uYWwgPSBvcHRpb24gPT09ICc/JyA/IG9wdGlvbiA6IG51bGw7XG4gICAgICAgIHZhciBzdGFyID0gb3B0aW9uID09PSAnKicgPyBvcHRpb24gOiBudWxsO1xuICAgICAgICBrZXlzLnB1c2goeyBuYW1lOiBrZXksIG9wdGlvbmFsOiAhIW9wdGlvbmFsIH0pO1xuICAgICAgICBzbGFzaCA9IHNsYXNoIHx8ICcnO1xuICAgICAgICByZXR1cm4gJydcbiAgICAgICAgICArIChvcHRpb25hbCA/ICcnIDogc2xhc2gpXG4gICAgICAgICAgKyAnKD86J1xuICAgICAgICAgICsgKG9wdGlvbmFsID8gc2xhc2ggOiAnJylcbiAgICAgICAgICArIChzdGFyICYmICcoLis/KScgfHwgJyhbXi9dKyknKVxuICAgICAgICAgICsgKG9wdGlvbmFsIHx8ICcnKVxuICAgICAgICAgICsgJyknXG4gICAgICAgICAgKyAob3B0aW9uYWwgfHwgJycpO1xuICAgICAgfSlcbiAgICAgIC5yZXBsYWNlKC8oW1xcLyRcXCpdKS9nLCAnXFxcXCQxJyk7XG5cbiAgICByZXQucmVnZXhwID0gbmV3IFJlZ0V4cCgnXicgKyBwYXRoICsgJyQnLCBpbnNlbnNpdGl2ZSA/ICdpJyA6ICcnKTtcbiAgICByZXR1cm4gcmV0O1xuICB9XG5cbiAgLyoqXG4gICAqIEBuZ2RvYyBtZXRob2RcbiAgICogQG5hbWUgJHJvdXRlUHJvdmlkZXIjb3RoZXJ3aXNlXG4gICAqXG4gICAqIEBkZXNjcmlwdGlvblxuICAgKiBTZXRzIHJvdXRlIGRlZmluaXRpb24gdGhhdCB3aWxsIGJlIHVzZWQgb24gcm91dGUgY2hhbmdlIHdoZW4gbm8gb3RoZXIgcm91dGUgZGVmaW5pdGlvblxuICAgKiBpcyBtYXRjaGVkLlxuICAgKlxuICAgKiBAcGFyYW0ge09iamVjdHxzdHJpbmd9IHBhcmFtcyBNYXBwaW5nIGluZm9ybWF0aW9uIHRvIGJlIGFzc2lnbmVkIHRvIGAkcm91dGUuY3VycmVudGAuXG4gICAqIElmIGNhbGxlZCB3aXRoIGEgc3RyaW5nLCB0aGUgdmFsdWUgbWFwcyB0byBgcmVkaXJlY3RUb2AuXG4gICAqIEByZXR1cm5zIHtPYmplY3R9IHNlbGZcbiAgICovXG4gIHRoaXMub3RoZXJ3aXNlID0gZnVuY3Rpb24ocGFyYW1zKSB7XG4gICAgaWYgKHR5cGVvZiBwYXJhbXMgPT09ICdzdHJpbmcnKSB7XG4gICAgICBwYXJhbXMgPSB7cmVkaXJlY3RUbzogcGFyYW1zfTtcbiAgICB9XG4gICAgdGhpcy53aGVuKG51bGwsIHBhcmFtcyk7XG4gICAgcmV0dXJuIHRoaXM7XG4gIH07XG5cblxuICB0aGlzLiRnZXQgPSBbJyRyb290U2NvcGUnLFxuICAgICAgICAgICAgICAgJyRsb2NhdGlvbicsXG4gICAgICAgICAgICAgICAnJHJvdXRlUGFyYW1zJyxcbiAgICAgICAgICAgICAgICckcScsXG4gICAgICAgICAgICAgICAnJGluamVjdG9yJyxcbiAgICAgICAgICAgICAgICckdGVtcGxhdGVSZXF1ZXN0JyxcbiAgICAgICAgICAgICAgICckc2NlJyxcbiAgICAgIGZ1bmN0aW9uKCRyb290U2NvcGUsICRsb2NhdGlvbiwgJHJvdXRlUGFyYW1zLCAkcSwgJGluamVjdG9yLCAkdGVtcGxhdGVSZXF1ZXN0LCAkc2NlKSB7XG5cbiAgICAvKipcbiAgICAgKiBAbmdkb2Mgc2VydmljZVxuICAgICAqIEBuYW1lICRyb3V0ZVxuICAgICAqIEByZXF1aXJlcyAkbG9jYXRpb25cbiAgICAgKiBAcmVxdWlyZXMgJHJvdXRlUGFyYW1zXG4gICAgICpcbiAgICAgKiBAcHJvcGVydHkge09iamVjdH0gY3VycmVudCBSZWZlcmVuY2UgdG8gdGhlIGN1cnJlbnQgcm91dGUgZGVmaW5pdGlvbi5cbiAgICAgKiBUaGUgcm91dGUgZGVmaW5pdGlvbiBjb250YWluczpcbiAgICAgKlxuICAgICAqICAgLSBgY29udHJvbGxlcmA6IFRoZSBjb250cm9sbGVyIGNvbnN0cnVjdG9yIGFzIGRlZmluZSBpbiByb3V0ZSBkZWZpbml0aW9uLlxuICAgICAqICAgLSBgbG9jYWxzYDogQSBtYXAgb2YgbG9jYWxzIHdoaWNoIGlzIHVzZWQgYnkge0BsaW5rIG5nLiRjb250cm9sbGVyICRjb250cm9sbGVyfSBzZXJ2aWNlIGZvclxuICAgICAqICAgICBjb250cm9sbGVyIGluc3RhbnRpYXRpb24uIFRoZSBgbG9jYWxzYCBjb250YWluXG4gICAgICogICAgIHRoZSByZXNvbHZlZCB2YWx1ZXMgb2YgdGhlIGByZXNvbHZlYCBtYXAuIEFkZGl0aW9uYWxseSB0aGUgYGxvY2Fsc2AgYWxzbyBjb250YWluOlxuICAgICAqXG4gICAgICogICAgIC0gYCRzY29wZWAgLSBUaGUgY3VycmVudCByb3V0ZSBzY29wZS5cbiAgICAgKiAgICAgLSBgJHRlbXBsYXRlYCAtIFRoZSBjdXJyZW50IHJvdXRlIHRlbXBsYXRlIEhUTUwuXG4gICAgICpcbiAgICAgKiBAcHJvcGVydHkge09iamVjdH0gcm91dGVzIE9iamVjdCB3aXRoIGFsbCByb3V0ZSBjb25maWd1cmF0aW9uIE9iamVjdHMgYXMgaXRzIHByb3BlcnRpZXMuXG4gICAgICpcbiAgICAgKiBAZGVzY3JpcHRpb25cbiAgICAgKiBgJHJvdXRlYCBpcyB1c2VkIGZvciBkZWVwLWxpbmtpbmcgVVJMcyB0byBjb250cm9sbGVycyBhbmQgdmlld3MgKEhUTUwgcGFydGlhbHMpLlxuICAgICAqIEl0IHdhdGNoZXMgYCRsb2NhdGlvbi51cmwoKWAgYW5kIHRyaWVzIHRvIG1hcCB0aGUgcGF0aCB0byBhbiBleGlzdGluZyByb3V0ZSBkZWZpbml0aW9uLlxuICAgICAqXG4gICAgICogUmVxdWlyZXMgdGhlIHtAbGluayBuZ1JvdXRlIGBuZ1JvdXRlYH0gbW9kdWxlIHRvIGJlIGluc3RhbGxlZC5cbiAgICAgKlxuICAgICAqIFlvdSBjYW4gZGVmaW5lIHJvdXRlcyB0aHJvdWdoIHtAbGluayBuZ1JvdXRlLiRyb3V0ZVByb3ZpZGVyICRyb3V0ZVByb3ZpZGVyfSdzIEFQSS5cbiAgICAgKlxuICAgICAqIFRoZSBgJHJvdXRlYCBzZXJ2aWNlIGlzIHR5cGljYWxseSB1c2VkIGluIGNvbmp1bmN0aW9uIHdpdGggdGhlXG4gICAgICoge0BsaW5rIG5nUm91dGUuZGlyZWN0aXZlOm5nVmlldyBgbmdWaWV3YH0gZGlyZWN0aXZlIGFuZCB0aGVcbiAgICAgKiB7QGxpbmsgbmdSb3V0ZS4kcm91dGVQYXJhbXMgYCRyb3V0ZVBhcmFtc2B9IHNlcnZpY2UuXG4gICAgICpcbiAgICAgKiBAZXhhbXBsZVxuICAgICAqIFRoaXMgZXhhbXBsZSBzaG93cyBob3cgY2hhbmdpbmcgdGhlIFVSTCBoYXNoIGNhdXNlcyB0aGUgYCRyb3V0ZWAgdG8gbWF0Y2ggYSByb3V0ZSBhZ2FpbnN0IHRoZVxuICAgICAqIFVSTCwgYW5kIHRoZSBgbmdWaWV3YCBwdWxscyBpbiB0aGUgcGFydGlhbC5cbiAgICAgKlxuICAgICAqIDxleGFtcGxlIG5hbWU9XCIkcm91dGUtc2VydmljZVwiIG1vZHVsZT1cIm5nUm91dGVFeGFtcGxlXCJcbiAgICAgKiAgICAgICAgICBkZXBzPVwiYW5ndWxhci1yb3V0ZS5qc1wiIGZpeEJhc2U9XCJ0cnVlXCI+XG4gICAgICogICA8ZmlsZSBuYW1lPVwiaW5kZXguaHRtbFwiPlxuICAgICAqICAgICA8ZGl2IG5nLWNvbnRyb2xsZXI9XCJNYWluQ29udHJvbGxlclwiPlxuICAgICAqICAgICAgIENob29zZTpcbiAgICAgKiAgICAgICA8YSBocmVmPVwiQm9vay9Nb2J5XCI+TW9ieTwvYT4gfFxuICAgICAqICAgICAgIDxhIGhyZWY9XCJCb29rL01vYnkvY2gvMVwiPk1vYnk6IENoMTwvYT4gfFxuICAgICAqICAgICAgIDxhIGhyZWY9XCJCb29rL0dhdHNieVwiPkdhdHNieTwvYT4gfFxuICAgICAqICAgICAgIDxhIGhyZWY9XCJCb29rL0dhdHNieS9jaC80P2tleT12YWx1ZVwiPkdhdHNieTogQ2g0PC9hPiB8XG4gICAgICogICAgICAgPGEgaHJlZj1cIkJvb2svU2NhcmxldFwiPlNjYXJsZXQgTGV0dGVyPC9hPjxici8+XG4gICAgICpcbiAgICAgKiAgICAgICA8ZGl2IG5nLXZpZXc+PC9kaXY+XG4gICAgICpcbiAgICAgKiAgICAgICA8aHIgLz5cbiAgICAgKlxuICAgICAqICAgICAgIDxwcmU+JGxvY2F0aW9uLnBhdGgoKSA9IHt7JGxvY2F0aW9uLnBhdGgoKX19PC9wcmU+XG4gICAgICogICAgICAgPHByZT4kcm91dGUuY3VycmVudC50ZW1wbGF0ZVVybCA9IHt7JHJvdXRlLmN1cnJlbnQudGVtcGxhdGVVcmx9fTwvcHJlPlxuICAgICAqICAgICAgIDxwcmU+JHJvdXRlLmN1cnJlbnQucGFyYW1zID0ge3skcm91dGUuY3VycmVudC5wYXJhbXN9fTwvcHJlPlxuICAgICAqICAgICAgIDxwcmU+JHJvdXRlLmN1cnJlbnQuc2NvcGUubmFtZSA9IHt7JHJvdXRlLmN1cnJlbnQuc2NvcGUubmFtZX19PC9wcmU+XG4gICAgICogICAgICAgPHByZT4kcm91dGVQYXJhbXMgPSB7eyRyb3V0ZVBhcmFtc319PC9wcmU+XG4gICAgICogICAgIDwvZGl2PlxuICAgICAqICAgPC9maWxlPlxuICAgICAqXG4gICAgICogICA8ZmlsZSBuYW1lPVwiYm9vay5odG1sXCI+XG4gICAgICogICAgIGNvbnRyb2xsZXI6IHt7bmFtZX19PGJyIC8+XG4gICAgICogICAgIEJvb2sgSWQ6IHt7cGFyYW1zLmJvb2tJZH19PGJyIC8+XG4gICAgICogICA8L2ZpbGU+XG4gICAgICpcbiAgICAgKiAgIDxmaWxlIG5hbWU9XCJjaGFwdGVyLmh0bWxcIj5cbiAgICAgKiAgICAgY29udHJvbGxlcjoge3tuYW1lfX08YnIgLz5cbiAgICAgKiAgICAgQm9vayBJZDoge3twYXJhbXMuYm9va0lkfX08YnIgLz5cbiAgICAgKiAgICAgQ2hhcHRlciBJZDoge3twYXJhbXMuY2hhcHRlcklkfX1cbiAgICAgKiAgIDwvZmlsZT5cbiAgICAgKlxuICAgICAqICAgPGZpbGUgbmFtZT1cInNjcmlwdC5qc1wiPlxuICAgICAqICAgICBhbmd1bGFyLm1vZHVsZSgnbmdSb3V0ZUV4YW1wbGUnLCBbJ25nUm91dGUnXSlcbiAgICAgKlxuICAgICAqICAgICAgLmNvbnRyb2xsZXIoJ01haW5Db250cm9sbGVyJywgZnVuY3Rpb24oJHNjb3BlLCAkcm91dGUsICRyb3V0ZVBhcmFtcywgJGxvY2F0aW9uKSB7XG4gICAgICogICAgICAgICAgJHNjb3BlLiRyb3V0ZSA9ICRyb3V0ZTtcbiAgICAgKiAgICAgICAgICAkc2NvcGUuJGxvY2F0aW9uID0gJGxvY2F0aW9uO1xuICAgICAqICAgICAgICAgICRzY29wZS4kcm91dGVQYXJhbXMgPSAkcm91dGVQYXJhbXM7XG4gICAgICogICAgICB9KVxuICAgICAqXG4gICAgICogICAgICAuY29udHJvbGxlcignQm9va0NvbnRyb2xsZXInLCBmdW5jdGlvbigkc2NvcGUsICRyb3V0ZVBhcmFtcykge1xuICAgICAqICAgICAgICAgICRzY29wZS5uYW1lID0gXCJCb29rQ29udHJvbGxlclwiO1xuICAgICAqICAgICAgICAgICRzY29wZS5wYXJhbXMgPSAkcm91dGVQYXJhbXM7XG4gICAgICogICAgICB9KVxuICAgICAqXG4gICAgICogICAgICAuY29udHJvbGxlcignQ2hhcHRlckNvbnRyb2xsZXInLCBmdW5jdGlvbigkc2NvcGUsICRyb3V0ZVBhcmFtcykge1xuICAgICAqICAgICAgICAgICRzY29wZS5uYW1lID0gXCJDaGFwdGVyQ29udHJvbGxlclwiO1xuICAgICAqICAgICAgICAgICRzY29wZS5wYXJhbXMgPSAkcm91dGVQYXJhbXM7XG4gICAgICogICAgICB9KVxuICAgICAqXG4gICAgICogICAgIC5jb25maWcoZnVuY3Rpb24oJHJvdXRlUHJvdmlkZXIsICRsb2NhdGlvblByb3ZpZGVyKSB7XG4gICAgICogICAgICAgJHJvdXRlUHJvdmlkZXJcbiAgICAgKiAgICAgICAgLndoZW4oJy9Cb29rLzpib29rSWQnLCB7XG4gICAgICogICAgICAgICB0ZW1wbGF0ZVVybDogJ2Jvb2suaHRtbCcsXG4gICAgICogICAgICAgICBjb250cm9sbGVyOiAnQm9va0NvbnRyb2xsZXInLFxuICAgICAqICAgICAgICAgcmVzb2x2ZToge1xuICAgICAqICAgICAgICAgICAvLyBJIHdpbGwgY2F1c2UgYSAxIHNlY29uZCBkZWxheVxuICAgICAqICAgICAgICAgICBkZWxheTogZnVuY3Rpb24oJHEsICR0aW1lb3V0KSB7XG4gICAgICogICAgICAgICAgICAgdmFyIGRlbGF5ID0gJHEuZGVmZXIoKTtcbiAgICAgKiAgICAgICAgICAgICAkdGltZW91dChkZWxheS5yZXNvbHZlLCAxMDAwKTtcbiAgICAgKiAgICAgICAgICAgICByZXR1cm4gZGVsYXkucHJvbWlzZTtcbiAgICAgKiAgICAgICAgICAgfVxuICAgICAqICAgICAgICAgfVxuICAgICAqICAgICAgIH0pXG4gICAgICogICAgICAgLndoZW4oJy9Cb29rLzpib29rSWQvY2gvOmNoYXB0ZXJJZCcsIHtcbiAgICAgKiAgICAgICAgIHRlbXBsYXRlVXJsOiAnY2hhcHRlci5odG1sJyxcbiAgICAgKiAgICAgICAgIGNvbnRyb2xsZXI6ICdDaGFwdGVyQ29udHJvbGxlcidcbiAgICAgKiAgICAgICB9KTtcbiAgICAgKlxuICAgICAqICAgICAgIC8vIGNvbmZpZ3VyZSBodG1sNSB0byBnZXQgbGlua3Mgd29ya2luZyBvbiBqc2ZpZGRsZVxuICAgICAqICAgICAgICRsb2NhdGlvblByb3ZpZGVyLmh0bWw1TW9kZSh0cnVlKTtcbiAgICAgKiAgICAgfSk7XG4gICAgICpcbiAgICAgKiAgIDwvZmlsZT5cbiAgICAgKlxuICAgICAqICAgPGZpbGUgbmFtZT1cInByb3RyYWN0b3IuanNcIiB0eXBlPVwicHJvdHJhY3RvclwiPlxuICAgICAqICAgICBpdCgnc2hvdWxkIGxvYWQgYW5kIGNvbXBpbGUgY29ycmVjdCB0ZW1wbGF0ZScsIGZ1bmN0aW9uKCkge1xuICAgICAqICAgICAgIGVsZW1lbnQoYnkubGlua1RleHQoJ01vYnk6IENoMScpKS5jbGljaygpO1xuICAgICAqICAgICAgIHZhciBjb250ZW50ID0gZWxlbWVudChieS5jc3MoJ1tuZy12aWV3XScpKS5nZXRUZXh0KCk7XG4gICAgICogICAgICAgZXhwZWN0KGNvbnRlbnQpLnRvTWF0Y2goL2NvbnRyb2xsZXJcXDogQ2hhcHRlckNvbnRyb2xsZXIvKTtcbiAgICAgKiAgICAgICBleHBlY3QoY29udGVudCkudG9NYXRjaCgvQm9vayBJZFxcOiBNb2J5Lyk7XG4gICAgICogICAgICAgZXhwZWN0KGNvbnRlbnQpLnRvTWF0Y2goL0NoYXB0ZXIgSWRcXDogMS8pO1xuICAgICAqXG4gICAgICogICAgICAgZWxlbWVudChieS5wYXJ0aWFsTGlua1RleHQoJ1NjYXJsZXQnKSkuY2xpY2soKTtcbiAgICAgKlxuICAgICAqICAgICAgIGNvbnRlbnQgPSBlbGVtZW50KGJ5LmNzcygnW25nLXZpZXddJykpLmdldFRleHQoKTtcbiAgICAgKiAgICAgICBleHBlY3QoY29udGVudCkudG9NYXRjaCgvY29udHJvbGxlclxcOiBCb29rQ29udHJvbGxlci8pO1xuICAgICAqICAgICAgIGV4cGVjdChjb250ZW50KS50b01hdGNoKC9Cb29rIElkXFw6IFNjYXJsZXQvKTtcbiAgICAgKiAgICAgfSk7XG4gICAgICogICA8L2ZpbGU+XG4gICAgICogPC9leGFtcGxlPlxuICAgICAqL1xuXG4gICAgLyoqXG4gICAgICogQG5nZG9jIGV2ZW50XG4gICAgICogQG5hbWUgJHJvdXRlIyRyb3V0ZUNoYW5nZVN0YXJ0XG4gICAgICogQGV2ZW50VHlwZSBicm9hZGNhc3Qgb24gcm9vdCBzY29wZVxuICAgICAqIEBkZXNjcmlwdGlvblxuICAgICAqIEJyb2FkY2FzdGVkIGJlZm9yZSBhIHJvdXRlIGNoYW5nZS4gQXQgdGhpcyAgcG9pbnQgdGhlIHJvdXRlIHNlcnZpY2VzIHN0YXJ0c1xuICAgICAqIHJlc29sdmluZyBhbGwgb2YgdGhlIGRlcGVuZGVuY2llcyBuZWVkZWQgZm9yIHRoZSByb3V0ZSBjaGFuZ2UgdG8gb2NjdXIuXG4gICAgICogVHlwaWNhbGx5IHRoaXMgaW52b2x2ZXMgZmV0Y2hpbmcgdGhlIHZpZXcgdGVtcGxhdGUgYXMgd2VsbCBhcyBhbnkgZGVwZW5kZW5jaWVzXG4gICAgICogZGVmaW5lZCBpbiBgcmVzb2x2ZWAgcm91dGUgcHJvcGVydHkuIE9uY2UgIGFsbCBvZiB0aGUgZGVwZW5kZW5jaWVzIGFyZSByZXNvbHZlZFxuICAgICAqIGAkcm91dGVDaGFuZ2VTdWNjZXNzYCBpcyBmaXJlZC5cbiAgICAgKlxuICAgICAqIFRoZSByb3V0ZSBjaGFuZ2UgKGFuZCB0aGUgYCRsb2NhdGlvbmAgY2hhbmdlIHRoYXQgdHJpZ2dlcmVkIGl0KSBjYW4gYmUgcHJldmVudGVkXG4gICAgICogYnkgY2FsbGluZyBgcHJldmVudERlZmF1bHRgIG1ldGhvZCBvZiB0aGUgZXZlbnQuIFNlZSB7QGxpbmsgbmcuJHJvb3RTY29wZS5TY29wZSMkb259XG4gICAgICogZm9yIG1vcmUgZGV0YWlscyBhYm91dCBldmVudCBvYmplY3QuXG4gICAgICpcbiAgICAgKiBAcGFyYW0ge09iamVjdH0gYW5ndWxhckV2ZW50IFN5bnRoZXRpYyBldmVudCBvYmplY3QuXG4gICAgICogQHBhcmFtIHtSb3V0ZX0gbmV4dCBGdXR1cmUgcm91dGUgaW5mb3JtYXRpb24uXG4gICAgICogQHBhcmFtIHtSb3V0ZX0gY3VycmVudCBDdXJyZW50IHJvdXRlIGluZm9ybWF0aW9uLlxuICAgICAqL1xuXG4gICAgLyoqXG4gICAgICogQG5nZG9jIGV2ZW50XG4gICAgICogQG5hbWUgJHJvdXRlIyRyb3V0ZUNoYW5nZVN1Y2Nlc3NcbiAgICAgKiBAZXZlbnRUeXBlIGJyb2FkY2FzdCBvbiByb290IHNjb3BlXG4gICAgICogQGRlc2NyaXB0aW9uXG4gICAgICogQnJvYWRjYXN0ZWQgYWZ0ZXIgYSByb3V0ZSBkZXBlbmRlbmNpZXMgYXJlIHJlc29sdmVkLlxuICAgICAqIHtAbGluayBuZ1JvdXRlLmRpcmVjdGl2ZTpuZ1ZpZXcgbmdWaWV3fSBsaXN0ZW5zIGZvciB0aGUgZGlyZWN0aXZlXG4gICAgICogdG8gaW5zdGFudGlhdGUgdGhlIGNvbnRyb2xsZXIgYW5kIHJlbmRlciB0aGUgdmlldy5cbiAgICAgKlxuICAgICAqIEBwYXJhbSB7T2JqZWN0fSBhbmd1bGFyRXZlbnQgU3ludGhldGljIGV2ZW50IG9iamVjdC5cbiAgICAgKiBAcGFyYW0ge1JvdXRlfSBjdXJyZW50IEN1cnJlbnQgcm91dGUgaW5mb3JtYXRpb24uXG4gICAgICogQHBhcmFtIHtSb3V0ZXxVbmRlZmluZWR9IHByZXZpb3VzIFByZXZpb3VzIHJvdXRlIGluZm9ybWF0aW9uLCBvciB1bmRlZmluZWQgaWYgY3VycmVudCBpc1xuICAgICAqIGZpcnN0IHJvdXRlIGVudGVyZWQuXG4gICAgICovXG5cbiAgICAvKipcbiAgICAgKiBAbmdkb2MgZXZlbnRcbiAgICAgKiBAbmFtZSAkcm91dGUjJHJvdXRlQ2hhbmdlRXJyb3JcbiAgICAgKiBAZXZlbnRUeXBlIGJyb2FkY2FzdCBvbiByb290IHNjb3BlXG4gICAgICogQGRlc2NyaXB0aW9uXG4gICAgICogQnJvYWRjYXN0ZWQgaWYgYW55IG9mIHRoZSByZXNvbHZlIHByb21pc2VzIGFyZSByZWplY3RlZC5cbiAgICAgKlxuICAgICAqIEBwYXJhbSB7T2JqZWN0fSBhbmd1bGFyRXZlbnQgU3ludGhldGljIGV2ZW50IG9iamVjdFxuICAgICAqIEBwYXJhbSB7Um91dGV9IGN1cnJlbnQgQ3VycmVudCByb3V0ZSBpbmZvcm1hdGlvbi5cbiAgICAgKiBAcGFyYW0ge1JvdXRlfSBwcmV2aW91cyBQcmV2aW91cyByb3V0ZSBpbmZvcm1hdGlvbi5cbiAgICAgKiBAcGFyYW0ge1JvdXRlfSByZWplY3Rpb24gUmVqZWN0aW9uIG9mIHRoZSBwcm9taXNlLiBVc3VhbGx5IHRoZSBlcnJvciBvZiB0aGUgZmFpbGVkIHByb21pc2UuXG4gICAgICovXG5cbiAgICAvKipcbiAgICAgKiBAbmdkb2MgZXZlbnRcbiAgICAgKiBAbmFtZSAkcm91dGUjJHJvdXRlVXBkYXRlXG4gICAgICogQGV2ZW50VHlwZSBicm9hZGNhc3Qgb24gcm9vdCBzY29wZVxuICAgICAqIEBkZXNjcmlwdGlvblxuICAgICAqIFRoZSBgcmVsb2FkT25TZWFyY2hgIHByb3BlcnR5IGhhcyBiZWVuIHNldCB0byBmYWxzZSwgYW5kIHdlIGFyZSByZXVzaW5nIHRoZSBzYW1lXG4gICAgICogaW5zdGFuY2Ugb2YgdGhlIENvbnRyb2xsZXIuXG4gICAgICpcbiAgICAgKiBAcGFyYW0ge09iamVjdH0gYW5ndWxhckV2ZW50IFN5bnRoZXRpYyBldmVudCBvYmplY3RcbiAgICAgKiBAcGFyYW0ge1JvdXRlfSBjdXJyZW50IEN1cnJlbnQvcHJldmlvdXMgcm91dGUgaW5mb3JtYXRpb24uXG4gICAgICovXG5cbiAgICB2YXIgZm9yY2VSZWxvYWQgPSBmYWxzZSxcbiAgICAgICAgcHJlcGFyZWRSb3V0ZSxcbiAgICAgICAgcHJlcGFyZWRSb3V0ZUlzVXBkYXRlT25seSxcbiAgICAgICAgJHJvdXRlID0ge1xuICAgICAgICAgIHJvdXRlczogcm91dGVzLFxuXG4gICAgICAgICAgLyoqXG4gICAgICAgICAgICogQG5nZG9jIG1ldGhvZFxuICAgICAgICAgICAqIEBuYW1lICRyb3V0ZSNyZWxvYWRcbiAgICAgICAgICAgKlxuICAgICAgICAgICAqIEBkZXNjcmlwdGlvblxuICAgICAgICAgICAqIENhdXNlcyBgJHJvdXRlYCBzZXJ2aWNlIHRvIHJlbG9hZCB0aGUgY3VycmVudCByb3V0ZSBldmVuIGlmXG4gICAgICAgICAgICoge0BsaW5rIG5nLiRsb2NhdGlvbiAkbG9jYXRpb259IGhhc24ndCBjaGFuZ2VkLlxuICAgICAgICAgICAqXG4gICAgICAgICAgICogQXMgYSByZXN1bHQgb2YgdGhhdCwge0BsaW5rIG5nUm91dGUuZGlyZWN0aXZlOm5nVmlldyBuZ1ZpZXd9XG4gICAgICAgICAgICogY3JlYXRlcyBuZXcgc2NvcGUgYW5kIHJlaW5zdGFudGlhdGVzIHRoZSBjb250cm9sbGVyLlxuICAgICAgICAgICAqL1xuICAgICAgICAgIHJlbG9hZDogZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICBmb3JjZVJlbG9hZCA9IHRydWU7XG4gICAgICAgICAgICAkcm9vdFNjb3BlLiRldmFsQXN5bmMoZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICAgIC8vIERvbid0IHN1cHBvcnQgY2FuY2VsbGF0aW9uIG9mIGEgcmVsb2FkIGZvciBub3cuLi5cbiAgICAgICAgICAgICAgcHJlcGFyZVJvdXRlKCk7XG4gICAgICAgICAgICAgIGNvbW1pdFJvdXRlKCk7XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgICB9LFxuXG4gICAgICAgICAgLyoqXG4gICAgICAgICAgICogQG5nZG9jIG1ldGhvZFxuICAgICAgICAgICAqIEBuYW1lICRyb3V0ZSN1cGRhdGVQYXJhbXNcbiAgICAgICAgICAgKlxuICAgICAgICAgICAqIEBkZXNjcmlwdGlvblxuICAgICAgICAgICAqIENhdXNlcyBgJHJvdXRlYCBzZXJ2aWNlIHRvIHVwZGF0ZSB0aGUgY3VycmVudCBVUkwsIHJlcGxhY2luZ1xuICAgICAgICAgICAqIGN1cnJlbnQgcm91dGUgcGFyYW1ldGVycyB3aXRoIHRob3NlIHNwZWNpZmllZCBpbiBgbmV3UGFyYW1zYC5cbiAgICAgICAgICAgKiBQcm92aWRlZCBwcm9wZXJ0eSBuYW1lcyB0aGF0IG1hdGNoIHRoZSByb3V0ZSdzIHBhdGggc2VnbWVudFxuICAgICAgICAgICAqIGRlZmluaXRpb25zIHdpbGwgYmUgaW50ZXJwb2xhdGVkIGludG8gdGhlIGxvY2F0aW9uJ3MgcGF0aCwgd2hpbGVcbiAgICAgICAgICAgKiByZW1haW5pbmcgcHJvcGVydGllcyB3aWxsIGJlIHRyZWF0ZWQgYXMgcXVlcnkgcGFyYW1zLlxuICAgICAgICAgICAqXG4gICAgICAgICAgICogQHBhcmFtIHshT2JqZWN0PHN0cmluZywgc3RyaW5nPn0gbmV3UGFyYW1zIG1hcHBpbmcgb2YgVVJMIHBhcmFtZXRlciBuYW1lcyB0byB2YWx1ZXNcbiAgICAgICAgICAgKi9cbiAgICAgICAgICB1cGRhdGVQYXJhbXM6IGZ1bmN0aW9uKG5ld1BhcmFtcykge1xuICAgICAgICAgICAgaWYgKHRoaXMuY3VycmVudCAmJiB0aGlzLmN1cnJlbnQuJCRyb3V0ZSkge1xuICAgICAgICAgICAgICBuZXdQYXJhbXMgPSBhbmd1bGFyLmV4dGVuZCh7fSwgdGhpcy5jdXJyZW50LnBhcmFtcywgbmV3UGFyYW1zKTtcbiAgICAgICAgICAgICAgJGxvY2F0aW9uLnBhdGgoaW50ZXJwb2xhdGUodGhpcy5jdXJyZW50LiQkcm91dGUub3JpZ2luYWxQYXRoLCBuZXdQYXJhbXMpKTtcbiAgICAgICAgICAgICAgLy8gaW50ZXJwb2xhdGUgbW9kaWZpZXMgbmV3UGFyYW1zLCBvbmx5IHF1ZXJ5IHBhcmFtcyBhcmUgbGVmdFxuICAgICAgICAgICAgICAkbG9jYXRpb24uc2VhcmNoKG5ld1BhcmFtcyk7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICB0aHJvdyAkcm91dGVNaW5FcnIoJ25vcm91dCcsICdUcmllZCB1cGRhdGluZyByb3V0ZSB3aGVuIHdpdGggbm8gY3VycmVudCByb3V0ZScpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgIH1cbiAgICAgICAgfTtcblxuICAgICRyb290U2NvcGUuJG9uKCckbG9jYXRpb25DaGFuZ2VTdGFydCcsIHByZXBhcmVSb3V0ZSk7XG4gICAgJHJvb3RTY29wZS4kb24oJyRsb2NhdGlvbkNoYW5nZVN1Y2Nlc3MnLCBjb21taXRSb3V0ZSk7XG5cbiAgICByZXR1cm4gJHJvdXRlO1xuXG4gICAgLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy9cblxuICAgIC8qKlxuICAgICAqIEBwYXJhbSBvbiB7c3RyaW5nfSBjdXJyZW50IHVybFxuICAgICAqIEBwYXJhbSByb3V0ZSB7T2JqZWN0fSByb3V0ZSByZWdleHAgdG8gbWF0Y2ggdGhlIHVybCBhZ2FpbnN0XG4gICAgICogQHJldHVybiB7P09iamVjdH1cbiAgICAgKlxuICAgICAqIEBkZXNjcmlwdGlvblxuICAgICAqIENoZWNrIGlmIHRoZSByb3V0ZSBtYXRjaGVzIHRoZSBjdXJyZW50IHVybC5cbiAgICAgKlxuICAgICAqIEluc3BpcmVkIGJ5IG1hdGNoIGluXG4gICAgICogdmlzaW9ubWVkaWEvZXhwcmVzcy9saWIvcm91dGVyL3JvdXRlci5qcy5cbiAgICAgKi9cbiAgICBmdW5jdGlvbiBzd2l0Y2hSb3V0ZU1hdGNoZXIob24sIHJvdXRlKSB7XG4gICAgICB2YXIga2V5cyA9IHJvdXRlLmtleXMsXG4gICAgICAgICAgcGFyYW1zID0ge307XG5cbiAgICAgIGlmICghcm91dGUucmVnZXhwKSByZXR1cm4gbnVsbDtcblxuICAgICAgdmFyIG0gPSByb3V0ZS5yZWdleHAuZXhlYyhvbik7XG4gICAgICBpZiAoIW0pIHJldHVybiBudWxsO1xuXG4gICAgICBmb3IgKHZhciBpID0gMSwgbGVuID0gbS5sZW5ndGg7IGkgPCBsZW47ICsraSkge1xuICAgICAgICB2YXIga2V5ID0ga2V5c1tpIC0gMV07XG5cbiAgICAgICAgdmFyIHZhbCA9IG1baV07XG5cbiAgICAgICAgaWYgKGtleSAmJiB2YWwpIHtcbiAgICAgICAgICBwYXJhbXNba2V5Lm5hbWVdID0gdmFsO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgICByZXR1cm4gcGFyYW1zO1xuICAgIH1cblxuICAgIGZ1bmN0aW9uIHByZXBhcmVSb3V0ZSgkbG9jYXRpb25FdmVudCkge1xuICAgICAgdmFyIGxhc3RSb3V0ZSA9ICRyb3V0ZS5jdXJyZW50O1xuXG4gICAgICBwcmVwYXJlZFJvdXRlID0gcGFyc2VSb3V0ZSgpO1xuICAgICAgcHJlcGFyZWRSb3V0ZUlzVXBkYXRlT25seSA9IHByZXBhcmVkUm91dGUgJiYgbGFzdFJvdXRlICYmIHByZXBhcmVkUm91dGUuJCRyb3V0ZSA9PT0gbGFzdFJvdXRlLiQkcm91dGVcbiAgICAgICAgICAmJiBhbmd1bGFyLmVxdWFscyhwcmVwYXJlZFJvdXRlLnBhdGhQYXJhbXMsIGxhc3RSb3V0ZS5wYXRoUGFyYW1zKVxuICAgICAgICAgICYmICFwcmVwYXJlZFJvdXRlLnJlbG9hZE9uU2VhcmNoICYmICFmb3JjZVJlbG9hZDtcblxuICAgICAgaWYgKCFwcmVwYXJlZFJvdXRlSXNVcGRhdGVPbmx5ICYmIChsYXN0Um91dGUgfHwgcHJlcGFyZWRSb3V0ZSkpIHtcbiAgICAgICAgaWYgKCRyb290U2NvcGUuJGJyb2FkY2FzdCgnJHJvdXRlQ2hhbmdlU3RhcnQnLCBwcmVwYXJlZFJvdXRlLCBsYXN0Um91dGUpLmRlZmF1bHRQcmV2ZW50ZWQpIHtcbiAgICAgICAgICBpZiAoJGxvY2F0aW9uRXZlbnQpIHtcbiAgICAgICAgICAgICRsb2NhdGlvbkV2ZW50LnByZXZlbnREZWZhdWx0KCk7XG4gICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICB9XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gY29tbWl0Um91dGUoKSB7XG4gICAgICB2YXIgbGFzdFJvdXRlID0gJHJvdXRlLmN1cnJlbnQ7XG4gICAgICB2YXIgbmV4dFJvdXRlID0gcHJlcGFyZWRSb3V0ZTtcblxuICAgICAgaWYgKHByZXBhcmVkUm91dGVJc1VwZGF0ZU9ubHkpIHtcbiAgICAgICAgbGFzdFJvdXRlLnBhcmFtcyA9IG5leHRSb3V0ZS5wYXJhbXM7XG4gICAgICAgIGFuZ3VsYXIuY29weShsYXN0Um91dGUucGFyYW1zLCAkcm91dGVQYXJhbXMpO1xuICAgICAgICAkcm9vdFNjb3BlLiRicm9hZGNhc3QoJyRyb3V0ZVVwZGF0ZScsIGxhc3RSb3V0ZSk7XG4gICAgICB9IGVsc2UgaWYgKG5leHRSb3V0ZSB8fCBsYXN0Um91dGUpIHtcbiAgICAgICAgZm9yY2VSZWxvYWQgPSBmYWxzZTtcbiAgICAgICAgJHJvdXRlLmN1cnJlbnQgPSBuZXh0Um91dGU7XG4gICAgICAgIGlmIChuZXh0Um91dGUpIHtcbiAgICAgICAgICBpZiAobmV4dFJvdXRlLnJlZGlyZWN0VG8pIHtcbiAgICAgICAgICAgIGlmIChhbmd1bGFyLmlzU3RyaW5nKG5leHRSb3V0ZS5yZWRpcmVjdFRvKSkge1xuICAgICAgICAgICAgICAkbG9jYXRpb24ucGF0aChpbnRlcnBvbGF0ZShuZXh0Um91dGUucmVkaXJlY3RUbywgbmV4dFJvdXRlLnBhcmFtcykpLnNlYXJjaChuZXh0Um91dGUucGFyYW1zKVxuICAgICAgICAgICAgICAgICAgICAgICAucmVwbGFjZSgpO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgJGxvY2F0aW9uLnVybChuZXh0Um91dGUucmVkaXJlY3RUbyhuZXh0Um91dGUucGF0aFBhcmFtcywgJGxvY2F0aW9uLnBhdGgoKSwgJGxvY2F0aW9uLnNlYXJjaCgpKSlcbiAgICAgICAgICAgICAgICAgICAgICAgLnJlcGxhY2UoKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICB9XG4gICAgICAgIH1cblxuICAgICAgICAkcS53aGVuKG5leHRSb3V0ZSkuXG4gICAgICAgICAgdGhlbihmdW5jdGlvbigpIHtcbiAgICAgICAgICAgIGlmIChuZXh0Um91dGUpIHtcbiAgICAgICAgICAgICAgdmFyIGxvY2FscyA9IGFuZ3VsYXIuZXh0ZW5kKHt9LCBuZXh0Um91dGUucmVzb2x2ZSksXG4gICAgICAgICAgICAgICAgICB0ZW1wbGF0ZSwgdGVtcGxhdGVVcmw7XG5cbiAgICAgICAgICAgICAgYW5ndWxhci5mb3JFYWNoKGxvY2FscywgZnVuY3Rpb24odmFsdWUsIGtleSkge1xuICAgICAgICAgICAgICAgIGxvY2Fsc1trZXldID0gYW5ndWxhci5pc1N0cmluZyh2YWx1ZSkgP1xuICAgICAgICAgICAgICAgICAgICAkaW5qZWN0b3IuZ2V0KHZhbHVlKSA6ICRpbmplY3Rvci5pbnZva2UodmFsdWUsIG51bGwsIG51bGwsIGtleSk7XG4gICAgICAgICAgICAgIH0pO1xuXG4gICAgICAgICAgICAgIGlmIChhbmd1bGFyLmlzRGVmaW5lZCh0ZW1wbGF0ZSA9IG5leHRSb3V0ZS50ZW1wbGF0ZSkpIHtcbiAgICAgICAgICAgICAgICBpZiAoYW5ndWxhci5pc0Z1bmN0aW9uKHRlbXBsYXRlKSkge1xuICAgICAgICAgICAgICAgICAgdGVtcGxhdGUgPSB0ZW1wbGF0ZShuZXh0Um91dGUucGFyYW1zKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgIH0gZWxzZSBpZiAoYW5ndWxhci5pc0RlZmluZWQodGVtcGxhdGVVcmwgPSBuZXh0Um91dGUudGVtcGxhdGVVcmwpKSB7XG4gICAgICAgICAgICAgICAgaWYgKGFuZ3VsYXIuaXNGdW5jdGlvbih0ZW1wbGF0ZVVybCkpIHtcbiAgICAgICAgICAgICAgICAgIHRlbXBsYXRlVXJsID0gdGVtcGxhdGVVcmwobmV4dFJvdXRlLnBhcmFtcyk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIGlmIChhbmd1bGFyLmlzRGVmaW5lZCh0ZW1wbGF0ZVVybCkpIHtcbiAgICAgICAgICAgICAgICAgIG5leHRSb3V0ZS5sb2FkZWRUZW1wbGF0ZVVybCA9ICRzY2UudmFsdWVPZih0ZW1wbGF0ZVVybCk7XG4gICAgICAgICAgICAgICAgICB0ZW1wbGF0ZSA9ICR0ZW1wbGF0ZVJlcXVlc3QodGVtcGxhdGVVcmwpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICBpZiAoYW5ndWxhci5pc0RlZmluZWQodGVtcGxhdGUpKSB7XG4gICAgICAgICAgICAgICAgbG9jYWxzWyckdGVtcGxhdGUnXSA9IHRlbXBsYXRlO1xuICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgIHJldHVybiAkcS5hbGwobG9jYWxzKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICB9KS5cbiAgICAgICAgICAvLyBhZnRlciByb3V0ZSBjaGFuZ2VcbiAgICAgICAgICB0aGVuKGZ1bmN0aW9uKGxvY2Fscykge1xuICAgICAgICAgICAgaWYgKG5leHRSb3V0ZSA9PSAkcm91dGUuY3VycmVudCkge1xuICAgICAgICAgICAgICBpZiAobmV4dFJvdXRlKSB7XG4gICAgICAgICAgICAgICAgbmV4dFJvdXRlLmxvY2FscyA9IGxvY2FscztcbiAgICAgICAgICAgICAgICBhbmd1bGFyLmNvcHkobmV4dFJvdXRlLnBhcmFtcywgJHJvdXRlUGFyYW1zKTtcbiAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAkcm9vdFNjb3BlLiRicm9hZGNhc3QoJyRyb3V0ZUNoYW5nZVN1Y2Nlc3MnLCBuZXh0Um91dGUsIGxhc3RSb3V0ZSk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgfSwgZnVuY3Rpb24oZXJyb3IpIHtcbiAgICAgICAgICAgIGlmIChuZXh0Um91dGUgPT0gJHJvdXRlLmN1cnJlbnQpIHtcbiAgICAgICAgICAgICAgJHJvb3RTY29wZS4kYnJvYWRjYXN0KCckcm91dGVDaGFuZ2VFcnJvcicsIG5leHRSb3V0ZSwgbGFzdFJvdXRlLCBlcnJvcik7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgfSk7XG4gICAgICB9XG4gICAgfVxuXG5cbiAgICAvKipcbiAgICAgKiBAcmV0dXJucyB7T2JqZWN0fSB0aGUgY3VycmVudCBhY3RpdmUgcm91dGUsIGJ5IG1hdGNoaW5nIGl0IGFnYWluc3QgdGhlIFVSTFxuICAgICAqL1xuICAgIGZ1bmN0aW9uIHBhcnNlUm91dGUoKSB7XG4gICAgICAvLyBNYXRjaCBhIHJvdXRlXG4gICAgICB2YXIgcGFyYW1zLCBtYXRjaDtcbiAgICAgIGFuZ3VsYXIuZm9yRWFjaChyb3V0ZXMsIGZ1bmN0aW9uKHJvdXRlLCBwYXRoKSB7XG4gICAgICAgIGlmICghbWF0Y2ggJiYgKHBhcmFtcyA9IHN3aXRjaFJvdXRlTWF0Y2hlcigkbG9jYXRpb24ucGF0aCgpLCByb3V0ZSkpKSB7XG4gICAgICAgICAgbWF0Y2ggPSBpbmhlcml0KHJvdXRlLCB7XG4gICAgICAgICAgICBwYXJhbXM6IGFuZ3VsYXIuZXh0ZW5kKHt9LCAkbG9jYXRpb24uc2VhcmNoKCksIHBhcmFtcyksXG4gICAgICAgICAgICBwYXRoUGFyYW1zOiBwYXJhbXN9KTtcbiAgICAgICAgICBtYXRjaC4kJHJvdXRlID0gcm91dGU7XG4gICAgICAgIH1cbiAgICAgIH0pO1xuICAgICAgLy8gTm8gcm91dGUgbWF0Y2hlZDsgZmFsbGJhY2sgdG8gXCJvdGhlcndpc2VcIiByb3V0ZVxuICAgICAgcmV0dXJuIG1hdGNoIHx8IHJvdXRlc1tudWxsXSAmJiBpbmhlcml0KHJvdXRlc1tudWxsXSwge3BhcmFtczoge30sIHBhdGhQYXJhbXM6e319KTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBAcmV0dXJucyB7c3RyaW5nfSBpbnRlcnBvbGF0aW9uIG9mIHRoZSByZWRpcmVjdCBwYXRoIHdpdGggdGhlIHBhcmFtZXRlcnNcbiAgICAgKi9cbiAgICBmdW5jdGlvbiBpbnRlcnBvbGF0ZShzdHJpbmcsIHBhcmFtcykge1xuICAgICAgdmFyIHJlc3VsdCA9IFtdO1xuICAgICAgYW5ndWxhci5mb3JFYWNoKChzdHJpbmcgfHwgJycpLnNwbGl0KCc6JyksIGZ1bmN0aW9uKHNlZ21lbnQsIGkpIHtcbiAgICAgICAgaWYgKGkgPT09IDApIHtcbiAgICAgICAgICByZXN1bHQucHVzaChzZWdtZW50KTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICB2YXIgc2VnbWVudE1hdGNoID0gc2VnbWVudC5tYXRjaCgvKFxcdyspKD86Wz8qXSk/KC4qKS8pO1xuICAgICAgICAgIHZhciBrZXkgPSBzZWdtZW50TWF0Y2hbMV07XG4gICAgICAgICAgcmVzdWx0LnB1c2gocGFyYW1zW2tleV0pO1xuICAgICAgICAgIHJlc3VsdC5wdXNoKHNlZ21lbnRNYXRjaFsyXSB8fCAnJyk7XG4gICAgICAgICAgZGVsZXRlIHBhcmFtc1trZXldO1xuICAgICAgICB9XG4gICAgICB9KTtcbiAgICAgIHJldHVybiByZXN1bHQuam9pbignJyk7XG4gICAgfVxuICB9XTtcbn1cblxubmdSb3V0ZU1vZHVsZS5wcm92aWRlcignJHJvdXRlUGFyYW1zJywgJFJvdXRlUGFyYW1zUHJvdmlkZXIpO1xuXG5cbi8qKlxuICogQG5nZG9jIHNlcnZpY2VcbiAqIEBuYW1lICRyb3V0ZVBhcmFtc1xuICogQHJlcXVpcmVzICRyb3V0ZVxuICpcbiAqIEBkZXNjcmlwdGlvblxuICogVGhlIGAkcm91dGVQYXJhbXNgIHNlcnZpY2UgYWxsb3dzIHlvdSB0byByZXRyaWV2ZSB0aGUgY3VycmVudCBzZXQgb2Ygcm91dGUgcGFyYW1ldGVycy5cbiAqXG4gKiBSZXF1aXJlcyB0aGUge0BsaW5rIG5nUm91dGUgYG5nUm91dGVgfSBtb2R1bGUgdG8gYmUgaW5zdGFsbGVkLlxuICpcbiAqIFRoZSByb3V0ZSBwYXJhbWV0ZXJzIGFyZSBhIGNvbWJpbmF0aW9uIG9mIHtAbGluayBuZy4kbG9jYXRpb24gYCRsb2NhdGlvbmB9J3NcbiAqIHtAbGluayBuZy4kbG9jYXRpb24jc2VhcmNoIGBzZWFyY2goKWB9IGFuZCB7QGxpbmsgbmcuJGxvY2F0aW9uI3BhdGggYHBhdGgoKWB9LlxuICogVGhlIGBwYXRoYCBwYXJhbWV0ZXJzIGFyZSBleHRyYWN0ZWQgd2hlbiB0aGUge0BsaW5rIG5nUm91dGUuJHJvdXRlIGAkcm91dGVgfSBwYXRoIGlzIG1hdGNoZWQuXG4gKlxuICogSW4gY2FzZSBvZiBwYXJhbWV0ZXIgbmFtZSBjb2xsaXNpb24sIGBwYXRoYCBwYXJhbXMgdGFrZSBwcmVjZWRlbmNlIG92ZXIgYHNlYXJjaGAgcGFyYW1zLlxuICpcbiAqIFRoZSBzZXJ2aWNlIGd1YXJhbnRlZXMgdGhhdCB0aGUgaWRlbnRpdHkgb2YgdGhlIGAkcm91dGVQYXJhbXNgIG9iamVjdCB3aWxsIHJlbWFpbiB1bmNoYW5nZWRcbiAqIChidXQgaXRzIHByb3BlcnRpZXMgd2lsbCBsaWtlbHkgY2hhbmdlKSBldmVuIHdoZW4gYSByb3V0ZSBjaGFuZ2Ugb2NjdXJzLlxuICpcbiAqIE5vdGUgdGhhdCB0aGUgYCRyb3V0ZVBhcmFtc2AgYXJlIG9ubHkgdXBkYXRlZCAqYWZ0ZXIqIGEgcm91dGUgY2hhbmdlIGNvbXBsZXRlcyBzdWNjZXNzZnVsbHkuXG4gKiBUaGlzIG1lYW5zIHRoYXQgeW91IGNhbm5vdCByZWx5IG9uIGAkcm91dGVQYXJhbXNgIGJlaW5nIGNvcnJlY3QgaW4gcm91dGUgcmVzb2x2ZSBmdW5jdGlvbnMuXG4gKiBJbnN0ZWFkIHlvdSBjYW4gdXNlIGAkcm91dGUuY3VycmVudC5wYXJhbXNgIHRvIGFjY2VzcyB0aGUgbmV3IHJvdXRlJ3MgcGFyYW1ldGVycy5cbiAqXG4gKiBAZXhhbXBsZVxuICogYGBganNcbiAqICAvLyBHaXZlbjpcbiAqICAvLyBVUkw6IGh0dHA6Ly9zZXJ2ZXIuY29tL2luZGV4Lmh0bWwjL0NoYXB0ZXIvMS9TZWN0aW9uLzI/c2VhcmNoPW1vYnlcbiAqICAvLyBSb3V0ZTogL0NoYXB0ZXIvOmNoYXB0ZXJJZC9TZWN0aW9uLzpzZWN0aW9uSWRcbiAqICAvL1xuICogIC8vIFRoZW5cbiAqICAkcm91dGVQYXJhbXMgPT0+IHtjaGFwdGVySWQ6JzEnLCBzZWN0aW9uSWQ6JzInLCBzZWFyY2g6J21vYnknfVxuICogYGBgXG4gKi9cbmZ1bmN0aW9uICRSb3V0ZVBhcmFtc1Byb3ZpZGVyKCkge1xuICB0aGlzLiRnZXQgPSBmdW5jdGlvbigpIHsgcmV0dXJuIHt9OyB9O1xufVxuXG5uZ1JvdXRlTW9kdWxlLmRpcmVjdGl2ZSgnbmdWaWV3JywgbmdWaWV3RmFjdG9yeSk7XG5uZ1JvdXRlTW9kdWxlLmRpcmVjdGl2ZSgnbmdWaWV3JywgbmdWaWV3RmlsbENvbnRlbnRGYWN0b3J5KTtcblxuXG4vKipcbiAqIEBuZ2RvYyBkaXJlY3RpdmVcbiAqIEBuYW1lIG5nVmlld1xuICogQHJlc3RyaWN0IEVDQVxuICpcbiAqIEBkZXNjcmlwdGlvblxuICogIyBPdmVydmlld1xuICogYG5nVmlld2AgaXMgYSBkaXJlY3RpdmUgdGhhdCBjb21wbGVtZW50cyB0aGUge0BsaW5rIG5nUm91dGUuJHJvdXRlICRyb3V0ZX0gc2VydmljZSBieVxuICogaW5jbHVkaW5nIHRoZSByZW5kZXJlZCB0ZW1wbGF0ZSBvZiB0aGUgY3VycmVudCByb3V0ZSBpbnRvIHRoZSBtYWluIGxheW91dCAoYGluZGV4Lmh0bWxgKSBmaWxlLlxuICogRXZlcnkgdGltZSB0aGUgY3VycmVudCByb3V0ZSBjaGFuZ2VzLCB0aGUgaW5jbHVkZWQgdmlldyBjaGFuZ2VzIHdpdGggaXQgYWNjb3JkaW5nIHRvIHRoZVxuICogY29uZmlndXJhdGlvbiBvZiB0aGUgYCRyb3V0ZWAgc2VydmljZS5cbiAqXG4gKiBSZXF1aXJlcyB0aGUge0BsaW5rIG5nUm91dGUgYG5nUm91dGVgfSBtb2R1bGUgdG8gYmUgaW5zdGFsbGVkLlxuICpcbiAqIEBhbmltYXRpb25zXG4gKiBlbnRlciAtIGFuaW1hdGlvbiBpcyB1c2VkIHRvIGJyaW5nIG5ldyBjb250ZW50IGludG8gdGhlIGJyb3dzZXIuXG4gKiBsZWF2ZSAtIGFuaW1hdGlvbiBpcyB1c2VkIHRvIGFuaW1hdGUgZXhpc3RpbmcgY29udGVudCBhd2F5LlxuICpcbiAqIFRoZSBlbnRlciBhbmQgbGVhdmUgYW5pbWF0aW9uIG9jY3VyIGNvbmN1cnJlbnRseS5cbiAqXG4gKiBAc2NvcGVcbiAqIEBwcmlvcml0eSA0MDBcbiAqIEBwYXJhbSB7c3RyaW5nPX0gb25sb2FkIEV4cHJlc3Npb24gdG8gZXZhbHVhdGUgd2hlbmV2ZXIgdGhlIHZpZXcgdXBkYXRlcy5cbiAqXG4gKiBAcGFyYW0ge3N0cmluZz19IGF1dG9zY3JvbGwgV2hldGhlciBgbmdWaWV3YCBzaG91bGQgY2FsbCB7QGxpbmsgbmcuJGFuY2hvclNjcm9sbFxuICogICAgICAgICAgICAgICAgICAkYW5jaG9yU2Nyb2xsfSB0byBzY3JvbGwgdGhlIHZpZXdwb3J0IGFmdGVyIHRoZSB2aWV3IGlzIHVwZGF0ZWQuXG4gKlxuICogICAgICAgICAgICAgICAgICAtIElmIHRoZSBhdHRyaWJ1dGUgaXMgbm90IHNldCwgZGlzYWJsZSBzY3JvbGxpbmcuXG4gKiAgICAgICAgICAgICAgICAgIC0gSWYgdGhlIGF0dHJpYnV0ZSBpcyBzZXQgd2l0aG91dCB2YWx1ZSwgZW5hYmxlIHNjcm9sbGluZy5cbiAqICAgICAgICAgICAgICAgICAgLSBPdGhlcndpc2UgZW5hYmxlIHNjcm9sbGluZyBvbmx5IGlmIHRoZSBgYXV0b3Njcm9sbGAgYXR0cmlidXRlIHZhbHVlIGV2YWx1YXRlZFxuICogICAgICAgICAgICAgICAgICAgIGFzIGFuIGV4cHJlc3Npb24geWllbGRzIGEgdHJ1dGh5IHZhbHVlLlxuICogQGV4YW1wbGVcbiAgICA8ZXhhbXBsZSBuYW1lPVwibmdWaWV3LWRpcmVjdGl2ZVwiIG1vZHVsZT1cIm5nVmlld0V4YW1wbGVcIlxuICAgICAgICAgICAgIGRlcHM9XCJhbmd1bGFyLXJvdXRlLmpzO2FuZ3VsYXItYW5pbWF0ZS5qc1wiXG4gICAgICAgICAgICAgYW5pbWF0aW9ucz1cInRydWVcIiBmaXhCYXNlPVwidHJ1ZVwiPlxuICAgICAgPGZpbGUgbmFtZT1cImluZGV4Lmh0bWxcIj5cbiAgICAgICAgPGRpdiBuZy1jb250cm9sbGVyPVwiTWFpbkN0cmwgYXMgbWFpblwiPlxuICAgICAgICAgIENob29zZTpcbiAgICAgICAgICA8YSBocmVmPVwiQm9vay9Nb2J5XCI+TW9ieTwvYT4gfFxuICAgICAgICAgIDxhIGhyZWY9XCJCb29rL01vYnkvY2gvMVwiPk1vYnk6IENoMTwvYT4gfFxuICAgICAgICAgIDxhIGhyZWY9XCJCb29rL0dhdHNieVwiPkdhdHNieTwvYT4gfFxuICAgICAgICAgIDxhIGhyZWY9XCJCb29rL0dhdHNieS9jaC80P2tleT12YWx1ZVwiPkdhdHNieTogQ2g0PC9hPiB8XG4gICAgICAgICAgPGEgaHJlZj1cIkJvb2svU2NhcmxldFwiPlNjYXJsZXQgTGV0dGVyPC9hPjxici8+XG5cbiAgICAgICAgICA8ZGl2IGNsYXNzPVwidmlldy1hbmltYXRlLWNvbnRhaW5lclwiPlxuICAgICAgICAgICAgPGRpdiBuZy12aWV3IGNsYXNzPVwidmlldy1hbmltYXRlXCI+PC9kaXY+XG4gICAgICAgICAgPC9kaXY+XG4gICAgICAgICAgPGhyIC8+XG5cbiAgICAgICAgICA8cHJlPiRsb2NhdGlvbi5wYXRoKCkgPSB7e21haW4uJGxvY2F0aW9uLnBhdGgoKX19PC9wcmU+XG4gICAgICAgICAgPHByZT4kcm91dGUuY3VycmVudC50ZW1wbGF0ZVVybCA9IHt7bWFpbi4kcm91dGUuY3VycmVudC50ZW1wbGF0ZVVybH19PC9wcmU+XG4gICAgICAgICAgPHByZT4kcm91dGUuY3VycmVudC5wYXJhbXMgPSB7e21haW4uJHJvdXRlLmN1cnJlbnQucGFyYW1zfX08L3ByZT5cbiAgICAgICAgICA8cHJlPiRyb3V0ZVBhcmFtcyA9IHt7bWFpbi4kcm91dGVQYXJhbXN9fTwvcHJlPlxuICAgICAgICA8L2Rpdj5cbiAgICAgIDwvZmlsZT5cblxuICAgICAgPGZpbGUgbmFtZT1cImJvb2suaHRtbFwiPlxuICAgICAgICA8ZGl2PlxuICAgICAgICAgIGNvbnRyb2xsZXI6IHt7Ym9vay5uYW1lfX08YnIgLz5cbiAgICAgICAgICBCb29rIElkOiB7e2Jvb2sucGFyYW1zLmJvb2tJZH19PGJyIC8+XG4gICAgICAgIDwvZGl2PlxuICAgICAgPC9maWxlPlxuXG4gICAgICA8ZmlsZSBuYW1lPVwiY2hhcHRlci5odG1sXCI+XG4gICAgICAgIDxkaXY+XG4gICAgICAgICAgY29udHJvbGxlcjoge3tjaGFwdGVyLm5hbWV9fTxiciAvPlxuICAgICAgICAgIEJvb2sgSWQ6IHt7Y2hhcHRlci5wYXJhbXMuYm9va0lkfX08YnIgLz5cbiAgICAgICAgICBDaGFwdGVyIElkOiB7e2NoYXB0ZXIucGFyYW1zLmNoYXB0ZXJJZH19XG4gICAgICAgIDwvZGl2PlxuICAgICAgPC9maWxlPlxuXG4gICAgICA8ZmlsZSBuYW1lPVwiYW5pbWF0aW9ucy5jc3NcIj5cbiAgICAgICAgLnZpZXctYW5pbWF0ZS1jb250YWluZXIge1xuICAgICAgICAgIHBvc2l0aW9uOnJlbGF0aXZlO1xuICAgICAgICAgIGhlaWdodDoxMDBweCFpbXBvcnRhbnQ7XG4gICAgICAgICAgYmFja2dyb3VuZDp3aGl0ZTtcbiAgICAgICAgICBib3JkZXI6MXB4IHNvbGlkIGJsYWNrO1xuICAgICAgICAgIGhlaWdodDo0MHB4O1xuICAgICAgICAgIG92ZXJmbG93OmhpZGRlbjtcbiAgICAgICAgfVxuXG4gICAgICAgIC52aWV3LWFuaW1hdGUge1xuICAgICAgICAgIHBhZGRpbmc6MTBweDtcbiAgICAgICAgfVxuXG4gICAgICAgIC52aWV3LWFuaW1hdGUubmctZW50ZXIsIC52aWV3LWFuaW1hdGUubmctbGVhdmUge1xuICAgICAgICAgIC13ZWJraXQtdHJhbnNpdGlvbjphbGwgY3ViaWMtYmV6aWVyKDAuMjUwLCAwLjQ2MCwgMC40NTAsIDAuOTQwKSAxLjVzO1xuICAgICAgICAgIHRyYW5zaXRpb246YWxsIGN1YmljLWJlemllcigwLjI1MCwgMC40NjAsIDAuNDUwLCAwLjk0MCkgMS41cztcblxuICAgICAgICAgIGRpc3BsYXk6YmxvY2s7XG4gICAgICAgICAgd2lkdGg6MTAwJTtcbiAgICAgICAgICBib3JkZXItbGVmdDoxcHggc29saWQgYmxhY2s7XG5cbiAgICAgICAgICBwb3NpdGlvbjphYnNvbHV0ZTtcbiAgICAgICAgICB0b3A6MDtcbiAgICAgICAgICBsZWZ0OjA7XG4gICAgICAgICAgcmlnaHQ6MDtcbiAgICAgICAgICBib3R0b206MDtcbiAgICAgICAgICBwYWRkaW5nOjEwcHg7XG4gICAgICAgIH1cblxuICAgICAgICAudmlldy1hbmltYXRlLm5nLWVudGVyIHtcbiAgICAgICAgICBsZWZ0OjEwMCU7XG4gICAgICAgIH1cbiAgICAgICAgLnZpZXctYW5pbWF0ZS5uZy1lbnRlci5uZy1lbnRlci1hY3RpdmUge1xuICAgICAgICAgIGxlZnQ6MDtcbiAgICAgICAgfVxuICAgICAgICAudmlldy1hbmltYXRlLm5nLWxlYXZlLm5nLWxlYXZlLWFjdGl2ZSB7XG4gICAgICAgICAgbGVmdDotMTAwJTtcbiAgICAgICAgfVxuICAgICAgPC9maWxlPlxuXG4gICAgICA8ZmlsZSBuYW1lPVwic2NyaXB0LmpzXCI+XG4gICAgICAgIGFuZ3VsYXIubW9kdWxlKCduZ1ZpZXdFeGFtcGxlJywgWyduZ1JvdXRlJywgJ25nQW5pbWF0ZSddKVxuICAgICAgICAgIC5jb25maWcoWyckcm91dGVQcm92aWRlcicsICckbG9jYXRpb25Qcm92aWRlcicsXG4gICAgICAgICAgICBmdW5jdGlvbigkcm91dGVQcm92aWRlciwgJGxvY2F0aW9uUHJvdmlkZXIpIHtcbiAgICAgICAgICAgICAgJHJvdXRlUHJvdmlkZXJcbiAgICAgICAgICAgICAgICAud2hlbignL0Jvb2svOmJvb2tJZCcsIHtcbiAgICAgICAgICAgICAgICAgIHRlbXBsYXRlVXJsOiAnYm9vay5odG1sJyxcbiAgICAgICAgICAgICAgICAgIGNvbnRyb2xsZXI6ICdCb29rQ3RybCcsXG4gICAgICAgICAgICAgICAgICBjb250cm9sbGVyQXM6ICdib29rJ1xuICAgICAgICAgICAgICAgIH0pXG4gICAgICAgICAgICAgICAgLndoZW4oJy9Cb29rLzpib29rSWQvY2gvOmNoYXB0ZXJJZCcsIHtcbiAgICAgICAgICAgICAgICAgIHRlbXBsYXRlVXJsOiAnY2hhcHRlci5odG1sJyxcbiAgICAgICAgICAgICAgICAgIGNvbnRyb2xsZXI6ICdDaGFwdGVyQ3RybCcsXG4gICAgICAgICAgICAgICAgICBjb250cm9sbGVyQXM6ICdjaGFwdGVyJ1xuICAgICAgICAgICAgICAgIH0pO1xuXG4gICAgICAgICAgICAgICRsb2NhdGlvblByb3ZpZGVyLmh0bWw1TW9kZSh0cnVlKTtcbiAgICAgICAgICB9XSlcbiAgICAgICAgICAuY29udHJvbGxlcignTWFpbkN0cmwnLCBbJyRyb3V0ZScsICckcm91dGVQYXJhbXMnLCAnJGxvY2F0aW9uJyxcbiAgICAgICAgICAgIGZ1bmN0aW9uKCRyb3V0ZSwgJHJvdXRlUGFyYW1zLCAkbG9jYXRpb24pIHtcbiAgICAgICAgICAgICAgdGhpcy4kcm91dGUgPSAkcm91dGU7XG4gICAgICAgICAgICAgIHRoaXMuJGxvY2F0aW9uID0gJGxvY2F0aW9uO1xuICAgICAgICAgICAgICB0aGlzLiRyb3V0ZVBhcmFtcyA9ICRyb3V0ZVBhcmFtcztcbiAgICAgICAgICB9XSlcbiAgICAgICAgICAuY29udHJvbGxlcignQm9va0N0cmwnLCBbJyRyb3V0ZVBhcmFtcycsIGZ1bmN0aW9uKCRyb3V0ZVBhcmFtcykge1xuICAgICAgICAgICAgdGhpcy5uYW1lID0gXCJCb29rQ3RybFwiO1xuICAgICAgICAgICAgdGhpcy5wYXJhbXMgPSAkcm91dGVQYXJhbXM7XG4gICAgICAgICAgfV0pXG4gICAgICAgICAgLmNvbnRyb2xsZXIoJ0NoYXB0ZXJDdHJsJywgWyckcm91dGVQYXJhbXMnLCBmdW5jdGlvbigkcm91dGVQYXJhbXMpIHtcbiAgICAgICAgICAgIHRoaXMubmFtZSA9IFwiQ2hhcHRlckN0cmxcIjtcbiAgICAgICAgICAgIHRoaXMucGFyYW1zID0gJHJvdXRlUGFyYW1zO1xuICAgICAgICAgIH1dKTtcblxuICAgICAgPC9maWxlPlxuXG4gICAgICA8ZmlsZSBuYW1lPVwicHJvdHJhY3Rvci5qc1wiIHR5cGU9XCJwcm90cmFjdG9yXCI+XG4gICAgICAgIGl0KCdzaG91bGQgbG9hZCBhbmQgY29tcGlsZSBjb3JyZWN0IHRlbXBsYXRlJywgZnVuY3Rpb24oKSB7XG4gICAgICAgICAgZWxlbWVudChieS5saW5rVGV4dCgnTW9ieTogQ2gxJykpLmNsaWNrKCk7XG4gICAgICAgICAgdmFyIGNvbnRlbnQgPSBlbGVtZW50KGJ5LmNzcygnW25nLXZpZXddJykpLmdldFRleHQoKTtcbiAgICAgICAgICBleHBlY3QoY29udGVudCkudG9NYXRjaCgvY29udHJvbGxlclxcOiBDaGFwdGVyQ3RybC8pO1xuICAgICAgICAgIGV4cGVjdChjb250ZW50KS50b01hdGNoKC9Cb29rIElkXFw6IE1vYnkvKTtcbiAgICAgICAgICBleHBlY3QoY29udGVudCkudG9NYXRjaCgvQ2hhcHRlciBJZFxcOiAxLyk7XG5cbiAgICAgICAgICBlbGVtZW50KGJ5LnBhcnRpYWxMaW5rVGV4dCgnU2NhcmxldCcpKS5jbGljaygpO1xuXG4gICAgICAgICAgY29udGVudCA9IGVsZW1lbnQoYnkuY3NzKCdbbmctdmlld10nKSkuZ2V0VGV4dCgpO1xuICAgICAgICAgIGV4cGVjdChjb250ZW50KS50b01hdGNoKC9jb250cm9sbGVyXFw6IEJvb2tDdHJsLyk7XG4gICAgICAgICAgZXhwZWN0KGNvbnRlbnQpLnRvTWF0Y2goL0Jvb2sgSWRcXDogU2NhcmxldC8pO1xuICAgICAgICB9KTtcbiAgICAgIDwvZmlsZT5cbiAgICA8L2V4YW1wbGU+XG4gKi9cblxuXG4vKipcbiAqIEBuZ2RvYyBldmVudFxuICogQG5hbWUgbmdWaWV3IyR2aWV3Q29udGVudExvYWRlZFxuICogQGV2ZW50VHlwZSBlbWl0IG9uIHRoZSBjdXJyZW50IG5nVmlldyBzY29wZVxuICogQGRlc2NyaXB0aW9uXG4gKiBFbWl0dGVkIGV2ZXJ5IHRpbWUgdGhlIG5nVmlldyBjb250ZW50IGlzIHJlbG9hZGVkLlxuICovXG5uZ1ZpZXdGYWN0b3J5LiRpbmplY3QgPSBbJyRyb3V0ZScsICckYW5jaG9yU2Nyb2xsJywgJyRhbmltYXRlJ107XG5mdW5jdGlvbiBuZ1ZpZXdGYWN0b3J5KCRyb3V0ZSwgJGFuY2hvclNjcm9sbCwgJGFuaW1hdGUpIHtcbiAgcmV0dXJuIHtcbiAgICByZXN0cmljdDogJ0VDQScsXG4gICAgdGVybWluYWw6IHRydWUsXG4gICAgcHJpb3JpdHk6IDQwMCxcbiAgICB0cmFuc2NsdWRlOiAnZWxlbWVudCcsXG4gICAgbGluazogZnVuY3Rpb24oc2NvcGUsICRlbGVtZW50LCBhdHRyLCBjdHJsLCAkdHJhbnNjbHVkZSkge1xuICAgICAgICB2YXIgY3VycmVudFNjb3BlLFxuICAgICAgICAgICAgY3VycmVudEVsZW1lbnQsXG4gICAgICAgICAgICBwcmV2aW91c0xlYXZlQW5pbWF0aW9uLFxuICAgICAgICAgICAgYXV0b1Njcm9sbEV4cCA9IGF0dHIuYXV0b3Njcm9sbCxcbiAgICAgICAgICAgIG9ubG9hZEV4cCA9IGF0dHIub25sb2FkIHx8ICcnO1xuXG4gICAgICAgIHNjb3BlLiRvbignJHJvdXRlQ2hhbmdlU3VjY2VzcycsIHVwZGF0ZSk7XG4gICAgICAgIHVwZGF0ZSgpO1xuXG4gICAgICAgIGZ1bmN0aW9uIGNsZWFudXBMYXN0VmlldygpIHtcbiAgICAgICAgICBpZiAocHJldmlvdXNMZWF2ZUFuaW1hdGlvbikge1xuICAgICAgICAgICAgJGFuaW1hdGUuY2FuY2VsKHByZXZpb3VzTGVhdmVBbmltYXRpb24pO1xuICAgICAgICAgICAgcHJldmlvdXNMZWF2ZUFuaW1hdGlvbiA9IG51bGw7XG4gICAgICAgICAgfVxuXG4gICAgICAgICAgaWYgKGN1cnJlbnRTY29wZSkge1xuICAgICAgICAgICAgY3VycmVudFNjb3BlLiRkZXN0cm95KCk7XG4gICAgICAgICAgICBjdXJyZW50U2NvcGUgPSBudWxsO1xuICAgICAgICAgIH1cbiAgICAgICAgICBpZiAoY3VycmVudEVsZW1lbnQpIHtcbiAgICAgICAgICAgIHByZXZpb3VzTGVhdmVBbmltYXRpb24gPSAkYW5pbWF0ZS5sZWF2ZShjdXJyZW50RWxlbWVudCk7XG4gICAgICAgICAgICBwcmV2aW91c0xlYXZlQW5pbWF0aW9uLnRoZW4oZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICAgIHByZXZpb3VzTGVhdmVBbmltYXRpb24gPSBudWxsO1xuICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICBjdXJyZW50RWxlbWVudCA9IG51bGw7XG4gICAgICAgICAgfVxuICAgICAgICB9XG5cbiAgICAgICAgZnVuY3Rpb24gdXBkYXRlKCkge1xuICAgICAgICAgIHZhciBsb2NhbHMgPSAkcm91dGUuY3VycmVudCAmJiAkcm91dGUuY3VycmVudC5sb2NhbHMsXG4gICAgICAgICAgICAgIHRlbXBsYXRlID0gbG9jYWxzICYmIGxvY2Fscy4kdGVtcGxhdGU7XG5cbiAgICAgICAgICBpZiAoYW5ndWxhci5pc0RlZmluZWQodGVtcGxhdGUpKSB7XG4gICAgICAgICAgICB2YXIgbmV3U2NvcGUgPSBzY29wZS4kbmV3KCk7XG4gICAgICAgICAgICB2YXIgY3VycmVudCA9ICRyb3V0ZS5jdXJyZW50O1xuXG4gICAgICAgICAgICAvLyBOb3RlOiBUaGlzIHdpbGwgYWxzbyBsaW5rIGFsbCBjaGlsZHJlbiBvZiBuZy12aWV3IHRoYXQgd2VyZSBjb250YWluZWQgaW4gdGhlIG9yaWdpbmFsXG4gICAgICAgICAgICAvLyBodG1sLiBJZiB0aGF0IGNvbnRlbnQgY29udGFpbnMgY29udHJvbGxlcnMsIC4uLiB0aGV5IGNvdWxkIHBvbGx1dGUvY2hhbmdlIHRoZSBzY29wZS5cbiAgICAgICAgICAgIC8vIEhvd2V2ZXIsIHVzaW5nIG5nLXZpZXcgb24gYW4gZWxlbWVudCB3aXRoIGFkZGl0aW9uYWwgY29udGVudCBkb2VzIG5vdCBtYWtlIHNlbnNlLi4uXG4gICAgICAgICAgICAvLyBOb3RlOiBXZSBjYW4ndCByZW1vdmUgdGhlbSBpbiB0aGUgY2xvbmVBdHRjaEZuIG9mICR0cmFuc2NsdWRlIGFzIHRoYXRcbiAgICAgICAgICAgIC8vIGZ1bmN0aW9uIGlzIGNhbGxlZCBiZWZvcmUgbGlua2luZyB0aGUgY29udGVudCwgd2hpY2ggd291bGQgYXBwbHkgY2hpbGRcbiAgICAgICAgICAgIC8vIGRpcmVjdGl2ZXMgdG8gbm9uIGV4aXN0aW5nIGVsZW1lbnRzLlxuICAgICAgICAgICAgdmFyIGNsb25lID0gJHRyYW5zY2x1ZGUobmV3U2NvcGUsIGZ1bmN0aW9uKGNsb25lKSB7XG4gICAgICAgICAgICAgICRhbmltYXRlLmVudGVyKGNsb25lLCBudWxsLCBjdXJyZW50RWxlbWVudCB8fCAkZWxlbWVudCkudGhlbihmdW5jdGlvbiBvbk5nVmlld0VudGVyKCkge1xuICAgICAgICAgICAgICAgIGlmIChhbmd1bGFyLmlzRGVmaW5lZChhdXRvU2Nyb2xsRXhwKVxuICAgICAgICAgICAgICAgICAgJiYgKCFhdXRvU2Nyb2xsRXhwIHx8IHNjb3BlLiRldmFsKGF1dG9TY3JvbGxFeHApKSkge1xuICAgICAgICAgICAgICAgICAgJGFuY2hvclNjcm9sbCgpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgIGNsZWFudXBMYXN0VmlldygpO1xuICAgICAgICAgICAgfSk7XG5cbiAgICAgICAgICAgIGN1cnJlbnRFbGVtZW50ID0gY2xvbmU7XG4gICAgICAgICAgICBjdXJyZW50U2NvcGUgPSBjdXJyZW50LnNjb3BlID0gbmV3U2NvcGU7XG4gICAgICAgICAgICBjdXJyZW50U2NvcGUuJGVtaXQoJyR2aWV3Q29udGVudExvYWRlZCcpO1xuICAgICAgICAgICAgY3VycmVudFNjb3BlLiRldmFsKG9ubG9hZEV4cCk7XG4gICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIGNsZWFudXBMYXN0VmlldygpO1xuICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgIH1cbiAgfTtcbn1cblxuLy8gVGhpcyBkaXJlY3RpdmUgaXMgY2FsbGVkIGR1cmluZyB0aGUgJHRyYW5zY2x1ZGUgY2FsbCBvZiB0aGUgZmlyc3QgYG5nVmlld2AgZGlyZWN0aXZlLlxuLy8gSXQgd2lsbCByZXBsYWNlIGFuZCBjb21waWxlIHRoZSBjb250ZW50IG9mIHRoZSBlbGVtZW50IHdpdGggdGhlIGxvYWRlZCB0ZW1wbGF0ZS5cbi8vIFdlIG5lZWQgdGhpcyBkaXJlY3RpdmUgc28gdGhhdCB0aGUgZWxlbWVudCBjb250ZW50IGlzIGFscmVhZHkgZmlsbGVkIHdoZW5cbi8vIHRoZSBsaW5rIGZ1bmN0aW9uIG9mIGFub3RoZXIgZGlyZWN0aXZlIG9uIHRoZSBzYW1lIGVsZW1lbnQgYXMgbmdWaWV3XG4vLyBpcyBjYWxsZWQuXG5uZ1ZpZXdGaWxsQ29udGVudEZhY3RvcnkuJGluamVjdCA9IFsnJGNvbXBpbGUnLCAnJGNvbnRyb2xsZXInLCAnJHJvdXRlJ107XG5mdW5jdGlvbiBuZ1ZpZXdGaWxsQ29udGVudEZhY3RvcnkoJGNvbXBpbGUsICRjb250cm9sbGVyLCAkcm91dGUpIHtcbiAgcmV0dXJuIHtcbiAgICByZXN0cmljdDogJ0VDQScsXG4gICAgcHJpb3JpdHk6IC00MDAsXG4gICAgbGluazogZnVuY3Rpb24oc2NvcGUsICRlbGVtZW50KSB7XG4gICAgICB2YXIgY3VycmVudCA9ICRyb3V0ZS5jdXJyZW50LFxuICAgICAgICAgIGxvY2FscyA9IGN1cnJlbnQubG9jYWxzO1xuXG4gICAgICAkZWxlbWVudC5odG1sKGxvY2Fscy4kdGVtcGxhdGUpO1xuXG4gICAgICB2YXIgbGluayA9ICRjb21waWxlKCRlbGVtZW50LmNvbnRlbnRzKCkpO1xuXG4gICAgICBpZiAoY3VycmVudC5jb250cm9sbGVyKSB7XG4gICAgICAgIGxvY2Fscy4kc2NvcGUgPSBzY29wZTtcbiAgICAgICAgdmFyIGNvbnRyb2xsZXIgPSAkY29udHJvbGxlcihjdXJyZW50LmNvbnRyb2xsZXIsIGxvY2Fscyk7XG4gICAgICAgIGlmIChjdXJyZW50LmNvbnRyb2xsZXJBcykge1xuICAgICAgICAgIHNjb3BlW2N1cnJlbnQuY29udHJvbGxlckFzXSA9IGNvbnRyb2xsZXI7XG4gICAgICAgIH1cbiAgICAgICAgJGVsZW1lbnQuZGF0YSgnJG5nQ29udHJvbGxlckNvbnRyb2xsZXInLCBjb250cm9sbGVyKTtcbiAgICAgICAgJGVsZW1lbnQuY2hpbGRyZW4oKS5kYXRhKCckbmdDb250cm9sbGVyQ29udHJvbGxlcicsIGNvbnRyb2xsZXIpO1xuICAgICAgfVxuXG4gICAgICBsaW5rKHNjb3BlKTtcbiAgICB9XG4gIH07XG59XG5cblxufSkod2luZG93LCB3aW5kb3cuYW5ndWxhcik7XG4iXSwiZmlsZSI6ImFuZ3VsYXItcm91dGUuanMiLCJzb3VyY2VSb290IjoiL3NvdXJjZS8ifQ==