/**
 * State-based routing for AngularJS
 * @version v0.2.15
 * @link http://angular-ui.github.com/
 * @license MIT License, http://www.opensource.org/licenses/MIT
 */

/* commonjs package manager support (eg componentjs) */
if (typeof module !== "undefined" && typeof exports !== "undefined" && module.exports === exports){
  module.exports = 'ui.router';
}

(function (window, angular, undefined) {
/*jshint globalstrict:true*/
/*global angular:false*/
'use strict';

var isDefined = angular.isDefined,
    isFunction = angular.isFunction,
    isString = angular.isString,
    isObject = angular.isObject,
    isArray = angular.isArray,
    forEach = angular.forEach,
    extend = angular.extend,
    copy = angular.copy;

function inherit(parent, extra) {
  return extend(new (extend(function() {}, { prototype: parent }))(), extra);
}

function merge(dst) {
  forEach(arguments, function(obj) {
    if (obj !== dst) {
      forEach(obj, function(value, key) {
        if (!dst.hasOwnProperty(key)) dst[key] = value;
      });
    }
  });
  return dst;
}

/**
 * Finds the common ancestor path between two states.
 *
 * @param {Object} first The first state.
 * @param {Object} second The second state.
 * @return {Array} Returns an array of state names in descending order, not including the root.
 */
function ancestors(first, second) {
  var path = [];

  for (var n in first.path) {
    if (first.path[n] !== second.path[n]) break;
    path.push(first.path[n]);
  }
  return path;
}

/**
 * IE8-safe wrapper for `Object.keys()`.
 *
 * @param {Object} object A JavaScript object.
 * @return {Array} Returns the keys of the object as an array.
 */
function objectKeys(object) {
  if (Object.keys) {
    return Object.keys(object);
  }
  var result = [];

  forEach(object, function(val, key) {
    result.push(key);
  });
  return result;
}

/**
 * IE8-safe wrapper for `Array.prototype.indexOf()`.
 *
 * @param {Array} array A JavaScript array.
 * @param {*} value A value to search the array for.
 * @return {Number} Returns the array index value of `value`, or `-1` if not present.
 */
function indexOf(array, value) {
  if (Array.prototype.indexOf) {
    return array.indexOf(value, Number(arguments[2]) || 0);
  }
  var len = array.length >>> 0, from = Number(arguments[2]) || 0;
  from = (from < 0) ? Math.ceil(from) : Math.floor(from);

  if (from < 0) from += len;

  for (; from < len; from++) {
    if (from in array && array[from] === value) return from;
  }
  return -1;
}

/**
 * Merges a set of parameters with all parameters inherited between the common parents of the
 * current state and a given destination state.
 *
 * @param {Object} currentParams The value of the current state parameters ($stateParams).
 * @param {Object} newParams The set of parameters which will be composited with inherited params.
 * @param {Object} $current Internal definition of object representing the current state.
 * @param {Object} $to Internal definition of object representing state to transition to.
 */
function inheritParams(currentParams, newParams, $current, $to) {
  var parents = ancestors($current, $to), parentParams, inherited = {}, inheritList = [];

  for (var i in parents) {
    if (!parents[i].params) continue;
    parentParams = objectKeys(parents[i].params);
    if (!parentParams.length) continue;

    for (var j in parentParams) {
      if (indexOf(inheritList, parentParams[j]) >= 0) continue;
      inheritList.push(parentParams[j]);
      inherited[parentParams[j]] = currentParams[parentParams[j]];
    }
  }
  return extend({}, inherited, newParams);
}

/**
 * Performs a non-strict comparison of the subset of two objects, defined by a list of keys.
 *
 * @param {Object} a The first object.
 * @param {Object} b The second object.
 * @param {Array} keys The list of keys within each object to compare. If the list is empty or not specified,
 *                     it defaults to the list of keys in `a`.
 * @return {Boolean} Returns `true` if the keys match, otherwise `false`.
 */
function equalForKeys(a, b, keys) {
  if (!keys) {
    keys = [];
    for (var n in a) keys.push(n); // Used instead of Object.keys() for IE8 compatibility
  }

  for (var i=0; i<keys.length; i++) {
    var k = keys[i];
    if (a[k] != b[k]) return false; // Not '===', values aren't necessarily normalized
  }
  return true;
}

/**
 * Returns the subset of an object, based on a list of keys.
 *
 * @param {Array} keys
 * @param {Object} values
 * @return {Boolean} Returns a subset of `values`.
 */
function filterByKeys(keys, values) {
  var filtered = {};

  forEach(keys, function (name) {
    filtered[name] = values[name];
  });
  return filtered;
}

// like _.indexBy
// when you know that your index values will be unique, or you want last-one-in to win
function indexBy(array, propName) {
  var result = {};
  forEach(array, function(item) {
    result[item[propName]] = item;
  });
  return result;
}

// extracted from underscore.js
// Return a copy of the object only containing the whitelisted properties.
function pick(obj) {
  var copy = {};
  var keys = Array.prototype.concat.apply(Array.prototype, Array.prototype.slice.call(arguments, 1));
  forEach(keys, function(key) {
    if (key in obj) copy[key] = obj[key];
  });
  return copy;
}

// extracted from underscore.js
// Return a copy of the object omitting the blacklisted properties.
function omit(obj) {
  var copy = {};
  var keys = Array.prototype.concat.apply(Array.prototype, Array.prototype.slice.call(arguments, 1));
  for (var key in obj) {
    if (indexOf(keys, key) == -1) copy[key] = obj[key];
  }
  return copy;
}

function pluck(collection, key) {
  var result = isArray(collection) ? [] : {};

  forEach(collection, function(val, i) {
    result[i] = isFunction(key) ? key(val) : val[key];
  });
  return result;
}

function filter(collection, callback) {
  var array = isArray(collection);
  var result = array ? [] : {};
  forEach(collection, function(val, i) {
    if (callback(val, i)) {
      result[array ? result.length : i] = val;
    }
  });
  return result;
}

function map(collection, callback) {
  var result = isArray(collection) ? [] : {};

  forEach(collection, function(val, i) {
    result[i] = callback(val, i);
  });
  return result;
}

/**
 * @ngdoc overview
 * @name ui.router.util
 *
 * @description
 * # ui.router.util sub-module
 *
 * This module is a dependency of other sub-modules. Do not include this module as a dependency
 * in your angular app (use {@link ui.router} module instead).
 *
 */
angular.module('ui.router.util', ['ng']);

/**
 * @ngdoc overview
 * @name ui.router.router
 * 
 * @requires ui.router.util
 *
 * @description
 * # ui.router.router sub-module
 *
 * This module is a dependency of other sub-modules. Do not include this module as a dependency
 * in your angular app (use {@link ui.router} module instead).
 */
angular.module('ui.router.router', ['ui.router.util']);

/**
 * @ngdoc overview
 * @name ui.router.state
 * 
 * @requires ui.router.router
 * @requires ui.router.util
 *
 * @description
 * # ui.router.state sub-module
 *
 * This module is a dependency of the main ui.router module. Do not include this module as a dependency
 * in your angular app (use {@link ui.router} module instead).
 * 
 */
angular.module('ui.router.state', ['ui.router.router', 'ui.router.util']);

/**
 * @ngdoc overview
 * @name ui.router
 *
 * @requires ui.router.state
 *
 * @description
 * # ui.router
 * 
 * ## The main module for ui.router 
 * There are several sub-modules included with the ui.router module, however only this module is needed
 * as a dependency within your angular app. The other modules are for organization purposes. 
 *
 * The modules are:
 * * ui.router - the main "umbrella" module
 * * ui.router.router - 
 * 
 * *You'll need to include **only** this module as the dependency within your angular app.*
 * 
 * <pre>
 * <!doctype html>
 * <html ng-app="myApp">
 * <head>
 *   <script src="js/angular.js"></script>
 *   <!-- Include the ui-router script -->
 *   <script src="js/angular-ui-router.min.js"></script>
 *   <script>
 *     // ...and add 'ui.router' as a dependency
 *     var myApp = angular.module('myApp', ['ui.router']);
 *   </script>
 * </head>
 * <body>
 * </body>
 * </html>
 * </pre>
 */
angular.module('ui.router', ['ui.router.state']);

angular.module('ui.router.compat', ['ui.router']);

/**
 * @ngdoc object
 * @name ui.router.util.$resolve
 *
 * @requires $q
 * @requires $injector
 *
 * @description
 * Manages resolution of (acyclic) graphs of promises.
 */
$Resolve.$inject = ['$q', '$injector'];
function $Resolve(  $q,    $injector) {
  
  var VISIT_IN_PROGRESS = 1,
      VISIT_DONE = 2,
      NOTHING = {},
      NO_DEPENDENCIES = [],
      NO_LOCALS = NOTHING,
      NO_PARENT = extend($q.when(NOTHING), { $$promises: NOTHING, $$values: NOTHING });
  

  /**
   * @ngdoc function
   * @name ui.router.util.$resolve#study
   * @methodOf ui.router.util.$resolve
   *
   * @description
   * Studies a set of invocables that are likely to be used multiple times.
   * <pre>
   * $resolve.study(invocables)(locals, parent, self)
   * </pre>
   * is equivalent to
   * <pre>
   * $resolve.resolve(invocables, locals, parent, self)
   * </pre>
   * but the former is more efficient (in fact `resolve` just calls `study` 
   * internally).
   *
   * @param {object} invocables Invocable objects
   * @return {function} a function to pass in locals, parent and self
   */
  this.study = function (invocables) {
    if (!isObject(invocables)) throw new Error("'invocables' must be an object");
    var invocableKeys = objectKeys(invocables || {});
    
    // Perform a topological sort of invocables to build an ordered plan
    var plan = [], cycle = [], visited = {};
    function visit(value, key) {
      if (visited[key] === VISIT_DONE) return;
      
      cycle.push(key);
      if (visited[key] === VISIT_IN_PROGRESS) {
        cycle.splice(0, indexOf(cycle, key));
        throw new Error("Cyclic dependency: " + cycle.join(" -> "));
      }
      visited[key] = VISIT_IN_PROGRESS;
      
      if (isString(value)) {
        plan.push(key, [ function() { return $injector.get(value); }], NO_DEPENDENCIES);
      } else {
        var params = $injector.annotate(value);
        forEach(params, function (param) {
          if (param !== key && invocables.hasOwnProperty(param)) visit(invocables[param], param);
        });
        plan.push(key, value, params);
      }
      
      cycle.pop();
      visited[key] = VISIT_DONE;
    }
    forEach(invocables, visit);
    invocables = cycle = visited = null; // plan is all that's required
    
    function isResolve(value) {
      return isObject(value) && value.then && value.$$promises;
    }
    
    return function (locals, parent, self) {
      if (isResolve(locals) && self === undefined) {
        self = parent; parent = locals; locals = null;
      }
      if (!locals) locals = NO_LOCALS;
      else if (!isObject(locals)) {
        throw new Error("'locals' must be an object");
      }       
      if (!parent) parent = NO_PARENT;
      else if (!isResolve(parent)) {
        throw new Error("'parent' must be a promise returned by $resolve.resolve()");
      }
      
      // To complete the overall resolution, we have to wait for the parent
      // promise and for the promise for each invokable in our plan.
      var resolution = $q.defer(),
          result = resolution.promise,
          promises = result.$$promises = {},
          values = extend({}, locals),
          wait = 1 + plan.length/3,
          merged = false;
          
      function done() {
        // Merge parent values we haven't got yet and publish our own $$values
        if (!--wait) {
          if (!merged) merge(values, parent.$$values); 
          result.$$values = values;
          result.$$promises = result.$$promises || true; // keep for isResolve()
          delete result.$$inheritedValues;
          resolution.resolve(values);
        }
      }
      
      function fail(reason) {
        result.$$failure = reason;
        resolution.reject(reason);
      }

      // Short-circuit if parent has already failed
      if (isDefined(parent.$$failure)) {
        fail(parent.$$failure);
        return result;
      }
      
      if (parent.$$inheritedValues) {
        merge(values, omit(parent.$$inheritedValues, invocableKeys));
      }

      // Merge parent values if the parent has already resolved, or merge
      // parent promises and wait if the parent resolve is still in progress.
      extend(promises, parent.$$promises);
      if (parent.$$values) {
        merged = merge(values, omit(parent.$$values, invocableKeys));
        result.$$inheritedValues = omit(parent.$$values, invocableKeys);
        done();
      } else {
        if (parent.$$inheritedValues) {
          result.$$inheritedValues = omit(parent.$$inheritedValues, invocableKeys);
        }        
        parent.then(done, fail);
      }
      
      // Process each invocable in the plan, but ignore any where a local of the same name exists.
      for (var i=0, ii=plan.length; i<ii; i+=3) {
        if (locals.hasOwnProperty(plan[i])) done();
        else invoke(plan[i], plan[i+1], plan[i+2]);
      }
      
      function invoke(key, invocable, params) {
        // Create a deferred for this invocation. Failures will propagate to the resolution as well.
        var invocation = $q.defer(), waitParams = 0;
        function onfailure(reason) {
          invocation.reject(reason);
          fail(reason);
        }
        // Wait for any parameter that we have a promise for (either from parent or from this
        // resolve; in that case study() will have made sure it's ordered before us in the plan).
        forEach(params, function (dep) {
          if (promises.hasOwnProperty(dep) && !locals.hasOwnProperty(dep)) {
            waitParams++;
            promises[dep].then(function (result) {
              values[dep] = result;
              if (!(--waitParams)) proceed();
            }, onfailure);
          }
        });
        if (!waitParams) proceed();
        function proceed() {
          if (isDefined(result.$$failure)) return;
          try {
            invocation.resolve($injector.invoke(invocable, self, values));
            invocation.promise.then(function (result) {
              values[key] = result;
              done();
            }, onfailure);
          } catch (e) {
            onfailure(e);
          }
        }
        // Publish promise synchronously; invocations further down in the plan may depend on it.
        promises[key] = invocation.promise;
      }
      
      return result;
    };
  };
  
  /**
   * @ngdoc function
   * @name ui.router.util.$resolve#resolve
   * @methodOf ui.router.util.$resolve
   *
   * @description
   * Resolves a set of invocables. An invocable is a function to be invoked via 
   * `$injector.invoke()`, and can have an arbitrary number of dependencies. 
   * An invocable can either return a value directly,
   * or a `$q` promise. If a promise is returned it will be resolved and the 
   * resulting value will be used instead. Dependencies of invocables are resolved 
   * (in this order of precedence)
   *
   * - from the specified `locals`
   * - from another invocable that is part of this `$resolve` call
   * - from an invocable that is inherited from a `parent` call to `$resolve` 
   *   (or recursively
   * - from any ancestor `$resolve` of that parent).
   *
   * The return value of `$resolve` is a promise for an object that contains 
   * (in this order of precedence)
   *
   * - any `locals` (if specified)
   * - the resolved return values of all injectables
   * - any values inherited from a `parent` call to `$resolve` (if specified)
   *
   * The promise will resolve after the `parent` promise (if any) and all promises 
   * returned by injectables have been resolved. If any invocable 
   * (or `$injector.invoke`) throws an exception, or if a promise returned by an 
   * invocable is rejected, the `$resolve` promise is immediately rejected with the 
   * same error. A rejection of a `parent` promise (if specified) will likewise be 
   * propagated immediately. Once the `$resolve` promise has been rejected, no 
   * further invocables will be called.
   * 
   * Cyclic dependencies between invocables are not permitted and will caues `$resolve`
   * to throw an error. As a special case, an injectable can depend on a parameter 
   * with the same name as the injectable, which will be fulfilled from the `parent` 
   * injectable of the same name. This allows inherited values to be decorated. 
   * Note that in this case any other injectable in the same `$resolve` with the same
   * dependency would see the decorated value, not the inherited value.
   *
   * Note that missing dependencies -- unlike cyclic dependencies -- will cause an 
   * (asynchronous) rejection of the `$resolve` promise rather than a (synchronous) 
   * exception.
   *
   * Invocables are invoked eagerly as soon as all dependencies are available. 
   * This is true even for dependencies inherited from a `parent` call to `$resolve`.
   *
   * As a special case, an invocable can be a string, in which case it is taken to 
   * be a service name to be passed to `$injector.get()`. This is supported primarily 
   * for backwards-compatibility with the `resolve` property of `$routeProvider` 
   * routes.
   *
   * @param {object} invocables functions to invoke or 
   * `$injector` services to fetch.
   * @param {object} locals  values to make available to the injectables
   * @param {object} parent  a promise returned by another call to `$resolve`.
   * @param {object} self  the `this` for the invoked methods
   * @return {object} Promise for an object that contains the resolved return value
   * of all invocables, as well as any inherited and local values.
   */
  this.resolve = function (invocables, locals, parent, self) {
    return this.study(invocables)(locals, parent, self);
  };
}

angular.module('ui.router.util').service('$resolve', $Resolve);


/**
 * @ngdoc object
 * @name ui.router.util.$templateFactory
 *
 * @requires $http
 * @requires $templateCache
 * @requires $injector
 *
 * @description
 * Service. Manages loading of templates.
 */
$TemplateFactory.$inject = ['$http', '$templateCache', '$injector'];
function $TemplateFactory(  $http,   $templateCache,   $injector) {

  /**
   * @ngdoc function
   * @name ui.router.util.$templateFactory#fromConfig
   * @methodOf ui.router.util.$templateFactory
   *
   * @description
   * Creates a template from a configuration object. 
   *
   * @param {object} config Configuration object for which to load a template. 
   * The following properties are search in the specified order, and the first one 
   * that is defined is used to create the template:
   *
   * @param {string|object} config.template html string template or function to 
   * load via {@link ui.router.util.$templateFactory#fromString fromString}.
   * @param {string|object} config.templateUrl url to load or a function returning 
   * the url to load via {@link ui.router.util.$templateFactory#fromUrl fromUrl}.
   * @param {Function} config.templateProvider function to invoke via 
   * {@link ui.router.util.$templateFactory#fromProvider fromProvider}.
   * @param {object} params  Parameters to pass to the template function.
   * @param {object} locals Locals to pass to `invoke` if the template is loaded 
   * via a `templateProvider`. Defaults to `{ params: params }`.
   *
   * @return {string|object}  The template html as a string, or a promise for 
   * that string,or `null` if no template is configured.
   */
  this.fromConfig = function (config, params, locals) {
    return (
      isDefined(config.template) ? this.fromString(config.template, params) :
      isDefined(config.templateUrl) ? this.fromUrl(config.templateUrl, params) :
      isDefined(config.templateProvider) ? this.fromProvider(config.templateProvider, params, locals) :
      null
    );
  };

  /**
   * @ngdoc function
   * @name ui.router.util.$templateFactory#fromString
   * @methodOf ui.router.util.$templateFactory
   *
   * @description
   * Creates a template from a string or a function returning a string.
   *
   * @param {string|object} template html template as a string or function that 
   * returns an html template as a string.
   * @param {object} params Parameters to pass to the template function.
   *
   * @return {string|object} The template html as a string, or a promise for that 
   * string.
   */
  this.fromString = function (template, params) {
    return isFunction(template) ? template(params) : template;
  };

  /**
   * @ngdoc function
   * @name ui.router.util.$templateFactory#fromUrl
   * @methodOf ui.router.util.$templateFactory
   * 
   * @description
   * Loads a template from the a URL via `$http` and `$templateCache`.
   *
   * @param {string|Function} url url of the template to load, or a function 
   * that returns a url.
   * @param {Object} params Parameters to pass to the url function.
   * @return {string|Promise.<string>} The template html as a string, or a promise 
   * for that string.
   */
  this.fromUrl = function (url, params) {
    if (isFunction(url)) url = url(params);
    if (url == null) return null;
    else return $http
        .get(url, { cache: $templateCache, headers: { Accept: 'text/html' }})
        .then(function(response) { return response.data; });
  };

  /**
   * @ngdoc function
   * @name ui.router.util.$templateFactory#fromProvider
   * @methodOf ui.router.util.$templateFactory
   *
   * @description
   * Creates a template by invoking an injectable provider function.
   *
   * @param {Function} provider Function to invoke via `$injector.invoke`
   * @param {Object} params Parameters for the template.
   * @param {Object} locals Locals to pass to `invoke`. Defaults to 
   * `{ params: params }`.
   * @return {string|Promise.<string>} The template html as a string, or a promise 
   * for that string.
   */
  this.fromProvider = function (provider, params, locals) {
    return $injector.invoke(provider, null, locals || { params: params });
  };
}

angular.module('ui.router.util').service('$templateFactory', $TemplateFactory);

var $$UMFP; // reference to $UrlMatcherFactoryProvider

/**
 * @ngdoc object
 * @name ui.router.util.type:UrlMatcher
 *
 * @description
 * Matches URLs against patterns and extracts named parameters from the path or the search
 * part of the URL. A URL pattern consists of a path pattern, optionally followed by '?' and a list
 * of search parameters. Multiple search parameter names are separated by '&'. Search parameters
 * do not influence whether or not a URL is matched, but their values are passed through into
 * the matched parameters returned by {@link ui.router.util.type:UrlMatcher#methods_exec exec}.
 *
 * Path parameter placeholders can be specified using simple colon/catch-all syntax or curly brace
 * syntax, which optionally allows a regular expression for the parameter to be specified:
 *
 * * `':'` name - colon placeholder
 * * `'*'` name - catch-all placeholder
 * * `'{' name '}'` - curly placeholder
 * * `'{' name ':' regexp|type '}'` - curly placeholder with regexp or type name. Should the
 *   regexp itself contain curly braces, they must be in matched pairs or escaped with a backslash.
 *
 * Parameter names may contain only word characters (latin letters, digits, and underscore) and
 * must be unique within the pattern (across both path and search parameters). For colon
 * placeholders or curly placeholders without an explicit regexp, a path parameter matches any
 * number of characters other than '/'. For catch-all placeholders the path parameter matches
 * any number of characters.
 *
 * Examples:
 *
 * * `'/hello/'` - Matches only if the path is exactly '/hello/'. There is no special treatment for
 *   trailing slashes, and patterns have to match the entire path, not just a prefix.
 * * `'/user/:id'` - Matches '/user/bob' or '/user/1234!!!' or even '/user/' but not '/user' or
 *   '/user/bob/details'. The second path segment will be captured as the parameter 'id'.
 * * `'/user/{id}'` - Same as the previous example, but using curly brace syntax.
 * * `'/user/{id:[^/]*}'` - Same as the previous example.
 * * `'/user/{id:[0-9a-fA-F]{1,8}}'` - Similar to the previous example, but only matches if the id
 *   parameter consists of 1 to 8 hex digits.
 * * `'/files/{path:.*}'` - Matches any URL starting with '/files/' and captures the rest of the
 *   path into the parameter 'path'.
 * * `'/files/*path'` - ditto.
 * * `'/calendar/{start:date}'` - Matches "/calendar/2014-11-12" (because the pattern defined
 *   in the built-in  `date` Type matches `2014-11-12`) and provides a Date object in $stateParams.start
 *
 * @param {string} pattern  The pattern to compile into a matcher.
 * @param {Object} config  A configuration object hash:
 * @param {Object=} parentMatcher Used to concatenate the pattern/config onto
 *   an existing UrlMatcher
 *
 * * `caseInsensitive` - `true` if URL matching should be case insensitive, otherwise `false`, the default value (for backward compatibility) is `false`.
 * * `strict` - `false` if matching against a URL with a trailing slash should be treated as equivalent to a URL without a trailing slash, the default value is `true`.
 *
 * @property {string} prefix  A static prefix of this pattern. The matcher guarantees that any
 *   URL matching this matcher (i.e. any string for which {@link ui.router.util.type:UrlMatcher#methods_exec exec()} returns
 *   non-null) will start with this prefix.
 *
 * @property {string} source  The pattern that was passed into the constructor
 *
 * @property {string} sourcePath  The path portion of the source property
 *
 * @property {string} sourceSearch  The search portion of the source property
 *
 * @property {string} regex  The constructed regex that will be used to match against the url when
 *   it is time to determine which url will match.
 *
 * @returns {Object}  New `UrlMatcher` object
 */
function UrlMatcher(pattern, config, parentMatcher) {
  config = extend({ params: {} }, isObject(config) ? config : {});

  // Find all placeholders and create a compiled pattern, using either classic or curly syntax:
  //   '*' name
  //   ':' name
  //   '{' name '}'
  //   '{' name ':' regexp '}'
  // The regular expression is somewhat complicated due to the need to allow curly braces
  // inside the regular expression. The placeholder regexp breaks down as follows:
  //    ([:*])([\w\[\]]+)              - classic placeholder ($1 / $2) (search version has - for snake-case)
  //    \{([\w\[\]]+)(?:\:( ... ))?\}  - curly brace placeholder ($3) with optional regexp/type ... ($4) (search version has - for snake-case
  //    (?: ... | ... | ... )+         - the regexp consists of any number of atoms, an atom being either
  //    [^{}\\]+                       - anything other than curly braces or backslash
  //    \\.                            - a backslash escape
  //    \{(?:[^{}\\]+|\\.)*\}          - a matched set of curly braces containing other atoms
  var placeholder       = /([:*])([\w\[\]]+)|\{([\w\[\]]+)(?:\:((?:[^{}\\]+|\\.|\{(?:[^{}\\]+|\\.)*\})+))?\}/g,
      searchPlaceholder = /([:]?)([\w\[\]-]+)|\{([\w\[\]-]+)(?:\:((?:[^{}\\]+|\\.|\{(?:[^{}\\]+|\\.)*\})+))?\}/g,
      compiled = '^', last = 0, m,
      segments = this.segments = [],
      parentParams = parentMatcher ? parentMatcher.params : {},
      params = this.params = parentMatcher ? parentMatcher.params.$$new() : new $$UMFP.ParamSet(),
      paramNames = [];

  function addParameter(id, type, config, location) {
    paramNames.push(id);
    if (parentParams[id]) return parentParams[id];
    if (!/^\w+(-+\w+)*(?:\[\])?$/.test(id)) throw new Error("Invalid parameter name '" + id + "' in pattern '" + pattern + "'");
    if (params[id]) throw new Error("Duplicate parameter name '" + id + "' in pattern '" + pattern + "'");
    params[id] = new $$UMFP.Param(id, type, config, location);
    return params[id];
  }

  function quoteRegExp(string, pattern, squash, optional) {
    var surroundPattern = ['',''], result = string.replace(/[\\\[\]\^$*+?.()|{}]/g, "\\$&");
    if (!pattern) return result;
    switch(squash) {
      case false: surroundPattern = ['(', ')' + (optional ? "?" : "")]; break;
      case true:  surroundPattern = ['?(', ')?']; break;
      default:    surroundPattern = ['(' + squash + "|", ')?']; break;
    }
    return result + surroundPattern[0] + pattern + surroundPattern[1];
  }

  this.source = pattern;

  // Split into static segments separated by path parameter placeholders.
  // The number of segments is always 1 more than the number of parameters.
  function matchDetails(m, isSearch) {
    var id, regexp, segment, type, cfg, arrayMode;
    id          = m[2] || m[3]; // IE[78] returns '' for unmatched groups instead of null
    cfg         = config.params[id];
    segment     = pattern.substring(last, m.index);
    regexp      = isSearch ? m[4] : m[4] || (m[1] == '*' ? '.*' : null);
    type        = $$UMFP.type(regexp || "string") || inherit($$UMFP.type("string"), { pattern: new RegExp(regexp, config.caseInsensitive ? 'i' : undefined) });
    return {
      id: id, regexp: regexp, segment: segment, type: type, cfg: cfg
    };
  }

  var p, param, segment;
  while ((m = placeholder.exec(pattern))) {
    p = matchDetails(m, false);
    if (p.segment.indexOf('?') >= 0) break; // we're into the search part

    param = addParameter(p.id, p.type, p.cfg, "path");
    compiled += quoteRegExp(p.segment, param.type.pattern.source, param.squash, param.isOptional);
    segments.push(p.segment);
    last = placeholder.lastIndex;
  }
  segment = pattern.substring(last);

  // Find any search parameter names and remove them from the last segment
  var i = segment.indexOf('?');

  if (i >= 0) {
    var search = this.sourceSearch = segment.substring(i);
    segment = segment.substring(0, i);
    this.sourcePath = pattern.substring(0, last + i);

    if (search.length > 0) {
      last = 0;
      while ((m = searchPlaceholder.exec(search))) {
        p = matchDetails(m, true);
        param = addParameter(p.id, p.type, p.cfg, "search");
        last = placeholder.lastIndex;
        // check if ?&
      }
    }
  } else {
    this.sourcePath = pattern;
    this.sourceSearch = '';
  }

  compiled += quoteRegExp(segment) + (config.strict === false ? '\/?' : '') + '$';
  segments.push(segment);

  this.regexp = new RegExp(compiled, config.caseInsensitive ? 'i' : undefined);
  this.prefix = segments[0];
  this.$$paramNames = paramNames;
}

/**
 * @ngdoc function
 * @name ui.router.util.type:UrlMatcher#concat
 * @methodOf ui.router.util.type:UrlMatcher
 *
 * @description
 * Returns a new matcher for a pattern constructed by appending the path part and adding the
 * search parameters of the specified pattern to this pattern. The current pattern is not
 * modified. This can be understood as creating a pattern for URLs that are relative to (or
 * suffixes of) the current pattern.
 *
 * @example
 * The following two matchers are equivalent:
 * <pre>
 * new UrlMatcher('/user/{id}?q').concat('/details?date');
 * new UrlMatcher('/user/{id}/details?q&date');
 * </pre>
 *
 * @param {string} pattern  The pattern to append.
 * @param {Object} config  An object hash of the configuration for the matcher.
 * @returns {UrlMatcher}  A matcher for the concatenated pattern.
 */
UrlMatcher.prototype.concat = function (pattern, config) {
  // Because order of search parameters is irrelevant, we can add our own search
  // parameters to the end of the new pattern. Parse the new pattern by itself
  // and then join the bits together, but it's much easier to do this on a string level.
  var defaultConfig = {
    caseInsensitive: $$UMFP.caseInsensitive(),
    strict: $$UMFP.strictMode(),
    squash: $$UMFP.defaultSquashPolicy()
  };
  return new UrlMatcher(this.sourcePath + pattern + this.sourceSearch, extend(defaultConfig, config), this);
};

UrlMatcher.prototype.toString = function () {
  return this.source;
};

/**
 * @ngdoc function
 * @name ui.router.util.type:UrlMatcher#exec
 * @methodOf ui.router.util.type:UrlMatcher
 *
 * @description
 * Tests the specified path against this matcher, and returns an object containing the captured
 * parameter values, or null if the path does not match. The returned object contains the values
 * of any search parameters that are mentioned in the pattern, but their value may be null if
 * they are not present in `searchParams`. This means that search parameters are always treated
 * as optional.
 *
 * @example
 * <pre>
 * new UrlMatcher('/user/{id}?q&r').exec('/user/bob', {
 *   x: '1', q: 'hello'
 * });
 * // returns { id: 'bob', q: 'hello', r: null }
 * </pre>
 *
 * @param {string} path  The URL path to match, e.g. `$location.path()`.
 * @param {Object} searchParams  URL search parameters, e.g. `$location.search()`.
 * @returns {Object}  The captured parameter values.
 */
UrlMatcher.prototype.exec = function (path, searchParams) {
  var m = this.regexp.exec(path);
  if (!m) return null;
  searchParams = searchParams || {};

  var paramNames = this.parameters(), nTotal = paramNames.length,
    nPath = this.segments.length - 1,
    values = {}, i, j, cfg, paramName;

  if (nPath !== m.length - 1) throw new Error("Unbalanced capture group in route '" + this.source + "'");

  function decodePathArray(string) {
    function reverseString(str) { return str.split("").reverse().join(""); }
    function unquoteDashes(str) { return str.replace(/\\-/g, "-"); }

    var split = reverseString(string).split(/-(?!\\)/);
    var allReversed = map(split, reverseString);
    return map(allReversed, unquoteDashes).reverse();
  }

  for (i = 0; i < nPath; i++) {
    paramName = paramNames[i];
    var param = this.params[paramName];
    var paramVal = m[i+1];
    // if the param value matches a pre-replace pair, replace the value before decoding.
    for (j = 0; j < param.replace; j++) {
      if (param.replace[j].from === paramVal) paramVal = param.replace[j].to;
    }
    if (paramVal && param.array === true) paramVal = decodePathArray(paramVal);
    values[paramName] = param.value(paramVal);
  }
  for (/**/; i < nTotal; i++) {
    paramName = paramNames[i];
    values[paramName] = this.params[paramName].value(searchParams[paramName]);
  }

  return values;
};

/**
 * @ngdoc function
 * @name ui.router.util.type:UrlMatcher#parameters
 * @methodOf ui.router.util.type:UrlMatcher
 *
 * @description
 * Returns the names of all path and search parameters of this pattern in an unspecified order.
 *
 * @returns {Array.<string>}  An array of parameter names. Must be treated as read-only. If the
 *    pattern has no parameters, an empty array is returned.
 */
UrlMatcher.prototype.parameters = function (param) {
  if (!isDefined(param)) return this.$$paramNames;
  return this.params[param] || null;
};

/**
 * @ngdoc function
 * @name ui.router.util.type:UrlMatcher#validate
 * @methodOf ui.router.util.type:UrlMatcher
 *
 * @description
 * Checks an object hash of parameters to validate their correctness according to the parameter
 * types of this `UrlMatcher`.
 *
 * @param {Object} params The object hash of parameters to validate.
 * @returns {boolean} Returns `true` if `params` validates, otherwise `false`.
 */
UrlMatcher.prototype.validates = function (params) {
  return this.params.$$validates(params);
};

/**
 * @ngdoc function
 * @name ui.router.util.type:UrlMatcher#format
 * @methodOf ui.router.util.type:UrlMatcher
 *
 * @description
 * Creates a URL that matches this pattern by substituting the specified values
 * for the path and search parameters. Null values for path parameters are
 * treated as empty strings.
 *
 * @example
 * <pre>
 * new UrlMatcher('/user/{id}?q').format({ id:'bob', q:'yes' });
 * // returns '/user/bob?q=yes'
 * </pre>
 *
 * @param {Object} values  the values to substitute for the parameters in this pattern.
 * @returns {string}  the formatted URL (path and optionally search part).
 */
UrlMatcher.prototype.format = function (values) {
  values = values || {};
  var segments = this.segments, params = this.parameters(), paramset = this.params;
  if (!this.validates(values)) return null;

  var i, search = false, nPath = segments.length - 1, nTotal = params.length, result = segments[0];

  function encodeDashes(str) { // Replace dashes with encoded "\-"
    return encodeURIComponent(str).replace(/-/g, function(c) { return '%5C%' + c.charCodeAt(0).toString(16).toUpperCase(); });
  }

  for (i = 0; i < nTotal; i++) {
    var isPathParam = i < nPath;
    var name = params[i], param = paramset[name], value = param.value(values[name]);
    var isDefaultValue = param.isOptional && param.type.equals(param.value(), value);
    var squash = isDefaultValue ? param.squash : false;
    var encoded = param.type.encode(value);

    if (isPathParam) {
      var nextSegment = segments[i + 1];
      if (squash === false) {
        if (encoded != null) {
          if (isArray(encoded)) {
            result += map(encoded, encodeDashes).join("-");
          } else {
            result += encodeURIComponent(encoded);
          }
        }
        result += nextSegment;
      } else if (squash === true) {
        var capture = result.match(/\/$/) ? /\/?(.*)/ : /(.*)/;
        result += nextSegment.match(capture)[1];
      } else if (isString(squash)) {
        result += squash + nextSegment;
      }
    } else {
      if (encoded == null || (isDefaultValue && squash !== false)) continue;
      if (!isArray(encoded)) encoded = [ encoded ];
      encoded = map(encoded, encodeURIComponent).join('&' + name + '=');
      result += (search ? '&' : '?') + (name + '=' + encoded);
      search = true;
    }
  }

  return result;
};

/**
 * @ngdoc object
 * @name ui.router.util.type:Type
 *
 * @description
 * Implements an interface to define custom parameter types that can be decoded from and encoded to
 * string parameters matched in a URL. Used by {@link ui.router.util.type:UrlMatcher `UrlMatcher`}
 * objects when matching or formatting URLs, or comparing or validating parameter values.
 *
 * See {@link ui.router.util.$urlMatcherFactory#methods_type `$urlMatcherFactory#type()`} for more
 * information on registering custom types.
 *
 * @param {Object} config  A configuration object which contains the custom type definition.  The object's
 *        properties will override the default methods and/or pattern in `Type`'s public interface.
 * @example
 * <pre>
 * {
 *   decode: function(val) { return parseInt(val, 10); },
 *   encode: function(val) { return val && val.toString(); },
 *   equals: function(a, b) { return this.is(a) && a === b; },
 *   is: function(val) { return angular.isNumber(val) isFinite(val) && val % 1 === 0; },
 *   pattern: /\d+/
 * }
 * </pre>
 *
 * @property {RegExp} pattern The regular expression pattern used to match values of this type when
 *           coming from a substring of a URL.
 *
 * @returns {Object}  Returns a new `Type` object.
 */
function Type(config) {
  extend(this, config);
}

/**
 * @ngdoc function
 * @name ui.router.util.type:Type#is
 * @methodOf ui.router.util.type:Type
 *
 * @description
 * Detects whether a value is of a particular type. Accepts a native (decoded) value
 * and determines whether it matches the current `Type` object.
 *
 * @param {*} val  The value to check.
 * @param {string} key  Optional. If the type check is happening in the context of a specific
 *        {@link ui.router.util.type:UrlMatcher `UrlMatcher`} object, this is the name of the
 *        parameter in which `val` is stored. Can be used for meta-programming of `Type` objects.
 * @returns {Boolean}  Returns `true` if the value matches the type, otherwise `false`.
 */
Type.prototype.is = function(val, key) {
  return true;
};

/**
 * @ngdoc function
 * @name ui.router.util.type:Type#encode
 * @methodOf ui.router.util.type:Type
 *
 * @description
 * Encodes a custom/native type value to a string that can be embedded in a URL. Note that the
 * return value does *not* need to be URL-safe (i.e. passed through `encodeURIComponent()`), it
 * only needs to be a representation of `val` that has been coerced to a string.
 *
 * @param {*} val  The value to encode.
 * @param {string} key  The name of the parameter in which `val` is stored. Can be used for
 *        meta-programming of `Type` objects.
 * @returns {string}  Returns a string representation of `val` that can be encoded in a URL.
 */
Type.prototype.encode = function(val, key) {
  return val;
};

/**
 * @ngdoc function
 * @name ui.router.util.type:Type#decode
 * @methodOf ui.router.util.type:Type
 *
 * @description
 * Converts a parameter value (from URL string or transition param) to a custom/native value.
 *
 * @param {string} val  The URL parameter value to decode.
 * @param {string} key  The name of the parameter in which `val` is stored. Can be used for
 *        meta-programming of `Type` objects.
 * @returns {*}  Returns a custom representation of the URL parameter value.
 */
Type.prototype.decode = function(val, key) {
  return val;
};

/**
 * @ngdoc function
 * @name ui.router.util.type:Type#equals
 * @methodOf ui.router.util.type:Type
 *
 * @description
 * Determines whether two decoded values are equivalent.
 *
 * @param {*} a  A value to compare against.
 * @param {*} b  A value to compare against.
 * @returns {Boolean}  Returns `true` if the values are equivalent/equal, otherwise `false`.
 */
Type.prototype.equals = function(a, b) {
  return a == b;
};

Type.prototype.$subPattern = function() {
  var sub = this.pattern.toString();
  return sub.substr(1, sub.length - 2);
};

Type.prototype.pattern = /.*/;

Type.prototype.toString = function() { return "{Type:" + this.name + "}"; };

/** Given an encoded string, or a decoded object, returns a decoded object */
Type.prototype.$normalize = function(val) {
  return this.is(val) ? val : this.decode(val);
};

/*
 * Wraps an existing custom Type as an array of Type, depending on 'mode'.
 * e.g.:
 * - urlmatcher pattern "/path?{queryParam[]:int}"
 * - url: "/path?queryParam=1&queryParam=2
 * - $stateParams.queryParam will be [1, 2]
 * if `mode` is "auto", then
 * - url: "/path?queryParam=1 will create $stateParams.queryParam: 1
 * - url: "/path?queryParam=1&queryParam=2 will create $stateParams.queryParam: [1, 2]
 */
Type.prototype.$asArray = function(mode, isSearch) {
  if (!mode) return this;
  if (mode === "auto" && !isSearch) throw new Error("'auto' array mode is for query parameters only");

  function ArrayType(type, mode) {
    function bindTo(type, callbackName) {
      return function() {
        return type[callbackName].apply(type, arguments);
      };
    }

    // Wrap non-array value as array
    function arrayWrap(val) { return isArray(val) ? val : (isDefined(val) ? [ val ] : []); }
    // Unwrap array value for "auto" mode. Return undefined for empty array.
    function arrayUnwrap(val) {
      switch(val.length) {
        case 0: return undefined;
        case 1: return mode === "auto" ? val[0] : val;
        default: return val;
      }
    }
    function falsey(val) { return !val; }

    // Wraps type (.is/.encode/.decode) functions to operate on each value of an array
    function arrayHandler(callback, allTruthyMode) {
      return function handleArray(val) {
        val = arrayWrap(val);
        var result = map(val, callback);
        if (allTruthyMode === true)
          return filter(result, falsey).length === 0;
        return arrayUnwrap(result);
      };
    }

    // Wraps type (.equals) functions to operate on each value of an array
    function arrayEqualsHandler(callback) {
      return function handleArray(val1, val2) {
        var left = arrayWrap(val1), right = arrayWrap(val2);
        if (left.length !== right.length) return false;
        for (var i = 0; i < left.length; i++) {
          if (!callback(left[i], right[i])) return false;
        }
        return true;
      };
    }

    this.encode = arrayHandler(bindTo(type, 'encode'));
    this.decode = arrayHandler(bindTo(type, 'decode'));
    this.is     = arrayHandler(bindTo(type, 'is'), true);
    this.equals = arrayEqualsHandler(bindTo(type, 'equals'));
    this.pattern = type.pattern;
    this.$normalize = arrayHandler(bindTo(type, '$normalize'));
    this.name = type.name;
    this.$arrayMode = mode;
  }

  return new ArrayType(this, mode);
};



/**
 * @ngdoc object
 * @name ui.router.util.$urlMatcherFactory
 *
 * @description
 * Factory for {@link ui.router.util.type:UrlMatcher `UrlMatcher`} instances. The factory
 * is also available to providers under the name `$urlMatcherFactoryProvider`.
 */
function $UrlMatcherFactory() {
  $$UMFP = this;

  var isCaseInsensitive = false, isStrictMode = true, defaultSquashPolicy = false;

  function valToString(val) { return val != null ? val.toString().replace(/\//g, "%2F") : val; }
  function valFromString(val) { return val != null ? val.toString().replace(/%2F/g, "/") : val; }

  var $types = {}, enqueue = true, typeQueue = [], injector, defaultTypes = {
    string: {
      encode: valToString,
      decode: valFromString,
      // TODO: in 1.0, make string .is() return false if value is undefined/null by default.
      // In 0.2.x, string params are optional by default for backwards compat
      is: function(val) { return val == null || !isDefined(val) || typeof val === "string"; },
      pattern: /[^/]*/
    },
    int: {
      encode: valToString,
      decode: function(val) { return parseInt(val, 10); },
      is: function(val) { return isDefined(val) && this.decode(val.toString()) === val; },
      pattern: /\d+/
    },
    bool: {
      encode: function(val) { return val ? 1 : 0; },
      decode: function(val) { return parseInt(val, 10) !== 0; },
      is: function(val) { return val === true || val === false; },
      pattern: /0|1/
    },
    date: {
      encode: function (val) {
        if (!this.is(val))
          return undefined;
        return [ val.getFullYear(),
          ('0' + (val.getMonth() + 1)).slice(-2),
          ('0' + val.getDate()).slice(-2)
        ].join("-");
      },
      decode: function (val) {
        if (this.is(val)) return val;
        var match = this.capture.exec(val);
        return match ? new Date(match[1], match[2] - 1, match[3]) : undefined;
      },
      is: function(val) { return val instanceof Date && !isNaN(val.valueOf()); },
      equals: function (a, b) { return this.is(a) && this.is(b) && a.toISOString() === b.toISOString(); },
      pattern: /[0-9]{4}-(?:0[1-9]|1[0-2])-(?:0[1-9]|[1-2][0-9]|3[0-1])/,
      capture: /([0-9]{4})-(0[1-9]|1[0-2])-(0[1-9]|[1-2][0-9]|3[0-1])/
    },
    json: {
      encode: angular.toJson,
      decode: angular.fromJson,
      is: angular.isObject,
      equals: angular.equals,
      pattern: /[^/]*/
    },
    any: { // does not encode/decode
      encode: angular.identity,
      decode: angular.identity,
      equals: angular.equals,
      pattern: /.*/
    }
  };

  function getDefaultConfig() {
    return {
      strict: isStrictMode,
      caseInsensitive: isCaseInsensitive
    };
  }

  function isInjectable(value) {
    return (isFunction(value) || (isArray(value) && isFunction(value[value.length - 1])));
  }

  /**
   * [Internal] Get the default value of a parameter, which may be an injectable function.
   */
  $UrlMatcherFactory.$$getDefaultValue = function(config) {
    if (!isInjectable(config.value)) return config.value;
    if (!injector) throw new Error("Injectable functions cannot be called at configuration time");
    return injector.invoke(config.value);
  };

  /**
   * @ngdoc function
   * @name ui.router.util.$urlMatcherFactory#caseInsensitive
   * @methodOf ui.router.util.$urlMatcherFactory
   *
   * @description
   * Defines whether URL matching should be case sensitive (the default behavior), or not.
   *
   * @param {boolean} value `false` to match URL in a case sensitive manner; otherwise `true`;
   * @returns {boolean} the current value of caseInsensitive
   */
  this.caseInsensitive = function(value) {
    if (isDefined(value))
      isCaseInsensitive = value;
    return isCaseInsensitive;
  };

  /**
   * @ngdoc function
   * @name ui.router.util.$urlMatcherFactory#strictMode
   * @methodOf ui.router.util.$urlMatcherFactory
   *
   * @description
   * Defines whether URLs should match trailing slashes, or not (the default behavior).
   *
   * @param {boolean=} value `false` to match trailing slashes in URLs, otherwise `true`.
   * @returns {boolean} the current value of strictMode
   */
  this.strictMode = function(value) {
    if (isDefined(value))
      isStrictMode = value;
    return isStrictMode;
  };

  /**
   * @ngdoc function
   * @name ui.router.util.$urlMatcherFactory#defaultSquashPolicy
   * @methodOf ui.router.util.$urlMatcherFactory
   *
   * @description
   * Sets the default behavior when generating or matching URLs with default parameter values.
   *
   * @param {string} value A string that defines the default parameter URL squashing behavior.
   *    `nosquash`: When generating an href with a default parameter value, do not squash the parameter value from the URL
   *    `slash`: When generating an href with a default parameter value, squash (remove) the parameter value, and, if the
   *             parameter is surrounded by slashes, squash (remove) one slash from the URL
   *    any other string, e.g. "~": When generating an href with a default parameter value, squash (remove)
   *             the parameter value from the URL and replace it with this string.
   */
  this.defaultSquashPolicy = function(value) {
    if (!isDefined(value)) return defaultSquashPolicy;
    if (value !== true && value !== false && !isString(value))
      throw new Error("Invalid squash policy: " + value + ". Valid policies: false, true, arbitrary-string");
    defaultSquashPolicy = value;
    return value;
  };

  /**
   * @ngdoc function
   * @name ui.router.util.$urlMatcherFactory#compile
   * @methodOf ui.router.util.$urlMatcherFactory
   *
   * @description
   * Creates a {@link ui.router.util.type:UrlMatcher `UrlMatcher`} for the specified pattern.
   *
   * @param {string} pattern  The URL pattern.
   * @param {Object} config  The config object hash.
   * @returns {UrlMatcher}  The UrlMatcher.
   */
  this.compile = function (pattern, config) {
    return new UrlMatcher(pattern, extend(getDefaultConfig(), config));
  };

  /**
   * @ngdoc function
   * @name ui.router.util.$urlMatcherFactory#isMatcher
   * @methodOf ui.router.util.$urlMatcherFactory
   *
   * @description
   * Returns true if the specified object is a `UrlMatcher`, or false otherwise.
   *
   * @param {Object} object  The object to perform the type check against.
   * @returns {Boolean}  Returns `true` if the object matches the `UrlMatcher` interface, by
   *          implementing all the same methods.
   */
  this.isMatcher = function (o) {
    if (!isObject(o)) return false;
    var result = true;

    forEach(UrlMatcher.prototype, function(val, name) {
      if (isFunction(val)) {
        result = result && (isDefined(o[name]) && isFunction(o[name]));
      }
    });
    return result;
  };

  /**
   * @ngdoc function
   * @name ui.router.util.$urlMatcherFactory#type
   * @methodOf ui.router.util.$urlMatcherFactory
   *
   * @description
   * Registers a custom {@link ui.router.util.type:Type `Type`} object that can be used to
   * generate URLs with typed parameters.
   *
   * @param {string} name  The type name.
   * @param {Object|Function} definition   The type definition. See
   *        {@link ui.router.util.type:Type `Type`} for information on the values accepted.
   * @param {Object|Function} definitionFn (optional) A function that is injected before the app
   *        runtime starts.  The result of this function is merged into the existing `definition`.
   *        See {@link ui.router.util.type:Type `Type`} for information on the values accepted.
   *
   * @returns {Object}  Returns `$urlMatcherFactoryProvider`.
   *
   * @example
   * This is a simple example of a custom type that encodes and decodes items from an
   * array, using the array index as the URL-encoded value:
   *
   * <pre>
   * var list = ['John', 'Paul', 'George', 'Ringo'];
   *
   * $urlMatcherFactoryProvider.type('listItem', {
   *   encode: function(item) {
   *     // Represent the list item in the URL using its corresponding index
   *     return list.indexOf(item);
   *   },
   *   decode: function(item) {
   *     // Look up the list item by index
   *     return list[parseInt(item, 10)];
   *   },
   *   is: function(item) {
   *     // Ensure the item is valid by checking to see that it appears
   *     // in the list
   *     return list.indexOf(item) > -1;
   *   }
   * });
   *
   * $stateProvider.state('list', {
   *   url: "/list/{item:listItem}",
   *   controller: function($scope, $stateParams) {
   *     console.log($stateParams.item);
   *   }
   * });
   *
   * // ...
   *
   * // Changes URL to '/list/3', logs "Ringo" to the console
   * $state.go('list', { item: "Ringo" });
   * </pre>
   *
   * This is a more complex example of a type that relies on dependency injection to
   * interact with services, and uses the parameter name from the URL to infer how to
   * handle encoding and decoding parameter values:
   *
   * <pre>
   * // Defines a custom type that gets a value from a service,
   * // where each service gets different types of values from
   * // a backend API:
   * $urlMatcherFactoryProvider.type('dbObject', {}, function(Users, Posts) {
   *
   *   // Matches up services to URL parameter names
   *   var services = {
   *     user: Users,
   *     post: Posts
   *   };
   *
   *   return {
   *     encode: function(object) {
   *       // Represent the object in the URL using its unique ID
   *       return object.id;
   *     },
   *     decode: function(value, key) {
   *       // Look up the object by ID, using the parameter
   *       // name (key) to call the correct service
   *       return services[key].findById(value);
   *     },
   *     is: function(object, key) {
   *       // Check that object is a valid dbObject
   *       return angular.isObject(object) && object.id && services[key];
   *     }
   *     equals: function(a, b) {
   *       // Check the equality of decoded objects by comparing
   *       // their unique IDs
   *       return a.id === b.id;
   *     }
   *   };
   * });
   *
   * // In a config() block, you can then attach URLs with
   * // type-annotated parameters:
   * $stateProvider.state('users', {
   *   url: "/users",
   *   // ...
   * }).state('users.item', {
   *   url: "/{user:dbObject}",
   *   controller: function($scope, $stateParams) {
   *     // $stateParams.user will now be an object returned from
   *     // the Users service
   *   },
   *   // ...
   * });
   * </pre>
   */
  this.type = function (name, definition, definitionFn) {
    if (!isDefined(definition)) return $types[name];
    if ($types.hasOwnProperty(name)) throw new Error("A type named '" + name + "' has already been defined.");

    $types[name] = new Type(extend({ name: name }, definition));
    if (definitionFn) {
      typeQueue.push({ name: name, def: definitionFn });
      if (!enqueue) flushTypeQueue();
    }
    return this;
  };

  // `flushTypeQueue()` waits until `$urlMatcherFactory` is injected before invoking the queued `definitionFn`s
  function flushTypeQueue() {
    while(typeQueue.length) {
      var type = typeQueue.shift();
      if (type.pattern) throw new Error("You cannot override a type's .pattern at runtime.");
      angular.extend($types[type.name], injector.invoke(type.def));
    }
  }

  // Register default types. Store them in the prototype of $types.
  forEach(defaultTypes, function(type, name) { $types[name] = new Type(extend({name: name}, type)); });
  $types = inherit($types, {});

  /* No need to document $get, since it returns this */
  this.$get = ['$injector', function ($injector) {
    injector = $injector;
    enqueue = false;
    flushTypeQueue();

    forEach(defaultTypes, function(type, name) {
      if (!$types[name]) $types[name] = new Type(type);
    });
    return this;
  }];

  this.Param = function Param(id, type, config, location) {
    var self = this;
    config = unwrapShorthand(config);
    type = getType(config, type, location);
    var arrayMode = getArrayMode();
    type = arrayMode ? type.$asArray(arrayMode, location === "search") : type;
    if (type.name === "string" && !arrayMode && location === "path" && config.value === undefined)
      config.value = ""; // for 0.2.x; in 0.3.0+ do not automatically default to ""
    var isOptional = config.value !== undefined;
    var squash = getSquashPolicy(config, isOptional);
    var replace = getReplace(config, arrayMode, isOptional, squash);

    function unwrapShorthand(config) {
      var keys = isObject(config) ? objectKeys(config) : [];
      var isShorthand = indexOf(keys, "value") === -1 && indexOf(keys, "type") === -1 &&
                        indexOf(keys, "squash") === -1 && indexOf(keys, "array") === -1;
      if (isShorthand) config = { value: config };
      config.$$fn = isInjectable(config.value) ? config.value : function () { return config.value; };
      return config;
    }

    function getType(config, urlType, location) {
      if (config.type && urlType) throw new Error("Param '"+id+"' has two type configurations.");
      if (urlType) return urlType;
      if (!config.type) return (location === "config" ? $types.any : $types.string);
      return config.type instanceof Type ? config.type : new Type(config.type);
    }

    // array config: param name (param[]) overrides default settings.  explicit config overrides param name.
    function getArrayMode() {
      var arrayDefaults = { array: (location === "search" ? "auto" : false) };
      var arrayParamNomenclature = id.match(/\[\]$/) ? { array: true } : {};
      return extend(arrayDefaults, arrayParamNomenclature, config).array;
    }

    /**
     * returns false, true, or the squash value to indicate the "default parameter url squash policy".
     */
    function getSquashPolicy(config, isOptional) {
      var squash = config.squash;
      if (!isOptional || squash === false) return false;
      if (!isDefined(squash) || squash == null) return defaultSquashPolicy;
      if (squash === true || isString(squash)) return squash;
      throw new Error("Invalid squash policy: '" + squash + "'. Valid policies: false, true, or arbitrary string");
    }

    function getReplace(config, arrayMode, isOptional, squash) {
      var replace, configuredKeys, defaultPolicy = [
        { from: "",   to: (isOptional || arrayMode ? undefined : "") },
        { from: null, to: (isOptional || arrayMode ? undefined : "") }
      ];
      replace = isArray(config.replace) ? config.replace : [];
      if (isString(squash))
        replace.push({ from: squash, to: undefined });
      configuredKeys = map(replace, function(item) { return item.from; } );
      return filter(defaultPolicy, function(item) { return indexOf(configuredKeys, item.from) === -1; }).concat(replace);
    }

    /**
     * [Internal] Get the default value of a parameter, which may be an injectable function.
     */
    function $$getDefaultValue() {
      if (!injector) throw new Error("Injectable functions cannot be called at configuration time");
      var defaultValue = injector.invoke(config.$$fn);
      if (defaultValue !== null && defaultValue !== undefined && !self.type.is(defaultValue))
        throw new Error("Default value (" + defaultValue + ") for parameter '" + self.id + "' is not an instance of Type (" + self.type.name + ")");
      return defaultValue;
    }

    /**
     * [Internal] Gets the decoded representation of a value if the value is defined, otherwise, returns the
     * default value, which may be the result of an injectable function.
     */
    function $value(value) {
      function hasReplaceVal(val) { return function(obj) { return obj.from === val; }; }
      function $replace(value) {
        var replacement = map(filter(self.replace, hasReplaceVal(value)), function(obj) { return obj.to; });
        return replacement.length ? replacement[0] : value;
      }
      value = $replace(value);
      return !isDefined(value) ? $$getDefaultValue() : self.type.$normalize(value);
    }

    function toString() { return "{Param:" + id + " " + type + " squash: '" + squash + "' optional: " + isOptional + "}"; }

    extend(this, {
      id: id,
      type: type,
      location: location,
      array: arrayMode,
      squash: squash,
      replace: replace,
      isOptional: isOptional,
      value: $value,
      dynamic: undefined,
      config: config,
      toString: toString
    });
  };

  function ParamSet(params) {
    extend(this, params || {});
  }

  ParamSet.prototype = {
    $$new: function() {
      return inherit(this, extend(new ParamSet(), { $$parent: this}));
    },
    $$keys: function () {
      var keys = [], chain = [], parent = this,
        ignore = objectKeys(ParamSet.prototype);
      while (parent) { chain.push(parent); parent = parent.$$parent; }
      chain.reverse();
      forEach(chain, function(paramset) {
        forEach(objectKeys(paramset), function(key) {
            if (indexOf(keys, key) === -1 && indexOf(ignore, key) === -1) keys.push(key);
        });
      });
      return keys;
    },
    $$values: function(paramValues) {
      var values = {}, self = this;
      forEach(self.$$keys(), function(key) {
        values[key] = self[key].value(paramValues && paramValues[key]);
      });
      return values;
    },
    $$equals: function(paramValues1, paramValues2) {
      var equal = true, self = this;
      forEach(self.$$keys(), function(key) {
        var left = paramValues1 && paramValues1[key], right = paramValues2 && paramValues2[key];
        if (!self[key].type.equals(left, right)) equal = false;
      });
      return equal;
    },
    $$validates: function $$validate(paramValues) {
      var keys = this.$$keys(), i, param, rawVal, normalized, encoded;
      for (i = 0; i < keys.length; i++) {
        param = this[keys[i]];
        rawVal = paramValues[keys[i]];
        if ((rawVal === undefined || rawVal === null) && param.isOptional)
          break; // There was no parameter value, but the param is optional
        normalized = param.type.$normalize(rawVal);
        if (!param.type.is(normalized))
          return false; // The value was not of the correct Type, and could not be decoded to the correct Type
        encoded = param.type.encode(normalized);
        if (angular.isString(encoded) && !param.type.pattern.exec(encoded))
          return false; // The value was of the correct type, but when encoded, did not match the Type's regexp
      }
      return true;
    },
    $$parent: undefined
  };

  this.ParamSet = ParamSet;
}

// Register as a provider so it's available to other providers
angular.module('ui.router.util').provider('$urlMatcherFactory', $UrlMatcherFactory);
angular.module('ui.router.util').run(['$urlMatcherFactory', function($urlMatcherFactory) { }]);

/**
 * @ngdoc object
 * @name ui.router.router.$urlRouterProvider
 *
 * @requires ui.router.util.$urlMatcherFactoryProvider
 * @requires $locationProvider
 *
 * @description
 * `$urlRouterProvider` has the responsibility of watching `$location`. 
 * When `$location` changes it runs through a list of rules one by one until a 
 * match is found. `$urlRouterProvider` is used behind the scenes anytime you specify 
 * a url in a state configuration. All urls are compiled into a UrlMatcher object.
 *
 * There are several methods on `$urlRouterProvider` that make it useful to use directly
 * in your module config.
 */
$UrlRouterProvider.$inject = ['$locationProvider', '$urlMatcherFactoryProvider'];
function $UrlRouterProvider(   $locationProvider,   $urlMatcherFactory) {
  var rules = [], otherwise = null, interceptDeferred = false, listener;

  // Returns a string that is a prefix of all strings matching the RegExp
  function regExpPrefix(re) {
    var prefix = /^\^((?:\\[^a-zA-Z0-9]|[^\\\[\]\^$*+?.()|{}]+)*)/.exec(re.source);
    return (prefix != null) ? prefix[1].replace(/\\(.)/g, "$1") : '';
  }

  // Interpolates matched values into a String.replace()-style pattern
  function interpolate(pattern, match) {
    return pattern.replace(/\$(\$|\d{1,2})/, function (m, what) {
      return match[what === '$' ? 0 : Number(what)];
    });
  }

  /**
   * @ngdoc function
   * @name ui.router.router.$urlRouterProvider#rule
   * @methodOf ui.router.router.$urlRouterProvider
   *
   * @description
   * Defines rules that are used by `$urlRouterProvider` to find matches for
   * specific URLs.
   *
   * @example
   * <pre>
   * var app = angular.module('app', ['ui.router.router']);
   *
   * app.config(function ($urlRouterProvider) {
   *   // Here's an example of how you might allow case insensitive urls
   *   $urlRouterProvider.rule(function ($injector, $location) {
   *     var path = $location.path(),
   *         normalized = path.toLowerCase();
   *
   *     if (path !== normalized) {
   *       return normalized;
   *     }
   *   });
   * });
   * </pre>
   *
   * @param {object} rule Handler function that takes `$injector` and `$location`
   * services as arguments. You can use them to return a valid path as a string.
   *
   * @return {object} `$urlRouterProvider` - `$urlRouterProvider` instance
   */
  this.rule = function (rule) {
    if (!isFunction(rule)) throw new Error("'rule' must be a function");
    rules.push(rule);
    return this;
  };

  /**
   * @ngdoc object
   * @name ui.router.router.$urlRouterProvider#otherwise
   * @methodOf ui.router.router.$urlRouterProvider
   *
   * @description
   * Defines a path that is used when an invalid route is requested.
   *
   * @example
   * <pre>
   * var app = angular.module('app', ['ui.router.router']);
   *
   * app.config(function ($urlRouterProvider) {
   *   // if the path doesn't match any of the urls you configured
   *   // otherwise will take care of routing the user to the
   *   // specified url
   *   $urlRouterProvider.otherwise('/index');
   *
   *   // Example of using function rule as param
   *   $urlRouterProvider.otherwise(function ($injector, $location) {
   *     return '/a/valid/url';
   *   });
   * });
   * </pre>
   *
   * @param {string|object} rule The url path you want to redirect to or a function 
   * rule that returns the url path. The function version is passed two params: 
   * `$injector` and `$location` services, and must return a url string.
   *
   * @return {object} `$urlRouterProvider` - `$urlRouterProvider` instance
   */
  this.otherwise = function (rule) {
    if (isString(rule)) {
      var redirect = rule;
      rule = function () { return redirect; };
    }
    else if (!isFunction(rule)) throw new Error("'rule' must be a function");
    otherwise = rule;
    return this;
  };


  function handleIfMatch($injector, handler, match) {
    if (!match) return false;
    var result = $injector.invoke(handler, handler, { $match: match });
    return isDefined(result) ? result : true;
  }

  /**
   * @ngdoc function
   * @name ui.router.router.$urlRouterProvider#when
   * @methodOf ui.router.router.$urlRouterProvider
   *
   * @description
   * Registers a handler for a given url matching. if handle is a string, it is
   * treated as a redirect, and is interpolated according to the syntax of match
   * (i.e. like `String.replace()` for `RegExp`, or like a `UrlMatcher` pattern otherwise).
   *
   * If the handler is a function, it is injectable. It gets invoked if `$location`
   * matches. You have the option of inject the match object as `$match`.
   *
   * The handler can return
   *
   * - **falsy** to indicate that the rule didn't match after all, then `$urlRouter`
   *   will continue trying to find another one that matches.
   * - **string** which is treated as a redirect and passed to `$location.url()`
   * - **void** or any **truthy** value tells `$urlRouter` that the url was handled.
   *
   * @example
   * <pre>
   * var app = angular.module('app', ['ui.router.router']);
   *
   * app.config(function ($urlRouterProvider) {
   *   $urlRouterProvider.when($state.url, function ($match, $stateParams) {
   *     if ($state.$current.navigable !== state ||
   *         !equalForKeys($match, $stateParams) {
   *      $state.transitionTo(state, $match, false);
   *     }
   *   });
   * });
   * </pre>
   *
   * @param {string|object} what The incoming path that you want to redirect.
   * @param {string|object} handler The path you want to redirect your user to.
   */
  this.when = function (what, handler) {
    var redirect, handlerIsString = isString(handler);
    if (isString(what)) what = $urlMatcherFactory.compile(what);

    if (!handlerIsString && !isFunction(handler) && !isArray(handler))
      throw new Error("invalid 'handler' in when()");

    var strategies = {
      matcher: function (what, handler) {
        if (handlerIsString) {
          redirect = $urlMatcherFactory.compile(handler);
          handler = ['$match', function ($match) { return redirect.format($match); }];
        }
        return extend(function ($injector, $location) {
          return handleIfMatch($injector, handler, what.exec($location.path(), $location.search()));
        }, {
          prefix: isString(what.prefix) ? what.prefix : ''
        });
      },
      regex: function (what, handler) {
        if (what.global || what.sticky) throw new Error("when() RegExp must not be global or sticky");

        if (handlerIsString) {
          redirect = handler;
          handler = ['$match', function ($match) { return interpolate(redirect, $match); }];
        }
        return extend(function ($injector, $location) {
          return handleIfMatch($injector, handler, what.exec($location.path()));
        }, {
          prefix: regExpPrefix(what)
        });
      }
    };

    var check = { matcher: $urlMatcherFactory.isMatcher(what), regex: what instanceof RegExp };

    for (var n in check) {
      if (check[n]) return this.rule(strategies[n](what, handler));
    }

    throw new Error("invalid 'what' in when()");
  };

  /**
   * @ngdoc function
   * @name ui.router.router.$urlRouterProvider#deferIntercept
   * @methodOf ui.router.router.$urlRouterProvider
   *
   * @description
   * Disables (or enables) deferring location change interception.
   *
   * If you wish to customize the behavior of syncing the URL (for example, if you wish to
   * defer a transition but maintain the current URL), call this method at configuration time.
   * Then, at run time, call `$urlRouter.listen()` after you have configured your own
   * `$locationChangeSuccess` event handler.
   *
   * @example
   * <pre>
   * var app = angular.module('app', ['ui.router.router']);
   *
   * app.config(function ($urlRouterProvider) {
   *
   *   // Prevent $urlRouter from automatically intercepting URL changes;
   *   // this allows you to configure custom behavior in between
   *   // location changes and route synchronization:
   *   $urlRouterProvider.deferIntercept();
   *
   * }).run(function ($rootScope, $urlRouter, UserService) {
   *
   *   $rootScope.$on('$locationChangeSuccess', function(e) {
   *     // UserService is an example service for managing user state
   *     if (UserService.isLoggedIn()) return;
   *
   *     // Prevent $urlRouter's default handler from firing
   *     e.preventDefault();
   *
   *     UserService.handleLogin().then(function() {
   *       // Once the user has logged in, sync the current URL
   *       // to the router:
   *       $urlRouter.sync();
   *     });
   *   });
   *
   *   // Configures $urlRouter's listener *after* your custom listener
   *   $urlRouter.listen();
   * });
   * </pre>
   *
   * @param {boolean} defer Indicates whether to defer location change interception. Passing
            no parameter is equivalent to `true`.
   */
  this.deferIntercept = function (defer) {
    if (defer === undefined) defer = true;
    interceptDeferred = defer;
  };

  /**
   * @ngdoc object
   * @name ui.router.router.$urlRouter
   *
   * @requires $location
   * @requires $rootScope
   * @requires $injector
   * @requires $browser
   *
   * @description
   *
   */
  this.$get = $get;
  $get.$inject = ['$location', '$rootScope', '$injector', '$browser'];
  function $get(   $location,   $rootScope,   $injector,   $browser) {

    var baseHref = $browser.baseHref(), location = $location.url(), lastPushedUrl;

    function appendBasePath(url, isHtml5, absolute) {
      if (baseHref === '/') return url;
      if (isHtml5) return baseHref.slice(0, -1) + url;
      if (absolute) return baseHref.slice(1) + url;
      return url;
    }

    // TODO: Optimize groups of rules with non-empty prefix into some sort of decision tree
    function update(evt) {
      if (evt && evt.defaultPrevented) return;
      var ignoreUpdate = lastPushedUrl && $location.url() === lastPushedUrl;
      lastPushedUrl = undefined;
      // TODO: Re-implement this in 1.0 for https://github.com/angular-ui/ui-router/issues/1573
      //if (ignoreUpdate) return true;

      function check(rule) {
        var handled = rule($injector, $location);

        if (!handled) return false;
        if (isString(handled)) $location.replace().url(handled);
        return true;
      }
      var n = rules.length, i;

      for (i = 0; i < n; i++) {
        if (check(rules[i])) return;
      }
      // always check otherwise last to allow dynamic updates to the set of rules
      if (otherwise) check(otherwise);
    }

    function listen() {
      listener = listener || $rootScope.$on('$locationChangeSuccess', update);
      return listener;
    }

    if (!interceptDeferred) listen();

    return {
      /**
       * @ngdoc function
       * @name ui.router.router.$urlRouter#sync
       * @methodOf ui.router.router.$urlRouter
       *
       * @description
       * Triggers an update; the same update that happens when the address bar url changes, aka `$locationChangeSuccess`.
       * This method is useful when you need to use `preventDefault()` on the `$locationChangeSuccess` event,
       * perform some custom logic (route protection, auth, config, redirection, etc) and then finally proceed
       * with the transition by calling `$urlRouter.sync()`.
       *
       * @example
       * <pre>
       * angular.module('app', ['ui.router'])
       *   .run(function($rootScope, $urlRouter) {
       *     $rootScope.$on('$locationChangeSuccess', function(evt) {
       *       // Halt state change from even starting
       *       evt.preventDefault();
       *       // Perform custom logic
       *       var meetsRequirement = ...
       *       // Continue with the update and state transition if logic allows
       *       if (meetsRequirement) $urlRouter.sync();
       *     });
       * });
       * </pre>
       */
      sync: function() {
        update();
      },

      listen: function() {
        return listen();
      },

      update: function(read) {
        if (read) {
          location = $location.url();
          return;
        }
        if ($location.url() === location) return;

        $location.url(location);
        $location.replace();
      },

      push: function(urlMatcher, params, options) {
         var url = urlMatcher.format(params || {});

        // Handle the special hash param, if needed
        if (url !== null && params && params['#']) {
            url += '#' + params['#'];
        }

        $location.url(url);
        lastPushedUrl = options && options.$$avoidResync ? $location.url() : undefined;
        if (options && options.replace) $location.replace();
      },

      /**
       * @ngdoc function
       * @name ui.router.router.$urlRouter#href
       * @methodOf ui.router.router.$urlRouter
       *
       * @description
       * A URL generation method that returns the compiled URL for a given
       * {@link ui.router.util.type:UrlMatcher `UrlMatcher`}, populated with the provided parameters.
       *
       * @example
       * <pre>
       * $bob = $urlRouter.href(new UrlMatcher("/about/:person"), {
       *   person: "bob"
       * });
       * // $bob == "/about/bob";
       * </pre>
       *
       * @param {UrlMatcher} urlMatcher The `UrlMatcher` object which is used as the template of the URL to generate.
       * @param {object=} params An object of parameter values to fill the matcher's required parameters.
       * @param {object=} options Options object. The options are:
       *
       * - **`absolute`** - {boolean=false},  If true will generate an absolute url, e.g. "http://www.example.com/fullurl".
       *
       * @returns {string} Returns the fully compiled URL, or `null` if `params` fail validation against `urlMatcher`
       */
      href: function(urlMatcher, params, options) {
        if (!urlMatcher.validates(params)) return null;

        var isHtml5 = $locationProvider.html5Mode();
        if (angular.isObject(isHtml5)) {
          isHtml5 = isHtml5.enabled;
        }
        
        var url = urlMatcher.format(params);
        options = options || {};

        if (!isHtml5 && url !== null) {
          url = "#" + $locationProvider.hashPrefix() + url;
        }

        // Handle special hash param, if needed
        if (url !== null && params && params['#']) {
          url += '#' + params['#'];
        }

        url = appendBasePath(url, isHtml5, options.absolute);

        if (!options.absolute || !url) {
          return url;
        }

        var slash = (!isHtml5 && url ? '/' : ''), port = $location.port();
        port = (port === 80 || port === 443 ? '' : ':' + port);

        return [$location.protocol(), '://', $location.host(), port, slash, url].join('');
      }
    };
  }
}

angular.module('ui.router.router').provider('$urlRouter', $UrlRouterProvider);

/**
 * @ngdoc object
 * @name ui.router.state.$stateProvider
 *
 * @requires ui.router.router.$urlRouterProvider
 * @requires ui.router.util.$urlMatcherFactoryProvider
 *
 * @description
 * The new `$stateProvider` works similar to Angular's v1 router, but it focuses purely
 * on state.
 *
 * A state corresponds to a "place" in the application in terms of the overall UI and
 * navigation. A state describes (via the controller / template / view properties) what
 * the UI looks like and does at that place.
 *
 * States often have things in common, and the primary way of factoring out these
 * commonalities in this model is via the state hierarchy, i.e. parent/child states aka
 * nested states.
 *
 * The `$stateProvider` provides interfaces to declare these states for your app.
 */
$StateProvider.$inject = ['$urlRouterProvider', '$urlMatcherFactoryProvider'];
function $StateProvider(   $urlRouterProvider,   $urlMatcherFactory) {

  var root, states = {}, $state, queue = {}, abstractKey = 'abstract';

  // Builds state properties from definition passed to registerState()
  var stateBuilder = {

    // Derive parent state from a hierarchical name only if 'parent' is not explicitly defined.
    // state.children = [];
    // if (parent) parent.children.push(state);
    parent: function(state) {
      if (isDefined(state.parent) && state.parent) return findState(state.parent);
      // regex matches any valid composite state name
      // would match "contact.list" but not "contacts"
      var compositeName = /^(.+)\.[^.]+$/.exec(state.name);
      return compositeName ? findState(compositeName[1]) : root;
    },

    // inherit 'data' from parent and override by own values (if any)
    data: function(state) {
      if (state.parent && state.parent.data) {
        state.data = state.self.data = extend({}, state.parent.data, state.data);
      }
      return state.data;
    },

    // Build a URLMatcher if necessary, either via a relative or absolute URL
    url: function(state) {
      var url = state.url, config = { params: state.params || {} };

      if (isString(url)) {
        if (url.charAt(0) == '^') return $urlMatcherFactory.compile(url.substring(1), config);
        return (state.parent.navigable || root).url.concat(url, config);
      }

      if (!url || $urlMatcherFactory.isMatcher(url)) return url;
      throw new Error("Invalid url '" + url + "' in state '" + state + "'");
    },

    // Keep track of the closest ancestor state that has a URL (i.e. is navigable)
    navigable: function(state) {
      return state.url ? state : (state.parent ? state.parent.navigable : null);
    },

    // Own parameters for this state. state.url.params is already built at this point. Create and add non-url params
    ownParams: function(state) {
      var params = state.url && state.url.params || new $$UMFP.ParamSet();
      forEach(state.params || {}, function(config, id) {
        if (!params[id]) params[id] = new $$UMFP.Param(id, null, config, "config");
      });
      return params;
    },

    // Derive parameters for this state and ensure they're a super-set of parent's parameters
    params: function(state) {
      return state.parent && state.parent.params ? extend(state.parent.params.$$new(), state.ownParams) : new $$UMFP.ParamSet();
    },

    // If there is no explicit multi-view configuration, make one up so we don't have
    // to handle both cases in the view directive later. Note that having an explicit
    // 'views' property will mean the default unnamed view properties are ignored. This
    // is also a good time to resolve view names to absolute names, so everything is a
    // straight lookup at link time.
    views: function(state) {
      var views = {};

      forEach(isDefined(state.views) ? state.views : { '': state }, function (view, name) {
        if (name.indexOf('@') < 0) name += '@' + state.parent.name;
        views[name] = view;
      });
      return views;
    },

    // Keep a full path from the root down to this state as this is needed for state activation.
    path: function(state) {
      return state.parent ? state.parent.path.concat(state) : []; // exclude root from path
    },

    // Speed up $state.contains() as it's used a lot
    includes: function(state) {
      var includes = state.parent ? extend({}, state.parent.includes) : {};
      includes[state.name] = true;
      return includes;
    },

    $delegates: {}
  };

  function isRelative(stateName) {
    return stateName.indexOf(".") === 0 || stateName.indexOf("^") === 0;
  }

  function findState(stateOrName, base) {
    if (!stateOrName) return undefined;

    var isStr = isString(stateOrName),
        name  = isStr ? stateOrName : stateOrName.name,
        path  = isRelative(name);

    if (path) {
      if (!base) throw new Error("No reference point given for path '"  + name + "'");
      base = findState(base);
      
      var rel = name.split("."), i = 0, pathLength = rel.length, current = base;

      for (; i < pathLength; i++) {
        if (rel[i] === "" && i === 0) {
          current = base;
          continue;
        }
        if (rel[i] === "^") {
          if (!current.parent) throw new Error("Path '" + name + "' not valid for state '" + base.name + "'");
          current = current.parent;
          continue;
        }
        break;
      }
      rel = rel.slice(i).join(".");
      name = current.name + (current.name && rel ? "." : "") + rel;
    }
    var state = states[name];

    if (state && (isStr || (!isStr && (state === stateOrName || state.self === stateOrName)))) {
      return state;
    }
    return undefined;
  }

  function queueState(parentName, state) {
    if (!queue[parentName]) {
      queue[parentName] = [];
    }
    queue[parentName].push(state);
  }

  function flushQueuedChildren(parentName) {
    var queued = queue[parentName] || [];
    while(queued.length) {
      registerState(queued.shift());
    }
  }

  function registerState(state) {
    // Wrap a new object around the state so we can store our private details easily.
    state = inherit(state, {
      self: state,
      resolve: state.resolve || {},
      toString: function() { return this.name; }
    });

    var name = state.name;
    if (!isString(name) || name.indexOf('@') >= 0) throw new Error("State must have a valid name");
    if (states.hasOwnProperty(name)) throw new Error("State '" + name + "'' is already defined");

    // Get parent name
    var parentName = (name.indexOf('.') !== -1) ? name.substring(0, name.lastIndexOf('.'))
        : (isString(state.parent)) ? state.parent
        : (isObject(state.parent) && isString(state.parent.name)) ? state.parent.name
        : '';

    // If parent is not registered yet, add state to queue and register later
    if (parentName && !states[parentName]) {
      return queueState(parentName, state.self);
    }

    for (var key in stateBuilder) {
      if (isFunction(stateBuilder[key])) state[key] = stateBuilder[key](state, stateBuilder.$delegates[key]);
    }
    states[name] = state;

    // Register the state in the global state list and with $urlRouter if necessary.
    if (!state[abstractKey] && state.url) {
      $urlRouterProvider.when(state.url, ['$match', '$stateParams', function ($match, $stateParams) {
        if ($state.$current.navigable != state || !equalForKeys($match, $stateParams)) {
          $state.transitionTo(state, $match, { inherit: true, location: false });
        }
      }]);
    }

    // Register any queued children
    flushQueuedChildren(name);

    return state;
  }

  // Checks text to see if it looks like a glob.
  function isGlob (text) {
    return text.indexOf('*') > -1;
  }

  // Returns true if glob matches current $state name.
  function doesStateMatchGlob (glob) {
    var globSegments = glob.split('.'),
        segments = $state.$current.name.split('.');

    //match single stars
    for (var i = 0, l = globSegments.length; i < l; i++) {
      if (globSegments[i] === '*') {
        segments[i] = '*';
      }
    }

    //match greedy starts
    if (globSegments[0] === '**') {
       segments = segments.slice(indexOf(segments, globSegments[1]));
       segments.unshift('**');
    }
    //match greedy ends
    if (globSegments[globSegments.length - 1] === '**') {
       segments.splice(indexOf(segments, globSegments[globSegments.length - 2]) + 1, Number.MAX_VALUE);
       segments.push('**');
    }

    if (globSegments.length != segments.length) {
      return false;
    }

    return segments.join('') === globSegments.join('');
  }


  // Implicit root state that is always active
  root = registerState({
    name: '',
    url: '^',
    views: null,
    'abstract': true
  });
  root.navigable = null;


  /**
   * @ngdoc function
   * @name ui.router.state.$stateProvider#decorator
   * @methodOf ui.router.state.$stateProvider
   *
   * @description
   * Allows you to extend (carefully) or override (at your own peril) the 
   * `stateBuilder` object used internally by `$stateProvider`. This can be used 
   * to add custom functionality to ui-router, for example inferring templateUrl 
   * based on the state name.
   *
   * When passing only a name, it returns the current (original or decorated) builder
   * function that matches `name`.
   *
   * The builder functions that can be decorated are listed below. Though not all
   * necessarily have a good use case for decoration, that is up to you to decide.
   *
   * In addition, users can attach custom decorators, which will generate new 
   * properties within the state's internal definition. There is currently no clear 
   * use-case for this beyond accessing internal states (i.e. $state.$current), 
   * however, expect this to become increasingly relevant as we introduce additional 
   * meta-programming features.
   *
   * **Warning**: Decorators should not be interdependent because the order of 
   * execution of the builder functions in non-deterministic. Builder functions 
   * should only be dependent on the state definition object and super function.
   *
   *
   * Existing builder functions and current return values:
   *
   * - **parent** `{object}` - returns the parent state object.
   * - **data** `{object}` - returns state data, including any inherited data that is not
   *   overridden by own values (if any).
   * - **url** `{object}` - returns a {@link ui.router.util.type:UrlMatcher UrlMatcher}
   *   or `null`.
   * - **navigable** `{object}` - returns closest ancestor state that has a URL (aka is 
   *   navigable).
   * - **params** `{object}` - returns an array of state params that are ensured to 
   *   be a super-set of parent's params.
   * - **views** `{object}` - returns a views object where each key is an absolute view 
   *   name (i.e. "viewName@stateName") and each value is the config object 
   *   (template, controller) for the view. Even when you don't use the views object 
   *   explicitly on a state config, one is still created for you internally.
   *   So by decorating this builder function you have access to decorating template 
   *   and controller properties.
   * - **ownParams** `{object}` - returns an array of params that belong to the state, 
   *   not including any params defined by ancestor states.
   * - **path** `{string}` - returns the full path from the root down to this state. 
   *   Needed for state activation.
   * - **includes** `{object}` - returns an object that includes every state that 
   *   would pass a `$state.includes()` test.
   *
   * @example
   * <pre>
   * // Override the internal 'views' builder with a function that takes the state
   * // definition, and a reference to the internal function being overridden:
   * $stateProvider.decorator('views', function (state, parent) {
   *   var result = {},
   *       views = parent(state);
   *
   *   angular.forEach(views, function (config, name) {
   *     var autoName = (state.name + '.' + name).replace('.', '/');
   *     config.templateUrl = config.templateUrl || '/partials/' + autoName + '.html';
   *     result[name] = config;
   *   });
   *   return result;
   * });
   *
   * $stateProvider.state('home', {
   *   views: {
   *     'contact.list': { controller: 'ListController' },
   *     'contact.item': { controller: 'ItemController' }
   *   }
   * });
   *
   * // ...
   *
   * $state.go('home');
   * // Auto-populates list and item views with /partials/home/contact/list.html,
   * // and /partials/home/contact/item.html, respectively.
   * </pre>
   *
   * @param {string} name The name of the builder function to decorate. 
   * @param {object} func A function that is responsible for decorating the original 
   * builder function. The function receives two parameters:
   *
   *   - `{object}` - state - The state config object.
   *   - `{object}` - super - The original builder function.
   *
   * @return {object} $stateProvider - $stateProvider instance
   */
  this.decorator = decorator;
  function decorator(name, func) {
    /*jshint validthis: true */
    if (isString(name) && !isDefined(func)) {
      return stateBuilder[name];
    }
    if (!isFunction(func) || !isString(name)) {
      return this;
    }
    if (stateBuilder[name] && !stateBuilder.$delegates[name]) {
      stateBuilder.$delegates[name] = stateBuilder[name];
    }
    stateBuilder[name] = func;
    return this;
  }

  /**
   * @ngdoc function
   * @name ui.router.state.$stateProvider#state
   * @methodOf ui.router.state.$stateProvider
   *
   * @description
   * Registers a state configuration under a given state name. The stateConfig object
   * has the following acceptable properties.
   *
   * @param {string} name A unique state name, e.g. "home", "about", "contacts".
   * To create a parent/child state use a dot, e.g. "about.sales", "home.newest".
   * @param {object} stateConfig State configuration object.
   * @param {string|function=} stateConfig.template
   * <a id='template'></a>
   *   html template as a string or a function that returns
   *   an html template as a string which should be used by the uiView directives. This property 
   *   takes precedence over templateUrl.
   *   
   *   If `template` is a function, it will be called with the following parameters:
   *
   *   - {array.&lt;object&gt;} - state parameters extracted from the current $location.path() by
   *     applying the current state
   *
   * <pre>template:
   *   "<h1>inline template definition</h1>" +
   *   "<div ui-view></div>"</pre>
   * <pre>template: function(params) {
   *       return "<h1>generated template</h1>"; }</pre>
   * </div>
   *
   * @param {string|function=} stateConfig.templateUrl
   * <a id='templateUrl'></a>
   *
   *   path or function that returns a path to an html
   *   template that should be used by uiView.
   *   
   *   If `templateUrl` is a function, it will be called with the following parameters:
   *
   *   - {array.&lt;object&gt;} - state parameters extracted from the current $location.path() by 
   *     applying the current state
   *
   * <pre>templateUrl: "home.html"</pre>
   * <pre>templateUrl: function(params) {
   *     return myTemplates[params.pageId]; }</pre>
   *
   * @param {function=} stateConfig.templateProvider
   * <a id='templateProvider'></a>
   *    Provider function that returns HTML content string.
   * <pre> templateProvider:
   *       function(MyTemplateService, params) {
   *         return MyTemplateService.getTemplate(params.pageId);
   *       }</pre>
   *
   * @param {string|function=} stateConfig.controller
   * <a id='controller'></a>
   *
   *  Controller fn that should be associated with newly
   *   related scope or the name of a registered controller if passed as a string.
   *   Optionally, the ControllerAs may be declared here.
   * <pre>controller: "MyRegisteredController"</pre>
   * <pre>controller:
   *     "MyRegisteredController as fooCtrl"}</pre>
   * <pre>controller: function($scope, MyService) {
   *     $scope.data = MyService.getData(); }</pre>
   *
   * @param {function=} stateConfig.controllerProvider
   * <a id='controllerProvider'></a>
   *
   * Injectable provider function that returns the actual controller or string.
   * <pre>controllerProvider:
   *   function(MyResolveData) {
   *     if (MyResolveData.foo)
   *       return "FooCtrl"
   *     else if (MyResolveData.bar)
   *       return "BarCtrl";
   *     else return function($scope) {
   *       $scope.baz = "Qux";
   *     }
   *   }</pre>
   *
   * @param {string=} stateConfig.controllerAs
   * <a id='controllerAs'></a>
   * 
   * A controller alias name. If present the controller will be
   *   published to scope under the controllerAs name.
   * <pre>controllerAs: "myCtrl"</pre>
   *
   * @param {string|object=} stateConfig.parent
   * <a id='parent'></a>
   * Optionally specifies the parent state of this state.
   *
   * <pre>parent: 'parentState'</pre>
   * <pre>parent: parentState // JS variable</pre>
   *
   * @param {object=} stateConfig.resolve
   * <a id='resolve'></a>
   *
   * An optional map&lt;string, function&gt; of dependencies which
   *   should be injected into the controller. If any of these dependencies are promises, 
   *   the router will wait for them all to be resolved before the controller is instantiated.
   *   If all the promises are resolved successfully, the $stateChangeSuccess event is fired
   *   and the values of the resolved promises are injected into any controllers that reference them.
   *   If any  of the promises are rejected the $stateChangeError event is fired.
   *
   *   The map object is:
   *   
   *   - key - {string}: name of dependency to be injected into controller
   *   - factory - {string|function}: If string then it is alias for service. Otherwise if function, 
   *     it is injected and return value it treated as dependency. If result is a promise, it is 
   *     resolved before its value is injected into controller.
   *
   * <pre>resolve: {
   *     myResolve1:
   *       function($http, $stateParams) {
   *         return $http.get("/api/foos/"+stateParams.fooID);
   *       }
   *     }</pre>
   *
   * @param {string=} stateConfig.url
   * <a id='url'></a>
   *
   *   A url fragment with optional parameters. When a state is navigated or
   *   transitioned to, the `$stateParams` service will be populated with any 
   *   parameters that were passed.
   *
   *   (See {@link ui.router.util.type:UrlMatcher UrlMatcher} `UrlMatcher`} for
   *   more details on acceptable patterns )
   *
   * examples:
   * <pre>url: "/home"
   * url: "/users/:userid"
   * url: "/books/{bookid:[a-zA-Z_-]}"
   * url: "/books/{categoryid:int}"
   * url: "/books/{publishername:string}/{categoryid:int}"
   * url: "/messages?before&after"
   * url: "/messages?{before:date}&{after:date}"
   * url: "/messages/:mailboxid?{before:date}&{after:date}"
   * </pre>
   *
   * @param {object=} stateConfig.views
   * <a id='views'></a>
   * an optional map&lt;string, object&gt; which defined multiple views, or targets views
   * manually/explicitly.
   *
   * Examples:
   *
   * Targets three named `ui-view`s in the parent state's template
   * <pre>views: {
   *     header: {
   *       controller: "headerCtrl",
   *       templateUrl: "header.html"
   *     }, body: {
   *       controller: "bodyCtrl",
   *       templateUrl: "body.html"
   *     }, footer: {
   *       controller: "footCtrl",
   *       templateUrl: "footer.html"
   *     }
   *   }</pre>
   *
   * Targets named `ui-view="header"` from grandparent state 'top''s template, and named `ui-view="body" from parent state's template.
   * <pre>views: {
   *     'header@top': {
   *       controller: "msgHeaderCtrl",
   *       templateUrl: "msgHeader.html"
   *     }, 'body': {
   *       controller: "messagesCtrl",
   *       templateUrl: "messages.html"
   *     }
   *   }</pre>
   *
   * @param {boolean=} [stateConfig.abstract=false]
   * <a id='abstract'></a>
   * An abstract state will never be directly activated,
   *   but can provide inherited properties to its common children states.
   * <pre>abstract: true</pre>
   *
   * @param {function=} stateConfig.onEnter
   * <a id='onEnter'></a>
   *
   * Callback function for when a state is entered. Good way
   *   to trigger an action or dispatch an event, such as opening a dialog.
   * If minifying your scripts, make sure to explictly annotate this function,
   * because it won't be automatically annotated by your build tools.
   *
   * <pre>onEnter: function(MyService, $stateParams) {
   *     MyService.foo($stateParams.myParam);
   * }</pre>
   *
   * @param {function=} stateConfig.onExit
   * <a id='onExit'></a>
   *
   * Callback function for when a state is exited. Good way to
   *   trigger an action or dispatch an event, such as opening a dialog.
   * If minifying your scripts, make sure to explictly annotate this function,
   * because it won't be automatically annotated by your build tools.
   *
   * <pre>onExit: function(MyService, $stateParams) {
   *     MyService.cleanup($stateParams.myParam);
   * }</pre>
   *
   * @param {boolean=} [stateConfig.reloadOnSearch=true]
   * <a id='reloadOnSearch'></a>
   *
   * If `false`, will not retrigger the same state
   *   just because a search/query parameter has changed (via $location.search() or $location.hash()). 
   *   Useful for when you'd like to modify $location.search() without triggering a reload.
   * <pre>reloadOnSearch: false</pre>
   *
   * @param {object=} stateConfig.data
   * <a id='data'></a>
   *
   * Arbitrary data object, useful for custom configuration.  The parent state's `data` is
   *   prototypally inherited.  In other words, adding a data property to a state adds it to
   *   the entire subtree via prototypal inheritance.
   *
   * <pre>data: {
   *     requiredRole: 'foo'
   * } </pre>
   *
   * @param {object=} stateConfig.params
   * <a id='params'></a>
   *
   * A map which optionally configures parameters declared in the `url`, or
   *   defines additional non-url parameters.  For each parameter being
   *   configured, add a configuration object keyed to the name of the parameter.
   *
   *   Each parameter configuration object may contain the following properties:
   *
   *   - ** value ** - {object|function=}: specifies the default value for this
   *     parameter.  This implicitly sets this parameter as optional.
   *
   *     When UI-Router routes to a state and no value is
   *     specified for this parameter in the URL or transition, the
   *     default value will be used instead.  If `value` is a function,
   *     it will be injected and invoked, and the return value used.
   *
   *     *Note*: `undefined` is treated as "no default value" while `null`
   *     is treated as "the default value is `null`".
   *
   *     *Shorthand*: If you only need to configure the default value of the
   *     parameter, you may use a shorthand syntax.   In the **`params`**
   *     map, instead mapping the param name to a full parameter configuration
   *     object, simply set map it to the default parameter value, e.g.:
   *
   * <pre>// define a parameter's default value
   * params: {
   *     param1: { value: "defaultValue" }
   * }
   * // shorthand default values
   * params: {
   *     param1: "defaultValue",
   *     param2: "param2Default"
   * }</pre>
   *
   *   - ** array ** - {boolean=}: *(default: false)* If true, the param value will be
   *     treated as an array of values.  If you specified a Type, the value will be
   *     treated as an array of the specified Type.  Note: query parameter values
   *     default to a special `"auto"` mode.
   *
   *     For query parameters in `"auto"` mode, if multiple  values for a single parameter
   *     are present in the URL (e.g.: `/foo?bar=1&bar=2&bar=3`) then the values
   *     are mapped to an array (e.g.: `{ foo: [ '1', '2', '3' ] }`).  However, if
   *     only one value is present (e.g.: `/foo?bar=1`) then the value is treated as single
   *     value (e.g.: `{ foo: '1' }`).
   *
   * <pre>params: {
   *     param1: { array: true }
   * }</pre>
   *
   *   - ** squash ** - {bool|string=}: `squash` configures how a default parameter value is represented in the URL when
   *     the current parameter value is the same as the default value. If `squash` is not set, it uses the
   *     configured default squash policy.
   *     (See {@link ui.router.util.$urlMatcherFactory#methods_defaultSquashPolicy `defaultSquashPolicy()`})
   *
   *   There are three squash settings:
   *
   *     - false: The parameter's default value is not squashed.  It is encoded and included in the URL
   *     - true: The parameter's default value is omitted from the URL.  If the parameter is preceeded and followed
   *       by slashes in the state's `url` declaration, then one of those slashes are omitted.
   *       This can allow for cleaner looking URLs.
   *     - `"<arbitrary string>"`: The parameter's default value is replaced with an arbitrary placeholder of  your choice.
   *
   * <pre>params: {
   *     param1: {
   *       value: "defaultId",
   *       squash: true
   * } }
   * // squash "defaultValue" to "~"
   * params: {
   *     param1: {
   *       value: "defaultValue",
   *       squash: "~"
   * } }
   * </pre>
   *
   *
   * @example
   * <pre>
   * // Some state name examples
   *
   * // stateName can be a single top-level name (must be unique).
   * $stateProvider.state("home", {});
   *
   * // Or it can be a nested state name. This state is a child of the
   * // above "home" state.
   * $stateProvider.state("home.newest", {});
   *
   * // Nest states as deeply as needed.
   * $stateProvider.state("home.newest.abc.xyz.inception", {});
   *
   * // state() returns $stateProvider, so you can chain state declarations.
   * $stateProvider
   *   .state("home", {})
   *   .state("about", {})
   *   .state("contacts", {});
   * </pre>
   *
   */
  this.state = state;
  function state(name, definition) {
    /*jshint validthis: true */
    if (isObject(name)) definition = name;
    else definition.name = name;
    registerState(definition);
    return this;
  }

  /**
   * @ngdoc object
   * @name ui.router.state.$state
   *
   * @requires $rootScope
   * @requires $q
   * @requires ui.router.state.$view
   * @requires $injector
   * @requires ui.router.util.$resolve
   * @requires ui.router.state.$stateParams
   * @requires ui.router.router.$urlRouter
   *
   * @property {object} params A param object, e.g. {sectionId: section.id)}, that 
   * you'd like to test against the current active state.
   * @property {object} current A reference to the state's config object. However 
   * you passed it in. Useful for accessing custom data.
   * @property {object} transition Currently pending transition. A promise that'll 
   * resolve or reject.
   *
   * @description
   * `$state` service is responsible for representing states as well as transitioning
   * between them. It also provides interfaces to ask for current state or even states
   * you're coming from.
   */
  this.$get = $get;
  $get.$inject = ['$rootScope', '$q', '$view', '$injector', '$resolve', '$stateParams', '$urlRouter', '$location', '$urlMatcherFactory'];
  function $get(   $rootScope,   $q,   $view,   $injector,   $resolve,   $stateParams,   $urlRouter,   $location,   $urlMatcherFactory) {

    var TransitionSuperseded = $q.reject(new Error('transition superseded'));
    var TransitionPrevented = $q.reject(new Error('transition prevented'));
    var TransitionAborted = $q.reject(new Error('transition aborted'));
    var TransitionFailed = $q.reject(new Error('transition failed'));

    // Handles the case where a state which is the target of a transition is not found, and the user
    // can optionally retry or defer the transition
    function handleRedirect(redirect, state, params, options) {
      /**
       * @ngdoc event
       * @name ui.router.state.$state#$stateNotFound
       * @eventOf ui.router.state.$state
       * @eventType broadcast on root scope
       * @description
       * Fired when a requested state **cannot be found** using the provided state name during transition.
       * The event is broadcast allowing any handlers a single chance to deal with the error (usually by
       * lazy-loading the unfound state). A special `unfoundState` object is passed to the listener handler,
       * you can see its three properties in the example. You can use `event.preventDefault()` to abort the
       * transition and the promise returned from `go` will be rejected with a `'transition aborted'` value.
       *
       * @param {Object} event Event object.
       * @param {Object} unfoundState Unfound State information. Contains: `to, toParams, options` properties.
       * @param {State} fromState Current state object.
       * @param {Object} fromParams Current state params.
       *
       * @example
       *
       * <pre>
       * // somewhere, assume lazy.state has not been defined
       * $state.go("lazy.state", {a:1, b:2}, {inherit:false});
       *
       * // somewhere else
       * $scope.$on('$stateNotFound',
       * function(event, unfoundState, fromState, fromParams){
       *     console.log(unfoundState.to); // "lazy.state"
       *     console.log(unfoundState.toParams); // {a:1, b:2}
       *     console.log(unfoundState.options); // {inherit:false} + default options
       * })
       * </pre>
       */
      var evt = $rootScope.$broadcast('$stateNotFound', redirect, state, params);

      if (evt.defaultPrevented) {
        $urlRouter.update();
        return TransitionAborted;
      }

      if (!evt.retry) {
        return null;
      }

      // Allow the handler to return a promise to defer state lookup retry
      if (options.$retry) {
        $urlRouter.update();
        return TransitionFailed;
      }
      var retryTransition = $state.transition = $q.when(evt.retry);

      retryTransition.then(function() {
        if (retryTransition !== $state.transition) return TransitionSuperseded;
        redirect.options.$retry = true;
        return $state.transitionTo(redirect.to, redirect.toParams, redirect.options);
      }, function() {
        return TransitionAborted;
      });
      $urlRouter.update();

      return retryTransition;
    }

    root.locals = { resolve: null, globals: { $stateParams: {} } };

    $state = {
      params: {},
      current: root.self,
      $current: root,
      transition: null
    };

    /**
     * @ngdoc function
     * @name ui.router.state.$state#reload
     * @methodOf ui.router.state.$state
     *
     * @description
     * A method that force reloads the current state. All resolves are re-resolved,
     * controllers reinstantiated, and events re-fired.
     *
     * @example
     * <pre>
     * var app angular.module('app', ['ui.router']);
     *
     * app.controller('ctrl', function ($scope, $state) {
     *   $scope.reload = function(){
     *     $state.reload();
     *   }
     * });
     * </pre>
     *
     * `reload()` is just an alias for:
     * <pre>
     * $state.transitionTo($state.current, $stateParams, { 
     *   reload: true, inherit: false, notify: true
     * });
     * </pre>
     *
     * @param {string=|object=} state - A state name or a state object, which is the root of the resolves to be re-resolved.
     * @example
     * <pre>
     * //assuming app application consists of 3 states: 'contacts', 'contacts.detail', 'contacts.detail.item' 
     * //and current state is 'contacts.detail.item'
     * var app angular.module('app', ['ui.router']);
     *
     * app.controller('ctrl', function ($scope, $state) {
     *   $scope.reload = function(){
     *     //will reload 'contact.detail' and 'contact.detail.item' states
     *     $state.reload('contact.detail');
     *   }
     * });
     * </pre>
     *
     * `reload()` is just an alias for:
     * <pre>
     * $state.transitionTo($state.current, $stateParams, { 
     *   reload: true, inherit: false, notify: true
     * });
     * </pre>

     * @returns {promise} A promise representing the state of the new transition. See
     * {@link ui.router.state.$state#methods_go $state.go}.
     */
    $state.reload = function reload(state) {
      return $state.transitionTo($state.current, $stateParams, { reload: state || true, inherit: false, notify: true});
    };

    /**
     * @ngdoc function
     * @name ui.router.state.$state#go
     * @methodOf ui.router.state.$state
     *
     * @description
     * Convenience method for transitioning to a new state. `$state.go` calls 
     * `$state.transitionTo` internally but automatically sets options to 
     * `{ location: true, inherit: true, relative: $state.$current, notify: true }`. 
     * This allows you to easily use an absolute or relative to path and specify 
     * only the parameters you'd like to update (while letting unspecified parameters 
     * inherit from the currently active ancestor states).
     *
     * @example
     * <pre>
     * var app = angular.module('app', ['ui.router']);
     *
     * app.controller('ctrl', function ($scope, $state) {
     *   $scope.changeState = function () {
     *     $state.go('contact.detail');
     *   };
     * });
     * </pre>
     * <img src='../ngdoc_assets/StateGoExamples.png'/>
     *
     * @param {string} to Absolute state name or relative state path. Some examples:
     *
     * - `$state.go('contact.detail')` - will go to the `contact.detail` state
     * - `$state.go('^')` - will go to a parent state
     * - `$state.go('^.sibling')` - will go to a sibling state
     * - `$state.go('.child.grandchild')` - will go to grandchild state
     *
     * @param {object=} params A map of the parameters that will be sent to the state, 
     * will populate $stateParams. Any parameters that are not specified will be inherited from currently 
     * defined parameters. This allows, for example, going to a sibling state that shares parameters
     * specified in a parent state. Parameter inheritance only works between common ancestor states, I.e.
     * transitioning to a sibling will get you the parameters for all parents, transitioning to a child
     * will get you all current parameters, etc.
     * @param {object=} options Options object. The options are:
     *
     * - **`location`** - {boolean=true|string=} - If `true` will update the url in the location bar, if `false`
     *    will not. If string, must be `"replace"`, which will update url and also replace last history record.
     * - **`inherit`** - {boolean=true}, If `true` will inherit url parameters from current url.
     * - **`relative`** - {object=$state.$current}, When transitioning with relative path (e.g '^'), 
     *    defines which state to be relative from.
     * - **`notify`** - {boolean=true}, If `true` will broadcast $stateChangeStart and $stateChangeSuccess events.
     * - **`reload`** (v0.2.5) - {boolean=false}, If `true` will force transition even if the state or params 
     *    have not changed, aka a reload of the same state. It differs from reloadOnSearch because you'd
     *    use this when you want to force a reload when *everything* is the same, including search params.
     *
     * @returns {promise} A promise representing the state of the new transition.
     *
     * Possible success values:
     *
     * - $state.current
     *
     * <br/>Possible rejection values:
     *
     * - 'transition superseded' - when a newer transition has been started after this one
     * - 'transition prevented' - when `event.preventDefault()` has been called in a `$stateChangeStart` listener
     * - 'transition aborted' - when `event.preventDefault()` has been called in a `$stateNotFound` listener or
     *   when a `$stateNotFound` `event.retry` promise errors.
     * - 'transition failed' - when a state has been unsuccessfully found after 2 tries.
     * - *resolve error* - when an error has occurred with a `resolve`
     *
     */
    $state.go = function go(to, params, options) {
      return $state.transitionTo(to, params, extend({ inherit: true, relative: $state.$current }, options));
    };

    /**
     * @ngdoc function
     * @name ui.router.state.$state#transitionTo
     * @methodOf ui.router.state.$state
     *
     * @description
     * Low-level method for transitioning to a new state. {@link ui.router.state.$state#methods_go $state.go}
     * uses `transitionTo` internally. `$state.go` is recommended in most situations.
     *
     * @example
     * <pre>
     * var app = angular.module('app', ['ui.router']);
     *
     * app.controller('ctrl', function ($scope, $state) {
     *   $scope.changeState = function () {
     *     $state.transitionTo('contact.detail');
     *   };
     * });
     * </pre>
     *
     * @param {string} to State name.
     * @param {object=} toParams A map of the parameters that will be sent to the state,
     * will populate $stateParams.
     * @param {object=} options Options object. The options are:
     *
     * - **`location`** - {boolean=true|string=} - If `true` will update the url in the location bar, if `false`
     *    will not. If string, must be `"replace"`, which will update url and also replace last history record.
     * - **`inherit`** - {boolean=false}, If `true` will inherit url parameters from current url.
     * - **`relative`** - {object=}, When transitioning with relative path (e.g '^'), 
     *    defines which state to be relative from.
     * - **`notify`** - {boolean=true}, If `true` will broadcast $stateChangeStart and $stateChangeSuccess events.
     * - **`reload`** (v0.2.5) - {boolean=false|string=|object=}, If `true` will force transition even if the state or params 
     *    have not changed, aka a reload of the same state. It differs from reloadOnSearch because you'd
     *    use this when you want to force a reload when *everything* is the same, including search params.
     *    if String, then will reload the state with the name given in reload, and any children.
     *    if Object, then a stateObj is expected, will reload the state found in stateObj, and any children.
     *
     * @returns {promise} A promise representing the state of the new transition. See
     * {@link ui.router.state.$state#methods_go $state.go}.
     */
    $state.transitionTo = function transitionTo(to, toParams, options) {
      toParams = toParams || {};
      options = extend({
        location: true, inherit: false, relative: null, notify: true, reload: false, $retry: false
      }, options || {});

      var from = $state.$current, fromParams = $state.params, fromPath = from.path;
      var evt, toState = findState(to, options.relative);

      // Store the hash param for later (since it will be stripped out by various methods)
      var hash = toParams['#'];

      if (!isDefined(toState)) {
        var redirect = { to: to, toParams: toParams, options: options };
        var redirectResult = handleRedirect(redirect, from.self, fromParams, options);

        if (redirectResult) {
          return redirectResult;
        }

        // Always retry once if the $stateNotFound was not prevented
        // (handles either redirect changed or state lazy-definition)
        to = redirect.to;
        toParams = redirect.toParams;
        options = redirect.options;
        toState = findState(to, options.relative);

        if (!isDefined(toState)) {
          if (!options.relative) throw new Error("No such state '" + to + "'");
          throw new Error("Could not resolve '" + to + "' from state '" + options.relative + "'");
        }
      }
      if (toState[abstractKey]) throw new Error("Cannot transition to abstract state '" + to + "'");
      if (options.inherit) toParams = inheritParams($stateParams, toParams || {}, $state.$current, toState);
      if (!toState.params.$$validates(toParams)) return TransitionFailed;

      toParams = toState.params.$$values(toParams);
      to = toState;

      var toPath = to.path;

      // Starting from the root of the path, keep all levels that haven't changed
      var keep = 0, state = toPath[keep], locals = root.locals, toLocals = [];

      if (!options.reload) {
        while (state && state === fromPath[keep] && state.ownParams.$$equals(toParams, fromParams)) {
          locals = toLocals[keep] = state.locals;
          keep++;
          state = toPath[keep];
        }
      } else if (isString(options.reload) || isObject(options.reload)) {
        if (isObject(options.reload) && !options.reload.name) {
          throw new Error('Invalid reload state object');
        }
        
        var reloadState = options.reload === true ? fromPath[0] : findState(options.reload);
        if (options.reload && !reloadState) {
          throw new Error("No such reload state '" + (isString(options.reload) ? options.reload : options.reload.name) + "'");
        }

        while (state && state === fromPath[keep] && state !== reloadState) {
          locals = toLocals[keep] = state.locals;
          keep++;
          state = toPath[keep];
        }
      }

      // If we're going to the same state and all locals are kept, we've got nothing to do.
      // But clear 'transition', as we still want to cancel any other pending transitions.
      // TODO: We may not want to bump 'transition' if we're called from a location change
      // that we've initiated ourselves, because we might accidentally abort a legitimate
      // transition initiated from code?
      if (shouldSkipReload(to, toParams, from, fromParams, locals, options)) {
        if (hash) toParams['#'] = hash;
        $state.params = toParams;
        copy($state.params, $stateParams);
        if (options.location && to.navigable && to.navigable.url) {
          $urlRouter.push(to.navigable.url, toParams, {
            $$avoidResync: true, replace: options.location === 'replace'
          });
          $urlRouter.update(true);
        }
        $state.transition = null;
        return $q.when($state.current);
      }

      // Filter parameters before we pass them to event handlers etc.
      toParams = filterByKeys(to.params.$$keys(), toParams || {});

      // Broadcast start event and cancel the transition if requested
      if (options.notify) {
        /**
         * @ngdoc event
         * @name ui.router.state.$state#$stateChangeStart
         * @eventOf ui.router.state.$state
         * @eventType broadcast on root scope
         * @description
         * Fired when the state transition **begins**. You can use `event.preventDefault()`
         * to prevent the transition from happening and then the transition promise will be
         * rejected with a `'transition prevented'` value.
         *
         * @param {Object} event Event object.
         * @param {State} toState The state being transitioned to.
         * @param {Object} toParams The params supplied to the `toState`.
         * @param {State} fromState The current state, pre-transition.
         * @param {Object} fromParams The params supplied to the `fromState`.
         *
         * @example
         *
         * <pre>
         * $rootScope.$on('$stateChangeStart',
         * function(event, toState, toParams, fromState, fromParams){
         *     event.preventDefault();
         *     // transitionTo() promise will be rejected with
         *     // a 'transition prevented' error
         * })
         * </pre>
         */
        if ($rootScope.$broadcast('$stateChangeStart', to.self, toParams, from.self, fromParams).defaultPrevented) {
          $rootScope.$broadcast('$stateChangeCancel', to.self, toParams, from.self, fromParams);
          $urlRouter.update();
          return TransitionPrevented;
        }
      }

      // Resolve locals for the remaining states, but don't update any global state just
      // yet -- if anything fails to resolve the current state needs to remain untouched.
      // We also set up an inheritance chain for the locals here. This allows the view directive
      // to quickly look up the correct definition for each view in the current state. Even
      // though we create the locals object itself outside resolveState(), it is initially
      // empty and gets filled asynchronously. We need to keep track of the promise for the
      // (fully resolved) current locals, and pass this down the chain.
      var resolved = $q.when(locals);

      for (var l = keep; l < toPath.length; l++, state = toPath[l]) {
        locals = toLocals[l] = inherit(locals);
        resolved = resolveState(state, toParams, state === to, resolved, locals, options);
      }

      // Once everything is resolved, we are ready to perform the actual transition
      // and return a promise for the new state. We also keep track of what the
      // current promise is, so that we can detect overlapping transitions and
      // keep only the outcome of the last transition.
      var transition = $state.transition = resolved.then(function () {
        var l, entering, exiting;

        if ($state.transition !== transition) return TransitionSuperseded;

        // Exit 'from' states not kept
        for (l = fromPath.length - 1; l >= keep; l--) {
          exiting = fromPath[l];
          if (exiting.self.onExit) {
            $injector.invoke(exiting.self.onExit, exiting.self, exiting.locals.globals);
          }
          exiting.locals = null;
        }

        // Enter 'to' states not kept
        for (l = keep; l < toPath.length; l++) {
          entering = toPath[l];
          entering.locals = toLocals[l];
          if (entering.self.onEnter) {
            $injector.invoke(entering.self.onEnter, entering.self, entering.locals.globals);
          }
        }

        // Re-add the saved hash before we start returning things
        if (hash) toParams['#'] = hash;

        // Run it again, to catch any transitions in callbacks
        if ($state.transition !== transition) return TransitionSuperseded;

        // Update globals in $state
        $state.$current = to;
        $state.current = to.self;
        $state.params = toParams;
        copy($state.params, $stateParams);
        $state.transition = null;

        if (options.location && to.navigable) {
          $urlRouter.push(to.navigable.url, to.navigable.locals.globals.$stateParams, {
            $$avoidResync: true, replace: options.location === 'replace'
          });
        }

        if (options.notify) {
        /**
         * @ngdoc event
         * @name ui.router.state.$state#$stateChangeSuccess
         * @eventOf ui.router.state.$state
         * @eventType broadcast on root scope
         * @description
         * Fired once the state transition is **complete**.
         *
         * @param {Object} event Event object.
         * @param {State} toState The state being transitioned to.
         * @param {Object} toParams The params supplied to the `toState`.
         * @param {State} fromState The current state, pre-transition.
         * @param {Object} fromParams The params supplied to the `fromState`.
         */
          $rootScope.$broadcast('$stateChangeSuccess', to.self, toParams, from.self, fromParams);
        }
        $urlRouter.update(true);

        return $state.current;
      }, function (error) {
        if ($state.transition !== transition) return TransitionSuperseded;

        $state.transition = null;
        /**
         * @ngdoc event
         * @name ui.router.state.$state#$stateChangeError
         * @eventOf ui.router.state.$state
         * @eventType broadcast on root scope
         * @description
         * Fired when an **error occurs** during transition. It's important to note that if you
         * have any errors in your resolve functions (javascript errors, non-existent services, etc)
         * they will not throw traditionally. You must listen for this $stateChangeError event to
         * catch **ALL** errors.
         *
         * @param {Object} event Event object.
         * @param {State} toState The state being transitioned to.
         * @param {Object} toParams The params supplied to the `toState`.
         * @param {State} fromState The current state, pre-transition.
         * @param {Object} fromParams The params supplied to the `fromState`.
         * @param {Error} error The resolve error object.
         */
        evt = $rootScope.$broadcast('$stateChangeError', to.self, toParams, from.self, fromParams, error);

        if (!evt.defaultPrevented) {
            $urlRouter.update();
        }

        return $q.reject(error);
      });

      return transition;
    };

    /**
     * @ngdoc function
     * @name ui.router.state.$state#is
     * @methodOf ui.router.state.$state
     *
     * @description
     * Similar to {@link ui.router.state.$state#methods_includes $state.includes},
     * but only checks for the full state name. If params is supplied then it will be
     * tested for strict equality against the current active params object, so all params
     * must match with none missing and no extras.
     *
     * @example
     * <pre>
     * $state.$current.name = 'contacts.details.item';
     *
     * // absolute name
     * $state.is('contact.details.item'); // returns true
     * $state.is(contactDetailItemStateObject); // returns true
     *
     * // relative name (. and ^), typically from a template
     * // E.g. from the 'contacts.details' template
     * <div ng-class="{highlighted: $state.is('.item')}">Item</div>
     * </pre>
     *
     * @param {string|object} stateOrName The state name (absolute or relative) or state object you'd like to check.
     * @param {object=} params A param object, e.g. `{sectionId: section.id}`, that you'd like
     * to test against the current active state.
     * @param {object=} options An options object.  The options are:
     *
     * - **`relative`** - {string|object} -  If `stateOrName` is a relative state name and `options.relative` is set, .is will
     * test relative to `options.relative` state (or name).
     *
     * @returns {boolean} Returns true if it is the state.
     */
    $state.is = function is(stateOrName, params, options) {
      options = extend({ relative: $state.$current }, options || {});
      var state = findState(stateOrName, options.relative);

      if (!isDefined(state)) { return undefined; }
      if ($state.$current !== state) { return false; }
      return params ? equalForKeys(state.params.$$values(params), $stateParams) : true;
    };

    /**
     * @ngdoc function
     * @name ui.router.state.$state#includes
     * @methodOf ui.router.state.$state
     *
     * @description
     * A method to determine if the current active state is equal to or is the child of the
     * state stateName. If any params are passed then they will be tested for a match as well.
     * Not all the parameters need to be passed, just the ones you'd like to test for equality.
     *
     * @example
     * Partial and relative names
     * <pre>
     * $state.$current.name = 'contacts.details.item';
     *
     * // Using partial names
     * $state.includes("contacts"); // returns true
     * $state.includes("contacts.details"); // returns true
     * $state.includes("contacts.details.item"); // returns true
     * $state.includes("contacts.list"); // returns false
     * $state.includes("about"); // returns false
     *
     * // Using relative names (. and ^), typically from a template
     * // E.g. from the 'contacts.details' template
     * <div ng-class="{highlighted: $state.includes('.item')}">Item</div>
     * </pre>
     *
     * Basic globbing patterns
     * <pre>
     * $state.$current.name = 'contacts.details.item.url';
     *
     * $state.includes("*.details.*.*"); // returns true
     * $state.includes("*.details.**"); // returns true
     * $state.includes("**.item.**"); // returns true
     * $state.includes("*.details.item.url"); // returns true
     * $state.includes("*.details.*.url"); // returns true
     * $state.includes("*.details.*"); // returns false
     * $state.includes("item.**"); // returns false
     * </pre>
     *
     * @param {string} stateOrName A partial name, relative name, or glob pattern
     * to be searched for within the current state name.
     * @param {object=} params A param object, e.g. `{sectionId: section.id}`,
     * that you'd like to test against the current active state.
     * @param {object=} options An options object.  The options are:
     *
     * - **`relative`** - {string|object=} -  If `stateOrName` is a relative state reference and `options.relative` is set,
     * .includes will test relative to `options.relative` state (or name).
     *
     * @returns {boolean} Returns true if it does include the state
     */
    $state.includes = function includes(stateOrName, params, options) {
      options = extend({ relative: $state.$current }, options || {});
      if (isString(stateOrName) && isGlob(stateOrName)) {
        if (!doesStateMatchGlob(stateOrName)) {
          return false;
        }
        stateOrName = $state.$current.name;
      }

      var state = findState(stateOrName, options.relative);
      if (!isDefined(state)) { return undefined; }
      if (!isDefined($state.$current.includes[state.name])) { return false; }
      return params ? equalForKeys(state.params.$$values(params), $stateParams, objectKeys(params)) : true;
    };


    /**
     * @ngdoc function
     * @name ui.router.state.$state#href
     * @methodOf ui.router.state.$state
     *
     * @description
     * A url generation method that returns the compiled url for the given state populated with the given params.
     *
     * @example
     * <pre>
     * expect($state.href("about.person", { person: "bob" })).toEqual("/about/bob");
     * </pre>
     *
     * @param {string|object} stateOrName The state name or state object you'd like to generate a url from.
     * @param {object=} params An object of parameter values to fill the state's required parameters.
     * @param {object=} options Options object. The options are:
     *
     * - **`lossy`** - {boolean=true} -  If true, and if there is no url associated with the state provided in the
     *    first parameter, then the constructed href url will be built from the first navigable ancestor (aka
     *    ancestor with a valid url).
     * - **`inherit`** - {boolean=true}, If `true` will inherit url parameters from current url.
     * - **`relative`** - {object=$state.$current}, When transitioning with relative path (e.g '^'), 
     *    defines which state to be relative from.
     * - **`absolute`** - {boolean=false},  If true will generate an absolute url, e.g. "http://www.example.com/fullurl".
     * 
     * @returns {string} compiled state url
     */
    $state.href = function href(stateOrName, params, options) {
      options = extend({
        lossy:    true,
        inherit:  true,
        absolute: false,
        relative: $state.$current
      }, options || {});

      var state = findState(stateOrName, options.relative);

      if (!isDefined(state)) return null;
      if (options.inherit) params = inheritParams($stateParams, params || {}, $state.$current, state);
      
      var nav = (state && options.lossy) ? state.navigable : state;

      if (!nav || nav.url === undefined || nav.url === null) {
        return null;
      }
      return $urlRouter.href(nav.url, filterByKeys(state.params.$$keys().concat('#'), params || {}), {
        absolute: options.absolute
      });
    };

    /**
     * @ngdoc function
     * @name ui.router.state.$state#get
     * @methodOf ui.router.state.$state
     *
     * @description
     * Returns the state configuration object for any specific state or all states.
     *
     * @param {string|object=} stateOrName (absolute or relative) If provided, will only get the config for
     * the requested state. If not provided, returns an array of ALL state configs.
     * @param {string|object=} context When stateOrName is a relative state reference, the state will be retrieved relative to context.
     * @returns {Object|Array} State configuration object or array of all objects.
     */
    $state.get = function (stateOrName, context) {
      if (arguments.length === 0) return map(objectKeys(states), function(name) { return states[name].self; });
      var state = findState(stateOrName, context || $state.$current);
      return (state && state.self) ? state.self : null;
    };

    function resolveState(state, params, paramsAreFiltered, inherited, dst, options) {
      // Make a restricted $stateParams with only the parameters that apply to this state if
      // necessary. In addition to being available to the controller and onEnter/onExit callbacks,
      // we also need $stateParams to be available for any $injector calls we make during the
      // dependency resolution process.
      var $stateParams = (paramsAreFiltered) ? params : filterByKeys(state.params.$$keys(), params);
      var locals = { $stateParams: $stateParams };

      // Resolve 'global' dependencies for the state, i.e. those not specific to a view.
      // We're also including $stateParams in this; that way the parameters are restricted
      // to the set that should be visible to the state, and are independent of when we update
      // the global $state and $stateParams values.
      dst.resolve = $resolve.resolve(state.resolve, locals, dst.resolve, state);
      var promises = [dst.resolve.then(function (globals) {
        dst.globals = globals;
      })];
      if (inherited) promises.push(inherited);

      function resolveViews() {
        var viewsPromises = [];

        // Resolve template and dependencies for all views.
        forEach(state.views, function (view, name) {
          var injectables = (view.resolve && view.resolve !== state.resolve ? view.resolve : {});
          injectables.$template = [ function () {
            return $view.load(name, { view: view, locals: dst.globals, params: $stateParams, notify: options.notify }) || '';
          }];

          viewsPromises.push($resolve.resolve(injectables, dst.globals, dst.resolve, state).then(function (result) {
            // References to the controller (only instantiated at link time)
            if (isFunction(view.controllerProvider) || isArray(view.controllerProvider)) {
              var injectLocals = angular.extend({}, injectables, dst.globals);
              result.$$controller = $injector.invoke(view.controllerProvider, null, injectLocals);
            } else {
              result.$$controller = view.controller;
            }
            // Provide access to the state itself for internal use
            result.$$state = state;
            result.$$controllerAs = view.controllerAs;
            dst[name] = result;
          }));
        });

        return $q.all(viewsPromises).then(function(){
          return dst.globals;
        });
      }

      // Wait for all the promises and then return the activation object
      return $q.all(promises).then(resolveViews).then(function (values) {
        return dst;
      });
    }

    return $state;
  }

  function shouldSkipReload(to, toParams, from, fromParams, locals, options) {
    // Return true if there are no differences in non-search (path/object) params, false if there are differences
    function nonSearchParamsEqual(fromAndToState, fromParams, toParams) {
      // Identify whether all the parameters that differ between `fromParams` and `toParams` were search params.
      function notSearchParam(key) {
        return fromAndToState.params[key].location != "search";
      }
      var nonQueryParamKeys = fromAndToState.params.$$keys().filter(notSearchParam);
      var nonQueryParams = pick.apply({}, [fromAndToState.params].concat(nonQueryParamKeys));
      var nonQueryParamSet = new $$UMFP.ParamSet(nonQueryParams);
      return nonQueryParamSet.$$equals(fromParams, toParams);
    }

    // If reload was not explicitly requested
    // and we're transitioning to the same state we're already in
    // and    the locals didn't change
    //     or they changed in a way that doesn't merit reloading
    //        (reloadOnParams:false, or reloadOnSearch.false and only search params changed)
    // Then return true.
    if (!options.reload && to === from &&
      (locals === from.locals || (to.self.reloadOnSearch === false && nonSearchParamsEqual(from, fromParams, toParams)))) {
      return true;
    }
  }
}

angular.module('ui.router.state')
  .value('$stateParams', {})
  .provider('$state', $StateProvider);


$ViewProvider.$inject = [];
function $ViewProvider() {

  this.$get = $get;
  /**
   * @ngdoc object
   * @name ui.router.state.$view
   *
   * @requires ui.router.util.$templateFactory
   * @requires $rootScope
   *
   * @description
   *
   */
  $get.$inject = ['$rootScope', '$templateFactory'];
  function $get(   $rootScope,   $templateFactory) {
    return {
      // $view.load('full.viewName', { template: ..., controller: ..., resolve: ..., async: false, params: ... })
      /**
       * @ngdoc function
       * @name ui.router.state.$view#load
       * @methodOf ui.router.state.$view
       *
       * @description
       *
       * @param {string} name name
       * @param {object} options option object.
       */
      load: function load(name, options) {
        var result, defaults = {
          template: null, controller: null, view: null, locals: null, notify: true, async: true, params: {}
        };
        options = extend(defaults, options);

        if (options.view) {
          result = $templateFactory.fromConfig(options.view, options.params, options.locals);
        }
        if (result && options.notify) {
        /**
         * @ngdoc event
         * @name ui.router.state.$state#$viewContentLoading
         * @eventOf ui.router.state.$view
         * @eventType broadcast on root scope
         * @description
         *
         * Fired once the view **begins loading**, *before* the DOM is rendered.
         *
         * @param {Object} event Event object.
         * @param {Object} viewConfig The view config properties (template, controller, etc).
         *
         * @example
         *
         * <pre>
         * $scope.$on('$viewContentLoading',
         * function(event, viewConfig){
         *     // Access to all the view config properties.
         *     // and one special property 'targetView'
         *     // viewConfig.targetView
         * });
         * </pre>
         */
          $rootScope.$broadcast('$viewContentLoading', options);
        }
        return result;
      }
    };
  }
}

angular.module('ui.router.state').provider('$view', $ViewProvider);

/**
 * @ngdoc object
 * @name ui.router.state.$uiViewScrollProvider
 *
 * @description
 * Provider that returns the {@link ui.router.state.$uiViewScroll} service function.
 */
function $ViewScrollProvider() {

  var useAnchorScroll = false;

  /**
   * @ngdoc function
   * @name ui.router.state.$uiViewScrollProvider#useAnchorScroll
   * @methodOf ui.router.state.$uiViewScrollProvider
   *
   * @description
   * Reverts back to using the core [`$anchorScroll`](http://docs.angularjs.org/api/ng.$anchorScroll) service for
   * scrolling based on the url anchor.
   */
  this.useAnchorScroll = function () {
    useAnchorScroll = true;
  };

  /**
   * @ngdoc object
   * @name ui.router.state.$uiViewScroll
   *
   * @requires $anchorScroll
   * @requires $timeout
   *
   * @description
   * When called with a jqLite element, it scrolls the element into view (after a
   * `$timeout` so the DOM has time to refresh).
   *
   * If you prefer to rely on `$anchorScroll` to scroll the view to the anchor,
   * this can be enabled by calling {@link ui.router.state.$uiViewScrollProvider#methods_useAnchorScroll `$uiViewScrollProvider.useAnchorScroll()`}.
   */
  this.$get = ['$anchorScroll', '$timeout', function ($anchorScroll, $timeout) {
    if (useAnchorScroll) {
      return $anchorScroll;
    }

    return function ($element) {
      return $timeout(function () {
        $element[0].scrollIntoView();
      }, 0, false);
    };
  }];
}

angular.module('ui.router.state').provider('$uiViewScroll', $ViewScrollProvider);

/**
 * @ngdoc directive
 * @name ui.router.state.directive:ui-view
 *
 * @requires ui.router.state.$state
 * @requires $compile
 * @requires $controller
 * @requires $injector
 * @requires ui.router.state.$uiViewScroll
 * @requires $document
 *
 * @restrict ECA
 *
 * @description
 * The ui-view directive tells $state where to place your templates.
 *
 * @param {string=} name A view name. The name should be unique amongst the other views in the
 * same state. You can have views of the same name that live in different states.
 *
 * @param {string=} autoscroll It allows you to set the scroll behavior of the browser window
 * when a view is populated. By default, $anchorScroll is overridden by ui-router's custom scroll
 * service, {@link ui.router.state.$uiViewScroll}. This custom service let's you
 * scroll ui-view elements into view when they are populated during a state activation.
 *
 * *Note: To revert back to old [`$anchorScroll`](http://docs.angularjs.org/api/ng.$anchorScroll)
 * functionality, call `$uiViewScrollProvider.useAnchorScroll()`.*
 *
 * @param {string=} onload Expression to evaluate whenever the view updates.
 * 
 * @example
 * A view can be unnamed or named. 
 * <pre>
 * <!-- Unnamed -->
 * <div ui-view></div> 
 * 
 * <!-- Named -->
 * <div ui-view="viewName"></div>
 * </pre>
 *
 * You can only have one unnamed view within any template (or root html). If you are only using a 
 * single view and it is unnamed then you can populate it like so:
 * <pre>
 * <div ui-view></div> 
 * $stateProvider.state("home", {
 *   template: "<h1>HELLO!</h1>"
 * })
 * </pre>
 * 
 * The above is a convenient shortcut equivalent to specifying your view explicitly with the {@link ui.router.state.$stateProvider#views `views`}
 * config property, by name, in this case an empty name:
 * <pre>
 * $stateProvider.state("home", {
 *   views: {
 *     "": {
 *       template: "<h1>HELLO!</h1>"
 *     }
 *   }    
 * })
 * </pre>
 * 
 * But typically you'll only use the views property if you name your view or have more than one view 
 * in the same template. There's not really a compelling reason to name a view if its the only one, 
 * but you could if you wanted, like so:
 * <pre>
 * <div ui-view="main"></div>
 * </pre> 
 * <pre>
 * $stateProvider.state("home", {
 *   views: {
 *     "main": {
 *       template: "<h1>HELLO!</h1>"
 *     }
 *   }    
 * })
 * </pre>
 * 
 * Really though, you'll use views to set up multiple views:
 * <pre>
 * <div ui-view></div>
 * <div ui-view="chart"></div> 
 * <div ui-view="data"></div> 
 * </pre>
 * 
 * <pre>
 * $stateProvider.state("home", {
 *   views: {
 *     "": {
 *       template: "<h1>HELLO!</h1>"
 *     },
 *     "chart": {
 *       template: "<chart_thing/>"
 *     },
 *     "data": {
 *       template: "<data_thing/>"
 *     }
 *   }    
 * })
 * </pre>
 *
 * Examples for `autoscroll`:
 *
 * <pre>
 * <!-- If autoscroll present with no expression,
 *      then scroll ui-view into view -->
 * <ui-view autoscroll/>
 *
 * <!-- If autoscroll present with valid expression,
 *      then scroll ui-view into view if expression evaluates to true -->
 * <ui-view autoscroll='true'/>
 * <ui-view autoscroll='false'/>
 * <ui-view autoscroll='scopeVariable'/>
 * </pre>
 */
$ViewDirective.$inject = ['$state', '$injector', '$uiViewScroll', '$interpolate'];
function $ViewDirective(   $state,   $injector,   $uiViewScroll,   $interpolate) {

  function getService() {
    return ($injector.has) ? function(service) {
      return $injector.has(service) ? $injector.get(service) : null;
    } : function(service) {
      try {
        return $injector.get(service);
      } catch (e) {
        return null;
      }
    };
  }

  var service = getService(),
      $animator = service('$animator'),
      $animate = service('$animate');

  // Returns a set of DOM manipulation functions based on which Angular version
  // it should use
  function getRenderer(attrs, scope) {
    var statics = function() {
      return {
        enter: function (element, target, cb) { target.after(element); cb(); },
        leave: function (element, cb) { element.remove(); cb(); }
      };
    };

    if ($animate) {
      return {
        enter: function(element, target, cb) {
          var promise = $animate.enter(element, null, target, cb);
          if (promise && promise.then) promise.then(cb);
        },
        leave: function(element, cb) {
          var promise = $animate.leave(element, cb);
          if (promise && promise.then) promise.then(cb);
        }
      };
    }

    if ($animator) {
      var animate = $animator && $animator(scope, attrs);

      return {
        enter: function(element, target, cb) {animate.enter(element, null, target); cb(); },
        leave: function(element, cb) { animate.leave(element); cb(); }
      };
    }

    return statics();
  }

  var directive = {
    restrict: 'ECA',
    terminal: true,
    priority: 400,
    transclude: 'element',
    compile: function (tElement, tAttrs, $transclude) {
      return function (scope, $element, attrs) {
        var previousEl, currentEl, currentScope, latestLocals,
            onloadExp     = attrs.onload || '',
            autoScrollExp = attrs.autoscroll,
            renderer      = getRenderer(attrs, scope);

        scope.$on('$stateChangeSuccess', function() {
          updateView(false);
        });
        scope.$on('$viewContentLoading', function() {
          updateView(false);
        });

        updateView(true);

        function cleanupLastView() {
          if (previousEl) {
            previousEl.remove();
            previousEl = null;
          }

          if (currentScope) {
            currentScope.$destroy();
            currentScope = null;
          }

          if (currentEl) {
            renderer.leave(currentEl, function() {
              previousEl = null;
            });

            previousEl = currentEl;
            currentEl = null;
          }
        }

        function updateView(firstTime) {
          var newScope,
              name            = getUiViewName(scope, attrs, $element, $interpolate),
              previousLocals  = name && $state.$current && $state.$current.locals[name];

          if (!firstTime && previousLocals === latestLocals) return; // nothing to do
          newScope = scope.$new();
          latestLocals = $state.$current.locals[name];

          var clone = $transclude(newScope, function(clone) {
            renderer.enter(clone, $element, function onUiViewEnter() {
              if(currentScope) {
                currentScope.$emit('$viewContentAnimationEnded');
              }

              if (angular.isDefined(autoScrollExp) && !autoScrollExp || scope.$eval(autoScrollExp)) {
                $uiViewScroll(clone);
              }
            });
            cleanupLastView();
          });

          currentEl = clone;
          currentScope = newScope;
          /**
           * @ngdoc event
           * @name ui.router.state.directive:ui-view#$viewContentLoaded
           * @eventOf ui.router.state.directive:ui-view
           * @eventType emits on ui-view directive scope
           * @description           *
           * Fired once the view is **loaded**, *after* the DOM is rendered.
           *
           * @param {Object} event Event object.
           */
          currentScope.$emit('$viewContentLoaded');
          currentScope.$eval(onloadExp);
        }
      };
    }
  };

  return directive;
}

$ViewDirectiveFill.$inject = ['$compile', '$controller', '$state', '$interpolate'];
function $ViewDirectiveFill (  $compile,   $controller,   $state,   $interpolate) {
  return {
    restrict: 'ECA',
    priority: -400,
    compile: function (tElement) {
      var initial = tElement.html();
      return function (scope, $element, attrs) {
        var current = $state.$current,
            name = getUiViewName(scope, attrs, $element, $interpolate),
            locals  = current && current.locals[name];

        if (! locals) {
          return;
        }

        $element.data('$uiView', { name: name, state: locals.$$state });
        $element.html(locals.$template ? locals.$template : initial);

        var link = $compile($element.contents());

        if (locals.$$controller) {
          locals.$scope = scope;
          locals.$element = $element;
          var controller = $controller(locals.$$controller, locals);
          if (locals.$$controllerAs) {
            scope[locals.$$controllerAs] = controller;
          }
          $element.data('$ngControllerController', controller);
          $element.children().data('$ngControllerController', controller);
        }

        link(scope);
      };
    }
  };
}

/**
 * Shared ui-view code for both directives:
 * Given scope, element, and its attributes, return the view's name
 */
function getUiViewName(scope, attrs, element, $interpolate) {
  var name = $interpolate(attrs.uiView || attrs.name || '')(scope);
  var inherited = element.inheritedData('$uiView');
  return name.indexOf('@') >= 0 ?  name :  (name + '@' + (inherited ? inherited.state.name : ''));
}

angular.module('ui.router.state').directive('uiView', $ViewDirective);
angular.module('ui.router.state').directive('uiView', $ViewDirectiveFill);

function parseStateRef(ref, current) {
  var preparsed = ref.match(/^\s*({[^}]*})\s*$/), parsed;
  if (preparsed) ref = current + '(' + preparsed[1] + ')';
  parsed = ref.replace(/\n/g, " ").match(/^([^(]+?)\s*(\((.*)\))?$/);
  if (!parsed || parsed.length !== 4) throw new Error("Invalid state ref '" + ref + "'");
  return { state: parsed[1], paramExpr: parsed[3] || null };
}

function stateContext(el) {
  var stateData = el.parent().inheritedData('$uiView');

  if (stateData && stateData.state && stateData.state.name) {
    return stateData.state;
  }
}

/**
 * @ngdoc directive
 * @name ui.router.state.directive:ui-sref
 *
 * @requires ui.router.state.$state
 * @requires $timeout
 *
 * @restrict A
 *
 * @description
 * A directive that binds a link (`<a>` tag) to a state. If the state has an associated 
 * URL, the directive will automatically generate & update the `href` attribute via 
 * the {@link ui.router.state.$state#methods_href $state.href()} method. Clicking 
 * the link will trigger a state transition with optional parameters. 
 *
 * Also middle-clicking, right-clicking, and ctrl-clicking on the link will be 
 * handled natively by the browser.
 *
 * You can also use relative state paths within ui-sref, just like the relative 
 * paths passed to `$state.go()`. You just need to be aware that the path is relative
 * to the state that the link lives in, in other words the state that loaded the 
 * template containing the link.
 *
 * You can specify options to pass to {@link ui.router.state.$state#go $state.go()}
 * using the `ui-sref-opts` attribute. Options are restricted to `location`, `inherit`,
 * and `reload`.
 *
 * @example
 * Here's an example of how you'd use ui-sref and how it would compile. If you have the 
 * following template:
 * <pre>
 * <a ui-sref="home">Home</a> | <a ui-sref="about">About</a> | <a ui-sref="{page: 2}">Next page</a>
 * 
 * <ul>
 *     <li ng-repeat="contact in contacts">
 *         <a ui-sref="contacts.detail({ id: contact.id })">{{ contact.name }}</a>
 *     </li>
 * </ul>
 * </pre>
 * 
 * Then the compiled html would be (assuming Html5Mode is off and current state is contacts):
 * <pre>
 * <a href="#/home" ui-sref="home">Home</a> | <a href="#/about" ui-sref="about">About</a> | <a href="#/contacts?page=2" ui-sref="{page: 2}">Next page</a>
 * 
 * <ul>
 *     <li ng-repeat="contact in contacts">
 *         <a href="#/contacts/1" ui-sref="contacts.detail({ id: contact.id })">Joe</a>
 *     </li>
 *     <li ng-repeat="contact in contacts">
 *         <a href="#/contacts/2" ui-sref="contacts.detail({ id: contact.id })">Alice</a>
 *     </li>
 *     <li ng-repeat="contact in contacts">
 *         <a href="#/contacts/3" ui-sref="contacts.detail({ id: contact.id })">Bob</a>
 *     </li>
 * </ul>
 *
 * <a ui-sref="home" ui-sref-opts="{reload: true}">Home</a>
 * </pre>
 *
 * @param {string} ui-sref 'stateName' can be any valid absolute or relative state
 * @param {Object} ui-sref-opts options to pass to {@link ui.router.state.$state#go $state.go()}
 */
$StateRefDirective.$inject = ['$state', '$timeout'];
function $StateRefDirective($state, $timeout) {
  var allowedOptions = ['location', 'inherit', 'reload', 'absolute'];

  return {
    restrict: 'A',
    require: ['?^uiSrefActive', '?^uiSrefActiveEq'],
    link: function(scope, element, attrs, uiSrefActive) {
      var ref = parseStateRef(attrs.uiSref, $state.current.name);
      var params = null, url = null, base = stateContext(element) || $state.$current;
      // SVGAElement does not use the href attribute, but rather the 'xlinkHref' attribute.
      var hrefKind = Object.prototype.toString.call(element.prop('href')) === '[object SVGAnimatedString]' ?
                 'xlink:href' : 'href';
      var newHref = null, isAnchor = element.prop("tagName").toUpperCase() === "A";
      var isForm = element[0].nodeName === "FORM";
      var attr = isForm ? "action" : hrefKind, nav = true;

      var options = { relative: base, inherit: true };
      var optionsOverride = scope.$eval(attrs.uiSrefOpts) || {};

      angular.forEach(allowedOptions, function(option) {
        if (option in optionsOverride) {
          options[option] = optionsOverride[option];
        }
      });

      var update = function(newVal) {
        if (newVal) params = angular.copy(newVal);
        if (!nav) return;

        newHref = $state.href(ref.state, params, options);

        var activeDirective = uiSrefActive[1] || uiSrefActive[0];
        if (activeDirective) {
          activeDirective.$$addStateInfo(ref.state, params);
        }
        if (newHref === null) {
          nav = false;
          return false;
        }
        attrs.$set(attr, newHref);
      };

      if (ref.paramExpr) {
        scope.$watch(ref.paramExpr, function(newVal, oldVal) {
          if (newVal !== params) update(newVal);
        }, true);
        params = angular.copy(scope.$eval(ref.paramExpr));
      }
      update();

      if (isForm) return;

      element.bind("click", function(e) {
        var button = e.which || e.button;
        if ( !(button > 1 || e.ctrlKey || e.metaKey || e.shiftKey || element.attr('target')) ) {
          // HACK: This is to allow ng-clicks to be processed before the transition is initiated:
          var transition = $timeout(function() {
            $state.go(ref.state, params, options);
          });
          e.preventDefault();

          // if the state has no URL, ignore one preventDefault from the <a> directive.
          var ignorePreventDefaultCount = isAnchor && !newHref ? 1: 0;
          e.preventDefault = function() {
            if (ignorePreventDefaultCount-- <= 0)
              $timeout.cancel(transition);
          };
        }
      });
    }
  };
}

/**
 * @ngdoc directive
 * @name ui.router.state.directive:ui-sref-active
 *
 * @requires ui.router.state.$state
 * @requires ui.router.state.$stateParams
 * @requires $interpolate
 *
 * @restrict A
 *
 * @description
 * A directive working alongside ui-sref to add classes to an element when the
 * related ui-sref directive's state is active, and removing them when it is inactive.
 * The primary use-case is to simplify the special appearance of navigation menus
 * relying on `ui-sref`, by having the "active" state's menu button appear different,
 * distinguishing it from the inactive menu items.
 *
 * ui-sref-active can live on the same element as ui-sref or on a parent element. The first
 * ui-sref-active found at the same level or above the ui-sref will be used.
 *
 * Will activate when the ui-sref's target state or any child state is active. If you
 * need to activate only when the ui-sref target state is active and *not* any of
 * it's children, then you will use
 * {@link ui.router.state.directive:ui-sref-active-eq ui-sref-active-eq}
 *
 * @example
 * Given the following template:
 * <pre>
 * <ul>
 *   <li ui-sref-active="active" class="item">
 *     <a href ui-sref="app.user({user: 'bilbobaggins'})">@bilbobaggins</a>
 *   </li>
 * </ul>
 * </pre>
 *
 *
 * When the app state is "app.user" (or any children states), and contains the state parameter "user" with value "bilbobaggins",
 * the resulting HTML will appear as (note the 'active' class):
 * <pre>
 * <ul>
 *   <li ui-sref-active="active" class="item active">
 *     <a ui-sref="app.user({user: 'bilbobaggins'})" href="/users/bilbobaggins">@bilbobaggins</a>
 *   </li>
 * </ul>
 * </pre>
 *
 * The class name is interpolated **once** during the directives link time (any further changes to the
 * interpolated value are ignored).
 *
 * Multiple classes may be specified in a space-separated format:
 * <pre>
 * <ul>
 *   <li ui-sref-active='class1 class2 class3'>
 *     <a ui-sref="app.user">link</a>
 *   </li>
 * </ul>
 * </pre>
 */

/**
 * @ngdoc directive
 * @name ui.router.state.directive:ui-sref-active-eq
 *
 * @requires ui.router.state.$state
 * @requires ui.router.state.$stateParams
 * @requires $interpolate
 *
 * @restrict A
 *
 * @description
 * The same as {@link ui.router.state.directive:ui-sref-active ui-sref-active} but will only activate
 * when the exact target state used in the `ui-sref` is active; no child states.
 *
 */
$StateRefActiveDirective.$inject = ['$state', '$stateParams', '$interpolate'];
function $StateRefActiveDirective($state, $stateParams, $interpolate) {
  return  {
    restrict: "A",
    controller: ['$scope', '$element', '$attrs', function ($scope, $element, $attrs) {
      var states = [], activeClass;

      // There probably isn't much point in $observing this
      // uiSrefActive and uiSrefActiveEq share the same directive object with some
      // slight difference in logic routing
      activeClass = $interpolate($attrs.uiSrefActiveEq || $attrs.uiSrefActive || '', false)($scope);

      // Allow uiSref to communicate with uiSrefActive[Equals]
      this.$$addStateInfo = function (newState, newParams) {
        var state = $state.get(newState, stateContext($element));

        states.push({
          state: state || { name: newState },
          params: newParams
        });

        update();
      };

      $scope.$on('$stateChangeSuccess', update);

      // Update route state
      function update() {
        if (anyMatch()) {
          $element.addClass(activeClass);
        } else {
          $element.removeClass(activeClass);
        }
      }

      function anyMatch() {
        for (var i = 0; i < states.length; i++) {
          if (isMatch(states[i].state, states[i].params)) {
            return true;
          }
        }
        return false;
      }

      function isMatch(state, params) {
        if (typeof $attrs.uiSrefActiveEq !== 'undefined') {
          return $state.is(state.name, params);
        } else {
          return $state.includes(state.name, params);
        }
      }
    }]
  };
}

angular.module('ui.router.state')
  .directive('uiSref', $StateRefDirective)
  .directive('uiSrefActive', $StateRefActiveDirective)
  .directive('uiSrefActiveEq', $StateRefActiveDirective);

/**
 * @ngdoc filter
 * @name ui.router.state.filter:isState
 *
 * @requires ui.router.state.$state
 *
 * @description
 * Translates to {@link ui.router.state.$state#methods_is $state.is("stateName")}.
 */
$IsStateFilter.$inject = ['$state'];
function $IsStateFilter($state) {
  var isFilter = function (state) {
    return $state.is(state);
  };
  isFilter.$stateful = true;
  return isFilter;
}

/**
 * @ngdoc filter
 * @name ui.router.state.filter:includedByState
 *
 * @requires ui.router.state.$state
 *
 * @description
 * Translates to {@link ui.router.state.$state#methods_includes $state.includes('fullOrPartialStateName')}.
 */
$IncludedByStateFilter.$inject = ['$state'];
function $IncludedByStateFilter($state) {
  var includesFilter = function (state) {
    return $state.includes(state);
  };
  includesFilter.$stateful = true;
  return  includesFilter;
}

angular.module('ui.router.state')
  .filter('isState', $IsStateFilter)
  .filter('includedByState', $IncludedByStateFilter);
})(window, window.angular);
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiIiwic291cmNlcyI6WyJhbmd1bGFyLXVpLXJvdXRlci5qcyJdLCJzb3VyY2VzQ29udGVudCI6WyIvKipcbiAqIFN0YXRlLWJhc2VkIHJvdXRpbmcgZm9yIEFuZ3VsYXJKU1xuICogQHZlcnNpb24gdjAuMi4xNVxuICogQGxpbmsgaHR0cDovL2FuZ3VsYXItdWkuZ2l0aHViLmNvbS9cbiAqIEBsaWNlbnNlIE1JVCBMaWNlbnNlLCBodHRwOi8vd3d3Lm9wZW5zb3VyY2Uub3JnL2xpY2Vuc2VzL01JVFxuICovXG5cbi8qIGNvbW1vbmpzIHBhY2thZ2UgbWFuYWdlciBzdXBwb3J0IChlZyBjb21wb25lbnRqcykgKi9cbmlmICh0eXBlb2YgbW9kdWxlICE9PSBcInVuZGVmaW5lZFwiICYmIHR5cGVvZiBleHBvcnRzICE9PSBcInVuZGVmaW5lZFwiICYmIG1vZHVsZS5leHBvcnRzID09PSBleHBvcnRzKXtcbiAgbW9kdWxlLmV4cG9ydHMgPSAndWkucm91dGVyJztcbn1cblxuKGZ1bmN0aW9uICh3aW5kb3csIGFuZ3VsYXIsIHVuZGVmaW5lZCkge1xuLypqc2hpbnQgZ2xvYmFsc3RyaWN0OnRydWUqL1xuLypnbG9iYWwgYW5ndWxhcjpmYWxzZSovXG4ndXNlIHN0cmljdCc7XG5cbnZhciBpc0RlZmluZWQgPSBhbmd1bGFyLmlzRGVmaW5lZCxcbiAgICBpc0Z1bmN0aW9uID0gYW5ndWxhci5pc0Z1bmN0aW9uLFxuICAgIGlzU3RyaW5nID0gYW5ndWxhci5pc1N0cmluZyxcbiAgICBpc09iamVjdCA9IGFuZ3VsYXIuaXNPYmplY3QsXG4gICAgaXNBcnJheSA9IGFuZ3VsYXIuaXNBcnJheSxcbiAgICBmb3JFYWNoID0gYW5ndWxhci5mb3JFYWNoLFxuICAgIGV4dGVuZCA9IGFuZ3VsYXIuZXh0ZW5kLFxuICAgIGNvcHkgPSBhbmd1bGFyLmNvcHk7XG5cbmZ1bmN0aW9uIGluaGVyaXQocGFyZW50LCBleHRyYSkge1xuICByZXR1cm4gZXh0ZW5kKG5ldyAoZXh0ZW5kKGZ1bmN0aW9uKCkge30sIHsgcHJvdG90eXBlOiBwYXJlbnQgfSkpKCksIGV4dHJhKTtcbn1cblxuZnVuY3Rpb24gbWVyZ2UoZHN0KSB7XG4gIGZvckVhY2goYXJndW1lbnRzLCBmdW5jdGlvbihvYmopIHtcbiAgICBpZiAob2JqICE9PSBkc3QpIHtcbiAgICAgIGZvckVhY2gob2JqLCBmdW5jdGlvbih2YWx1ZSwga2V5KSB7XG4gICAgICAgIGlmICghZHN0Lmhhc093blByb3BlcnR5KGtleSkpIGRzdFtrZXldID0gdmFsdWU7XG4gICAgICB9KTtcbiAgICB9XG4gIH0pO1xuICByZXR1cm4gZHN0O1xufVxuXG4vKipcbiAqIEZpbmRzIHRoZSBjb21tb24gYW5jZXN0b3IgcGF0aCBiZXR3ZWVuIHR3byBzdGF0ZXMuXG4gKlxuICogQHBhcmFtIHtPYmplY3R9IGZpcnN0IFRoZSBmaXJzdCBzdGF0ZS5cbiAqIEBwYXJhbSB7T2JqZWN0fSBzZWNvbmQgVGhlIHNlY29uZCBzdGF0ZS5cbiAqIEByZXR1cm4ge0FycmF5fSBSZXR1cm5zIGFuIGFycmF5IG9mIHN0YXRlIG5hbWVzIGluIGRlc2NlbmRpbmcgb3JkZXIsIG5vdCBpbmNsdWRpbmcgdGhlIHJvb3QuXG4gKi9cbmZ1bmN0aW9uIGFuY2VzdG9ycyhmaXJzdCwgc2Vjb25kKSB7XG4gIHZhciBwYXRoID0gW107XG5cbiAgZm9yICh2YXIgbiBpbiBmaXJzdC5wYXRoKSB7XG4gICAgaWYgKGZpcnN0LnBhdGhbbl0gIT09IHNlY29uZC5wYXRoW25dKSBicmVhaztcbiAgICBwYXRoLnB1c2goZmlyc3QucGF0aFtuXSk7XG4gIH1cbiAgcmV0dXJuIHBhdGg7XG59XG5cbi8qKlxuICogSUU4LXNhZmUgd3JhcHBlciBmb3IgYE9iamVjdC5rZXlzKClgLlxuICpcbiAqIEBwYXJhbSB7T2JqZWN0fSBvYmplY3QgQSBKYXZhU2NyaXB0IG9iamVjdC5cbiAqIEByZXR1cm4ge0FycmF5fSBSZXR1cm5zIHRoZSBrZXlzIG9mIHRoZSBvYmplY3QgYXMgYW4gYXJyYXkuXG4gKi9cbmZ1bmN0aW9uIG9iamVjdEtleXMob2JqZWN0KSB7XG4gIGlmIChPYmplY3Qua2V5cykge1xuICAgIHJldHVybiBPYmplY3Qua2V5cyhvYmplY3QpO1xuICB9XG4gIHZhciByZXN1bHQgPSBbXTtcblxuICBmb3JFYWNoKG9iamVjdCwgZnVuY3Rpb24odmFsLCBrZXkpIHtcbiAgICByZXN1bHQucHVzaChrZXkpO1xuICB9KTtcbiAgcmV0dXJuIHJlc3VsdDtcbn1cblxuLyoqXG4gKiBJRTgtc2FmZSB3cmFwcGVyIGZvciBgQXJyYXkucHJvdG90eXBlLmluZGV4T2YoKWAuXG4gKlxuICogQHBhcmFtIHtBcnJheX0gYXJyYXkgQSBKYXZhU2NyaXB0IGFycmF5LlxuICogQHBhcmFtIHsqfSB2YWx1ZSBBIHZhbHVlIHRvIHNlYXJjaCB0aGUgYXJyYXkgZm9yLlxuICogQHJldHVybiB7TnVtYmVyfSBSZXR1cm5zIHRoZSBhcnJheSBpbmRleCB2YWx1ZSBvZiBgdmFsdWVgLCBvciBgLTFgIGlmIG5vdCBwcmVzZW50LlxuICovXG5mdW5jdGlvbiBpbmRleE9mKGFycmF5LCB2YWx1ZSkge1xuICBpZiAoQXJyYXkucHJvdG90eXBlLmluZGV4T2YpIHtcbiAgICByZXR1cm4gYXJyYXkuaW5kZXhPZih2YWx1ZSwgTnVtYmVyKGFyZ3VtZW50c1syXSkgfHwgMCk7XG4gIH1cbiAgdmFyIGxlbiA9IGFycmF5Lmxlbmd0aCA+Pj4gMCwgZnJvbSA9IE51bWJlcihhcmd1bWVudHNbMl0pIHx8IDA7XG4gIGZyb20gPSAoZnJvbSA8IDApID8gTWF0aC5jZWlsKGZyb20pIDogTWF0aC5mbG9vcihmcm9tKTtcblxuICBpZiAoZnJvbSA8IDApIGZyb20gKz0gbGVuO1xuXG4gIGZvciAoOyBmcm9tIDwgbGVuOyBmcm9tKyspIHtcbiAgICBpZiAoZnJvbSBpbiBhcnJheSAmJiBhcnJheVtmcm9tXSA9PT0gdmFsdWUpIHJldHVybiBmcm9tO1xuICB9XG4gIHJldHVybiAtMTtcbn1cblxuLyoqXG4gKiBNZXJnZXMgYSBzZXQgb2YgcGFyYW1ldGVycyB3aXRoIGFsbCBwYXJhbWV0ZXJzIGluaGVyaXRlZCBiZXR3ZWVuIHRoZSBjb21tb24gcGFyZW50cyBvZiB0aGVcbiAqIGN1cnJlbnQgc3RhdGUgYW5kIGEgZ2l2ZW4gZGVzdGluYXRpb24gc3RhdGUuXG4gKlxuICogQHBhcmFtIHtPYmplY3R9IGN1cnJlbnRQYXJhbXMgVGhlIHZhbHVlIG9mIHRoZSBjdXJyZW50IHN0YXRlIHBhcmFtZXRlcnMgKCRzdGF0ZVBhcmFtcykuXG4gKiBAcGFyYW0ge09iamVjdH0gbmV3UGFyYW1zIFRoZSBzZXQgb2YgcGFyYW1ldGVycyB3aGljaCB3aWxsIGJlIGNvbXBvc2l0ZWQgd2l0aCBpbmhlcml0ZWQgcGFyYW1zLlxuICogQHBhcmFtIHtPYmplY3R9ICRjdXJyZW50IEludGVybmFsIGRlZmluaXRpb24gb2Ygb2JqZWN0IHJlcHJlc2VudGluZyB0aGUgY3VycmVudCBzdGF0ZS5cbiAqIEBwYXJhbSB7T2JqZWN0fSAkdG8gSW50ZXJuYWwgZGVmaW5pdGlvbiBvZiBvYmplY3QgcmVwcmVzZW50aW5nIHN0YXRlIHRvIHRyYW5zaXRpb24gdG8uXG4gKi9cbmZ1bmN0aW9uIGluaGVyaXRQYXJhbXMoY3VycmVudFBhcmFtcywgbmV3UGFyYW1zLCAkY3VycmVudCwgJHRvKSB7XG4gIHZhciBwYXJlbnRzID0gYW5jZXN0b3JzKCRjdXJyZW50LCAkdG8pLCBwYXJlbnRQYXJhbXMsIGluaGVyaXRlZCA9IHt9LCBpbmhlcml0TGlzdCA9IFtdO1xuXG4gIGZvciAodmFyIGkgaW4gcGFyZW50cykge1xuICAgIGlmICghcGFyZW50c1tpXS5wYXJhbXMpIGNvbnRpbnVlO1xuICAgIHBhcmVudFBhcmFtcyA9IG9iamVjdEtleXMocGFyZW50c1tpXS5wYXJhbXMpO1xuICAgIGlmICghcGFyZW50UGFyYW1zLmxlbmd0aCkgY29udGludWU7XG5cbiAgICBmb3IgKHZhciBqIGluIHBhcmVudFBhcmFtcykge1xuICAgICAgaWYgKGluZGV4T2YoaW5oZXJpdExpc3QsIHBhcmVudFBhcmFtc1tqXSkgPj0gMCkgY29udGludWU7XG4gICAgICBpbmhlcml0TGlzdC5wdXNoKHBhcmVudFBhcmFtc1tqXSk7XG4gICAgICBpbmhlcml0ZWRbcGFyZW50UGFyYW1zW2pdXSA9IGN1cnJlbnRQYXJhbXNbcGFyZW50UGFyYW1zW2pdXTtcbiAgICB9XG4gIH1cbiAgcmV0dXJuIGV4dGVuZCh7fSwgaW5oZXJpdGVkLCBuZXdQYXJhbXMpO1xufVxuXG4vKipcbiAqIFBlcmZvcm1zIGEgbm9uLXN0cmljdCBjb21wYXJpc29uIG9mIHRoZSBzdWJzZXQgb2YgdHdvIG9iamVjdHMsIGRlZmluZWQgYnkgYSBsaXN0IG9mIGtleXMuXG4gKlxuICogQHBhcmFtIHtPYmplY3R9IGEgVGhlIGZpcnN0IG9iamVjdC5cbiAqIEBwYXJhbSB7T2JqZWN0fSBiIFRoZSBzZWNvbmQgb2JqZWN0LlxuICogQHBhcmFtIHtBcnJheX0ga2V5cyBUaGUgbGlzdCBvZiBrZXlzIHdpdGhpbiBlYWNoIG9iamVjdCB0byBjb21wYXJlLiBJZiB0aGUgbGlzdCBpcyBlbXB0eSBvciBub3Qgc3BlY2lmaWVkLFxuICogICAgICAgICAgICAgICAgICAgICBpdCBkZWZhdWx0cyB0byB0aGUgbGlzdCBvZiBrZXlzIGluIGBhYC5cbiAqIEByZXR1cm4ge0Jvb2xlYW59IFJldHVybnMgYHRydWVgIGlmIHRoZSBrZXlzIG1hdGNoLCBvdGhlcndpc2UgYGZhbHNlYC5cbiAqL1xuZnVuY3Rpb24gZXF1YWxGb3JLZXlzKGEsIGIsIGtleXMpIHtcbiAgaWYgKCFrZXlzKSB7XG4gICAga2V5cyA9IFtdO1xuICAgIGZvciAodmFyIG4gaW4gYSkga2V5cy5wdXNoKG4pOyAvLyBVc2VkIGluc3RlYWQgb2YgT2JqZWN0LmtleXMoKSBmb3IgSUU4IGNvbXBhdGliaWxpdHlcbiAgfVxuXG4gIGZvciAodmFyIGk9MDsgaTxrZXlzLmxlbmd0aDsgaSsrKSB7XG4gICAgdmFyIGsgPSBrZXlzW2ldO1xuICAgIGlmIChhW2tdICE9IGJba10pIHJldHVybiBmYWxzZTsgLy8gTm90ICc9PT0nLCB2YWx1ZXMgYXJlbid0IG5lY2Vzc2FyaWx5IG5vcm1hbGl6ZWRcbiAgfVxuICByZXR1cm4gdHJ1ZTtcbn1cblxuLyoqXG4gKiBSZXR1cm5zIHRoZSBzdWJzZXQgb2YgYW4gb2JqZWN0LCBiYXNlZCBvbiBhIGxpc3Qgb2Yga2V5cy5cbiAqXG4gKiBAcGFyYW0ge0FycmF5fSBrZXlzXG4gKiBAcGFyYW0ge09iamVjdH0gdmFsdWVzXG4gKiBAcmV0dXJuIHtCb29sZWFufSBSZXR1cm5zIGEgc3Vic2V0IG9mIGB2YWx1ZXNgLlxuICovXG5mdW5jdGlvbiBmaWx0ZXJCeUtleXMoa2V5cywgdmFsdWVzKSB7XG4gIHZhciBmaWx0ZXJlZCA9IHt9O1xuXG4gIGZvckVhY2goa2V5cywgZnVuY3Rpb24gKG5hbWUpIHtcbiAgICBmaWx0ZXJlZFtuYW1lXSA9IHZhbHVlc1tuYW1lXTtcbiAgfSk7XG4gIHJldHVybiBmaWx0ZXJlZDtcbn1cblxuLy8gbGlrZSBfLmluZGV4Qnlcbi8vIHdoZW4geW91IGtub3cgdGhhdCB5b3VyIGluZGV4IHZhbHVlcyB3aWxsIGJlIHVuaXF1ZSwgb3IgeW91IHdhbnQgbGFzdC1vbmUtaW4gdG8gd2luXG5mdW5jdGlvbiBpbmRleEJ5KGFycmF5LCBwcm9wTmFtZSkge1xuICB2YXIgcmVzdWx0ID0ge307XG4gIGZvckVhY2goYXJyYXksIGZ1bmN0aW9uKGl0ZW0pIHtcbiAgICByZXN1bHRbaXRlbVtwcm9wTmFtZV1dID0gaXRlbTtcbiAgfSk7XG4gIHJldHVybiByZXN1bHQ7XG59XG5cbi8vIGV4dHJhY3RlZCBmcm9tIHVuZGVyc2NvcmUuanNcbi8vIFJldHVybiBhIGNvcHkgb2YgdGhlIG9iamVjdCBvbmx5IGNvbnRhaW5pbmcgdGhlIHdoaXRlbGlzdGVkIHByb3BlcnRpZXMuXG5mdW5jdGlvbiBwaWNrKG9iaikge1xuICB2YXIgY29weSA9IHt9O1xuICB2YXIga2V5cyA9IEFycmF5LnByb3RvdHlwZS5jb25jYXQuYXBwbHkoQXJyYXkucHJvdG90eXBlLCBBcnJheS5wcm90b3R5cGUuc2xpY2UuY2FsbChhcmd1bWVudHMsIDEpKTtcbiAgZm9yRWFjaChrZXlzLCBmdW5jdGlvbihrZXkpIHtcbiAgICBpZiAoa2V5IGluIG9iaikgY29weVtrZXldID0gb2JqW2tleV07XG4gIH0pO1xuICByZXR1cm4gY29weTtcbn1cblxuLy8gZXh0cmFjdGVkIGZyb20gdW5kZXJzY29yZS5qc1xuLy8gUmV0dXJuIGEgY29weSBvZiB0aGUgb2JqZWN0IG9taXR0aW5nIHRoZSBibGFja2xpc3RlZCBwcm9wZXJ0aWVzLlxuZnVuY3Rpb24gb21pdChvYmopIHtcbiAgdmFyIGNvcHkgPSB7fTtcbiAgdmFyIGtleXMgPSBBcnJheS5wcm90b3R5cGUuY29uY2F0LmFwcGx5KEFycmF5LnByb3RvdHlwZSwgQXJyYXkucHJvdG90eXBlLnNsaWNlLmNhbGwoYXJndW1lbnRzLCAxKSk7XG4gIGZvciAodmFyIGtleSBpbiBvYmopIHtcbiAgICBpZiAoaW5kZXhPZihrZXlzLCBrZXkpID09IC0xKSBjb3B5W2tleV0gPSBvYmpba2V5XTtcbiAgfVxuICByZXR1cm4gY29weTtcbn1cblxuZnVuY3Rpb24gcGx1Y2soY29sbGVjdGlvbiwga2V5KSB7XG4gIHZhciByZXN1bHQgPSBpc0FycmF5KGNvbGxlY3Rpb24pID8gW10gOiB7fTtcblxuICBmb3JFYWNoKGNvbGxlY3Rpb24sIGZ1bmN0aW9uKHZhbCwgaSkge1xuICAgIHJlc3VsdFtpXSA9IGlzRnVuY3Rpb24oa2V5KSA/IGtleSh2YWwpIDogdmFsW2tleV07XG4gIH0pO1xuICByZXR1cm4gcmVzdWx0O1xufVxuXG5mdW5jdGlvbiBmaWx0ZXIoY29sbGVjdGlvbiwgY2FsbGJhY2spIHtcbiAgdmFyIGFycmF5ID0gaXNBcnJheShjb2xsZWN0aW9uKTtcbiAgdmFyIHJlc3VsdCA9IGFycmF5ID8gW10gOiB7fTtcbiAgZm9yRWFjaChjb2xsZWN0aW9uLCBmdW5jdGlvbih2YWwsIGkpIHtcbiAgICBpZiAoY2FsbGJhY2sodmFsLCBpKSkge1xuICAgICAgcmVzdWx0W2FycmF5ID8gcmVzdWx0Lmxlbmd0aCA6IGldID0gdmFsO1xuICAgIH1cbiAgfSk7XG4gIHJldHVybiByZXN1bHQ7XG59XG5cbmZ1bmN0aW9uIG1hcChjb2xsZWN0aW9uLCBjYWxsYmFjaykge1xuICB2YXIgcmVzdWx0ID0gaXNBcnJheShjb2xsZWN0aW9uKSA/IFtdIDoge307XG5cbiAgZm9yRWFjaChjb2xsZWN0aW9uLCBmdW5jdGlvbih2YWwsIGkpIHtcbiAgICByZXN1bHRbaV0gPSBjYWxsYmFjayh2YWwsIGkpO1xuICB9KTtcbiAgcmV0dXJuIHJlc3VsdDtcbn1cblxuLyoqXG4gKiBAbmdkb2Mgb3ZlcnZpZXdcbiAqIEBuYW1lIHVpLnJvdXRlci51dGlsXG4gKlxuICogQGRlc2NyaXB0aW9uXG4gKiAjIHVpLnJvdXRlci51dGlsIHN1Yi1tb2R1bGVcbiAqXG4gKiBUaGlzIG1vZHVsZSBpcyBhIGRlcGVuZGVuY3kgb2Ygb3RoZXIgc3ViLW1vZHVsZXMuIERvIG5vdCBpbmNsdWRlIHRoaXMgbW9kdWxlIGFzIGEgZGVwZW5kZW5jeVxuICogaW4geW91ciBhbmd1bGFyIGFwcCAodXNlIHtAbGluayB1aS5yb3V0ZXJ9IG1vZHVsZSBpbnN0ZWFkKS5cbiAqXG4gKi9cbmFuZ3VsYXIubW9kdWxlKCd1aS5yb3V0ZXIudXRpbCcsIFsnbmcnXSk7XG5cbi8qKlxuICogQG5nZG9jIG92ZXJ2aWV3XG4gKiBAbmFtZSB1aS5yb3V0ZXIucm91dGVyXG4gKiBcbiAqIEByZXF1aXJlcyB1aS5yb3V0ZXIudXRpbFxuICpcbiAqIEBkZXNjcmlwdGlvblxuICogIyB1aS5yb3V0ZXIucm91dGVyIHN1Yi1tb2R1bGVcbiAqXG4gKiBUaGlzIG1vZHVsZSBpcyBhIGRlcGVuZGVuY3kgb2Ygb3RoZXIgc3ViLW1vZHVsZXMuIERvIG5vdCBpbmNsdWRlIHRoaXMgbW9kdWxlIGFzIGEgZGVwZW5kZW5jeVxuICogaW4geW91ciBhbmd1bGFyIGFwcCAodXNlIHtAbGluayB1aS5yb3V0ZXJ9IG1vZHVsZSBpbnN0ZWFkKS5cbiAqL1xuYW5ndWxhci5tb2R1bGUoJ3VpLnJvdXRlci5yb3V0ZXInLCBbJ3VpLnJvdXRlci51dGlsJ10pO1xuXG4vKipcbiAqIEBuZ2RvYyBvdmVydmlld1xuICogQG5hbWUgdWkucm91dGVyLnN0YXRlXG4gKiBcbiAqIEByZXF1aXJlcyB1aS5yb3V0ZXIucm91dGVyXG4gKiBAcmVxdWlyZXMgdWkucm91dGVyLnV0aWxcbiAqXG4gKiBAZGVzY3JpcHRpb25cbiAqICMgdWkucm91dGVyLnN0YXRlIHN1Yi1tb2R1bGVcbiAqXG4gKiBUaGlzIG1vZHVsZSBpcyBhIGRlcGVuZGVuY3kgb2YgdGhlIG1haW4gdWkucm91dGVyIG1vZHVsZS4gRG8gbm90IGluY2x1ZGUgdGhpcyBtb2R1bGUgYXMgYSBkZXBlbmRlbmN5XG4gKiBpbiB5b3VyIGFuZ3VsYXIgYXBwICh1c2Uge0BsaW5rIHVpLnJvdXRlcn0gbW9kdWxlIGluc3RlYWQpLlxuICogXG4gKi9cbmFuZ3VsYXIubW9kdWxlKCd1aS5yb3V0ZXIuc3RhdGUnLCBbJ3VpLnJvdXRlci5yb3V0ZXInLCAndWkucm91dGVyLnV0aWwnXSk7XG5cbi8qKlxuICogQG5nZG9jIG92ZXJ2aWV3XG4gKiBAbmFtZSB1aS5yb3V0ZXJcbiAqXG4gKiBAcmVxdWlyZXMgdWkucm91dGVyLnN0YXRlXG4gKlxuICogQGRlc2NyaXB0aW9uXG4gKiAjIHVpLnJvdXRlclxuICogXG4gKiAjIyBUaGUgbWFpbiBtb2R1bGUgZm9yIHVpLnJvdXRlciBcbiAqIFRoZXJlIGFyZSBzZXZlcmFsIHN1Yi1tb2R1bGVzIGluY2x1ZGVkIHdpdGggdGhlIHVpLnJvdXRlciBtb2R1bGUsIGhvd2V2ZXIgb25seSB0aGlzIG1vZHVsZSBpcyBuZWVkZWRcbiAqIGFzIGEgZGVwZW5kZW5jeSB3aXRoaW4geW91ciBhbmd1bGFyIGFwcC4gVGhlIG90aGVyIG1vZHVsZXMgYXJlIGZvciBvcmdhbml6YXRpb24gcHVycG9zZXMuIFxuICpcbiAqIFRoZSBtb2R1bGVzIGFyZTpcbiAqICogdWkucm91dGVyIC0gdGhlIG1haW4gXCJ1bWJyZWxsYVwiIG1vZHVsZVxuICogKiB1aS5yb3V0ZXIucm91dGVyIC0gXG4gKiBcbiAqICpZb3UnbGwgbmVlZCB0byBpbmNsdWRlICoqb25seSoqIHRoaXMgbW9kdWxlIGFzIHRoZSBkZXBlbmRlbmN5IHdpdGhpbiB5b3VyIGFuZ3VsYXIgYXBwLipcbiAqIFxuICogPHByZT5cbiAqIDwhZG9jdHlwZSBodG1sPlxuICogPGh0bWwgbmctYXBwPVwibXlBcHBcIj5cbiAqIDxoZWFkPlxuICogICA8c2NyaXB0IHNyYz1cImpzL2FuZ3VsYXIuanNcIj48L3NjcmlwdD5cbiAqICAgPCEtLSBJbmNsdWRlIHRoZSB1aS1yb3V0ZXIgc2NyaXB0IC0tPlxuICogICA8c2NyaXB0IHNyYz1cImpzL2FuZ3VsYXItdWktcm91dGVyLm1pbi5qc1wiPjwvc2NyaXB0PlxuICogICA8c2NyaXB0PlxuICogICAgIC8vIC4uLmFuZCBhZGQgJ3VpLnJvdXRlcicgYXMgYSBkZXBlbmRlbmN5XG4gKiAgICAgdmFyIG15QXBwID0gYW5ndWxhci5tb2R1bGUoJ215QXBwJywgWyd1aS5yb3V0ZXInXSk7XG4gKiAgIDwvc2NyaXB0PlxuICogPC9oZWFkPlxuICogPGJvZHk+XG4gKiA8L2JvZHk+XG4gKiA8L2h0bWw+XG4gKiA8L3ByZT5cbiAqL1xuYW5ndWxhci5tb2R1bGUoJ3VpLnJvdXRlcicsIFsndWkucm91dGVyLnN0YXRlJ10pO1xuXG5hbmd1bGFyLm1vZHVsZSgndWkucm91dGVyLmNvbXBhdCcsIFsndWkucm91dGVyJ10pO1xuXG4vKipcbiAqIEBuZ2RvYyBvYmplY3RcbiAqIEBuYW1lIHVpLnJvdXRlci51dGlsLiRyZXNvbHZlXG4gKlxuICogQHJlcXVpcmVzICRxXG4gKiBAcmVxdWlyZXMgJGluamVjdG9yXG4gKlxuICogQGRlc2NyaXB0aW9uXG4gKiBNYW5hZ2VzIHJlc29sdXRpb24gb2YgKGFjeWNsaWMpIGdyYXBocyBvZiBwcm9taXNlcy5cbiAqL1xuJFJlc29sdmUuJGluamVjdCA9IFsnJHEnLCAnJGluamVjdG9yJ107XG5mdW5jdGlvbiAkUmVzb2x2ZSggICRxLCAgICAkaW5qZWN0b3IpIHtcbiAgXG4gIHZhciBWSVNJVF9JTl9QUk9HUkVTUyA9IDEsXG4gICAgICBWSVNJVF9ET05FID0gMixcbiAgICAgIE5PVEhJTkcgPSB7fSxcbiAgICAgIE5PX0RFUEVOREVOQ0lFUyA9IFtdLFxuICAgICAgTk9fTE9DQUxTID0gTk9USElORyxcbiAgICAgIE5PX1BBUkVOVCA9IGV4dGVuZCgkcS53aGVuKE5PVEhJTkcpLCB7ICQkcHJvbWlzZXM6IE5PVEhJTkcsICQkdmFsdWVzOiBOT1RISU5HIH0pO1xuICBcblxuICAvKipcbiAgICogQG5nZG9jIGZ1bmN0aW9uXG4gICAqIEBuYW1lIHVpLnJvdXRlci51dGlsLiRyZXNvbHZlI3N0dWR5XG4gICAqIEBtZXRob2RPZiB1aS5yb3V0ZXIudXRpbC4kcmVzb2x2ZVxuICAgKlxuICAgKiBAZGVzY3JpcHRpb25cbiAgICogU3R1ZGllcyBhIHNldCBvZiBpbnZvY2FibGVzIHRoYXQgYXJlIGxpa2VseSB0byBiZSB1c2VkIG11bHRpcGxlIHRpbWVzLlxuICAgKiA8cHJlPlxuICAgKiAkcmVzb2x2ZS5zdHVkeShpbnZvY2FibGVzKShsb2NhbHMsIHBhcmVudCwgc2VsZilcbiAgICogPC9wcmU+XG4gICAqIGlzIGVxdWl2YWxlbnQgdG9cbiAgICogPHByZT5cbiAgICogJHJlc29sdmUucmVzb2x2ZShpbnZvY2FibGVzLCBsb2NhbHMsIHBhcmVudCwgc2VsZilcbiAgICogPC9wcmU+XG4gICAqIGJ1dCB0aGUgZm9ybWVyIGlzIG1vcmUgZWZmaWNpZW50IChpbiBmYWN0IGByZXNvbHZlYCBqdXN0IGNhbGxzIGBzdHVkeWAgXG4gICAqIGludGVybmFsbHkpLlxuICAgKlxuICAgKiBAcGFyYW0ge29iamVjdH0gaW52b2NhYmxlcyBJbnZvY2FibGUgb2JqZWN0c1xuICAgKiBAcmV0dXJuIHtmdW5jdGlvbn0gYSBmdW5jdGlvbiB0byBwYXNzIGluIGxvY2FscywgcGFyZW50IGFuZCBzZWxmXG4gICAqL1xuICB0aGlzLnN0dWR5ID0gZnVuY3Rpb24gKGludm9jYWJsZXMpIHtcbiAgICBpZiAoIWlzT2JqZWN0KGludm9jYWJsZXMpKSB0aHJvdyBuZXcgRXJyb3IoXCInaW52b2NhYmxlcycgbXVzdCBiZSBhbiBvYmplY3RcIik7XG4gICAgdmFyIGludm9jYWJsZUtleXMgPSBvYmplY3RLZXlzKGludm9jYWJsZXMgfHwge30pO1xuICAgIFxuICAgIC8vIFBlcmZvcm0gYSB0b3BvbG9naWNhbCBzb3J0IG9mIGludm9jYWJsZXMgdG8gYnVpbGQgYW4gb3JkZXJlZCBwbGFuXG4gICAgdmFyIHBsYW4gPSBbXSwgY3ljbGUgPSBbXSwgdmlzaXRlZCA9IHt9O1xuICAgIGZ1bmN0aW9uIHZpc2l0KHZhbHVlLCBrZXkpIHtcbiAgICAgIGlmICh2aXNpdGVkW2tleV0gPT09IFZJU0lUX0RPTkUpIHJldHVybjtcbiAgICAgIFxuICAgICAgY3ljbGUucHVzaChrZXkpO1xuICAgICAgaWYgKHZpc2l0ZWRba2V5XSA9PT0gVklTSVRfSU5fUFJPR1JFU1MpIHtcbiAgICAgICAgY3ljbGUuc3BsaWNlKDAsIGluZGV4T2YoY3ljbGUsIGtleSkpO1xuICAgICAgICB0aHJvdyBuZXcgRXJyb3IoXCJDeWNsaWMgZGVwZW5kZW5jeTogXCIgKyBjeWNsZS5qb2luKFwiIC0+IFwiKSk7XG4gICAgICB9XG4gICAgICB2aXNpdGVkW2tleV0gPSBWSVNJVF9JTl9QUk9HUkVTUztcbiAgICAgIFxuICAgICAgaWYgKGlzU3RyaW5nKHZhbHVlKSkge1xuICAgICAgICBwbGFuLnB1c2goa2V5LCBbIGZ1bmN0aW9uKCkgeyByZXR1cm4gJGluamVjdG9yLmdldCh2YWx1ZSk7IH1dLCBOT19ERVBFTkRFTkNJRVMpO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgdmFyIHBhcmFtcyA9ICRpbmplY3Rvci5hbm5vdGF0ZSh2YWx1ZSk7XG4gICAgICAgIGZvckVhY2gocGFyYW1zLCBmdW5jdGlvbiAocGFyYW0pIHtcbiAgICAgICAgICBpZiAocGFyYW0gIT09IGtleSAmJiBpbnZvY2FibGVzLmhhc093blByb3BlcnR5KHBhcmFtKSkgdmlzaXQoaW52b2NhYmxlc1twYXJhbV0sIHBhcmFtKTtcbiAgICAgICAgfSk7XG4gICAgICAgIHBsYW4ucHVzaChrZXksIHZhbHVlLCBwYXJhbXMpO1xuICAgICAgfVxuICAgICAgXG4gICAgICBjeWNsZS5wb3AoKTtcbiAgICAgIHZpc2l0ZWRba2V5XSA9IFZJU0lUX0RPTkU7XG4gICAgfVxuICAgIGZvckVhY2goaW52b2NhYmxlcywgdmlzaXQpO1xuICAgIGludm9jYWJsZXMgPSBjeWNsZSA9IHZpc2l0ZWQgPSBudWxsOyAvLyBwbGFuIGlzIGFsbCB0aGF0J3MgcmVxdWlyZWRcbiAgICBcbiAgICBmdW5jdGlvbiBpc1Jlc29sdmUodmFsdWUpIHtcbiAgICAgIHJldHVybiBpc09iamVjdCh2YWx1ZSkgJiYgdmFsdWUudGhlbiAmJiB2YWx1ZS4kJHByb21pc2VzO1xuICAgIH1cbiAgICBcbiAgICByZXR1cm4gZnVuY3Rpb24gKGxvY2FscywgcGFyZW50LCBzZWxmKSB7XG4gICAgICBpZiAoaXNSZXNvbHZlKGxvY2FscykgJiYgc2VsZiA9PT0gdW5kZWZpbmVkKSB7XG4gICAgICAgIHNlbGYgPSBwYXJlbnQ7IHBhcmVudCA9IGxvY2FsczsgbG9jYWxzID0gbnVsbDtcbiAgICAgIH1cbiAgICAgIGlmICghbG9jYWxzKSBsb2NhbHMgPSBOT19MT0NBTFM7XG4gICAgICBlbHNlIGlmICghaXNPYmplY3QobG9jYWxzKSkge1xuICAgICAgICB0aHJvdyBuZXcgRXJyb3IoXCInbG9jYWxzJyBtdXN0IGJlIGFuIG9iamVjdFwiKTtcbiAgICAgIH0gICAgICAgXG4gICAgICBpZiAoIXBhcmVudCkgcGFyZW50ID0gTk9fUEFSRU5UO1xuICAgICAgZWxzZSBpZiAoIWlzUmVzb2x2ZShwYXJlbnQpKSB7XG4gICAgICAgIHRocm93IG5ldyBFcnJvcihcIidwYXJlbnQnIG11c3QgYmUgYSBwcm9taXNlIHJldHVybmVkIGJ5ICRyZXNvbHZlLnJlc29sdmUoKVwiKTtcbiAgICAgIH1cbiAgICAgIFxuICAgICAgLy8gVG8gY29tcGxldGUgdGhlIG92ZXJhbGwgcmVzb2x1dGlvbiwgd2UgaGF2ZSB0byB3YWl0IGZvciB0aGUgcGFyZW50XG4gICAgICAvLyBwcm9taXNlIGFuZCBmb3IgdGhlIHByb21pc2UgZm9yIGVhY2ggaW52b2thYmxlIGluIG91ciBwbGFuLlxuICAgICAgdmFyIHJlc29sdXRpb24gPSAkcS5kZWZlcigpLFxuICAgICAgICAgIHJlc3VsdCA9IHJlc29sdXRpb24ucHJvbWlzZSxcbiAgICAgICAgICBwcm9taXNlcyA9IHJlc3VsdC4kJHByb21pc2VzID0ge30sXG4gICAgICAgICAgdmFsdWVzID0gZXh0ZW5kKHt9LCBsb2NhbHMpLFxuICAgICAgICAgIHdhaXQgPSAxICsgcGxhbi5sZW5ndGgvMyxcbiAgICAgICAgICBtZXJnZWQgPSBmYWxzZTtcbiAgICAgICAgICBcbiAgICAgIGZ1bmN0aW9uIGRvbmUoKSB7XG4gICAgICAgIC8vIE1lcmdlIHBhcmVudCB2YWx1ZXMgd2UgaGF2ZW4ndCBnb3QgeWV0IGFuZCBwdWJsaXNoIG91ciBvd24gJCR2YWx1ZXNcbiAgICAgICAgaWYgKCEtLXdhaXQpIHtcbiAgICAgICAgICBpZiAoIW1lcmdlZCkgbWVyZ2UodmFsdWVzLCBwYXJlbnQuJCR2YWx1ZXMpOyBcbiAgICAgICAgICByZXN1bHQuJCR2YWx1ZXMgPSB2YWx1ZXM7XG4gICAgICAgICAgcmVzdWx0LiQkcHJvbWlzZXMgPSByZXN1bHQuJCRwcm9taXNlcyB8fCB0cnVlOyAvLyBrZWVwIGZvciBpc1Jlc29sdmUoKVxuICAgICAgICAgIGRlbGV0ZSByZXN1bHQuJCRpbmhlcml0ZWRWYWx1ZXM7XG4gICAgICAgICAgcmVzb2x1dGlvbi5yZXNvbHZlKHZhbHVlcyk7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICAgIFxuICAgICAgZnVuY3Rpb24gZmFpbChyZWFzb24pIHtcbiAgICAgICAgcmVzdWx0LiQkZmFpbHVyZSA9IHJlYXNvbjtcbiAgICAgICAgcmVzb2x1dGlvbi5yZWplY3QocmVhc29uKTtcbiAgICAgIH1cblxuICAgICAgLy8gU2hvcnQtY2lyY3VpdCBpZiBwYXJlbnQgaGFzIGFscmVhZHkgZmFpbGVkXG4gICAgICBpZiAoaXNEZWZpbmVkKHBhcmVudC4kJGZhaWx1cmUpKSB7XG4gICAgICAgIGZhaWwocGFyZW50LiQkZmFpbHVyZSk7XG4gICAgICAgIHJldHVybiByZXN1bHQ7XG4gICAgICB9XG4gICAgICBcbiAgICAgIGlmIChwYXJlbnQuJCRpbmhlcml0ZWRWYWx1ZXMpIHtcbiAgICAgICAgbWVyZ2UodmFsdWVzLCBvbWl0KHBhcmVudC4kJGluaGVyaXRlZFZhbHVlcywgaW52b2NhYmxlS2V5cykpO1xuICAgICAgfVxuXG4gICAgICAvLyBNZXJnZSBwYXJlbnQgdmFsdWVzIGlmIHRoZSBwYXJlbnQgaGFzIGFscmVhZHkgcmVzb2x2ZWQsIG9yIG1lcmdlXG4gICAgICAvLyBwYXJlbnQgcHJvbWlzZXMgYW5kIHdhaXQgaWYgdGhlIHBhcmVudCByZXNvbHZlIGlzIHN0aWxsIGluIHByb2dyZXNzLlxuICAgICAgZXh0ZW5kKHByb21pc2VzLCBwYXJlbnQuJCRwcm9taXNlcyk7XG4gICAgICBpZiAocGFyZW50LiQkdmFsdWVzKSB7XG4gICAgICAgIG1lcmdlZCA9IG1lcmdlKHZhbHVlcywgb21pdChwYXJlbnQuJCR2YWx1ZXMsIGludm9jYWJsZUtleXMpKTtcbiAgICAgICAgcmVzdWx0LiQkaW5oZXJpdGVkVmFsdWVzID0gb21pdChwYXJlbnQuJCR2YWx1ZXMsIGludm9jYWJsZUtleXMpO1xuICAgICAgICBkb25lKCk7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICBpZiAocGFyZW50LiQkaW5oZXJpdGVkVmFsdWVzKSB7XG4gICAgICAgICAgcmVzdWx0LiQkaW5oZXJpdGVkVmFsdWVzID0gb21pdChwYXJlbnQuJCRpbmhlcml0ZWRWYWx1ZXMsIGludm9jYWJsZUtleXMpO1xuICAgICAgICB9ICAgICAgICBcbiAgICAgICAgcGFyZW50LnRoZW4oZG9uZSwgZmFpbCk7XG4gICAgICB9XG4gICAgICBcbiAgICAgIC8vIFByb2Nlc3MgZWFjaCBpbnZvY2FibGUgaW4gdGhlIHBsYW4sIGJ1dCBpZ25vcmUgYW55IHdoZXJlIGEgbG9jYWwgb2YgdGhlIHNhbWUgbmFtZSBleGlzdHMuXG4gICAgICBmb3IgKHZhciBpPTAsIGlpPXBsYW4ubGVuZ3RoOyBpPGlpOyBpKz0zKSB7XG4gICAgICAgIGlmIChsb2NhbHMuaGFzT3duUHJvcGVydHkocGxhbltpXSkpIGRvbmUoKTtcbiAgICAgICAgZWxzZSBpbnZva2UocGxhbltpXSwgcGxhbltpKzFdLCBwbGFuW2krMl0pO1xuICAgICAgfVxuICAgICAgXG4gICAgICBmdW5jdGlvbiBpbnZva2Uoa2V5LCBpbnZvY2FibGUsIHBhcmFtcykge1xuICAgICAgICAvLyBDcmVhdGUgYSBkZWZlcnJlZCBmb3IgdGhpcyBpbnZvY2F0aW9uLiBGYWlsdXJlcyB3aWxsIHByb3BhZ2F0ZSB0byB0aGUgcmVzb2x1dGlvbiBhcyB3ZWxsLlxuICAgICAgICB2YXIgaW52b2NhdGlvbiA9ICRxLmRlZmVyKCksIHdhaXRQYXJhbXMgPSAwO1xuICAgICAgICBmdW5jdGlvbiBvbmZhaWx1cmUocmVhc29uKSB7XG4gICAgICAgICAgaW52b2NhdGlvbi5yZWplY3QocmVhc29uKTtcbiAgICAgICAgICBmYWlsKHJlYXNvbik7XG4gICAgICAgIH1cbiAgICAgICAgLy8gV2FpdCBmb3IgYW55IHBhcmFtZXRlciB0aGF0IHdlIGhhdmUgYSBwcm9taXNlIGZvciAoZWl0aGVyIGZyb20gcGFyZW50IG9yIGZyb20gdGhpc1xuICAgICAgICAvLyByZXNvbHZlOyBpbiB0aGF0IGNhc2Ugc3R1ZHkoKSB3aWxsIGhhdmUgbWFkZSBzdXJlIGl0J3Mgb3JkZXJlZCBiZWZvcmUgdXMgaW4gdGhlIHBsYW4pLlxuICAgICAgICBmb3JFYWNoKHBhcmFtcywgZnVuY3Rpb24gKGRlcCkge1xuICAgICAgICAgIGlmIChwcm9taXNlcy5oYXNPd25Qcm9wZXJ0eShkZXApICYmICFsb2NhbHMuaGFzT3duUHJvcGVydHkoZGVwKSkge1xuICAgICAgICAgICAgd2FpdFBhcmFtcysrO1xuICAgICAgICAgICAgcHJvbWlzZXNbZGVwXS50aGVuKGZ1bmN0aW9uIChyZXN1bHQpIHtcbiAgICAgICAgICAgICAgdmFsdWVzW2RlcF0gPSByZXN1bHQ7XG4gICAgICAgICAgICAgIGlmICghKC0td2FpdFBhcmFtcykpIHByb2NlZWQoKTtcbiAgICAgICAgICAgIH0sIG9uZmFpbHVyZSk7XG4gICAgICAgICAgfVxuICAgICAgICB9KTtcbiAgICAgICAgaWYgKCF3YWl0UGFyYW1zKSBwcm9jZWVkKCk7XG4gICAgICAgIGZ1bmN0aW9uIHByb2NlZWQoKSB7XG4gICAgICAgICAgaWYgKGlzRGVmaW5lZChyZXN1bHQuJCRmYWlsdXJlKSkgcmV0dXJuO1xuICAgICAgICAgIHRyeSB7XG4gICAgICAgICAgICBpbnZvY2F0aW9uLnJlc29sdmUoJGluamVjdG9yLmludm9rZShpbnZvY2FibGUsIHNlbGYsIHZhbHVlcykpO1xuICAgICAgICAgICAgaW52b2NhdGlvbi5wcm9taXNlLnRoZW4oZnVuY3Rpb24gKHJlc3VsdCkge1xuICAgICAgICAgICAgICB2YWx1ZXNba2V5XSA9IHJlc3VsdDtcbiAgICAgICAgICAgICAgZG9uZSgpO1xuICAgICAgICAgICAgfSwgb25mYWlsdXJlKTtcbiAgICAgICAgICB9IGNhdGNoIChlKSB7XG4gICAgICAgICAgICBvbmZhaWx1cmUoZSk7XG4gICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIC8vIFB1Ymxpc2ggcHJvbWlzZSBzeW5jaHJvbm91c2x5OyBpbnZvY2F0aW9ucyBmdXJ0aGVyIGRvd24gaW4gdGhlIHBsYW4gbWF5IGRlcGVuZCBvbiBpdC5cbiAgICAgICAgcHJvbWlzZXNba2V5XSA9IGludm9jYXRpb24ucHJvbWlzZTtcbiAgICAgIH1cbiAgICAgIFxuICAgICAgcmV0dXJuIHJlc3VsdDtcbiAgICB9O1xuICB9O1xuICBcbiAgLyoqXG4gICAqIEBuZ2RvYyBmdW5jdGlvblxuICAgKiBAbmFtZSB1aS5yb3V0ZXIudXRpbC4kcmVzb2x2ZSNyZXNvbHZlXG4gICAqIEBtZXRob2RPZiB1aS5yb3V0ZXIudXRpbC4kcmVzb2x2ZVxuICAgKlxuICAgKiBAZGVzY3JpcHRpb25cbiAgICogUmVzb2x2ZXMgYSBzZXQgb2YgaW52b2NhYmxlcy4gQW4gaW52b2NhYmxlIGlzIGEgZnVuY3Rpb24gdG8gYmUgaW52b2tlZCB2aWEgXG4gICAqIGAkaW5qZWN0b3IuaW52b2tlKClgLCBhbmQgY2FuIGhhdmUgYW4gYXJiaXRyYXJ5IG51bWJlciBvZiBkZXBlbmRlbmNpZXMuIFxuICAgKiBBbiBpbnZvY2FibGUgY2FuIGVpdGhlciByZXR1cm4gYSB2YWx1ZSBkaXJlY3RseSxcbiAgICogb3IgYSBgJHFgIHByb21pc2UuIElmIGEgcHJvbWlzZSBpcyByZXR1cm5lZCBpdCB3aWxsIGJlIHJlc29sdmVkIGFuZCB0aGUgXG4gICAqIHJlc3VsdGluZyB2YWx1ZSB3aWxsIGJlIHVzZWQgaW5zdGVhZC4gRGVwZW5kZW5jaWVzIG9mIGludm9jYWJsZXMgYXJlIHJlc29sdmVkIFxuICAgKiAoaW4gdGhpcyBvcmRlciBvZiBwcmVjZWRlbmNlKVxuICAgKlxuICAgKiAtIGZyb20gdGhlIHNwZWNpZmllZCBgbG9jYWxzYFxuICAgKiAtIGZyb20gYW5vdGhlciBpbnZvY2FibGUgdGhhdCBpcyBwYXJ0IG9mIHRoaXMgYCRyZXNvbHZlYCBjYWxsXG4gICAqIC0gZnJvbSBhbiBpbnZvY2FibGUgdGhhdCBpcyBpbmhlcml0ZWQgZnJvbSBhIGBwYXJlbnRgIGNhbGwgdG8gYCRyZXNvbHZlYCBcbiAgICogICAob3IgcmVjdXJzaXZlbHlcbiAgICogLSBmcm9tIGFueSBhbmNlc3RvciBgJHJlc29sdmVgIG9mIHRoYXQgcGFyZW50KS5cbiAgICpcbiAgICogVGhlIHJldHVybiB2YWx1ZSBvZiBgJHJlc29sdmVgIGlzIGEgcHJvbWlzZSBmb3IgYW4gb2JqZWN0IHRoYXQgY29udGFpbnMgXG4gICAqIChpbiB0aGlzIG9yZGVyIG9mIHByZWNlZGVuY2UpXG4gICAqXG4gICAqIC0gYW55IGBsb2NhbHNgIChpZiBzcGVjaWZpZWQpXG4gICAqIC0gdGhlIHJlc29sdmVkIHJldHVybiB2YWx1ZXMgb2YgYWxsIGluamVjdGFibGVzXG4gICAqIC0gYW55IHZhbHVlcyBpbmhlcml0ZWQgZnJvbSBhIGBwYXJlbnRgIGNhbGwgdG8gYCRyZXNvbHZlYCAoaWYgc3BlY2lmaWVkKVxuICAgKlxuICAgKiBUaGUgcHJvbWlzZSB3aWxsIHJlc29sdmUgYWZ0ZXIgdGhlIGBwYXJlbnRgIHByb21pc2UgKGlmIGFueSkgYW5kIGFsbCBwcm9taXNlcyBcbiAgICogcmV0dXJuZWQgYnkgaW5qZWN0YWJsZXMgaGF2ZSBiZWVuIHJlc29sdmVkLiBJZiBhbnkgaW52b2NhYmxlIFxuICAgKiAob3IgYCRpbmplY3Rvci5pbnZva2VgKSB0aHJvd3MgYW4gZXhjZXB0aW9uLCBvciBpZiBhIHByb21pc2UgcmV0dXJuZWQgYnkgYW4gXG4gICAqIGludm9jYWJsZSBpcyByZWplY3RlZCwgdGhlIGAkcmVzb2x2ZWAgcHJvbWlzZSBpcyBpbW1lZGlhdGVseSByZWplY3RlZCB3aXRoIHRoZSBcbiAgICogc2FtZSBlcnJvci4gQSByZWplY3Rpb24gb2YgYSBgcGFyZW50YCBwcm9taXNlIChpZiBzcGVjaWZpZWQpIHdpbGwgbGlrZXdpc2UgYmUgXG4gICAqIHByb3BhZ2F0ZWQgaW1tZWRpYXRlbHkuIE9uY2UgdGhlIGAkcmVzb2x2ZWAgcHJvbWlzZSBoYXMgYmVlbiByZWplY3RlZCwgbm8gXG4gICAqIGZ1cnRoZXIgaW52b2NhYmxlcyB3aWxsIGJlIGNhbGxlZC5cbiAgICogXG4gICAqIEN5Y2xpYyBkZXBlbmRlbmNpZXMgYmV0d2VlbiBpbnZvY2FibGVzIGFyZSBub3QgcGVybWl0dGVkIGFuZCB3aWxsIGNhdWVzIGAkcmVzb2x2ZWBcbiAgICogdG8gdGhyb3cgYW4gZXJyb3IuIEFzIGEgc3BlY2lhbCBjYXNlLCBhbiBpbmplY3RhYmxlIGNhbiBkZXBlbmQgb24gYSBwYXJhbWV0ZXIgXG4gICAqIHdpdGggdGhlIHNhbWUgbmFtZSBhcyB0aGUgaW5qZWN0YWJsZSwgd2hpY2ggd2lsbCBiZSBmdWxmaWxsZWQgZnJvbSB0aGUgYHBhcmVudGAgXG4gICAqIGluamVjdGFibGUgb2YgdGhlIHNhbWUgbmFtZS4gVGhpcyBhbGxvd3MgaW5oZXJpdGVkIHZhbHVlcyB0byBiZSBkZWNvcmF0ZWQuIFxuICAgKiBOb3RlIHRoYXQgaW4gdGhpcyBjYXNlIGFueSBvdGhlciBpbmplY3RhYmxlIGluIHRoZSBzYW1lIGAkcmVzb2x2ZWAgd2l0aCB0aGUgc2FtZVxuICAgKiBkZXBlbmRlbmN5IHdvdWxkIHNlZSB0aGUgZGVjb3JhdGVkIHZhbHVlLCBub3QgdGhlIGluaGVyaXRlZCB2YWx1ZS5cbiAgICpcbiAgICogTm90ZSB0aGF0IG1pc3NpbmcgZGVwZW5kZW5jaWVzIC0tIHVubGlrZSBjeWNsaWMgZGVwZW5kZW5jaWVzIC0tIHdpbGwgY2F1c2UgYW4gXG4gICAqIChhc3luY2hyb25vdXMpIHJlamVjdGlvbiBvZiB0aGUgYCRyZXNvbHZlYCBwcm9taXNlIHJhdGhlciB0aGFuIGEgKHN5bmNocm9ub3VzKSBcbiAgICogZXhjZXB0aW9uLlxuICAgKlxuICAgKiBJbnZvY2FibGVzIGFyZSBpbnZva2VkIGVhZ2VybHkgYXMgc29vbiBhcyBhbGwgZGVwZW5kZW5jaWVzIGFyZSBhdmFpbGFibGUuIFxuICAgKiBUaGlzIGlzIHRydWUgZXZlbiBmb3IgZGVwZW5kZW5jaWVzIGluaGVyaXRlZCBmcm9tIGEgYHBhcmVudGAgY2FsbCB0byBgJHJlc29sdmVgLlxuICAgKlxuICAgKiBBcyBhIHNwZWNpYWwgY2FzZSwgYW4gaW52b2NhYmxlIGNhbiBiZSBhIHN0cmluZywgaW4gd2hpY2ggY2FzZSBpdCBpcyB0YWtlbiB0byBcbiAgICogYmUgYSBzZXJ2aWNlIG5hbWUgdG8gYmUgcGFzc2VkIHRvIGAkaW5qZWN0b3IuZ2V0KClgLiBUaGlzIGlzIHN1cHBvcnRlZCBwcmltYXJpbHkgXG4gICAqIGZvciBiYWNrd2FyZHMtY29tcGF0aWJpbGl0eSB3aXRoIHRoZSBgcmVzb2x2ZWAgcHJvcGVydHkgb2YgYCRyb3V0ZVByb3ZpZGVyYCBcbiAgICogcm91dGVzLlxuICAgKlxuICAgKiBAcGFyYW0ge29iamVjdH0gaW52b2NhYmxlcyBmdW5jdGlvbnMgdG8gaW52b2tlIG9yIFxuICAgKiBgJGluamVjdG9yYCBzZXJ2aWNlcyB0byBmZXRjaC5cbiAgICogQHBhcmFtIHtvYmplY3R9IGxvY2FscyAgdmFsdWVzIHRvIG1ha2UgYXZhaWxhYmxlIHRvIHRoZSBpbmplY3RhYmxlc1xuICAgKiBAcGFyYW0ge29iamVjdH0gcGFyZW50ICBhIHByb21pc2UgcmV0dXJuZWQgYnkgYW5vdGhlciBjYWxsIHRvIGAkcmVzb2x2ZWAuXG4gICAqIEBwYXJhbSB7b2JqZWN0fSBzZWxmICB0aGUgYHRoaXNgIGZvciB0aGUgaW52b2tlZCBtZXRob2RzXG4gICAqIEByZXR1cm4ge29iamVjdH0gUHJvbWlzZSBmb3IgYW4gb2JqZWN0IHRoYXQgY29udGFpbnMgdGhlIHJlc29sdmVkIHJldHVybiB2YWx1ZVxuICAgKiBvZiBhbGwgaW52b2NhYmxlcywgYXMgd2VsbCBhcyBhbnkgaW5oZXJpdGVkIGFuZCBsb2NhbCB2YWx1ZXMuXG4gICAqL1xuICB0aGlzLnJlc29sdmUgPSBmdW5jdGlvbiAoaW52b2NhYmxlcywgbG9jYWxzLCBwYXJlbnQsIHNlbGYpIHtcbiAgICByZXR1cm4gdGhpcy5zdHVkeShpbnZvY2FibGVzKShsb2NhbHMsIHBhcmVudCwgc2VsZik7XG4gIH07XG59XG5cbmFuZ3VsYXIubW9kdWxlKCd1aS5yb3V0ZXIudXRpbCcpLnNlcnZpY2UoJyRyZXNvbHZlJywgJFJlc29sdmUpO1xuXG5cbi8qKlxuICogQG5nZG9jIG9iamVjdFxuICogQG5hbWUgdWkucm91dGVyLnV0aWwuJHRlbXBsYXRlRmFjdG9yeVxuICpcbiAqIEByZXF1aXJlcyAkaHR0cFxuICogQHJlcXVpcmVzICR0ZW1wbGF0ZUNhY2hlXG4gKiBAcmVxdWlyZXMgJGluamVjdG9yXG4gKlxuICogQGRlc2NyaXB0aW9uXG4gKiBTZXJ2aWNlLiBNYW5hZ2VzIGxvYWRpbmcgb2YgdGVtcGxhdGVzLlxuICovXG4kVGVtcGxhdGVGYWN0b3J5LiRpbmplY3QgPSBbJyRodHRwJywgJyR0ZW1wbGF0ZUNhY2hlJywgJyRpbmplY3RvciddO1xuZnVuY3Rpb24gJFRlbXBsYXRlRmFjdG9yeSggICRodHRwLCAgICR0ZW1wbGF0ZUNhY2hlLCAgICRpbmplY3Rvcikge1xuXG4gIC8qKlxuICAgKiBAbmdkb2MgZnVuY3Rpb25cbiAgICogQG5hbWUgdWkucm91dGVyLnV0aWwuJHRlbXBsYXRlRmFjdG9yeSNmcm9tQ29uZmlnXG4gICAqIEBtZXRob2RPZiB1aS5yb3V0ZXIudXRpbC4kdGVtcGxhdGVGYWN0b3J5XG4gICAqXG4gICAqIEBkZXNjcmlwdGlvblxuICAgKiBDcmVhdGVzIGEgdGVtcGxhdGUgZnJvbSBhIGNvbmZpZ3VyYXRpb24gb2JqZWN0LiBcbiAgICpcbiAgICogQHBhcmFtIHtvYmplY3R9IGNvbmZpZyBDb25maWd1cmF0aW9uIG9iamVjdCBmb3Igd2hpY2ggdG8gbG9hZCBhIHRlbXBsYXRlLiBcbiAgICogVGhlIGZvbGxvd2luZyBwcm9wZXJ0aWVzIGFyZSBzZWFyY2ggaW4gdGhlIHNwZWNpZmllZCBvcmRlciwgYW5kIHRoZSBmaXJzdCBvbmUgXG4gICAqIHRoYXQgaXMgZGVmaW5lZCBpcyB1c2VkIHRvIGNyZWF0ZSB0aGUgdGVtcGxhdGU6XG4gICAqXG4gICAqIEBwYXJhbSB7c3RyaW5nfG9iamVjdH0gY29uZmlnLnRlbXBsYXRlIGh0bWwgc3RyaW5nIHRlbXBsYXRlIG9yIGZ1bmN0aW9uIHRvIFxuICAgKiBsb2FkIHZpYSB7QGxpbmsgdWkucm91dGVyLnV0aWwuJHRlbXBsYXRlRmFjdG9yeSNmcm9tU3RyaW5nIGZyb21TdHJpbmd9LlxuICAgKiBAcGFyYW0ge3N0cmluZ3xvYmplY3R9IGNvbmZpZy50ZW1wbGF0ZVVybCB1cmwgdG8gbG9hZCBvciBhIGZ1bmN0aW9uIHJldHVybmluZyBcbiAgICogdGhlIHVybCB0byBsb2FkIHZpYSB7QGxpbmsgdWkucm91dGVyLnV0aWwuJHRlbXBsYXRlRmFjdG9yeSNmcm9tVXJsIGZyb21Vcmx9LlxuICAgKiBAcGFyYW0ge0Z1bmN0aW9ufSBjb25maWcudGVtcGxhdGVQcm92aWRlciBmdW5jdGlvbiB0byBpbnZva2UgdmlhIFxuICAgKiB7QGxpbmsgdWkucm91dGVyLnV0aWwuJHRlbXBsYXRlRmFjdG9yeSNmcm9tUHJvdmlkZXIgZnJvbVByb3ZpZGVyfS5cbiAgICogQHBhcmFtIHtvYmplY3R9IHBhcmFtcyAgUGFyYW1ldGVycyB0byBwYXNzIHRvIHRoZSB0ZW1wbGF0ZSBmdW5jdGlvbi5cbiAgICogQHBhcmFtIHtvYmplY3R9IGxvY2FscyBMb2NhbHMgdG8gcGFzcyB0byBgaW52b2tlYCBpZiB0aGUgdGVtcGxhdGUgaXMgbG9hZGVkIFxuICAgKiB2aWEgYSBgdGVtcGxhdGVQcm92aWRlcmAuIERlZmF1bHRzIHRvIGB7IHBhcmFtczogcGFyYW1zIH1gLlxuICAgKlxuICAgKiBAcmV0dXJuIHtzdHJpbmd8b2JqZWN0fSAgVGhlIHRlbXBsYXRlIGh0bWwgYXMgYSBzdHJpbmcsIG9yIGEgcHJvbWlzZSBmb3IgXG4gICAqIHRoYXQgc3RyaW5nLG9yIGBudWxsYCBpZiBubyB0ZW1wbGF0ZSBpcyBjb25maWd1cmVkLlxuICAgKi9cbiAgdGhpcy5mcm9tQ29uZmlnID0gZnVuY3Rpb24gKGNvbmZpZywgcGFyYW1zLCBsb2NhbHMpIHtcbiAgICByZXR1cm4gKFxuICAgICAgaXNEZWZpbmVkKGNvbmZpZy50ZW1wbGF0ZSkgPyB0aGlzLmZyb21TdHJpbmcoY29uZmlnLnRlbXBsYXRlLCBwYXJhbXMpIDpcbiAgICAgIGlzRGVmaW5lZChjb25maWcudGVtcGxhdGVVcmwpID8gdGhpcy5mcm9tVXJsKGNvbmZpZy50ZW1wbGF0ZVVybCwgcGFyYW1zKSA6XG4gICAgICBpc0RlZmluZWQoY29uZmlnLnRlbXBsYXRlUHJvdmlkZXIpID8gdGhpcy5mcm9tUHJvdmlkZXIoY29uZmlnLnRlbXBsYXRlUHJvdmlkZXIsIHBhcmFtcywgbG9jYWxzKSA6XG4gICAgICBudWxsXG4gICAgKTtcbiAgfTtcblxuICAvKipcbiAgICogQG5nZG9jIGZ1bmN0aW9uXG4gICAqIEBuYW1lIHVpLnJvdXRlci51dGlsLiR0ZW1wbGF0ZUZhY3RvcnkjZnJvbVN0cmluZ1xuICAgKiBAbWV0aG9kT2YgdWkucm91dGVyLnV0aWwuJHRlbXBsYXRlRmFjdG9yeVxuICAgKlxuICAgKiBAZGVzY3JpcHRpb25cbiAgICogQ3JlYXRlcyBhIHRlbXBsYXRlIGZyb20gYSBzdHJpbmcgb3IgYSBmdW5jdGlvbiByZXR1cm5pbmcgYSBzdHJpbmcuXG4gICAqXG4gICAqIEBwYXJhbSB7c3RyaW5nfG9iamVjdH0gdGVtcGxhdGUgaHRtbCB0ZW1wbGF0ZSBhcyBhIHN0cmluZyBvciBmdW5jdGlvbiB0aGF0IFxuICAgKiByZXR1cm5zIGFuIGh0bWwgdGVtcGxhdGUgYXMgYSBzdHJpbmcuXG4gICAqIEBwYXJhbSB7b2JqZWN0fSBwYXJhbXMgUGFyYW1ldGVycyB0byBwYXNzIHRvIHRoZSB0ZW1wbGF0ZSBmdW5jdGlvbi5cbiAgICpcbiAgICogQHJldHVybiB7c3RyaW5nfG9iamVjdH0gVGhlIHRlbXBsYXRlIGh0bWwgYXMgYSBzdHJpbmcsIG9yIGEgcHJvbWlzZSBmb3IgdGhhdCBcbiAgICogc3RyaW5nLlxuICAgKi9cbiAgdGhpcy5mcm9tU3RyaW5nID0gZnVuY3Rpb24gKHRlbXBsYXRlLCBwYXJhbXMpIHtcbiAgICByZXR1cm4gaXNGdW5jdGlvbih0ZW1wbGF0ZSkgPyB0ZW1wbGF0ZShwYXJhbXMpIDogdGVtcGxhdGU7XG4gIH07XG5cbiAgLyoqXG4gICAqIEBuZ2RvYyBmdW5jdGlvblxuICAgKiBAbmFtZSB1aS5yb3V0ZXIudXRpbC4kdGVtcGxhdGVGYWN0b3J5I2Zyb21VcmxcbiAgICogQG1ldGhvZE9mIHVpLnJvdXRlci51dGlsLiR0ZW1wbGF0ZUZhY3RvcnlcbiAgICogXG4gICAqIEBkZXNjcmlwdGlvblxuICAgKiBMb2FkcyBhIHRlbXBsYXRlIGZyb20gdGhlIGEgVVJMIHZpYSBgJGh0dHBgIGFuZCBgJHRlbXBsYXRlQ2FjaGVgLlxuICAgKlxuICAgKiBAcGFyYW0ge3N0cmluZ3xGdW5jdGlvbn0gdXJsIHVybCBvZiB0aGUgdGVtcGxhdGUgdG8gbG9hZCwgb3IgYSBmdW5jdGlvbiBcbiAgICogdGhhdCByZXR1cm5zIGEgdXJsLlxuICAgKiBAcGFyYW0ge09iamVjdH0gcGFyYW1zIFBhcmFtZXRlcnMgdG8gcGFzcyB0byB0aGUgdXJsIGZ1bmN0aW9uLlxuICAgKiBAcmV0dXJuIHtzdHJpbmd8UHJvbWlzZS48c3RyaW5nPn0gVGhlIHRlbXBsYXRlIGh0bWwgYXMgYSBzdHJpbmcsIG9yIGEgcHJvbWlzZSBcbiAgICogZm9yIHRoYXQgc3RyaW5nLlxuICAgKi9cbiAgdGhpcy5mcm9tVXJsID0gZnVuY3Rpb24gKHVybCwgcGFyYW1zKSB7XG4gICAgaWYgKGlzRnVuY3Rpb24odXJsKSkgdXJsID0gdXJsKHBhcmFtcyk7XG4gICAgaWYgKHVybCA9PSBudWxsKSByZXR1cm4gbnVsbDtcbiAgICBlbHNlIHJldHVybiAkaHR0cFxuICAgICAgICAuZ2V0KHVybCwgeyBjYWNoZTogJHRlbXBsYXRlQ2FjaGUsIGhlYWRlcnM6IHsgQWNjZXB0OiAndGV4dC9odG1sJyB9fSlcbiAgICAgICAgLnRoZW4oZnVuY3Rpb24ocmVzcG9uc2UpIHsgcmV0dXJuIHJlc3BvbnNlLmRhdGE7IH0pO1xuICB9O1xuXG4gIC8qKlxuICAgKiBAbmdkb2MgZnVuY3Rpb25cbiAgICogQG5hbWUgdWkucm91dGVyLnV0aWwuJHRlbXBsYXRlRmFjdG9yeSNmcm9tUHJvdmlkZXJcbiAgICogQG1ldGhvZE9mIHVpLnJvdXRlci51dGlsLiR0ZW1wbGF0ZUZhY3RvcnlcbiAgICpcbiAgICogQGRlc2NyaXB0aW9uXG4gICAqIENyZWF0ZXMgYSB0ZW1wbGF0ZSBieSBpbnZva2luZyBhbiBpbmplY3RhYmxlIHByb3ZpZGVyIGZ1bmN0aW9uLlxuICAgKlxuICAgKiBAcGFyYW0ge0Z1bmN0aW9ufSBwcm92aWRlciBGdW5jdGlvbiB0byBpbnZva2UgdmlhIGAkaW5qZWN0b3IuaW52b2tlYFxuICAgKiBAcGFyYW0ge09iamVjdH0gcGFyYW1zIFBhcmFtZXRlcnMgZm9yIHRoZSB0ZW1wbGF0ZS5cbiAgICogQHBhcmFtIHtPYmplY3R9IGxvY2FscyBMb2NhbHMgdG8gcGFzcyB0byBgaW52b2tlYC4gRGVmYXVsdHMgdG8gXG4gICAqIGB7IHBhcmFtczogcGFyYW1zIH1gLlxuICAgKiBAcmV0dXJuIHtzdHJpbmd8UHJvbWlzZS48c3RyaW5nPn0gVGhlIHRlbXBsYXRlIGh0bWwgYXMgYSBzdHJpbmcsIG9yIGEgcHJvbWlzZSBcbiAgICogZm9yIHRoYXQgc3RyaW5nLlxuICAgKi9cbiAgdGhpcy5mcm9tUHJvdmlkZXIgPSBmdW5jdGlvbiAocHJvdmlkZXIsIHBhcmFtcywgbG9jYWxzKSB7XG4gICAgcmV0dXJuICRpbmplY3Rvci5pbnZva2UocHJvdmlkZXIsIG51bGwsIGxvY2FscyB8fCB7IHBhcmFtczogcGFyYW1zIH0pO1xuICB9O1xufVxuXG5hbmd1bGFyLm1vZHVsZSgndWkucm91dGVyLnV0aWwnKS5zZXJ2aWNlKCckdGVtcGxhdGVGYWN0b3J5JywgJFRlbXBsYXRlRmFjdG9yeSk7XG5cbnZhciAkJFVNRlA7IC8vIHJlZmVyZW5jZSB0byAkVXJsTWF0Y2hlckZhY3RvcnlQcm92aWRlclxuXG4vKipcbiAqIEBuZ2RvYyBvYmplY3RcbiAqIEBuYW1lIHVpLnJvdXRlci51dGlsLnR5cGU6VXJsTWF0Y2hlclxuICpcbiAqIEBkZXNjcmlwdGlvblxuICogTWF0Y2hlcyBVUkxzIGFnYWluc3QgcGF0dGVybnMgYW5kIGV4dHJhY3RzIG5hbWVkIHBhcmFtZXRlcnMgZnJvbSB0aGUgcGF0aCBvciB0aGUgc2VhcmNoXG4gKiBwYXJ0IG9mIHRoZSBVUkwuIEEgVVJMIHBhdHRlcm4gY29uc2lzdHMgb2YgYSBwYXRoIHBhdHRlcm4sIG9wdGlvbmFsbHkgZm9sbG93ZWQgYnkgJz8nIGFuZCBhIGxpc3RcbiAqIG9mIHNlYXJjaCBwYXJhbWV0ZXJzLiBNdWx0aXBsZSBzZWFyY2ggcGFyYW1ldGVyIG5hbWVzIGFyZSBzZXBhcmF0ZWQgYnkgJyYnLiBTZWFyY2ggcGFyYW1ldGVyc1xuICogZG8gbm90IGluZmx1ZW5jZSB3aGV0aGVyIG9yIG5vdCBhIFVSTCBpcyBtYXRjaGVkLCBidXQgdGhlaXIgdmFsdWVzIGFyZSBwYXNzZWQgdGhyb3VnaCBpbnRvXG4gKiB0aGUgbWF0Y2hlZCBwYXJhbWV0ZXJzIHJldHVybmVkIGJ5IHtAbGluayB1aS5yb3V0ZXIudXRpbC50eXBlOlVybE1hdGNoZXIjbWV0aG9kc19leGVjIGV4ZWN9LlxuICpcbiAqIFBhdGggcGFyYW1ldGVyIHBsYWNlaG9sZGVycyBjYW4gYmUgc3BlY2lmaWVkIHVzaW5nIHNpbXBsZSBjb2xvbi9jYXRjaC1hbGwgc3ludGF4IG9yIGN1cmx5IGJyYWNlXG4gKiBzeW50YXgsIHdoaWNoIG9wdGlvbmFsbHkgYWxsb3dzIGEgcmVndWxhciBleHByZXNzaW9uIGZvciB0aGUgcGFyYW1ldGVyIHRvIGJlIHNwZWNpZmllZDpcbiAqXG4gKiAqIGAnOidgIG5hbWUgLSBjb2xvbiBwbGFjZWhvbGRlclxuICogKiBgJyonYCBuYW1lIC0gY2F0Y2gtYWxsIHBsYWNlaG9sZGVyXG4gKiAqIGAneycgbmFtZSAnfSdgIC0gY3VybHkgcGxhY2Vob2xkZXJcbiAqICogYCd7JyBuYW1lICc6JyByZWdleHB8dHlwZSAnfSdgIC0gY3VybHkgcGxhY2Vob2xkZXIgd2l0aCByZWdleHAgb3IgdHlwZSBuYW1lLiBTaG91bGQgdGhlXG4gKiAgIHJlZ2V4cCBpdHNlbGYgY29udGFpbiBjdXJseSBicmFjZXMsIHRoZXkgbXVzdCBiZSBpbiBtYXRjaGVkIHBhaXJzIG9yIGVzY2FwZWQgd2l0aCBhIGJhY2tzbGFzaC5cbiAqXG4gKiBQYXJhbWV0ZXIgbmFtZXMgbWF5IGNvbnRhaW4gb25seSB3b3JkIGNoYXJhY3RlcnMgKGxhdGluIGxldHRlcnMsIGRpZ2l0cywgYW5kIHVuZGVyc2NvcmUpIGFuZFxuICogbXVzdCBiZSB1bmlxdWUgd2l0aGluIHRoZSBwYXR0ZXJuIChhY3Jvc3MgYm90aCBwYXRoIGFuZCBzZWFyY2ggcGFyYW1ldGVycykuIEZvciBjb2xvblxuICogcGxhY2Vob2xkZXJzIG9yIGN1cmx5IHBsYWNlaG9sZGVycyB3aXRob3V0IGFuIGV4cGxpY2l0IHJlZ2V4cCwgYSBwYXRoIHBhcmFtZXRlciBtYXRjaGVzIGFueVxuICogbnVtYmVyIG9mIGNoYXJhY3RlcnMgb3RoZXIgdGhhbiAnLycuIEZvciBjYXRjaC1hbGwgcGxhY2Vob2xkZXJzIHRoZSBwYXRoIHBhcmFtZXRlciBtYXRjaGVzXG4gKiBhbnkgbnVtYmVyIG9mIGNoYXJhY3RlcnMuXG4gKlxuICogRXhhbXBsZXM6XG4gKlxuICogKiBgJy9oZWxsby8nYCAtIE1hdGNoZXMgb25seSBpZiB0aGUgcGF0aCBpcyBleGFjdGx5ICcvaGVsbG8vJy4gVGhlcmUgaXMgbm8gc3BlY2lhbCB0cmVhdG1lbnQgZm9yXG4gKiAgIHRyYWlsaW5nIHNsYXNoZXMsIGFuZCBwYXR0ZXJucyBoYXZlIHRvIG1hdGNoIHRoZSBlbnRpcmUgcGF0aCwgbm90IGp1c3QgYSBwcmVmaXguXG4gKiAqIGAnL3VzZXIvOmlkJ2AgLSBNYXRjaGVzICcvdXNlci9ib2InIG9yICcvdXNlci8xMjM0ISEhJyBvciBldmVuICcvdXNlci8nIGJ1dCBub3QgJy91c2VyJyBvclxuICogICAnL3VzZXIvYm9iL2RldGFpbHMnLiBUaGUgc2Vjb25kIHBhdGggc2VnbWVudCB3aWxsIGJlIGNhcHR1cmVkIGFzIHRoZSBwYXJhbWV0ZXIgJ2lkJy5cbiAqICogYCcvdXNlci97aWR9J2AgLSBTYW1lIGFzIHRoZSBwcmV2aW91cyBleGFtcGxlLCBidXQgdXNpbmcgY3VybHkgYnJhY2Ugc3ludGF4LlxuICogKiBgJy91c2VyL3tpZDpbXi9dKn0nYCAtIFNhbWUgYXMgdGhlIHByZXZpb3VzIGV4YW1wbGUuXG4gKiAqIGAnL3VzZXIve2lkOlswLTlhLWZBLUZdezEsOH19J2AgLSBTaW1pbGFyIHRvIHRoZSBwcmV2aW91cyBleGFtcGxlLCBidXQgb25seSBtYXRjaGVzIGlmIHRoZSBpZFxuICogICBwYXJhbWV0ZXIgY29uc2lzdHMgb2YgMSB0byA4IGhleCBkaWdpdHMuXG4gKiAqIGAnL2ZpbGVzL3twYXRoOi4qfSdgIC0gTWF0Y2hlcyBhbnkgVVJMIHN0YXJ0aW5nIHdpdGggJy9maWxlcy8nIGFuZCBjYXB0dXJlcyB0aGUgcmVzdCBvZiB0aGVcbiAqICAgcGF0aCBpbnRvIHRoZSBwYXJhbWV0ZXIgJ3BhdGgnLlxuICogKiBgJy9maWxlcy8qcGF0aCdgIC0gZGl0dG8uXG4gKiAqIGAnL2NhbGVuZGFyL3tzdGFydDpkYXRlfSdgIC0gTWF0Y2hlcyBcIi9jYWxlbmRhci8yMDE0LTExLTEyXCIgKGJlY2F1c2UgdGhlIHBhdHRlcm4gZGVmaW5lZFxuICogICBpbiB0aGUgYnVpbHQtaW4gIGBkYXRlYCBUeXBlIG1hdGNoZXMgYDIwMTQtMTEtMTJgKSBhbmQgcHJvdmlkZXMgYSBEYXRlIG9iamVjdCBpbiAkc3RhdGVQYXJhbXMuc3RhcnRcbiAqXG4gKiBAcGFyYW0ge3N0cmluZ30gcGF0dGVybiAgVGhlIHBhdHRlcm4gdG8gY29tcGlsZSBpbnRvIGEgbWF0Y2hlci5cbiAqIEBwYXJhbSB7T2JqZWN0fSBjb25maWcgIEEgY29uZmlndXJhdGlvbiBvYmplY3QgaGFzaDpcbiAqIEBwYXJhbSB7T2JqZWN0PX0gcGFyZW50TWF0Y2hlciBVc2VkIHRvIGNvbmNhdGVuYXRlIHRoZSBwYXR0ZXJuL2NvbmZpZyBvbnRvXG4gKiAgIGFuIGV4aXN0aW5nIFVybE1hdGNoZXJcbiAqXG4gKiAqIGBjYXNlSW5zZW5zaXRpdmVgIC0gYHRydWVgIGlmIFVSTCBtYXRjaGluZyBzaG91bGQgYmUgY2FzZSBpbnNlbnNpdGl2ZSwgb3RoZXJ3aXNlIGBmYWxzZWAsIHRoZSBkZWZhdWx0IHZhbHVlIChmb3IgYmFja3dhcmQgY29tcGF0aWJpbGl0eSkgaXMgYGZhbHNlYC5cbiAqICogYHN0cmljdGAgLSBgZmFsc2VgIGlmIG1hdGNoaW5nIGFnYWluc3QgYSBVUkwgd2l0aCBhIHRyYWlsaW5nIHNsYXNoIHNob3VsZCBiZSB0cmVhdGVkIGFzIGVxdWl2YWxlbnQgdG8gYSBVUkwgd2l0aG91dCBhIHRyYWlsaW5nIHNsYXNoLCB0aGUgZGVmYXVsdCB2YWx1ZSBpcyBgdHJ1ZWAuXG4gKlxuICogQHByb3BlcnR5IHtzdHJpbmd9IHByZWZpeCAgQSBzdGF0aWMgcHJlZml4IG9mIHRoaXMgcGF0dGVybi4gVGhlIG1hdGNoZXIgZ3VhcmFudGVlcyB0aGF0IGFueVxuICogICBVUkwgbWF0Y2hpbmcgdGhpcyBtYXRjaGVyIChpLmUuIGFueSBzdHJpbmcgZm9yIHdoaWNoIHtAbGluayB1aS5yb3V0ZXIudXRpbC50eXBlOlVybE1hdGNoZXIjbWV0aG9kc19leGVjIGV4ZWMoKX0gcmV0dXJuc1xuICogICBub24tbnVsbCkgd2lsbCBzdGFydCB3aXRoIHRoaXMgcHJlZml4LlxuICpcbiAqIEBwcm9wZXJ0eSB7c3RyaW5nfSBzb3VyY2UgIFRoZSBwYXR0ZXJuIHRoYXQgd2FzIHBhc3NlZCBpbnRvIHRoZSBjb25zdHJ1Y3RvclxuICpcbiAqIEBwcm9wZXJ0eSB7c3RyaW5nfSBzb3VyY2VQYXRoICBUaGUgcGF0aCBwb3J0aW9uIG9mIHRoZSBzb3VyY2UgcHJvcGVydHlcbiAqXG4gKiBAcHJvcGVydHkge3N0cmluZ30gc291cmNlU2VhcmNoICBUaGUgc2VhcmNoIHBvcnRpb24gb2YgdGhlIHNvdXJjZSBwcm9wZXJ0eVxuICpcbiAqIEBwcm9wZXJ0eSB7c3RyaW5nfSByZWdleCAgVGhlIGNvbnN0cnVjdGVkIHJlZ2V4IHRoYXQgd2lsbCBiZSB1c2VkIHRvIG1hdGNoIGFnYWluc3QgdGhlIHVybCB3aGVuXG4gKiAgIGl0IGlzIHRpbWUgdG8gZGV0ZXJtaW5lIHdoaWNoIHVybCB3aWxsIG1hdGNoLlxuICpcbiAqIEByZXR1cm5zIHtPYmplY3R9ICBOZXcgYFVybE1hdGNoZXJgIG9iamVjdFxuICovXG5mdW5jdGlvbiBVcmxNYXRjaGVyKHBhdHRlcm4sIGNvbmZpZywgcGFyZW50TWF0Y2hlcikge1xuICBjb25maWcgPSBleHRlbmQoeyBwYXJhbXM6IHt9IH0sIGlzT2JqZWN0KGNvbmZpZykgPyBjb25maWcgOiB7fSk7XG5cbiAgLy8gRmluZCBhbGwgcGxhY2Vob2xkZXJzIGFuZCBjcmVhdGUgYSBjb21waWxlZCBwYXR0ZXJuLCB1c2luZyBlaXRoZXIgY2xhc3NpYyBvciBjdXJseSBzeW50YXg6XG4gIC8vICAgJyonIG5hbWVcbiAgLy8gICAnOicgbmFtZVxuICAvLyAgICd7JyBuYW1lICd9J1xuICAvLyAgICd7JyBuYW1lICc6JyByZWdleHAgJ30nXG4gIC8vIFRoZSByZWd1bGFyIGV4cHJlc3Npb24gaXMgc29tZXdoYXQgY29tcGxpY2F0ZWQgZHVlIHRvIHRoZSBuZWVkIHRvIGFsbG93IGN1cmx5IGJyYWNlc1xuICAvLyBpbnNpZGUgdGhlIHJlZ3VsYXIgZXhwcmVzc2lvbi4gVGhlIHBsYWNlaG9sZGVyIHJlZ2V4cCBicmVha3MgZG93biBhcyBmb2xsb3dzOlxuICAvLyAgICAoWzoqXSkoW1xcd1xcW1xcXV0rKSAgICAgICAgICAgICAgLSBjbGFzc2ljIHBsYWNlaG9sZGVyICgkMSAvICQyKSAoc2VhcmNoIHZlcnNpb24gaGFzIC0gZm9yIHNuYWtlLWNhc2UpXG4gIC8vICAgIFxceyhbXFx3XFxbXFxdXSspKD86XFw6KCAuLi4gKSk/XFx9ICAtIGN1cmx5IGJyYWNlIHBsYWNlaG9sZGVyICgkMykgd2l0aCBvcHRpb25hbCByZWdleHAvdHlwZSAuLi4gKCQ0KSAoc2VhcmNoIHZlcnNpb24gaGFzIC0gZm9yIHNuYWtlLWNhc2VcbiAgLy8gICAgKD86IC4uLiB8IC4uLiB8IC4uLiApKyAgICAgICAgIC0gdGhlIHJlZ2V4cCBjb25zaXN0cyBvZiBhbnkgbnVtYmVyIG9mIGF0b21zLCBhbiBhdG9tIGJlaW5nIGVpdGhlclxuICAvLyAgICBbXnt9XFxcXF0rICAgICAgICAgICAgICAgICAgICAgICAtIGFueXRoaW5nIG90aGVyIHRoYW4gY3VybHkgYnJhY2VzIG9yIGJhY2tzbGFzaFxuICAvLyAgICBcXFxcLiAgICAgICAgICAgICAgICAgICAgICAgICAgICAtIGEgYmFja3NsYXNoIGVzY2FwZVxuICAvLyAgICBcXHsoPzpbXnt9XFxcXF0rfFxcXFwuKSpcXH0gICAgICAgICAgLSBhIG1hdGNoZWQgc2V0IG9mIGN1cmx5IGJyYWNlcyBjb250YWluaW5nIG90aGVyIGF0b21zXG4gIHZhciBwbGFjZWhvbGRlciAgICAgICA9IC8oWzoqXSkoW1xcd1xcW1xcXV0rKXxcXHsoW1xcd1xcW1xcXV0rKSg/OlxcOigoPzpbXnt9XFxcXF0rfFxcXFwufFxceyg/Oltee31cXFxcXSt8XFxcXC4pKlxcfSkrKSk/XFx9L2csXG4gICAgICBzZWFyY2hQbGFjZWhvbGRlciA9IC8oWzpdPykoW1xcd1xcW1xcXS1dKyl8XFx7KFtcXHdcXFtcXF0tXSspKD86XFw6KCg/Oltee31cXFxcXSt8XFxcXC58XFx7KD86W157fVxcXFxdK3xcXFxcLikqXFx9KSspKT9cXH0vZyxcbiAgICAgIGNvbXBpbGVkID0gJ14nLCBsYXN0ID0gMCwgbSxcbiAgICAgIHNlZ21lbnRzID0gdGhpcy5zZWdtZW50cyA9IFtdLFxuICAgICAgcGFyZW50UGFyYW1zID0gcGFyZW50TWF0Y2hlciA/IHBhcmVudE1hdGNoZXIucGFyYW1zIDoge30sXG4gICAgICBwYXJhbXMgPSB0aGlzLnBhcmFtcyA9IHBhcmVudE1hdGNoZXIgPyBwYXJlbnRNYXRjaGVyLnBhcmFtcy4kJG5ldygpIDogbmV3ICQkVU1GUC5QYXJhbVNldCgpLFxuICAgICAgcGFyYW1OYW1lcyA9IFtdO1xuXG4gIGZ1bmN0aW9uIGFkZFBhcmFtZXRlcihpZCwgdHlwZSwgY29uZmlnLCBsb2NhdGlvbikge1xuICAgIHBhcmFtTmFtZXMucHVzaChpZCk7XG4gICAgaWYgKHBhcmVudFBhcmFtc1tpZF0pIHJldHVybiBwYXJlbnRQYXJhbXNbaWRdO1xuICAgIGlmICghL15cXHcrKC0rXFx3KykqKD86XFxbXFxdKT8kLy50ZXN0KGlkKSkgdGhyb3cgbmV3IEVycm9yKFwiSW52YWxpZCBwYXJhbWV0ZXIgbmFtZSAnXCIgKyBpZCArIFwiJyBpbiBwYXR0ZXJuICdcIiArIHBhdHRlcm4gKyBcIidcIik7XG4gICAgaWYgKHBhcmFtc1tpZF0pIHRocm93IG5ldyBFcnJvcihcIkR1cGxpY2F0ZSBwYXJhbWV0ZXIgbmFtZSAnXCIgKyBpZCArIFwiJyBpbiBwYXR0ZXJuICdcIiArIHBhdHRlcm4gKyBcIidcIik7XG4gICAgcGFyYW1zW2lkXSA9IG5ldyAkJFVNRlAuUGFyYW0oaWQsIHR5cGUsIGNvbmZpZywgbG9jYXRpb24pO1xuICAgIHJldHVybiBwYXJhbXNbaWRdO1xuICB9XG5cbiAgZnVuY3Rpb24gcXVvdGVSZWdFeHAoc3RyaW5nLCBwYXR0ZXJuLCBzcXVhc2gsIG9wdGlvbmFsKSB7XG4gICAgdmFyIHN1cnJvdW5kUGF0dGVybiA9IFsnJywnJ10sIHJlc3VsdCA9IHN0cmluZy5yZXBsYWNlKC9bXFxcXFxcW1xcXVxcXiQqKz8uKCl8e31dL2csIFwiXFxcXCQmXCIpO1xuICAgIGlmICghcGF0dGVybikgcmV0dXJuIHJlc3VsdDtcbiAgICBzd2l0Y2goc3F1YXNoKSB7XG4gICAgICBjYXNlIGZhbHNlOiBzdXJyb3VuZFBhdHRlcm4gPSBbJygnLCAnKScgKyAob3B0aW9uYWwgPyBcIj9cIiA6IFwiXCIpXTsgYnJlYWs7XG4gICAgICBjYXNlIHRydWU6ICBzdXJyb3VuZFBhdHRlcm4gPSBbJz8oJywgJyk/J107IGJyZWFrO1xuICAgICAgZGVmYXVsdDogICAgc3Vycm91bmRQYXR0ZXJuID0gWycoJyArIHNxdWFzaCArIFwifFwiLCAnKT8nXTsgYnJlYWs7XG4gICAgfVxuICAgIHJldHVybiByZXN1bHQgKyBzdXJyb3VuZFBhdHRlcm5bMF0gKyBwYXR0ZXJuICsgc3Vycm91bmRQYXR0ZXJuWzFdO1xuICB9XG5cbiAgdGhpcy5zb3VyY2UgPSBwYXR0ZXJuO1xuXG4gIC8vIFNwbGl0IGludG8gc3RhdGljIHNlZ21lbnRzIHNlcGFyYXRlZCBieSBwYXRoIHBhcmFtZXRlciBwbGFjZWhvbGRlcnMuXG4gIC8vIFRoZSBudW1iZXIgb2Ygc2VnbWVudHMgaXMgYWx3YXlzIDEgbW9yZSB0aGFuIHRoZSBudW1iZXIgb2YgcGFyYW1ldGVycy5cbiAgZnVuY3Rpb24gbWF0Y2hEZXRhaWxzKG0sIGlzU2VhcmNoKSB7XG4gICAgdmFyIGlkLCByZWdleHAsIHNlZ21lbnQsIHR5cGUsIGNmZywgYXJyYXlNb2RlO1xuICAgIGlkICAgICAgICAgID0gbVsyXSB8fCBtWzNdOyAvLyBJRVs3OF0gcmV0dXJucyAnJyBmb3IgdW5tYXRjaGVkIGdyb3VwcyBpbnN0ZWFkIG9mIG51bGxcbiAgICBjZmcgICAgICAgICA9IGNvbmZpZy5wYXJhbXNbaWRdO1xuICAgIHNlZ21lbnQgICAgID0gcGF0dGVybi5zdWJzdHJpbmcobGFzdCwgbS5pbmRleCk7XG4gICAgcmVnZXhwICAgICAgPSBpc1NlYXJjaCA/IG1bNF0gOiBtWzRdIHx8IChtWzFdID09ICcqJyA/ICcuKicgOiBudWxsKTtcbiAgICB0eXBlICAgICAgICA9ICQkVU1GUC50eXBlKHJlZ2V4cCB8fCBcInN0cmluZ1wiKSB8fCBpbmhlcml0KCQkVU1GUC50eXBlKFwic3RyaW5nXCIpLCB7IHBhdHRlcm46IG5ldyBSZWdFeHAocmVnZXhwLCBjb25maWcuY2FzZUluc2Vuc2l0aXZlID8gJ2knIDogdW5kZWZpbmVkKSB9KTtcbiAgICByZXR1cm4ge1xuICAgICAgaWQ6IGlkLCByZWdleHA6IHJlZ2V4cCwgc2VnbWVudDogc2VnbWVudCwgdHlwZTogdHlwZSwgY2ZnOiBjZmdcbiAgICB9O1xuICB9XG5cbiAgdmFyIHAsIHBhcmFtLCBzZWdtZW50O1xuICB3aGlsZSAoKG0gPSBwbGFjZWhvbGRlci5leGVjKHBhdHRlcm4pKSkge1xuICAgIHAgPSBtYXRjaERldGFpbHMobSwgZmFsc2UpO1xuICAgIGlmIChwLnNlZ21lbnQuaW5kZXhPZignPycpID49IDApIGJyZWFrOyAvLyB3ZSdyZSBpbnRvIHRoZSBzZWFyY2ggcGFydFxuXG4gICAgcGFyYW0gPSBhZGRQYXJhbWV0ZXIocC5pZCwgcC50eXBlLCBwLmNmZywgXCJwYXRoXCIpO1xuICAgIGNvbXBpbGVkICs9IHF1b3RlUmVnRXhwKHAuc2VnbWVudCwgcGFyYW0udHlwZS5wYXR0ZXJuLnNvdXJjZSwgcGFyYW0uc3F1YXNoLCBwYXJhbS5pc09wdGlvbmFsKTtcbiAgICBzZWdtZW50cy5wdXNoKHAuc2VnbWVudCk7XG4gICAgbGFzdCA9IHBsYWNlaG9sZGVyLmxhc3RJbmRleDtcbiAgfVxuICBzZWdtZW50ID0gcGF0dGVybi5zdWJzdHJpbmcobGFzdCk7XG5cbiAgLy8gRmluZCBhbnkgc2VhcmNoIHBhcmFtZXRlciBuYW1lcyBhbmQgcmVtb3ZlIHRoZW0gZnJvbSB0aGUgbGFzdCBzZWdtZW50XG4gIHZhciBpID0gc2VnbWVudC5pbmRleE9mKCc/Jyk7XG5cbiAgaWYgKGkgPj0gMCkge1xuICAgIHZhciBzZWFyY2ggPSB0aGlzLnNvdXJjZVNlYXJjaCA9IHNlZ21lbnQuc3Vic3RyaW5nKGkpO1xuICAgIHNlZ21lbnQgPSBzZWdtZW50LnN1YnN0cmluZygwLCBpKTtcbiAgICB0aGlzLnNvdXJjZVBhdGggPSBwYXR0ZXJuLnN1YnN0cmluZygwLCBsYXN0ICsgaSk7XG5cbiAgICBpZiAoc2VhcmNoLmxlbmd0aCA+IDApIHtcbiAgICAgIGxhc3QgPSAwO1xuICAgICAgd2hpbGUgKChtID0gc2VhcmNoUGxhY2Vob2xkZXIuZXhlYyhzZWFyY2gpKSkge1xuICAgICAgICBwID0gbWF0Y2hEZXRhaWxzKG0sIHRydWUpO1xuICAgICAgICBwYXJhbSA9IGFkZFBhcmFtZXRlcihwLmlkLCBwLnR5cGUsIHAuY2ZnLCBcInNlYXJjaFwiKTtcbiAgICAgICAgbGFzdCA9IHBsYWNlaG9sZGVyLmxhc3RJbmRleDtcbiAgICAgICAgLy8gY2hlY2sgaWYgPyZcbiAgICAgIH1cbiAgICB9XG4gIH0gZWxzZSB7XG4gICAgdGhpcy5zb3VyY2VQYXRoID0gcGF0dGVybjtcbiAgICB0aGlzLnNvdXJjZVNlYXJjaCA9ICcnO1xuICB9XG5cbiAgY29tcGlsZWQgKz0gcXVvdGVSZWdFeHAoc2VnbWVudCkgKyAoY29uZmlnLnN0cmljdCA9PT0gZmFsc2UgPyAnXFwvPycgOiAnJykgKyAnJCc7XG4gIHNlZ21lbnRzLnB1c2goc2VnbWVudCk7XG5cbiAgdGhpcy5yZWdleHAgPSBuZXcgUmVnRXhwKGNvbXBpbGVkLCBjb25maWcuY2FzZUluc2Vuc2l0aXZlID8gJ2knIDogdW5kZWZpbmVkKTtcbiAgdGhpcy5wcmVmaXggPSBzZWdtZW50c1swXTtcbiAgdGhpcy4kJHBhcmFtTmFtZXMgPSBwYXJhbU5hbWVzO1xufVxuXG4vKipcbiAqIEBuZ2RvYyBmdW5jdGlvblxuICogQG5hbWUgdWkucm91dGVyLnV0aWwudHlwZTpVcmxNYXRjaGVyI2NvbmNhdFxuICogQG1ldGhvZE9mIHVpLnJvdXRlci51dGlsLnR5cGU6VXJsTWF0Y2hlclxuICpcbiAqIEBkZXNjcmlwdGlvblxuICogUmV0dXJucyBhIG5ldyBtYXRjaGVyIGZvciBhIHBhdHRlcm4gY29uc3RydWN0ZWQgYnkgYXBwZW5kaW5nIHRoZSBwYXRoIHBhcnQgYW5kIGFkZGluZyB0aGVcbiAqIHNlYXJjaCBwYXJhbWV0ZXJzIG9mIHRoZSBzcGVjaWZpZWQgcGF0dGVybiB0byB0aGlzIHBhdHRlcm4uIFRoZSBjdXJyZW50IHBhdHRlcm4gaXMgbm90XG4gKiBtb2RpZmllZC4gVGhpcyBjYW4gYmUgdW5kZXJzdG9vZCBhcyBjcmVhdGluZyBhIHBhdHRlcm4gZm9yIFVSTHMgdGhhdCBhcmUgcmVsYXRpdmUgdG8gKG9yXG4gKiBzdWZmaXhlcyBvZikgdGhlIGN1cnJlbnQgcGF0dGVybi5cbiAqXG4gKiBAZXhhbXBsZVxuICogVGhlIGZvbGxvd2luZyB0d28gbWF0Y2hlcnMgYXJlIGVxdWl2YWxlbnQ6XG4gKiA8cHJlPlxuICogbmV3IFVybE1hdGNoZXIoJy91c2VyL3tpZH0/cScpLmNvbmNhdCgnL2RldGFpbHM/ZGF0ZScpO1xuICogbmV3IFVybE1hdGNoZXIoJy91c2VyL3tpZH0vZGV0YWlscz9xJmRhdGUnKTtcbiAqIDwvcHJlPlxuICpcbiAqIEBwYXJhbSB7c3RyaW5nfSBwYXR0ZXJuICBUaGUgcGF0dGVybiB0byBhcHBlbmQuXG4gKiBAcGFyYW0ge09iamVjdH0gY29uZmlnICBBbiBvYmplY3QgaGFzaCBvZiB0aGUgY29uZmlndXJhdGlvbiBmb3IgdGhlIG1hdGNoZXIuXG4gKiBAcmV0dXJucyB7VXJsTWF0Y2hlcn0gIEEgbWF0Y2hlciBmb3IgdGhlIGNvbmNhdGVuYXRlZCBwYXR0ZXJuLlxuICovXG5VcmxNYXRjaGVyLnByb3RvdHlwZS5jb25jYXQgPSBmdW5jdGlvbiAocGF0dGVybiwgY29uZmlnKSB7XG4gIC8vIEJlY2F1c2Ugb3JkZXIgb2Ygc2VhcmNoIHBhcmFtZXRlcnMgaXMgaXJyZWxldmFudCwgd2UgY2FuIGFkZCBvdXIgb3duIHNlYXJjaFxuICAvLyBwYXJhbWV0ZXJzIHRvIHRoZSBlbmQgb2YgdGhlIG5ldyBwYXR0ZXJuLiBQYXJzZSB0aGUgbmV3IHBhdHRlcm4gYnkgaXRzZWxmXG4gIC8vIGFuZCB0aGVuIGpvaW4gdGhlIGJpdHMgdG9nZXRoZXIsIGJ1dCBpdCdzIG11Y2ggZWFzaWVyIHRvIGRvIHRoaXMgb24gYSBzdHJpbmcgbGV2ZWwuXG4gIHZhciBkZWZhdWx0Q29uZmlnID0ge1xuICAgIGNhc2VJbnNlbnNpdGl2ZTogJCRVTUZQLmNhc2VJbnNlbnNpdGl2ZSgpLFxuICAgIHN0cmljdDogJCRVTUZQLnN0cmljdE1vZGUoKSxcbiAgICBzcXVhc2g6ICQkVU1GUC5kZWZhdWx0U3F1YXNoUG9saWN5KClcbiAgfTtcbiAgcmV0dXJuIG5ldyBVcmxNYXRjaGVyKHRoaXMuc291cmNlUGF0aCArIHBhdHRlcm4gKyB0aGlzLnNvdXJjZVNlYXJjaCwgZXh0ZW5kKGRlZmF1bHRDb25maWcsIGNvbmZpZyksIHRoaXMpO1xufTtcblxuVXJsTWF0Y2hlci5wcm90b3R5cGUudG9TdHJpbmcgPSBmdW5jdGlvbiAoKSB7XG4gIHJldHVybiB0aGlzLnNvdXJjZTtcbn07XG5cbi8qKlxuICogQG5nZG9jIGZ1bmN0aW9uXG4gKiBAbmFtZSB1aS5yb3V0ZXIudXRpbC50eXBlOlVybE1hdGNoZXIjZXhlY1xuICogQG1ldGhvZE9mIHVpLnJvdXRlci51dGlsLnR5cGU6VXJsTWF0Y2hlclxuICpcbiAqIEBkZXNjcmlwdGlvblxuICogVGVzdHMgdGhlIHNwZWNpZmllZCBwYXRoIGFnYWluc3QgdGhpcyBtYXRjaGVyLCBhbmQgcmV0dXJucyBhbiBvYmplY3QgY29udGFpbmluZyB0aGUgY2FwdHVyZWRcbiAqIHBhcmFtZXRlciB2YWx1ZXMsIG9yIG51bGwgaWYgdGhlIHBhdGggZG9lcyBub3QgbWF0Y2guIFRoZSByZXR1cm5lZCBvYmplY3QgY29udGFpbnMgdGhlIHZhbHVlc1xuICogb2YgYW55IHNlYXJjaCBwYXJhbWV0ZXJzIHRoYXQgYXJlIG1lbnRpb25lZCBpbiB0aGUgcGF0dGVybiwgYnV0IHRoZWlyIHZhbHVlIG1heSBiZSBudWxsIGlmXG4gKiB0aGV5IGFyZSBub3QgcHJlc2VudCBpbiBgc2VhcmNoUGFyYW1zYC4gVGhpcyBtZWFucyB0aGF0IHNlYXJjaCBwYXJhbWV0ZXJzIGFyZSBhbHdheXMgdHJlYXRlZFxuICogYXMgb3B0aW9uYWwuXG4gKlxuICogQGV4YW1wbGVcbiAqIDxwcmU+XG4gKiBuZXcgVXJsTWF0Y2hlcignL3VzZXIve2lkfT9xJnInKS5leGVjKCcvdXNlci9ib2InLCB7XG4gKiAgIHg6ICcxJywgcTogJ2hlbGxvJ1xuICogfSk7XG4gKiAvLyByZXR1cm5zIHsgaWQ6ICdib2InLCBxOiAnaGVsbG8nLCByOiBudWxsIH1cbiAqIDwvcHJlPlxuICpcbiAqIEBwYXJhbSB7c3RyaW5nfSBwYXRoICBUaGUgVVJMIHBhdGggdG8gbWF0Y2gsIGUuZy4gYCRsb2NhdGlvbi5wYXRoKClgLlxuICogQHBhcmFtIHtPYmplY3R9IHNlYXJjaFBhcmFtcyAgVVJMIHNlYXJjaCBwYXJhbWV0ZXJzLCBlLmcuIGAkbG9jYXRpb24uc2VhcmNoKClgLlxuICogQHJldHVybnMge09iamVjdH0gIFRoZSBjYXB0dXJlZCBwYXJhbWV0ZXIgdmFsdWVzLlxuICovXG5VcmxNYXRjaGVyLnByb3RvdHlwZS5leGVjID0gZnVuY3Rpb24gKHBhdGgsIHNlYXJjaFBhcmFtcykge1xuICB2YXIgbSA9IHRoaXMucmVnZXhwLmV4ZWMocGF0aCk7XG4gIGlmICghbSkgcmV0dXJuIG51bGw7XG4gIHNlYXJjaFBhcmFtcyA9IHNlYXJjaFBhcmFtcyB8fCB7fTtcblxuICB2YXIgcGFyYW1OYW1lcyA9IHRoaXMucGFyYW1ldGVycygpLCBuVG90YWwgPSBwYXJhbU5hbWVzLmxlbmd0aCxcbiAgICBuUGF0aCA9IHRoaXMuc2VnbWVudHMubGVuZ3RoIC0gMSxcbiAgICB2YWx1ZXMgPSB7fSwgaSwgaiwgY2ZnLCBwYXJhbU5hbWU7XG5cbiAgaWYgKG5QYXRoICE9PSBtLmxlbmd0aCAtIDEpIHRocm93IG5ldyBFcnJvcihcIlVuYmFsYW5jZWQgY2FwdHVyZSBncm91cCBpbiByb3V0ZSAnXCIgKyB0aGlzLnNvdXJjZSArIFwiJ1wiKTtcblxuICBmdW5jdGlvbiBkZWNvZGVQYXRoQXJyYXkoc3RyaW5nKSB7XG4gICAgZnVuY3Rpb24gcmV2ZXJzZVN0cmluZyhzdHIpIHsgcmV0dXJuIHN0ci5zcGxpdChcIlwiKS5yZXZlcnNlKCkuam9pbihcIlwiKTsgfVxuICAgIGZ1bmN0aW9uIHVucXVvdGVEYXNoZXMoc3RyKSB7IHJldHVybiBzdHIucmVwbGFjZSgvXFxcXC0vZywgXCItXCIpOyB9XG5cbiAgICB2YXIgc3BsaXQgPSByZXZlcnNlU3RyaW5nKHN0cmluZykuc3BsaXQoLy0oPyFcXFxcKS8pO1xuICAgIHZhciBhbGxSZXZlcnNlZCA9IG1hcChzcGxpdCwgcmV2ZXJzZVN0cmluZyk7XG4gICAgcmV0dXJuIG1hcChhbGxSZXZlcnNlZCwgdW5xdW90ZURhc2hlcykucmV2ZXJzZSgpO1xuICB9XG5cbiAgZm9yIChpID0gMDsgaSA8IG5QYXRoOyBpKyspIHtcbiAgICBwYXJhbU5hbWUgPSBwYXJhbU5hbWVzW2ldO1xuICAgIHZhciBwYXJhbSA9IHRoaXMucGFyYW1zW3BhcmFtTmFtZV07XG4gICAgdmFyIHBhcmFtVmFsID0gbVtpKzFdO1xuICAgIC8vIGlmIHRoZSBwYXJhbSB2YWx1ZSBtYXRjaGVzIGEgcHJlLXJlcGxhY2UgcGFpciwgcmVwbGFjZSB0aGUgdmFsdWUgYmVmb3JlIGRlY29kaW5nLlxuICAgIGZvciAoaiA9IDA7IGogPCBwYXJhbS5yZXBsYWNlOyBqKyspIHtcbiAgICAgIGlmIChwYXJhbS5yZXBsYWNlW2pdLmZyb20gPT09IHBhcmFtVmFsKSBwYXJhbVZhbCA9IHBhcmFtLnJlcGxhY2Vbal0udG87XG4gICAgfVxuICAgIGlmIChwYXJhbVZhbCAmJiBwYXJhbS5hcnJheSA9PT0gdHJ1ZSkgcGFyYW1WYWwgPSBkZWNvZGVQYXRoQXJyYXkocGFyYW1WYWwpO1xuICAgIHZhbHVlc1twYXJhbU5hbWVdID0gcGFyYW0udmFsdWUocGFyYW1WYWwpO1xuICB9XG4gIGZvciAoLyoqLzsgaSA8IG5Ub3RhbDsgaSsrKSB7XG4gICAgcGFyYW1OYW1lID0gcGFyYW1OYW1lc1tpXTtcbiAgICB2YWx1ZXNbcGFyYW1OYW1lXSA9IHRoaXMucGFyYW1zW3BhcmFtTmFtZV0udmFsdWUoc2VhcmNoUGFyYW1zW3BhcmFtTmFtZV0pO1xuICB9XG5cbiAgcmV0dXJuIHZhbHVlcztcbn07XG5cbi8qKlxuICogQG5nZG9jIGZ1bmN0aW9uXG4gKiBAbmFtZSB1aS5yb3V0ZXIudXRpbC50eXBlOlVybE1hdGNoZXIjcGFyYW1ldGVyc1xuICogQG1ldGhvZE9mIHVpLnJvdXRlci51dGlsLnR5cGU6VXJsTWF0Y2hlclxuICpcbiAqIEBkZXNjcmlwdGlvblxuICogUmV0dXJucyB0aGUgbmFtZXMgb2YgYWxsIHBhdGggYW5kIHNlYXJjaCBwYXJhbWV0ZXJzIG9mIHRoaXMgcGF0dGVybiBpbiBhbiB1bnNwZWNpZmllZCBvcmRlci5cbiAqXG4gKiBAcmV0dXJucyB7QXJyYXkuPHN0cmluZz59ICBBbiBhcnJheSBvZiBwYXJhbWV0ZXIgbmFtZXMuIE11c3QgYmUgdHJlYXRlZCBhcyByZWFkLW9ubHkuIElmIHRoZVxuICogICAgcGF0dGVybiBoYXMgbm8gcGFyYW1ldGVycywgYW4gZW1wdHkgYXJyYXkgaXMgcmV0dXJuZWQuXG4gKi9cblVybE1hdGNoZXIucHJvdG90eXBlLnBhcmFtZXRlcnMgPSBmdW5jdGlvbiAocGFyYW0pIHtcbiAgaWYgKCFpc0RlZmluZWQocGFyYW0pKSByZXR1cm4gdGhpcy4kJHBhcmFtTmFtZXM7XG4gIHJldHVybiB0aGlzLnBhcmFtc1twYXJhbV0gfHwgbnVsbDtcbn07XG5cbi8qKlxuICogQG5nZG9jIGZ1bmN0aW9uXG4gKiBAbmFtZSB1aS5yb3V0ZXIudXRpbC50eXBlOlVybE1hdGNoZXIjdmFsaWRhdGVcbiAqIEBtZXRob2RPZiB1aS5yb3V0ZXIudXRpbC50eXBlOlVybE1hdGNoZXJcbiAqXG4gKiBAZGVzY3JpcHRpb25cbiAqIENoZWNrcyBhbiBvYmplY3QgaGFzaCBvZiBwYXJhbWV0ZXJzIHRvIHZhbGlkYXRlIHRoZWlyIGNvcnJlY3RuZXNzIGFjY29yZGluZyB0byB0aGUgcGFyYW1ldGVyXG4gKiB0eXBlcyBvZiB0aGlzIGBVcmxNYXRjaGVyYC5cbiAqXG4gKiBAcGFyYW0ge09iamVjdH0gcGFyYW1zIFRoZSBvYmplY3QgaGFzaCBvZiBwYXJhbWV0ZXJzIHRvIHZhbGlkYXRlLlxuICogQHJldHVybnMge2Jvb2xlYW59IFJldHVybnMgYHRydWVgIGlmIGBwYXJhbXNgIHZhbGlkYXRlcywgb3RoZXJ3aXNlIGBmYWxzZWAuXG4gKi9cblVybE1hdGNoZXIucHJvdG90eXBlLnZhbGlkYXRlcyA9IGZ1bmN0aW9uIChwYXJhbXMpIHtcbiAgcmV0dXJuIHRoaXMucGFyYW1zLiQkdmFsaWRhdGVzKHBhcmFtcyk7XG59O1xuXG4vKipcbiAqIEBuZ2RvYyBmdW5jdGlvblxuICogQG5hbWUgdWkucm91dGVyLnV0aWwudHlwZTpVcmxNYXRjaGVyI2Zvcm1hdFxuICogQG1ldGhvZE9mIHVpLnJvdXRlci51dGlsLnR5cGU6VXJsTWF0Y2hlclxuICpcbiAqIEBkZXNjcmlwdGlvblxuICogQ3JlYXRlcyBhIFVSTCB0aGF0IG1hdGNoZXMgdGhpcyBwYXR0ZXJuIGJ5IHN1YnN0aXR1dGluZyB0aGUgc3BlY2lmaWVkIHZhbHVlc1xuICogZm9yIHRoZSBwYXRoIGFuZCBzZWFyY2ggcGFyYW1ldGVycy4gTnVsbCB2YWx1ZXMgZm9yIHBhdGggcGFyYW1ldGVycyBhcmVcbiAqIHRyZWF0ZWQgYXMgZW1wdHkgc3RyaW5ncy5cbiAqXG4gKiBAZXhhbXBsZVxuICogPHByZT5cbiAqIG5ldyBVcmxNYXRjaGVyKCcvdXNlci97aWR9P3EnKS5mb3JtYXQoeyBpZDonYm9iJywgcToneWVzJyB9KTtcbiAqIC8vIHJldHVybnMgJy91c2VyL2JvYj9xPXllcydcbiAqIDwvcHJlPlxuICpcbiAqIEBwYXJhbSB7T2JqZWN0fSB2YWx1ZXMgIHRoZSB2YWx1ZXMgdG8gc3Vic3RpdHV0ZSBmb3IgdGhlIHBhcmFtZXRlcnMgaW4gdGhpcyBwYXR0ZXJuLlxuICogQHJldHVybnMge3N0cmluZ30gIHRoZSBmb3JtYXR0ZWQgVVJMIChwYXRoIGFuZCBvcHRpb25hbGx5IHNlYXJjaCBwYXJ0KS5cbiAqL1xuVXJsTWF0Y2hlci5wcm90b3R5cGUuZm9ybWF0ID0gZnVuY3Rpb24gKHZhbHVlcykge1xuICB2YWx1ZXMgPSB2YWx1ZXMgfHwge307XG4gIHZhciBzZWdtZW50cyA9IHRoaXMuc2VnbWVudHMsIHBhcmFtcyA9IHRoaXMucGFyYW1ldGVycygpLCBwYXJhbXNldCA9IHRoaXMucGFyYW1zO1xuICBpZiAoIXRoaXMudmFsaWRhdGVzKHZhbHVlcykpIHJldHVybiBudWxsO1xuXG4gIHZhciBpLCBzZWFyY2ggPSBmYWxzZSwgblBhdGggPSBzZWdtZW50cy5sZW5ndGggLSAxLCBuVG90YWwgPSBwYXJhbXMubGVuZ3RoLCByZXN1bHQgPSBzZWdtZW50c1swXTtcblxuICBmdW5jdGlvbiBlbmNvZGVEYXNoZXMoc3RyKSB7IC8vIFJlcGxhY2UgZGFzaGVzIHdpdGggZW5jb2RlZCBcIlxcLVwiXG4gICAgcmV0dXJuIGVuY29kZVVSSUNvbXBvbmVudChzdHIpLnJlcGxhY2UoLy0vZywgZnVuY3Rpb24oYykgeyByZXR1cm4gJyU1QyUnICsgYy5jaGFyQ29kZUF0KDApLnRvU3RyaW5nKDE2KS50b1VwcGVyQ2FzZSgpOyB9KTtcbiAgfVxuXG4gIGZvciAoaSA9IDA7IGkgPCBuVG90YWw7IGkrKykge1xuICAgIHZhciBpc1BhdGhQYXJhbSA9IGkgPCBuUGF0aDtcbiAgICB2YXIgbmFtZSA9IHBhcmFtc1tpXSwgcGFyYW0gPSBwYXJhbXNldFtuYW1lXSwgdmFsdWUgPSBwYXJhbS52YWx1ZSh2YWx1ZXNbbmFtZV0pO1xuICAgIHZhciBpc0RlZmF1bHRWYWx1ZSA9IHBhcmFtLmlzT3B0aW9uYWwgJiYgcGFyYW0udHlwZS5lcXVhbHMocGFyYW0udmFsdWUoKSwgdmFsdWUpO1xuICAgIHZhciBzcXVhc2ggPSBpc0RlZmF1bHRWYWx1ZSA/IHBhcmFtLnNxdWFzaCA6IGZhbHNlO1xuICAgIHZhciBlbmNvZGVkID0gcGFyYW0udHlwZS5lbmNvZGUodmFsdWUpO1xuXG4gICAgaWYgKGlzUGF0aFBhcmFtKSB7XG4gICAgICB2YXIgbmV4dFNlZ21lbnQgPSBzZWdtZW50c1tpICsgMV07XG4gICAgICBpZiAoc3F1YXNoID09PSBmYWxzZSkge1xuICAgICAgICBpZiAoZW5jb2RlZCAhPSBudWxsKSB7XG4gICAgICAgICAgaWYgKGlzQXJyYXkoZW5jb2RlZCkpIHtcbiAgICAgICAgICAgIHJlc3VsdCArPSBtYXAoZW5jb2RlZCwgZW5jb2RlRGFzaGVzKS5qb2luKFwiLVwiKTtcbiAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgcmVzdWx0ICs9IGVuY29kZVVSSUNvbXBvbmVudChlbmNvZGVkKTtcbiAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgcmVzdWx0ICs9IG5leHRTZWdtZW50O1xuICAgICAgfSBlbHNlIGlmIChzcXVhc2ggPT09IHRydWUpIHtcbiAgICAgICAgdmFyIGNhcHR1cmUgPSByZXN1bHQubWF0Y2goL1xcLyQvKSA/IC9cXC8/KC4qKS8gOiAvKC4qKS87XG4gICAgICAgIHJlc3VsdCArPSBuZXh0U2VnbWVudC5tYXRjaChjYXB0dXJlKVsxXTtcbiAgICAgIH0gZWxzZSBpZiAoaXNTdHJpbmcoc3F1YXNoKSkge1xuICAgICAgICByZXN1bHQgKz0gc3F1YXNoICsgbmV4dFNlZ21lbnQ7XG4gICAgICB9XG4gICAgfSBlbHNlIHtcbiAgICAgIGlmIChlbmNvZGVkID09IG51bGwgfHwgKGlzRGVmYXVsdFZhbHVlICYmIHNxdWFzaCAhPT0gZmFsc2UpKSBjb250aW51ZTtcbiAgICAgIGlmICghaXNBcnJheShlbmNvZGVkKSkgZW5jb2RlZCA9IFsgZW5jb2RlZCBdO1xuICAgICAgZW5jb2RlZCA9IG1hcChlbmNvZGVkLCBlbmNvZGVVUklDb21wb25lbnQpLmpvaW4oJyYnICsgbmFtZSArICc9Jyk7XG4gICAgICByZXN1bHQgKz0gKHNlYXJjaCA/ICcmJyA6ICc/JykgKyAobmFtZSArICc9JyArIGVuY29kZWQpO1xuICAgICAgc2VhcmNoID0gdHJ1ZTtcbiAgICB9XG4gIH1cblxuICByZXR1cm4gcmVzdWx0O1xufTtcblxuLyoqXG4gKiBAbmdkb2Mgb2JqZWN0XG4gKiBAbmFtZSB1aS5yb3V0ZXIudXRpbC50eXBlOlR5cGVcbiAqXG4gKiBAZGVzY3JpcHRpb25cbiAqIEltcGxlbWVudHMgYW4gaW50ZXJmYWNlIHRvIGRlZmluZSBjdXN0b20gcGFyYW1ldGVyIHR5cGVzIHRoYXQgY2FuIGJlIGRlY29kZWQgZnJvbSBhbmQgZW5jb2RlZCB0b1xuICogc3RyaW5nIHBhcmFtZXRlcnMgbWF0Y2hlZCBpbiBhIFVSTC4gVXNlZCBieSB7QGxpbmsgdWkucm91dGVyLnV0aWwudHlwZTpVcmxNYXRjaGVyIGBVcmxNYXRjaGVyYH1cbiAqIG9iamVjdHMgd2hlbiBtYXRjaGluZyBvciBmb3JtYXR0aW5nIFVSTHMsIG9yIGNvbXBhcmluZyBvciB2YWxpZGF0aW5nIHBhcmFtZXRlciB2YWx1ZXMuXG4gKlxuICogU2VlIHtAbGluayB1aS5yb3V0ZXIudXRpbC4kdXJsTWF0Y2hlckZhY3RvcnkjbWV0aG9kc190eXBlIGAkdXJsTWF0Y2hlckZhY3RvcnkjdHlwZSgpYH0gZm9yIG1vcmVcbiAqIGluZm9ybWF0aW9uIG9uIHJlZ2lzdGVyaW5nIGN1c3RvbSB0eXBlcy5cbiAqXG4gKiBAcGFyYW0ge09iamVjdH0gY29uZmlnICBBIGNvbmZpZ3VyYXRpb24gb2JqZWN0IHdoaWNoIGNvbnRhaW5zIHRoZSBjdXN0b20gdHlwZSBkZWZpbml0aW9uLiAgVGhlIG9iamVjdCdzXG4gKiAgICAgICAgcHJvcGVydGllcyB3aWxsIG92ZXJyaWRlIHRoZSBkZWZhdWx0IG1ldGhvZHMgYW5kL29yIHBhdHRlcm4gaW4gYFR5cGVgJ3MgcHVibGljIGludGVyZmFjZS5cbiAqIEBleGFtcGxlXG4gKiA8cHJlPlxuICoge1xuICogICBkZWNvZGU6IGZ1bmN0aW9uKHZhbCkgeyByZXR1cm4gcGFyc2VJbnQodmFsLCAxMCk7IH0sXG4gKiAgIGVuY29kZTogZnVuY3Rpb24odmFsKSB7IHJldHVybiB2YWwgJiYgdmFsLnRvU3RyaW5nKCk7IH0sXG4gKiAgIGVxdWFsczogZnVuY3Rpb24oYSwgYikgeyByZXR1cm4gdGhpcy5pcyhhKSAmJiBhID09PSBiOyB9LFxuICogICBpczogZnVuY3Rpb24odmFsKSB7IHJldHVybiBhbmd1bGFyLmlzTnVtYmVyKHZhbCkgaXNGaW5pdGUodmFsKSAmJiB2YWwgJSAxID09PSAwOyB9LFxuICogICBwYXR0ZXJuOiAvXFxkKy9cbiAqIH1cbiAqIDwvcHJlPlxuICpcbiAqIEBwcm9wZXJ0eSB7UmVnRXhwfSBwYXR0ZXJuIFRoZSByZWd1bGFyIGV4cHJlc3Npb24gcGF0dGVybiB1c2VkIHRvIG1hdGNoIHZhbHVlcyBvZiB0aGlzIHR5cGUgd2hlblxuICogICAgICAgICAgIGNvbWluZyBmcm9tIGEgc3Vic3RyaW5nIG9mIGEgVVJMLlxuICpcbiAqIEByZXR1cm5zIHtPYmplY3R9ICBSZXR1cm5zIGEgbmV3IGBUeXBlYCBvYmplY3QuXG4gKi9cbmZ1bmN0aW9uIFR5cGUoY29uZmlnKSB7XG4gIGV4dGVuZCh0aGlzLCBjb25maWcpO1xufVxuXG4vKipcbiAqIEBuZ2RvYyBmdW5jdGlvblxuICogQG5hbWUgdWkucm91dGVyLnV0aWwudHlwZTpUeXBlI2lzXG4gKiBAbWV0aG9kT2YgdWkucm91dGVyLnV0aWwudHlwZTpUeXBlXG4gKlxuICogQGRlc2NyaXB0aW9uXG4gKiBEZXRlY3RzIHdoZXRoZXIgYSB2YWx1ZSBpcyBvZiBhIHBhcnRpY3VsYXIgdHlwZS4gQWNjZXB0cyBhIG5hdGl2ZSAoZGVjb2RlZCkgdmFsdWVcbiAqIGFuZCBkZXRlcm1pbmVzIHdoZXRoZXIgaXQgbWF0Y2hlcyB0aGUgY3VycmVudCBgVHlwZWAgb2JqZWN0LlxuICpcbiAqIEBwYXJhbSB7Kn0gdmFsICBUaGUgdmFsdWUgdG8gY2hlY2suXG4gKiBAcGFyYW0ge3N0cmluZ30ga2V5ICBPcHRpb25hbC4gSWYgdGhlIHR5cGUgY2hlY2sgaXMgaGFwcGVuaW5nIGluIHRoZSBjb250ZXh0IG9mIGEgc3BlY2lmaWNcbiAqICAgICAgICB7QGxpbmsgdWkucm91dGVyLnV0aWwudHlwZTpVcmxNYXRjaGVyIGBVcmxNYXRjaGVyYH0gb2JqZWN0LCB0aGlzIGlzIHRoZSBuYW1lIG9mIHRoZVxuICogICAgICAgIHBhcmFtZXRlciBpbiB3aGljaCBgdmFsYCBpcyBzdG9yZWQuIENhbiBiZSB1c2VkIGZvciBtZXRhLXByb2dyYW1taW5nIG9mIGBUeXBlYCBvYmplY3RzLlxuICogQHJldHVybnMge0Jvb2xlYW59ICBSZXR1cm5zIGB0cnVlYCBpZiB0aGUgdmFsdWUgbWF0Y2hlcyB0aGUgdHlwZSwgb3RoZXJ3aXNlIGBmYWxzZWAuXG4gKi9cblR5cGUucHJvdG90eXBlLmlzID0gZnVuY3Rpb24odmFsLCBrZXkpIHtcbiAgcmV0dXJuIHRydWU7XG59O1xuXG4vKipcbiAqIEBuZ2RvYyBmdW5jdGlvblxuICogQG5hbWUgdWkucm91dGVyLnV0aWwudHlwZTpUeXBlI2VuY29kZVxuICogQG1ldGhvZE9mIHVpLnJvdXRlci51dGlsLnR5cGU6VHlwZVxuICpcbiAqIEBkZXNjcmlwdGlvblxuICogRW5jb2RlcyBhIGN1c3RvbS9uYXRpdmUgdHlwZSB2YWx1ZSB0byBhIHN0cmluZyB0aGF0IGNhbiBiZSBlbWJlZGRlZCBpbiBhIFVSTC4gTm90ZSB0aGF0IHRoZVxuICogcmV0dXJuIHZhbHVlIGRvZXMgKm5vdCogbmVlZCB0byBiZSBVUkwtc2FmZSAoaS5lLiBwYXNzZWQgdGhyb3VnaCBgZW5jb2RlVVJJQ29tcG9uZW50KClgKSwgaXRcbiAqIG9ubHkgbmVlZHMgdG8gYmUgYSByZXByZXNlbnRhdGlvbiBvZiBgdmFsYCB0aGF0IGhhcyBiZWVuIGNvZXJjZWQgdG8gYSBzdHJpbmcuXG4gKlxuICogQHBhcmFtIHsqfSB2YWwgIFRoZSB2YWx1ZSB0byBlbmNvZGUuXG4gKiBAcGFyYW0ge3N0cmluZ30ga2V5ICBUaGUgbmFtZSBvZiB0aGUgcGFyYW1ldGVyIGluIHdoaWNoIGB2YWxgIGlzIHN0b3JlZC4gQ2FuIGJlIHVzZWQgZm9yXG4gKiAgICAgICAgbWV0YS1wcm9ncmFtbWluZyBvZiBgVHlwZWAgb2JqZWN0cy5cbiAqIEByZXR1cm5zIHtzdHJpbmd9ICBSZXR1cm5zIGEgc3RyaW5nIHJlcHJlc2VudGF0aW9uIG9mIGB2YWxgIHRoYXQgY2FuIGJlIGVuY29kZWQgaW4gYSBVUkwuXG4gKi9cblR5cGUucHJvdG90eXBlLmVuY29kZSA9IGZ1bmN0aW9uKHZhbCwga2V5KSB7XG4gIHJldHVybiB2YWw7XG59O1xuXG4vKipcbiAqIEBuZ2RvYyBmdW5jdGlvblxuICogQG5hbWUgdWkucm91dGVyLnV0aWwudHlwZTpUeXBlI2RlY29kZVxuICogQG1ldGhvZE9mIHVpLnJvdXRlci51dGlsLnR5cGU6VHlwZVxuICpcbiAqIEBkZXNjcmlwdGlvblxuICogQ29udmVydHMgYSBwYXJhbWV0ZXIgdmFsdWUgKGZyb20gVVJMIHN0cmluZyBvciB0cmFuc2l0aW9uIHBhcmFtKSB0byBhIGN1c3RvbS9uYXRpdmUgdmFsdWUuXG4gKlxuICogQHBhcmFtIHtzdHJpbmd9IHZhbCAgVGhlIFVSTCBwYXJhbWV0ZXIgdmFsdWUgdG8gZGVjb2RlLlxuICogQHBhcmFtIHtzdHJpbmd9IGtleSAgVGhlIG5hbWUgb2YgdGhlIHBhcmFtZXRlciBpbiB3aGljaCBgdmFsYCBpcyBzdG9yZWQuIENhbiBiZSB1c2VkIGZvclxuICogICAgICAgIG1ldGEtcHJvZ3JhbW1pbmcgb2YgYFR5cGVgIG9iamVjdHMuXG4gKiBAcmV0dXJucyB7Kn0gIFJldHVybnMgYSBjdXN0b20gcmVwcmVzZW50YXRpb24gb2YgdGhlIFVSTCBwYXJhbWV0ZXIgdmFsdWUuXG4gKi9cblR5cGUucHJvdG90eXBlLmRlY29kZSA9IGZ1bmN0aW9uKHZhbCwga2V5KSB7XG4gIHJldHVybiB2YWw7XG59O1xuXG4vKipcbiAqIEBuZ2RvYyBmdW5jdGlvblxuICogQG5hbWUgdWkucm91dGVyLnV0aWwudHlwZTpUeXBlI2VxdWFsc1xuICogQG1ldGhvZE9mIHVpLnJvdXRlci51dGlsLnR5cGU6VHlwZVxuICpcbiAqIEBkZXNjcmlwdGlvblxuICogRGV0ZXJtaW5lcyB3aGV0aGVyIHR3byBkZWNvZGVkIHZhbHVlcyBhcmUgZXF1aXZhbGVudC5cbiAqXG4gKiBAcGFyYW0geyp9IGEgIEEgdmFsdWUgdG8gY29tcGFyZSBhZ2FpbnN0LlxuICogQHBhcmFtIHsqfSBiICBBIHZhbHVlIHRvIGNvbXBhcmUgYWdhaW5zdC5cbiAqIEByZXR1cm5zIHtCb29sZWFufSAgUmV0dXJucyBgdHJ1ZWAgaWYgdGhlIHZhbHVlcyBhcmUgZXF1aXZhbGVudC9lcXVhbCwgb3RoZXJ3aXNlIGBmYWxzZWAuXG4gKi9cblR5cGUucHJvdG90eXBlLmVxdWFscyA9IGZ1bmN0aW9uKGEsIGIpIHtcbiAgcmV0dXJuIGEgPT0gYjtcbn07XG5cblR5cGUucHJvdG90eXBlLiRzdWJQYXR0ZXJuID0gZnVuY3Rpb24oKSB7XG4gIHZhciBzdWIgPSB0aGlzLnBhdHRlcm4udG9TdHJpbmcoKTtcbiAgcmV0dXJuIHN1Yi5zdWJzdHIoMSwgc3ViLmxlbmd0aCAtIDIpO1xufTtcblxuVHlwZS5wcm90b3R5cGUucGF0dGVybiA9IC8uKi87XG5cblR5cGUucHJvdG90eXBlLnRvU3RyaW5nID0gZnVuY3Rpb24oKSB7IHJldHVybiBcIntUeXBlOlwiICsgdGhpcy5uYW1lICsgXCJ9XCI7IH07XG5cbi8qKiBHaXZlbiBhbiBlbmNvZGVkIHN0cmluZywgb3IgYSBkZWNvZGVkIG9iamVjdCwgcmV0dXJucyBhIGRlY29kZWQgb2JqZWN0ICovXG5UeXBlLnByb3RvdHlwZS4kbm9ybWFsaXplID0gZnVuY3Rpb24odmFsKSB7XG4gIHJldHVybiB0aGlzLmlzKHZhbCkgPyB2YWwgOiB0aGlzLmRlY29kZSh2YWwpO1xufTtcblxuLypcbiAqIFdyYXBzIGFuIGV4aXN0aW5nIGN1c3RvbSBUeXBlIGFzIGFuIGFycmF5IG9mIFR5cGUsIGRlcGVuZGluZyBvbiAnbW9kZScuXG4gKiBlLmcuOlxuICogLSB1cmxtYXRjaGVyIHBhdHRlcm4gXCIvcGF0aD97cXVlcnlQYXJhbVtdOmludH1cIlxuICogLSB1cmw6IFwiL3BhdGg/cXVlcnlQYXJhbT0xJnF1ZXJ5UGFyYW09MlxuICogLSAkc3RhdGVQYXJhbXMucXVlcnlQYXJhbSB3aWxsIGJlIFsxLCAyXVxuICogaWYgYG1vZGVgIGlzIFwiYXV0b1wiLCB0aGVuXG4gKiAtIHVybDogXCIvcGF0aD9xdWVyeVBhcmFtPTEgd2lsbCBjcmVhdGUgJHN0YXRlUGFyYW1zLnF1ZXJ5UGFyYW06IDFcbiAqIC0gdXJsOiBcIi9wYXRoP3F1ZXJ5UGFyYW09MSZxdWVyeVBhcmFtPTIgd2lsbCBjcmVhdGUgJHN0YXRlUGFyYW1zLnF1ZXJ5UGFyYW06IFsxLCAyXVxuICovXG5UeXBlLnByb3RvdHlwZS4kYXNBcnJheSA9IGZ1bmN0aW9uKG1vZGUsIGlzU2VhcmNoKSB7XG4gIGlmICghbW9kZSkgcmV0dXJuIHRoaXM7XG4gIGlmIChtb2RlID09PSBcImF1dG9cIiAmJiAhaXNTZWFyY2gpIHRocm93IG5ldyBFcnJvcihcIidhdXRvJyBhcnJheSBtb2RlIGlzIGZvciBxdWVyeSBwYXJhbWV0ZXJzIG9ubHlcIik7XG5cbiAgZnVuY3Rpb24gQXJyYXlUeXBlKHR5cGUsIG1vZGUpIHtcbiAgICBmdW5jdGlvbiBiaW5kVG8odHlwZSwgY2FsbGJhY2tOYW1lKSB7XG4gICAgICByZXR1cm4gZnVuY3Rpb24oKSB7XG4gICAgICAgIHJldHVybiB0eXBlW2NhbGxiYWNrTmFtZV0uYXBwbHkodHlwZSwgYXJndW1lbnRzKTtcbiAgICAgIH07XG4gICAgfVxuXG4gICAgLy8gV3JhcCBub24tYXJyYXkgdmFsdWUgYXMgYXJyYXlcbiAgICBmdW5jdGlvbiBhcnJheVdyYXAodmFsKSB7IHJldHVybiBpc0FycmF5KHZhbCkgPyB2YWwgOiAoaXNEZWZpbmVkKHZhbCkgPyBbIHZhbCBdIDogW10pOyB9XG4gICAgLy8gVW53cmFwIGFycmF5IHZhbHVlIGZvciBcImF1dG9cIiBtb2RlLiBSZXR1cm4gdW5kZWZpbmVkIGZvciBlbXB0eSBhcnJheS5cbiAgICBmdW5jdGlvbiBhcnJheVVud3JhcCh2YWwpIHtcbiAgICAgIHN3aXRjaCh2YWwubGVuZ3RoKSB7XG4gICAgICAgIGNhc2UgMDogcmV0dXJuIHVuZGVmaW5lZDtcbiAgICAgICAgY2FzZSAxOiByZXR1cm4gbW9kZSA9PT0gXCJhdXRvXCIgPyB2YWxbMF0gOiB2YWw7XG4gICAgICAgIGRlZmF1bHQ6IHJldHVybiB2YWw7XG4gICAgICB9XG4gICAgfVxuICAgIGZ1bmN0aW9uIGZhbHNleSh2YWwpIHsgcmV0dXJuICF2YWw7IH1cblxuICAgIC8vIFdyYXBzIHR5cGUgKC5pcy8uZW5jb2RlLy5kZWNvZGUpIGZ1bmN0aW9ucyB0byBvcGVyYXRlIG9uIGVhY2ggdmFsdWUgb2YgYW4gYXJyYXlcbiAgICBmdW5jdGlvbiBhcnJheUhhbmRsZXIoY2FsbGJhY2ssIGFsbFRydXRoeU1vZGUpIHtcbiAgICAgIHJldHVybiBmdW5jdGlvbiBoYW5kbGVBcnJheSh2YWwpIHtcbiAgICAgICAgdmFsID0gYXJyYXlXcmFwKHZhbCk7XG4gICAgICAgIHZhciByZXN1bHQgPSBtYXAodmFsLCBjYWxsYmFjayk7XG4gICAgICAgIGlmIChhbGxUcnV0aHlNb2RlID09PSB0cnVlKVxuICAgICAgICAgIHJldHVybiBmaWx0ZXIocmVzdWx0LCBmYWxzZXkpLmxlbmd0aCA9PT0gMDtcbiAgICAgICAgcmV0dXJuIGFycmF5VW53cmFwKHJlc3VsdCk7XG4gICAgICB9O1xuICAgIH1cblxuICAgIC8vIFdyYXBzIHR5cGUgKC5lcXVhbHMpIGZ1bmN0aW9ucyB0byBvcGVyYXRlIG9uIGVhY2ggdmFsdWUgb2YgYW4gYXJyYXlcbiAgICBmdW5jdGlvbiBhcnJheUVxdWFsc0hhbmRsZXIoY2FsbGJhY2spIHtcbiAgICAgIHJldHVybiBmdW5jdGlvbiBoYW5kbGVBcnJheSh2YWwxLCB2YWwyKSB7XG4gICAgICAgIHZhciBsZWZ0ID0gYXJyYXlXcmFwKHZhbDEpLCByaWdodCA9IGFycmF5V3JhcCh2YWwyKTtcbiAgICAgICAgaWYgKGxlZnQubGVuZ3RoICE9PSByaWdodC5sZW5ndGgpIHJldHVybiBmYWxzZTtcbiAgICAgICAgZm9yICh2YXIgaSA9IDA7IGkgPCBsZWZ0Lmxlbmd0aDsgaSsrKSB7XG4gICAgICAgICAgaWYgKCFjYWxsYmFjayhsZWZ0W2ldLCByaWdodFtpXSkpIHJldHVybiBmYWxzZTtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICAgIH07XG4gICAgfVxuXG4gICAgdGhpcy5lbmNvZGUgPSBhcnJheUhhbmRsZXIoYmluZFRvKHR5cGUsICdlbmNvZGUnKSk7XG4gICAgdGhpcy5kZWNvZGUgPSBhcnJheUhhbmRsZXIoYmluZFRvKHR5cGUsICdkZWNvZGUnKSk7XG4gICAgdGhpcy5pcyAgICAgPSBhcnJheUhhbmRsZXIoYmluZFRvKHR5cGUsICdpcycpLCB0cnVlKTtcbiAgICB0aGlzLmVxdWFscyA9IGFycmF5RXF1YWxzSGFuZGxlcihiaW5kVG8odHlwZSwgJ2VxdWFscycpKTtcbiAgICB0aGlzLnBhdHRlcm4gPSB0eXBlLnBhdHRlcm47XG4gICAgdGhpcy4kbm9ybWFsaXplID0gYXJyYXlIYW5kbGVyKGJpbmRUbyh0eXBlLCAnJG5vcm1hbGl6ZScpKTtcbiAgICB0aGlzLm5hbWUgPSB0eXBlLm5hbWU7XG4gICAgdGhpcy4kYXJyYXlNb2RlID0gbW9kZTtcbiAgfVxuXG4gIHJldHVybiBuZXcgQXJyYXlUeXBlKHRoaXMsIG1vZGUpO1xufTtcblxuXG5cbi8qKlxuICogQG5nZG9jIG9iamVjdFxuICogQG5hbWUgdWkucm91dGVyLnV0aWwuJHVybE1hdGNoZXJGYWN0b3J5XG4gKlxuICogQGRlc2NyaXB0aW9uXG4gKiBGYWN0b3J5IGZvciB7QGxpbmsgdWkucm91dGVyLnV0aWwudHlwZTpVcmxNYXRjaGVyIGBVcmxNYXRjaGVyYH0gaW5zdGFuY2VzLiBUaGUgZmFjdG9yeVxuICogaXMgYWxzbyBhdmFpbGFibGUgdG8gcHJvdmlkZXJzIHVuZGVyIHRoZSBuYW1lIGAkdXJsTWF0Y2hlckZhY3RvcnlQcm92aWRlcmAuXG4gKi9cbmZ1bmN0aW9uICRVcmxNYXRjaGVyRmFjdG9yeSgpIHtcbiAgJCRVTUZQID0gdGhpcztcblxuICB2YXIgaXNDYXNlSW5zZW5zaXRpdmUgPSBmYWxzZSwgaXNTdHJpY3RNb2RlID0gdHJ1ZSwgZGVmYXVsdFNxdWFzaFBvbGljeSA9IGZhbHNlO1xuXG4gIGZ1bmN0aW9uIHZhbFRvU3RyaW5nKHZhbCkgeyByZXR1cm4gdmFsICE9IG51bGwgPyB2YWwudG9TdHJpbmcoKS5yZXBsYWNlKC9cXC8vZywgXCIlMkZcIikgOiB2YWw7IH1cbiAgZnVuY3Rpb24gdmFsRnJvbVN0cmluZyh2YWwpIHsgcmV0dXJuIHZhbCAhPSBudWxsID8gdmFsLnRvU3RyaW5nKCkucmVwbGFjZSgvJTJGL2csIFwiL1wiKSA6IHZhbDsgfVxuXG4gIHZhciAkdHlwZXMgPSB7fSwgZW5xdWV1ZSA9IHRydWUsIHR5cGVRdWV1ZSA9IFtdLCBpbmplY3RvciwgZGVmYXVsdFR5cGVzID0ge1xuICAgIHN0cmluZzoge1xuICAgICAgZW5jb2RlOiB2YWxUb1N0cmluZyxcbiAgICAgIGRlY29kZTogdmFsRnJvbVN0cmluZyxcbiAgICAgIC8vIFRPRE86IGluIDEuMCwgbWFrZSBzdHJpbmcgLmlzKCkgcmV0dXJuIGZhbHNlIGlmIHZhbHVlIGlzIHVuZGVmaW5lZC9udWxsIGJ5IGRlZmF1bHQuXG4gICAgICAvLyBJbiAwLjIueCwgc3RyaW5nIHBhcmFtcyBhcmUgb3B0aW9uYWwgYnkgZGVmYXVsdCBmb3IgYmFja3dhcmRzIGNvbXBhdFxuICAgICAgaXM6IGZ1bmN0aW9uKHZhbCkgeyByZXR1cm4gdmFsID09IG51bGwgfHwgIWlzRGVmaW5lZCh2YWwpIHx8IHR5cGVvZiB2YWwgPT09IFwic3RyaW5nXCI7IH0sXG4gICAgICBwYXR0ZXJuOiAvW14vXSovXG4gICAgfSxcbiAgICBpbnQ6IHtcbiAgICAgIGVuY29kZTogdmFsVG9TdHJpbmcsXG4gICAgICBkZWNvZGU6IGZ1bmN0aW9uKHZhbCkgeyByZXR1cm4gcGFyc2VJbnQodmFsLCAxMCk7IH0sXG4gICAgICBpczogZnVuY3Rpb24odmFsKSB7IHJldHVybiBpc0RlZmluZWQodmFsKSAmJiB0aGlzLmRlY29kZSh2YWwudG9TdHJpbmcoKSkgPT09IHZhbDsgfSxcbiAgICAgIHBhdHRlcm46IC9cXGQrL1xuICAgIH0sXG4gICAgYm9vbDoge1xuICAgICAgZW5jb2RlOiBmdW5jdGlvbih2YWwpIHsgcmV0dXJuIHZhbCA/IDEgOiAwOyB9LFxuICAgICAgZGVjb2RlOiBmdW5jdGlvbih2YWwpIHsgcmV0dXJuIHBhcnNlSW50KHZhbCwgMTApICE9PSAwOyB9LFxuICAgICAgaXM6IGZ1bmN0aW9uKHZhbCkgeyByZXR1cm4gdmFsID09PSB0cnVlIHx8IHZhbCA9PT0gZmFsc2U7IH0sXG4gICAgICBwYXR0ZXJuOiAvMHwxL1xuICAgIH0sXG4gICAgZGF0ZToge1xuICAgICAgZW5jb2RlOiBmdW5jdGlvbiAodmFsKSB7XG4gICAgICAgIGlmICghdGhpcy5pcyh2YWwpKVxuICAgICAgICAgIHJldHVybiB1bmRlZmluZWQ7XG4gICAgICAgIHJldHVybiBbIHZhbC5nZXRGdWxsWWVhcigpLFxuICAgICAgICAgICgnMCcgKyAodmFsLmdldE1vbnRoKCkgKyAxKSkuc2xpY2UoLTIpLFxuICAgICAgICAgICgnMCcgKyB2YWwuZ2V0RGF0ZSgpKS5zbGljZSgtMilcbiAgICAgICAgXS5qb2luKFwiLVwiKTtcbiAgICAgIH0sXG4gICAgICBkZWNvZGU6IGZ1bmN0aW9uICh2YWwpIHtcbiAgICAgICAgaWYgKHRoaXMuaXModmFsKSkgcmV0dXJuIHZhbDtcbiAgICAgICAgdmFyIG1hdGNoID0gdGhpcy5jYXB0dXJlLmV4ZWModmFsKTtcbiAgICAgICAgcmV0dXJuIG1hdGNoID8gbmV3IERhdGUobWF0Y2hbMV0sIG1hdGNoWzJdIC0gMSwgbWF0Y2hbM10pIDogdW5kZWZpbmVkO1xuICAgICAgfSxcbiAgICAgIGlzOiBmdW5jdGlvbih2YWwpIHsgcmV0dXJuIHZhbCBpbnN0YW5jZW9mIERhdGUgJiYgIWlzTmFOKHZhbC52YWx1ZU9mKCkpOyB9LFxuICAgICAgZXF1YWxzOiBmdW5jdGlvbiAoYSwgYikgeyByZXR1cm4gdGhpcy5pcyhhKSAmJiB0aGlzLmlzKGIpICYmIGEudG9JU09TdHJpbmcoKSA9PT0gYi50b0lTT1N0cmluZygpOyB9LFxuICAgICAgcGF0dGVybjogL1swLTldezR9LSg/OjBbMS05XXwxWzAtMl0pLSg/OjBbMS05XXxbMS0yXVswLTldfDNbMC0xXSkvLFxuICAgICAgY2FwdHVyZTogLyhbMC05XXs0fSktKDBbMS05XXwxWzAtMl0pLSgwWzEtOV18WzEtMl1bMC05XXwzWzAtMV0pL1xuICAgIH0sXG4gICAganNvbjoge1xuICAgICAgZW5jb2RlOiBhbmd1bGFyLnRvSnNvbixcbiAgICAgIGRlY29kZTogYW5ndWxhci5mcm9tSnNvbixcbiAgICAgIGlzOiBhbmd1bGFyLmlzT2JqZWN0LFxuICAgICAgZXF1YWxzOiBhbmd1bGFyLmVxdWFscyxcbiAgICAgIHBhdHRlcm46IC9bXi9dKi9cbiAgICB9LFxuICAgIGFueTogeyAvLyBkb2VzIG5vdCBlbmNvZGUvZGVjb2RlXG4gICAgICBlbmNvZGU6IGFuZ3VsYXIuaWRlbnRpdHksXG4gICAgICBkZWNvZGU6IGFuZ3VsYXIuaWRlbnRpdHksXG4gICAgICBlcXVhbHM6IGFuZ3VsYXIuZXF1YWxzLFxuICAgICAgcGF0dGVybjogLy4qL1xuICAgIH1cbiAgfTtcblxuICBmdW5jdGlvbiBnZXREZWZhdWx0Q29uZmlnKCkge1xuICAgIHJldHVybiB7XG4gICAgICBzdHJpY3Q6IGlzU3RyaWN0TW9kZSxcbiAgICAgIGNhc2VJbnNlbnNpdGl2ZTogaXNDYXNlSW5zZW5zaXRpdmVcbiAgICB9O1xuICB9XG5cbiAgZnVuY3Rpb24gaXNJbmplY3RhYmxlKHZhbHVlKSB7XG4gICAgcmV0dXJuIChpc0Z1bmN0aW9uKHZhbHVlKSB8fCAoaXNBcnJheSh2YWx1ZSkgJiYgaXNGdW5jdGlvbih2YWx1ZVt2YWx1ZS5sZW5ndGggLSAxXSkpKTtcbiAgfVxuXG4gIC8qKlxuICAgKiBbSW50ZXJuYWxdIEdldCB0aGUgZGVmYXVsdCB2YWx1ZSBvZiBhIHBhcmFtZXRlciwgd2hpY2ggbWF5IGJlIGFuIGluamVjdGFibGUgZnVuY3Rpb24uXG4gICAqL1xuICAkVXJsTWF0Y2hlckZhY3RvcnkuJCRnZXREZWZhdWx0VmFsdWUgPSBmdW5jdGlvbihjb25maWcpIHtcbiAgICBpZiAoIWlzSW5qZWN0YWJsZShjb25maWcudmFsdWUpKSByZXR1cm4gY29uZmlnLnZhbHVlO1xuICAgIGlmICghaW5qZWN0b3IpIHRocm93IG5ldyBFcnJvcihcIkluamVjdGFibGUgZnVuY3Rpb25zIGNhbm5vdCBiZSBjYWxsZWQgYXQgY29uZmlndXJhdGlvbiB0aW1lXCIpO1xuICAgIHJldHVybiBpbmplY3Rvci5pbnZva2UoY29uZmlnLnZhbHVlKTtcbiAgfTtcblxuICAvKipcbiAgICogQG5nZG9jIGZ1bmN0aW9uXG4gICAqIEBuYW1lIHVpLnJvdXRlci51dGlsLiR1cmxNYXRjaGVyRmFjdG9yeSNjYXNlSW5zZW5zaXRpdmVcbiAgICogQG1ldGhvZE9mIHVpLnJvdXRlci51dGlsLiR1cmxNYXRjaGVyRmFjdG9yeVxuICAgKlxuICAgKiBAZGVzY3JpcHRpb25cbiAgICogRGVmaW5lcyB3aGV0aGVyIFVSTCBtYXRjaGluZyBzaG91bGQgYmUgY2FzZSBzZW5zaXRpdmUgKHRoZSBkZWZhdWx0IGJlaGF2aW9yKSwgb3Igbm90LlxuICAgKlxuICAgKiBAcGFyYW0ge2Jvb2xlYW59IHZhbHVlIGBmYWxzZWAgdG8gbWF0Y2ggVVJMIGluIGEgY2FzZSBzZW5zaXRpdmUgbWFubmVyOyBvdGhlcndpc2UgYHRydWVgO1xuICAgKiBAcmV0dXJucyB7Ym9vbGVhbn0gdGhlIGN1cnJlbnQgdmFsdWUgb2YgY2FzZUluc2Vuc2l0aXZlXG4gICAqL1xuICB0aGlzLmNhc2VJbnNlbnNpdGl2ZSA9IGZ1bmN0aW9uKHZhbHVlKSB7XG4gICAgaWYgKGlzRGVmaW5lZCh2YWx1ZSkpXG4gICAgICBpc0Nhc2VJbnNlbnNpdGl2ZSA9IHZhbHVlO1xuICAgIHJldHVybiBpc0Nhc2VJbnNlbnNpdGl2ZTtcbiAgfTtcblxuICAvKipcbiAgICogQG5nZG9jIGZ1bmN0aW9uXG4gICAqIEBuYW1lIHVpLnJvdXRlci51dGlsLiR1cmxNYXRjaGVyRmFjdG9yeSNzdHJpY3RNb2RlXG4gICAqIEBtZXRob2RPZiB1aS5yb3V0ZXIudXRpbC4kdXJsTWF0Y2hlckZhY3RvcnlcbiAgICpcbiAgICogQGRlc2NyaXB0aW9uXG4gICAqIERlZmluZXMgd2hldGhlciBVUkxzIHNob3VsZCBtYXRjaCB0cmFpbGluZyBzbGFzaGVzLCBvciBub3QgKHRoZSBkZWZhdWx0IGJlaGF2aW9yKS5cbiAgICpcbiAgICogQHBhcmFtIHtib29sZWFuPX0gdmFsdWUgYGZhbHNlYCB0byBtYXRjaCB0cmFpbGluZyBzbGFzaGVzIGluIFVSTHMsIG90aGVyd2lzZSBgdHJ1ZWAuXG4gICAqIEByZXR1cm5zIHtib29sZWFufSB0aGUgY3VycmVudCB2YWx1ZSBvZiBzdHJpY3RNb2RlXG4gICAqL1xuICB0aGlzLnN0cmljdE1vZGUgPSBmdW5jdGlvbih2YWx1ZSkge1xuICAgIGlmIChpc0RlZmluZWQodmFsdWUpKVxuICAgICAgaXNTdHJpY3RNb2RlID0gdmFsdWU7XG4gICAgcmV0dXJuIGlzU3RyaWN0TW9kZTtcbiAgfTtcblxuICAvKipcbiAgICogQG5nZG9jIGZ1bmN0aW9uXG4gICAqIEBuYW1lIHVpLnJvdXRlci51dGlsLiR1cmxNYXRjaGVyRmFjdG9yeSNkZWZhdWx0U3F1YXNoUG9saWN5XG4gICAqIEBtZXRob2RPZiB1aS5yb3V0ZXIudXRpbC4kdXJsTWF0Y2hlckZhY3RvcnlcbiAgICpcbiAgICogQGRlc2NyaXB0aW9uXG4gICAqIFNldHMgdGhlIGRlZmF1bHQgYmVoYXZpb3Igd2hlbiBnZW5lcmF0aW5nIG9yIG1hdGNoaW5nIFVSTHMgd2l0aCBkZWZhdWx0IHBhcmFtZXRlciB2YWx1ZXMuXG4gICAqXG4gICAqIEBwYXJhbSB7c3RyaW5nfSB2YWx1ZSBBIHN0cmluZyB0aGF0IGRlZmluZXMgdGhlIGRlZmF1bHQgcGFyYW1ldGVyIFVSTCBzcXVhc2hpbmcgYmVoYXZpb3IuXG4gICAqICAgIGBub3NxdWFzaGA6IFdoZW4gZ2VuZXJhdGluZyBhbiBocmVmIHdpdGggYSBkZWZhdWx0IHBhcmFtZXRlciB2YWx1ZSwgZG8gbm90IHNxdWFzaCB0aGUgcGFyYW1ldGVyIHZhbHVlIGZyb20gdGhlIFVSTFxuICAgKiAgICBgc2xhc2hgOiBXaGVuIGdlbmVyYXRpbmcgYW4gaHJlZiB3aXRoIGEgZGVmYXVsdCBwYXJhbWV0ZXIgdmFsdWUsIHNxdWFzaCAocmVtb3ZlKSB0aGUgcGFyYW1ldGVyIHZhbHVlLCBhbmQsIGlmIHRoZVxuICAgKiAgICAgICAgICAgICBwYXJhbWV0ZXIgaXMgc3Vycm91bmRlZCBieSBzbGFzaGVzLCBzcXVhc2ggKHJlbW92ZSkgb25lIHNsYXNoIGZyb20gdGhlIFVSTFxuICAgKiAgICBhbnkgb3RoZXIgc3RyaW5nLCBlLmcuIFwiflwiOiBXaGVuIGdlbmVyYXRpbmcgYW4gaHJlZiB3aXRoIGEgZGVmYXVsdCBwYXJhbWV0ZXIgdmFsdWUsIHNxdWFzaCAocmVtb3ZlKVxuICAgKiAgICAgICAgICAgICB0aGUgcGFyYW1ldGVyIHZhbHVlIGZyb20gdGhlIFVSTCBhbmQgcmVwbGFjZSBpdCB3aXRoIHRoaXMgc3RyaW5nLlxuICAgKi9cbiAgdGhpcy5kZWZhdWx0U3F1YXNoUG9saWN5ID0gZnVuY3Rpb24odmFsdWUpIHtcbiAgICBpZiAoIWlzRGVmaW5lZCh2YWx1ZSkpIHJldHVybiBkZWZhdWx0U3F1YXNoUG9saWN5O1xuICAgIGlmICh2YWx1ZSAhPT0gdHJ1ZSAmJiB2YWx1ZSAhPT0gZmFsc2UgJiYgIWlzU3RyaW5nKHZhbHVlKSlcbiAgICAgIHRocm93IG5ldyBFcnJvcihcIkludmFsaWQgc3F1YXNoIHBvbGljeTogXCIgKyB2YWx1ZSArIFwiLiBWYWxpZCBwb2xpY2llczogZmFsc2UsIHRydWUsIGFyYml0cmFyeS1zdHJpbmdcIik7XG4gICAgZGVmYXVsdFNxdWFzaFBvbGljeSA9IHZhbHVlO1xuICAgIHJldHVybiB2YWx1ZTtcbiAgfTtcblxuICAvKipcbiAgICogQG5nZG9jIGZ1bmN0aW9uXG4gICAqIEBuYW1lIHVpLnJvdXRlci51dGlsLiR1cmxNYXRjaGVyRmFjdG9yeSNjb21waWxlXG4gICAqIEBtZXRob2RPZiB1aS5yb3V0ZXIudXRpbC4kdXJsTWF0Y2hlckZhY3RvcnlcbiAgICpcbiAgICogQGRlc2NyaXB0aW9uXG4gICAqIENyZWF0ZXMgYSB7QGxpbmsgdWkucm91dGVyLnV0aWwudHlwZTpVcmxNYXRjaGVyIGBVcmxNYXRjaGVyYH0gZm9yIHRoZSBzcGVjaWZpZWQgcGF0dGVybi5cbiAgICpcbiAgICogQHBhcmFtIHtzdHJpbmd9IHBhdHRlcm4gIFRoZSBVUkwgcGF0dGVybi5cbiAgICogQHBhcmFtIHtPYmplY3R9IGNvbmZpZyAgVGhlIGNvbmZpZyBvYmplY3QgaGFzaC5cbiAgICogQHJldHVybnMge1VybE1hdGNoZXJ9ICBUaGUgVXJsTWF0Y2hlci5cbiAgICovXG4gIHRoaXMuY29tcGlsZSA9IGZ1bmN0aW9uIChwYXR0ZXJuLCBjb25maWcpIHtcbiAgICByZXR1cm4gbmV3IFVybE1hdGNoZXIocGF0dGVybiwgZXh0ZW5kKGdldERlZmF1bHRDb25maWcoKSwgY29uZmlnKSk7XG4gIH07XG5cbiAgLyoqXG4gICAqIEBuZ2RvYyBmdW5jdGlvblxuICAgKiBAbmFtZSB1aS5yb3V0ZXIudXRpbC4kdXJsTWF0Y2hlckZhY3RvcnkjaXNNYXRjaGVyXG4gICAqIEBtZXRob2RPZiB1aS5yb3V0ZXIudXRpbC4kdXJsTWF0Y2hlckZhY3RvcnlcbiAgICpcbiAgICogQGRlc2NyaXB0aW9uXG4gICAqIFJldHVybnMgdHJ1ZSBpZiB0aGUgc3BlY2lmaWVkIG9iamVjdCBpcyBhIGBVcmxNYXRjaGVyYCwgb3IgZmFsc2Ugb3RoZXJ3aXNlLlxuICAgKlxuICAgKiBAcGFyYW0ge09iamVjdH0gb2JqZWN0ICBUaGUgb2JqZWN0IHRvIHBlcmZvcm0gdGhlIHR5cGUgY2hlY2sgYWdhaW5zdC5cbiAgICogQHJldHVybnMge0Jvb2xlYW59ICBSZXR1cm5zIGB0cnVlYCBpZiB0aGUgb2JqZWN0IG1hdGNoZXMgdGhlIGBVcmxNYXRjaGVyYCBpbnRlcmZhY2UsIGJ5XG4gICAqICAgICAgICAgIGltcGxlbWVudGluZyBhbGwgdGhlIHNhbWUgbWV0aG9kcy5cbiAgICovXG4gIHRoaXMuaXNNYXRjaGVyID0gZnVuY3Rpb24gKG8pIHtcbiAgICBpZiAoIWlzT2JqZWN0KG8pKSByZXR1cm4gZmFsc2U7XG4gICAgdmFyIHJlc3VsdCA9IHRydWU7XG5cbiAgICBmb3JFYWNoKFVybE1hdGNoZXIucHJvdG90eXBlLCBmdW5jdGlvbih2YWwsIG5hbWUpIHtcbiAgICAgIGlmIChpc0Z1bmN0aW9uKHZhbCkpIHtcbiAgICAgICAgcmVzdWx0ID0gcmVzdWx0ICYmIChpc0RlZmluZWQob1tuYW1lXSkgJiYgaXNGdW5jdGlvbihvW25hbWVdKSk7XG4gICAgICB9XG4gICAgfSk7XG4gICAgcmV0dXJuIHJlc3VsdDtcbiAgfTtcblxuICAvKipcbiAgICogQG5nZG9jIGZ1bmN0aW9uXG4gICAqIEBuYW1lIHVpLnJvdXRlci51dGlsLiR1cmxNYXRjaGVyRmFjdG9yeSN0eXBlXG4gICAqIEBtZXRob2RPZiB1aS5yb3V0ZXIudXRpbC4kdXJsTWF0Y2hlckZhY3RvcnlcbiAgICpcbiAgICogQGRlc2NyaXB0aW9uXG4gICAqIFJlZ2lzdGVycyBhIGN1c3RvbSB7QGxpbmsgdWkucm91dGVyLnV0aWwudHlwZTpUeXBlIGBUeXBlYH0gb2JqZWN0IHRoYXQgY2FuIGJlIHVzZWQgdG9cbiAgICogZ2VuZXJhdGUgVVJMcyB3aXRoIHR5cGVkIHBhcmFtZXRlcnMuXG4gICAqXG4gICAqIEBwYXJhbSB7c3RyaW5nfSBuYW1lICBUaGUgdHlwZSBuYW1lLlxuICAgKiBAcGFyYW0ge09iamVjdHxGdW5jdGlvbn0gZGVmaW5pdGlvbiAgIFRoZSB0eXBlIGRlZmluaXRpb24uIFNlZVxuICAgKiAgICAgICAge0BsaW5rIHVpLnJvdXRlci51dGlsLnR5cGU6VHlwZSBgVHlwZWB9IGZvciBpbmZvcm1hdGlvbiBvbiB0aGUgdmFsdWVzIGFjY2VwdGVkLlxuICAgKiBAcGFyYW0ge09iamVjdHxGdW5jdGlvbn0gZGVmaW5pdGlvbkZuIChvcHRpb25hbCkgQSBmdW5jdGlvbiB0aGF0IGlzIGluamVjdGVkIGJlZm9yZSB0aGUgYXBwXG4gICAqICAgICAgICBydW50aW1lIHN0YXJ0cy4gIFRoZSByZXN1bHQgb2YgdGhpcyBmdW5jdGlvbiBpcyBtZXJnZWQgaW50byB0aGUgZXhpc3RpbmcgYGRlZmluaXRpb25gLlxuICAgKiAgICAgICAgU2VlIHtAbGluayB1aS5yb3V0ZXIudXRpbC50eXBlOlR5cGUgYFR5cGVgfSBmb3IgaW5mb3JtYXRpb24gb24gdGhlIHZhbHVlcyBhY2NlcHRlZC5cbiAgICpcbiAgICogQHJldHVybnMge09iamVjdH0gIFJldHVybnMgYCR1cmxNYXRjaGVyRmFjdG9yeVByb3ZpZGVyYC5cbiAgICpcbiAgICogQGV4YW1wbGVcbiAgICogVGhpcyBpcyBhIHNpbXBsZSBleGFtcGxlIG9mIGEgY3VzdG9tIHR5cGUgdGhhdCBlbmNvZGVzIGFuZCBkZWNvZGVzIGl0ZW1zIGZyb20gYW5cbiAgICogYXJyYXksIHVzaW5nIHRoZSBhcnJheSBpbmRleCBhcyB0aGUgVVJMLWVuY29kZWQgdmFsdWU6XG4gICAqXG4gICAqIDxwcmU+XG4gICAqIHZhciBsaXN0ID0gWydKb2huJywgJ1BhdWwnLCAnR2VvcmdlJywgJ1JpbmdvJ107XG4gICAqXG4gICAqICR1cmxNYXRjaGVyRmFjdG9yeVByb3ZpZGVyLnR5cGUoJ2xpc3RJdGVtJywge1xuICAgKiAgIGVuY29kZTogZnVuY3Rpb24oaXRlbSkge1xuICAgKiAgICAgLy8gUmVwcmVzZW50IHRoZSBsaXN0IGl0ZW0gaW4gdGhlIFVSTCB1c2luZyBpdHMgY29ycmVzcG9uZGluZyBpbmRleFxuICAgKiAgICAgcmV0dXJuIGxpc3QuaW5kZXhPZihpdGVtKTtcbiAgICogICB9LFxuICAgKiAgIGRlY29kZTogZnVuY3Rpb24oaXRlbSkge1xuICAgKiAgICAgLy8gTG9vayB1cCB0aGUgbGlzdCBpdGVtIGJ5IGluZGV4XG4gICAqICAgICByZXR1cm4gbGlzdFtwYXJzZUludChpdGVtLCAxMCldO1xuICAgKiAgIH0sXG4gICAqICAgaXM6IGZ1bmN0aW9uKGl0ZW0pIHtcbiAgICogICAgIC8vIEVuc3VyZSB0aGUgaXRlbSBpcyB2YWxpZCBieSBjaGVja2luZyB0byBzZWUgdGhhdCBpdCBhcHBlYXJzXG4gICAqICAgICAvLyBpbiB0aGUgbGlzdFxuICAgKiAgICAgcmV0dXJuIGxpc3QuaW5kZXhPZihpdGVtKSA+IC0xO1xuICAgKiAgIH1cbiAgICogfSk7XG4gICAqXG4gICAqICRzdGF0ZVByb3ZpZGVyLnN0YXRlKCdsaXN0Jywge1xuICAgKiAgIHVybDogXCIvbGlzdC97aXRlbTpsaXN0SXRlbX1cIixcbiAgICogICBjb250cm9sbGVyOiBmdW5jdGlvbigkc2NvcGUsICRzdGF0ZVBhcmFtcykge1xuICAgKiAgICAgY29uc29sZS5sb2coJHN0YXRlUGFyYW1zLml0ZW0pO1xuICAgKiAgIH1cbiAgICogfSk7XG4gICAqXG4gICAqIC8vIC4uLlxuICAgKlxuICAgKiAvLyBDaGFuZ2VzIFVSTCB0byAnL2xpc3QvMycsIGxvZ3MgXCJSaW5nb1wiIHRvIHRoZSBjb25zb2xlXG4gICAqICRzdGF0ZS5nbygnbGlzdCcsIHsgaXRlbTogXCJSaW5nb1wiIH0pO1xuICAgKiA8L3ByZT5cbiAgICpcbiAgICogVGhpcyBpcyBhIG1vcmUgY29tcGxleCBleGFtcGxlIG9mIGEgdHlwZSB0aGF0IHJlbGllcyBvbiBkZXBlbmRlbmN5IGluamVjdGlvbiB0b1xuICAgKiBpbnRlcmFjdCB3aXRoIHNlcnZpY2VzLCBhbmQgdXNlcyB0aGUgcGFyYW1ldGVyIG5hbWUgZnJvbSB0aGUgVVJMIHRvIGluZmVyIGhvdyB0b1xuICAgKiBoYW5kbGUgZW5jb2RpbmcgYW5kIGRlY29kaW5nIHBhcmFtZXRlciB2YWx1ZXM6XG4gICAqXG4gICAqIDxwcmU+XG4gICAqIC8vIERlZmluZXMgYSBjdXN0b20gdHlwZSB0aGF0IGdldHMgYSB2YWx1ZSBmcm9tIGEgc2VydmljZSxcbiAgICogLy8gd2hlcmUgZWFjaCBzZXJ2aWNlIGdldHMgZGlmZmVyZW50IHR5cGVzIG9mIHZhbHVlcyBmcm9tXG4gICAqIC8vIGEgYmFja2VuZCBBUEk6XG4gICAqICR1cmxNYXRjaGVyRmFjdG9yeVByb3ZpZGVyLnR5cGUoJ2RiT2JqZWN0Jywge30sIGZ1bmN0aW9uKFVzZXJzLCBQb3N0cykge1xuICAgKlxuICAgKiAgIC8vIE1hdGNoZXMgdXAgc2VydmljZXMgdG8gVVJMIHBhcmFtZXRlciBuYW1lc1xuICAgKiAgIHZhciBzZXJ2aWNlcyA9IHtcbiAgICogICAgIHVzZXI6IFVzZXJzLFxuICAgKiAgICAgcG9zdDogUG9zdHNcbiAgICogICB9O1xuICAgKlxuICAgKiAgIHJldHVybiB7XG4gICAqICAgICBlbmNvZGU6IGZ1bmN0aW9uKG9iamVjdCkge1xuICAgKiAgICAgICAvLyBSZXByZXNlbnQgdGhlIG9iamVjdCBpbiB0aGUgVVJMIHVzaW5nIGl0cyB1bmlxdWUgSURcbiAgICogICAgICAgcmV0dXJuIG9iamVjdC5pZDtcbiAgICogICAgIH0sXG4gICAqICAgICBkZWNvZGU6IGZ1bmN0aW9uKHZhbHVlLCBrZXkpIHtcbiAgICogICAgICAgLy8gTG9vayB1cCB0aGUgb2JqZWN0IGJ5IElELCB1c2luZyB0aGUgcGFyYW1ldGVyXG4gICAqICAgICAgIC8vIG5hbWUgKGtleSkgdG8gY2FsbCB0aGUgY29ycmVjdCBzZXJ2aWNlXG4gICAqICAgICAgIHJldHVybiBzZXJ2aWNlc1trZXldLmZpbmRCeUlkKHZhbHVlKTtcbiAgICogICAgIH0sXG4gICAqICAgICBpczogZnVuY3Rpb24ob2JqZWN0LCBrZXkpIHtcbiAgICogICAgICAgLy8gQ2hlY2sgdGhhdCBvYmplY3QgaXMgYSB2YWxpZCBkYk9iamVjdFxuICAgKiAgICAgICByZXR1cm4gYW5ndWxhci5pc09iamVjdChvYmplY3QpICYmIG9iamVjdC5pZCAmJiBzZXJ2aWNlc1trZXldO1xuICAgKiAgICAgfVxuICAgKiAgICAgZXF1YWxzOiBmdW5jdGlvbihhLCBiKSB7XG4gICAqICAgICAgIC8vIENoZWNrIHRoZSBlcXVhbGl0eSBvZiBkZWNvZGVkIG9iamVjdHMgYnkgY29tcGFyaW5nXG4gICAqICAgICAgIC8vIHRoZWlyIHVuaXF1ZSBJRHNcbiAgICogICAgICAgcmV0dXJuIGEuaWQgPT09IGIuaWQ7XG4gICAqICAgICB9XG4gICAqICAgfTtcbiAgICogfSk7XG4gICAqXG4gICAqIC8vIEluIGEgY29uZmlnKCkgYmxvY2ssIHlvdSBjYW4gdGhlbiBhdHRhY2ggVVJMcyB3aXRoXG4gICAqIC8vIHR5cGUtYW5ub3RhdGVkIHBhcmFtZXRlcnM6XG4gICAqICRzdGF0ZVByb3ZpZGVyLnN0YXRlKCd1c2VycycsIHtcbiAgICogICB1cmw6IFwiL3VzZXJzXCIsXG4gICAqICAgLy8gLi4uXG4gICAqIH0pLnN0YXRlKCd1c2Vycy5pdGVtJywge1xuICAgKiAgIHVybDogXCIve3VzZXI6ZGJPYmplY3R9XCIsXG4gICAqICAgY29udHJvbGxlcjogZnVuY3Rpb24oJHNjb3BlLCAkc3RhdGVQYXJhbXMpIHtcbiAgICogICAgIC8vICRzdGF0ZVBhcmFtcy51c2VyIHdpbGwgbm93IGJlIGFuIG9iamVjdCByZXR1cm5lZCBmcm9tXG4gICAqICAgICAvLyB0aGUgVXNlcnMgc2VydmljZVxuICAgKiAgIH0sXG4gICAqICAgLy8gLi4uXG4gICAqIH0pO1xuICAgKiA8L3ByZT5cbiAgICovXG4gIHRoaXMudHlwZSA9IGZ1bmN0aW9uIChuYW1lLCBkZWZpbml0aW9uLCBkZWZpbml0aW9uRm4pIHtcbiAgICBpZiAoIWlzRGVmaW5lZChkZWZpbml0aW9uKSkgcmV0dXJuICR0eXBlc1tuYW1lXTtcbiAgICBpZiAoJHR5cGVzLmhhc093blByb3BlcnR5KG5hbWUpKSB0aHJvdyBuZXcgRXJyb3IoXCJBIHR5cGUgbmFtZWQgJ1wiICsgbmFtZSArIFwiJyBoYXMgYWxyZWFkeSBiZWVuIGRlZmluZWQuXCIpO1xuXG4gICAgJHR5cGVzW25hbWVdID0gbmV3IFR5cGUoZXh0ZW5kKHsgbmFtZTogbmFtZSB9LCBkZWZpbml0aW9uKSk7XG4gICAgaWYgKGRlZmluaXRpb25Gbikge1xuICAgICAgdHlwZVF1ZXVlLnB1c2goeyBuYW1lOiBuYW1lLCBkZWY6IGRlZmluaXRpb25GbiB9KTtcbiAgICAgIGlmICghZW5xdWV1ZSkgZmx1c2hUeXBlUXVldWUoKTtcbiAgICB9XG4gICAgcmV0dXJuIHRoaXM7XG4gIH07XG5cbiAgLy8gYGZsdXNoVHlwZVF1ZXVlKClgIHdhaXRzIHVudGlsIGAkdXJsTWF0Y2hlckZhY3RvcnlgIGlzIGluamVjdGVkIGJlZm9yZSBpbnZva2luZyB0aGUgcXVldWVkIGBkZWZpbml0aW9uRm5gc1xuICBmdW5jdGlvbiBmbHVzaFR5cGVRdWV1ZSgpIHtcbiAgICB3aGlsZSh0eXBlUXVldWUubGVuZ3RoKSB7XG4gICAgICB2YXIgdHlwZSA9IHR5cGVRdWV1ZS5zaGlmdCgpO1xuICAgICAgaWYgKHR5cGUucGF0dGVybikgdGhyb3cgbmV3IEVycm9yKFwiWW91IGNhbm5vdCBvdmVycmlkZSBhIHR5cGUncyAucGF0dGVybiBhdCBydW50aW1lLlwiKTtcbiAgICAgIGFuZ3VsYXIuZXh0ZW5kKCR0eXBlc1t0eXBlLm5hbWVdLCBpbmplY3Rvci5pbnZva2UodHlwZS5kZWYpKTtcbiAgICB9XG4gIH1cblxuICAvLyBSZWdpc3RlciBkZWZhdWx0IHR5cGVzLiBTdG9yZSB0aGVtIGluIHRoZSBwcm90b3R5cGUgb2YgJHR5cGVzLlxuICBmb3JFYWNoKGRlZmF1bHRUeXBlcywgZnVuY3Rpb24odHlwZSwgbmFtZSkgeyAkdHlwZXNbbmFtZV0gPSBuZXcgVHlwZShleHRlbmQoe25hbWU6IG5hbWV9LCB0eXBlKSk7IH0pO1xuICAkdHlwZXMgPSBpbmhlcml0KCR0eXBlcywge30pO1xuXG4gIC8qIE5vIG5lZWQgdG8gZG9jdW1lbnQgJGdldCwgc2luY2UgaXQgcmV0dXJucyB0aGlzICovXG4gIHRoaXMuJGdldCA9IFsnJGluamVjdG9yJywgZnVuY3Rpb24gKCRpbmplY3Rvcikge1xuICAgIGluamVjdG9yID0gJGluamVjdG9yO1xuICAgIGVucXVldWUgPSBmYWxzZTtcbiAgICBmbHVzaFR5cGVRdWV1ZSgpO1xuXG4gICAgZm9yRWFjaChkZWZhdWx0VHlwZXMsIGZ1bmN0aW9uKHR5cGUsIG5hbWUpIHtcbiAgICAgIGlmICghJHR5cGVzW25hbWVdKSAkdHlwZXNbbmFtZV0gPSBuZXcgVHlwZSh0eXBlKTtcbiAgICB9KTtcbiAgICByZXR1cm4gdGhpcztcbiAgfV07XG5cbiAgdGhpcy5QYXJhbSA9IGZ1bmN0aW9uIFBhcmFtKGlkLCB0eXBlLCBjb25maWcsIGxvY2F0aW9uKSB7XG4gICAgdmFyIHNlbGYgPSB0aGlzO1xuICAgIGNvbmZpZyA9IHVud3JhcFNob3J0aGFuZChjb25maWcpO1xuICAgIHR5cGUgPSBnZXRUeXBlKGNvbmZpZywgdHlwZSwgbG9jYXRpb24pO1xuICAgIHZhciBhcnJheU1vZGUgPSBnZXRBcnJheU1vZGUoKTtcbiAgICB0eXBlID0gYXJyYXlNb2RlID8gdHlwZS4kYXNBcnJheShhcnJheU1vZGUsIGxvY2F0aW9uID09PSBcInNlYXJjaFwiKSA6IHR5cGU7XG4gICAgaWYgKHR5cGUubmFtZSA9PT0gXCJzdHJpbmdcIiAmJiAhYXJyYXlNb2RlICYmIGxvY2F0aW9uID09PSBcInBhdGhcIiAmJiBjb25maWcudmFsdWUgPT09IHVuZGVmaW5lZClcbiAgICAgIGNvbmZpZy52YWx1ZSA9IFwiXCI7IC8vIGZvciAwLjIueDsgaW4gMC4zLjArIGRvIG5vdCBhdXRvbWF0aWNhbGx5IGRlZmF1bHQgdG8gXCJcIlxuICAgIHZhciBpc09wdGlvbmFsID0gY29uZmlnLnZhbHVlICE9PSB1bmRlZmluZWQ7XG4gICAgdmFyIHNxdWFzaCA9IGdldFNxdWFzaFBvbGljeShjb25maWcsIGlzT3B0aW9uYWwpO1xuICAgIHZhciByZXBsYWNlID0gZ2V0UmVwbGFjZShjb25maWcsIGFycmF5TW9kZSwgaXNPcHRpb25hbCwgc3F1YXNoKTtcblxuICAgIGZ1bmN0aW9uIHVud3JhcFNob3J0aGFuZChjb25maWcpIHtcbiAgICAgIHZhciBrZXlzID0gaXNPYmplY3QoY29uZmlnKSA/IG9iamVjdEtleXMoY29uZmlnKSA6IFtdO1xuICAgICAgdmFyIGlzU2hvcnRoYW5kID0gaW5kZXhPZihrZXlzLCBcInZhbHVlXCIpID09PSAtMSAmJiBpbmRleE9mKGtleXMsIFwidHlwZVwiKSA9PT0gLTEgJiZcbiAgICAgICAgICAgICAgICAgICAgICAgIGluZGV4T2Yoa2V5cywgXCJzcXVhc2hcIikgPT09IC0xICYmIGluZGV4T2Yoa2V5cywgXCJhcnJheVwiKSA9PT0gLTE7XG4gICAgICBpZiAoaXNTaG9ydGhhbmQpIGNvbmZpZyA9IHsgdmFsdWU6IGNvbmZpZyB9O1xuICAgICAgY29uZmlnLiQkZm4gPSBpc0luamVjdGFibGUoY29uZmlnLnZhbHVlKSA/IGNvbmZpZy52YWx1ZSA6IGZ1bmN0aW9uICgpIHsgcmV0dXJuIGNvbmZpZy52YWx1ZTsgfTtcbiAgICAgIHJldHVybiBjb25maWc7XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gZ2V0VHlwZShjb25maWcsIHVybFR5cGUsIGxvY2F0aW9uKSB7XG4gICAgICBpZiAoY29uZmlnLnR5cGUgJiYgdXJsVHlwZSkgdGhyb3cgbmV3IEVycm9yKFwiUGFyYW0gJ1wiK2lkK1wiJyBoYXMgdHdvIHR5cGUgY29uZmlndXJhdGlvbnMuXCIpO1xuICAgICAgaWYgKHVybFR5cGUpIHJldHVybiB1cmxUeXBlO1xuICAgICAgaWYgKCFjb25maWcudHlwZSkgcmV0dXJuIChsb2NhdGlvbiA9PT0gXCJjb25maWdcIiA/ICR0eXBlcy5hbnkgOiAkdHlwZXMuc3RyaW5nKTtcbiAgICAgIHJldHVybiBjb25maWcudHlwZSBpbnN0YW5jZW9mIFR5cGUgPyBjb25maWcudHlwZSA6IG5ldyBUeXBlKGNvbmZpZy50eXBlKTtcbiAgICB9XG5cbiAgICAvLyBhcnJheSBjb25maWc6IHBhcmFtIG5hbWUgKHBhcmFtW10pIG92ZXJyaWRlcyBkZWZhdWx0IHNldHRpbmdzLiAgZXhwbGljaXQgY29uZmlnIG92ZXJyaWRlcyBwYXJhbSBuYW1lLlxuICAgIGZ1bmN0aW9uIGdldEFycmF5TW9kZSgpIHtcbiAgICAgIHZhciBhcnJheURlZmF1bHRzID0geyBhcnJheTogKGxvY2F0aW9uID09PSBcInNlYXJjaFwiID8gXCJhdXRvXCIgOiBmYWxzZSkgfTtcbiAgICAgIHZhciBhcnJheVBhcmFtTm9tZW5jbGF0dXJlID0gaWQubWF0Y2goL1xcW1xcXSQvKSA/IHsgYXJyYXk6IHRydWUgfSA6IHt9O1xuICAgICAgcmV0dXJuIGV4dGVuZChhcnJheURlZmF1bHRzLCBhcnJheVBhcmFtTm9tZW5jbGF0dXJlLCBjb25maWcpLmFycmF5O1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIHJldHVybnMgZmFsc2UsIHRydWUsIG9yIHRoZSBzcXVhc2ggdmFsdWUgdG8gaW5kaWNhdGUgdGhlIFwiZGVmYXVsdCBwYXJhbWV0ZXIgdXJsIHNxdWFzaCBwb2xpY3lcIi5cbiAgICAgKi9cbiAgICBmdW5jdGlvbiBnZXRTcXVhc2hQb2xpY3koY29uZmlnLCBpc09wdGlvbmFsKSB7XG4gICAgICB2YXIgc3F1YXNoID0gY29uZmlnLnNxdWFzaDtcbiAgICAgIGlmICghaXNPcHRpb25hbCB8fCBzcXVhc2ggPT09IGZhbHNlKSByZXR1cm4gZmFsc2U7XG4gICAgICBpZiAoIWlzRGVmaW5lZChzcXVhc2gpIHx8IHNxdWFzaCA9PSBudWxsKSByZXR1cm4gZGVmYXVsdFNxdWFzaFBvbGljeTtcbiAgICAgIGlmIChzcXVhc2ggPT09IHRydWUgfHwgaXNTdHJpbmcoc3F1YXNoKSkgcmV0dXJuIHNxdWFzaDtcbiAgICAgIHRocm93IG5ldyBFcnJvcihcIkludmFsaWQgc3F1YXNoIHBvbGljeTogJ1wiICsgc3F1YXNoICsgXCInLiBWYWxpZCBwb2xpY2llczogZmFsc2UsIHRydWUsIG9yIGFyYml0cmFyeSBzdHJpbmdcIik7XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gZ2V0UmVwbGFjZShjb25maWcsIGFycmF5TW9kZSwgaXNPcHRpb25hbCwgc3F1YXNoKSB7XG4gICAgICB2YXIgcmVwbGFjZSwgY29uZmlndXJlZEtleXMsIGRlZmF1bHRQb2xpY3kgPSBbXG4gICAgICAgIHsgZnJvbTogXCJcIiwgICB0bzogKGlzT3B0aW9uYWwgfHwgYXJyYXlNb2RlID8gdW5kZWZpbmVkIDogXCJcIikgfSxcbiAgICAgICAgeyBmcm9tOiBudWxsLCB0bzogKGlzT3B0aW9uYWwgfHwgYXJyYXlNb2RlID8gdW5kZWZpbmVkIDogXCJcIikgfVxuICAgICAgXTtcbiAgICAgIHJlcGxhY2UgPSBpc0FycmF5KGNvbmZpZy5yZXBsYWNlKSA/IGNvbmZpZy5yZXBsYWNlIDogW107XG4gICAgICBpZiAoaXNTdHJpbmcoc3F1YXNoKSlcbiAgICAgICAgcmVwbGFjZS5wdXNoKHsgZnJvbTogc3F1YXNoLCB0bzogdW5kZWZpbmVkIH0pO1xuICAgICAgY29uZmlndXJlZEtleXMgPSBtYXAocmVwbGFjZSwgZnVuY3Rpb24oaXRlbSkgeyByZXR1cm4gaXRlbS5mcm9tOyB9ICk7XG4gICAgICByZXR1cm4gZmlsdGVyKGRlZmF1bHRQb2xpY3ksIGZ1bmN0aW9uKGl0ZW0pIHsgcmV0dXJuIGluZGV4T2YoY29uZmlndXJlZEtleXMsIGl0ZW0uZnJvbSkgPT09IC0xOyB9KS5jb25jYXQocmVwbGFjZSk7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogW0ludGVybmFsXSBHZXQgdGhlIGRlZmF1bHQgdmFsdWUgb2YgYSBwYXJhbWV0ZXIsIHdoaWNoIG1heSBiZSBhbiBpbmplY3RhYmxlIGZ1bmN0aW9uLlxuICAgICAqL1xuICAgIGZ1bmN0aW9uICQkZ2V0RGVmYXVsdFZhbHVlKCkge1xuICAgICAgaWYgKCFpbmplY3RvcikgdGhyb3cgbmV3IEVycm9yKFwiSW5qZWN0YWJsZSBmdW5jdGlvbnMgY2Fubm90IGJlIGNhbGxlZCBhdCBjb25maWd1cmF0aW9uIHRpbWVcIik7XG4gICAgICB2YXIgZGVmYXVsdFZhbHVlID0gaW5qZWN0b3IuaW52b2tlKGNvbmZpZy4kJGZuKTtcbiAgICAgIGlmIChkZWZhdWx0VmFsdWUgIT09IG51bGwgJiYgZGVmYXVsdFZhbHVlICE9PSB1bmRlZmluZWQgJiYgIXNlbGYudHlwZS5pcyhkZWZhdWx0VmFsdWUpKVxuICAgICAgICB0aHJvdyBuZXcgRXJyb3IoXCJEZWZhdWx0IHZhbHVlIChcIiArIGRlZmF1bHRWYWx1ZSArIFwiKSBmb3IgcGFyYW1ldGVyICdcIiArIHNlbGYuaWQgKyBcIicgaXMgbm90IGFuIGluc3RhbmNlIG9mIFR5cGUgKFwiICsgc2VsZi50eXBlLm5hbWUgKyBcIilcIik7XG4gICAgICByZXR1cm4gZGVmYXVsdFZhbHVlO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIFtJbnRlcm5hbF0gR2V0cyB0aGUgZGVjb2RlZCByZXByZXNlbnRhdGlvbiBvZiBhIHZhbHVlIGlmIHRoZSB2YWx1ZSBpcyBkZWZpbmVkLCBvdGhlcndpc2UsIHJldHVybnMgdGhlXG4gICAgICogZGVmYXVsdCB2YWx1ZSwgd2hpY2ggbWF5IGJlIHRoZSByZXN1bHQgb2YgYW4gaW5qZWN0YWJsZSBmdW5jdGlvbi5cbiAgICAgKi9cbiAgICBmdW5jdGlvbiAkdmFsdWUodmFsdWUpIHtcbiAgICAgIGZ1bmN0aW9uIGhhc1JlcGxhY2VWYWwodmFsKSB7IHJldHVybiBmdW5jdGlvbihvYmopIHsgcmV0dXJuIG9iai5mcm9tID09PSB2YWw7IH07IH1cbiAgICAgIGZ1bmN0aW9uICRyZXBsYWNlKHZhbHVlKSB7XG4gICAgICAgIHZhciByZXBsYWNlbWVudCA9IG1hcChmaWx0ZXIoc2VsZi5yZXBsYWNlLCBoYXNSZXBsYWNlVmFsKHZhbHVlKSksIGZ1bmN0aW9uKG9iaikgeyByZXR1cm4gb2JqLnRvOyB9KTtcbiAgICAgICAgcmV0dXJuIHJlcGxhY2VtZW50Lmxlbmd0aCA/IHJlcGxhY2VtZW50WzBdIDogdmFsdWU7XG4gICAgICB9XG4gICAgICB2YWx1ZSA9ICRyZXBsYWNlKHZhbHVlKTtcbiAgICAgIHJldHVybiAhaXNEZWZpbmVkKHZhbHVlKSA/ICQkZ2V0RGVmYXVsdFZhbHVlKCkgOiBzZWxmLnR5cGUuJG5vcm1hbGl6ZSh2YWx1ZSk7XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gdG9TdHJpbmcoKSB7IHJldHVybiBcIntQYXJhbTpcIiArIGlkICsgXCIgXCIgKyB0eXBlICsgXCIgc3F1YXNoOiAnXCIgKyBzcXVhc2ggKyBcIicgb3B0aW9uYWw6IFwiICsgaXNPcHRpb25hbCArIFwifVwiOyB9XG5cbiAgICBleHRlbmQodGhpcywge1xuICAgICAgaWQ6IGlkLFxuICAgICAgdHlwZTogdHlwZSxcbiAgICAgIGxvY2F0aW9uOiBsb2NhdGlvbixcbiAgICAgIGFycmF5OiBhcnJheU1vZGUsXG4gICAgICBzcXVhc2g6IHNxdWFzaCxcbiAgICAgIHJlcGxhY2U6IHJlcGxhY2UsXG4gICAgICBpc09wdGlvbmFsOiBpc09wdGlvbmFsLFxuICAgICAgdmFsdWU6ICR2YWx1ZSxcbiAgICAgIGR5bmFtaWM6IHVuZGVmaW5lZCxcbiAgICAgIGNvbmZpZzogY29uZmlnLFxuICAgICAgdG9TdHJpbmc6IHRvU3RyaW5nXG4gICAgfSk7XG4gIH07XG5cbiAgZnVuY3Rpb24gUGFyYW1TZXQocGFyYW1zKSB7XG4gICAgZXh0ZW5kKHRoaXMsIHBhcmFtcyB8fCB7fSk7XG4gIH1cblxuICBQYXJhbVNldC5wcm90b3R5cGUgPSB7XG4gICAgJCRuZXc6IGZ1bmN0aW9uKCkge1xuICAgICAgcmV0dXJuIGluaGVyaXQodGhpcywgZXh0ZW5kKG5ldyBQYXJhbVNldCgpLCB7ICQkcGFyZW50OiB0aGlzfSkpO1xuICAgIH0sXG4gICAgJCRrZXlzOiBmdW5jdGlvbiAoKSB7XG4gICAgICB2YXIga2V5cyA9IFtdLCBjaGFpbiA9IFtdLCBwYXJlbnQgPSB0aGlzLFxuICAgICAgICBpZ25vcmUgPSBvYmplY3RLZXlzKFBhcmFtU2V0LnByb3RvdHlwZSk7XG4gICAgICB3aGlsZSAocGFyZW50KSB7IGNoYWluLnB1c2gocGFyZW50KTsgcGFyZW50ID0gcGFyZW50LiQkcGFyZW50OyB9XG4gICAgICBjaGFpbi5yZXZlcnNlKCk7XG4gICAgICBmb3JFYWNoKGNoYWluLCBmdW5jdGlvbihwYXJhbXNldCkge1xuICAgICAgICBmb3JFYWNoKG9iamVjdEtleXMocGFyYW1zZXQpLCBmdW5jdGlvbihrZXkpIHtcbiAgICAgICAgICAgIGlmIChpbmRleE9mKGtleXMsIGtleSkgPT09IC0xICYmIGluZGV4T2YoaWdub3JlLCBrZXkpID09PSAtMSkga2V5cy5wdXNoKGtleSk7XG4gICAgICAgIH0pO1xuICAgICAgfSk7XG4gICAgICByZXR1cm4ga2V5cztcbiAgICB9LFxuICAgICQkdmFsdWVzOiBmdW5jdGlvbihwYXJhbVZhbHVlcykge1xuICAgICAgdmFyIHZhbHVlcyA9IHt9LCBzZWxmID0gdGhpcztcbiAgICAgIGZvckVhY2goc2VsZi4kJGtleXMoKSwgZnVuY3Rpb24oa2V5KSB7XG4gICAgICAgIHZhbHVlc1trZXldID0gc2VsZltrZXldLnZhbHVlKHBhcmFtVmFsdWVzICYmIHBhcmFtVmFsdWVzW2tleV0pO1xuICAgICAgfSk7XG4gICAgICByZXR1cm4gdmFsdWVzO1xuICAgIH0sXG4gICAgJCRlcXVhbHM6IGZ1bmN0aW9uKHBhcmFtVmFsdWVzMSwgcGFyYW1WYWx1ZXMyKSB7XG4gICAgICB2YXIgZXF1YWwgPSB0cnVlLCBzZWxmID0gdGhpcztcbiAgICAgIGZvckVhY2goc2VsZi4kJGtleXMoKSwgZnVuY3Rpb24oa2V5KSB7XG4gICAgICAgIHZhciBsZWZ0ID0gcGFyYW1WYWx1ZXMxICYmIHBhcmFtVmFsdWVzMVtrZXldLCByaWdodCA9IHBhcmFtVmFsdWVzMiAmJiBwYXJhbVZhbHVlczJba2V5XTtcbiAgICAgICAgaWYgKCFzZWxmW2tleV0udHlwZS5lcXVhbHMobGVmdCwgcmlnaHQpKSBlcXVhbCA9IGZhbHNlO1xuICAgICAgfSk7XG4gICAgICByZXR1cm4gZXF1YWw7XG4gICAgfSxcbiAgICAkJHZhbGlkYXRlczogZnVuY3Rpb24gJCR2YWxpZGF0ZShwYXJhbVZhbHVlcykge1xuICAgICAgdmFyIGtleXMgPSB0aGlzLiQka2V5cygpLCBpLCBwYXJhbSwgcmF3VmFsLCBub3JtYWxpemVkLCBlbmNvZGVkO1xuICAgICAgZm9yIChpID0gMDsgaSA8IGtleXMubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgcGFyYW0gPSB0aGlzW2tleXNbaV1dO1xuICAgICAgICByYXdWYWwgPSBwYXJhbVZhbHVlc1trZXlzW2ldXTtcbiAgICAgICAgaWYgKChyYXdWYWwgPT09IHVuZGVmaW5lZCB8fCByYXdWYWwgPT09IG51bGwpICYmIHBhcmFtLmlzT3B0aW9uYWwpXG4gICAgICAgICAgYnJlYWs7IC8vIFRoZXJlIHdhcyBubyBwYXJhbWV0ZXIgdmFsdWUsIGJ1dCB0aGUgcGFyYW0gaXMgb3B0aW9uYWxcbiAgICAgICAgbm9ybWFsaXplZCA9IHBhcmFtLnR5cGUuJG5vcm1hbGl6ZShyYXdWYWwpO1xuICAgICAgICBpZiAoIXBhcmFtLnR5cGUuaXMobm9ybWFsaXplZCkpXG4gICAgICAgICAgcmV0dXJuIGZhbHNlOyAvLyBUaGUgdmFsdWUgd2FzIG5vdCBvZiB0aGUgY29ycmVjdCBUeXBlLCBhbmQgY291bGQgbm90IGJlIGRlY29kZWQgdG8gdGhlIGNvcnJlY3QgVHlwZVxuICAgICAgICBlbmNvZGVkID0gcGFyYW0udHlwZS5lbmNvZGUobm9ybWFsaXplZCk7XG4gICAgICAgIGlmIChhbmd1bGFyLmlzU3RyaW5nKGVuY29kZWQpICYmICFwYXJhbS50eXBlLnBhdHRlcm4uZXhlYyhlbmNvZGVkKSlcbiAgICAgICAgICByZXR1cm4gZmFsc2U7IC8vIFRoZSB2YWx1ZSB3YXMgb2YgdGhlIGNvcnJlY3QgdHlwZSwgYnV0IHdoZW4gZW5jb2RlZCwgZGlkIG5vdCBtYXRjaCB0aGUgVHlwZSdzIHJlZ2V4cFxuICAgICAgfVxuICAgICAgcmV0dXJuIHRydWU7XG4gICAgfSxcbiAgICAkJHBhcmVudDogdW5kZWZpbmVkXG4gIH07XG5cbiAgdGhpcy5QYXJhbVNldCA9IFBhcmFtU2V0O1xufVxuXG4vLyBSZWdpc3RlciBhcyBhIHByb3ZpZGVyIHNvIGl0J3MgYXZhaWxhYmxlIHRvIG90aGVyIHByb3ZpZGVyc1xuYW5ndWxhci5tb2R1bGUoJ3VpLnJvdXRlci51dGlsJykucHJvdmlkZXIoJyR1cmxNYXRjaGVyRmFjdG9yeScsICRVcmxNYXRjaGVyRmFjdG9yeSk7XG5hbmd1bGFyLm1vZHVsZSgndWkucm91dGVyLnV0aWwnKS5ydW4oWyckdXJsTWF0Y2hlckZhY3RvcnknLCBmdW5jdGlvbigkdXJsTWF0Y2hlckZhY3RvcnkpIHsgfV0pO1xuXG4vKipcbiAqIEBuZ2RvYyBvYmplY3RcbiAqIEBuYW1lIHVpLnJvdXRlci5yb3V0ZXIuJHVybFJvdXRlclByb3ZpZGVyXG4gKlxuICogQHJlcXVpcmVzIHVpLnJvdXRlci51dGlsLiR1cmxNYXRjaGVyRmFjdG9yeVByb3ZpZGVyXG4gKiBAcmVxdWlyZXMgJGxvY2F0aW9uUHJvdmlkZXJcbiAqXG4gKiBAZGVzY3JpcHRpb25cbiAqIGAkdXJsUm91dGVyUHJvdmlkZXJgIGhhcyB0aGUgcmVzcG9uc2liaWxpdHkgb2Ygd2F0Y2hpbmcgYCRsb2NhdGlvbmAuIFxuICogV2hlbiBgJGxvY2F0aW9uYCBjaGFuZ2VzIGl0IHJ1bnMgdGhyb3VnaCBhIGxpc3Qgb2YgcnVsZXMgb25lIGJ5IG9uZSB1bnRpbCBhIFxuICogbWF0Y2ggaXMgZm91bmQuIGAkdXJsUm91dGVyUHJvdmlkZXJgIGlzIHVzZWQgYmVoaW5kIHRoZSBzY2VuZXMgYW55dGltZSB5b3Ugc3BlY2lmeSBcbiAqIGEgdXJsIGluIGEgc3RhdGUgY29uZmlndXJhdGlvbi4gQWxsIHVybHMgYXJlIGNvbXBpbGVkIGludG8gYSBVcmxNYXRjaGVyIG9iamVjdC5cbiAqXG4gKiBUaGVyZSBhcmUgc2V2ZXJhbCBtZXRob2RzIG9uIGAkdXJsUm91dGVyUHJvdmlkZXJgIHRoYXQgbWFrZSBpdCB1c2VmdWwgdG8gdXNlIGRpcmVjdGx5XG4gKiBpbiB5b3VyIG1vZHVsZSBjb25maWcuXG4gKi9cbiRVcmxSb3V0ZXJQcm92aWRlci4kaW5qZWN0ID0gWyckbG9jYXRpb25Qcm92aWRlcicsICckdXJsTWF0Y2hlckZhY3RvcnlQcm92aWRlciddO1xuZnVuY3Rpb24gJFVybFJvdXRlclByb3ZpZGVyKCAgICRsb2NhdGlvblByb3ZpZGVyLCAgICR1cmxNYXRjaGVyRmFjdG9yeSkge1xuICB2YXIgcnVsZXMgPSBbXSwgb3RoZXJ3aXNlID0gbnVsbCwgaW50ZXJjZXB0RGVmZXJyZWQgPSBmYWxzZSwgbGlzdGVuZXI7XG5cbiAgLy8gUmV0dXJucyBhIHN0cmluZyB0aGF0IGlzIGEgcHJlZml4IG9mIGFsbCBzdHJpbmdzIG1hdGNoaW5nIHRoZSBSZWdFeHBcbiAgZnVuY3Rpb24gcmVnRXhwUHJlZml4KHJlKSB7XG4gICAgdmFyIHByZWZpeCA9IC9eXFxeKCg/OlxcXFxbXmEtekEtWjAtOV18W15cXFxcXFxbXFxdXFxeJCorPy4oKXx7fV0rKSopLy5leGVjKHJlLnNvdXJjZSk7XG4gICAgcmV0dXJuIChwcmVmaXggIT0gbnVsbCkgPyBwcmVmaXhbMV0ucmVwbGFjZSgvXFxcXCguKS9nLCBcIiQxXCIpIDogJyc7XG4gIH1cblxuICAvLyBJbnRlcnBvbGF0ZXMgbWF0Y2hlZCB2YWx1ZXMgaW50byBhIFN0cmluZy5yZXBsYWNlKCktc3R5bGUgcGF0dGVyblxuICBmdW5jdGlvbiBpbnRlcnBvbGF0ZShwYXR0ZXJuLCBtYXRjaCkge1xuICAgIHJldHVybiBwYXR0ZXJuLnJlcGxhY2UoL1xcJChcXCR8XFxkezEsMn0pLywgZnVuY3Rpb24gKG0sIHdoYXQpIHtcbiAgICAgIHJldHVybiBtYXRjaFt3aGF0ID09PSAnJCcgPyAwIDogTnVtYmVyKHdoYXQpXTtcbiAgICB9KTtcbiAgfVxuXG4gIC8qKlxuICAgKiBAbmdkb2MgZnVuY3Rpb25cbiAgICogQG5hbWUgdWkucm91dGVyLnJvdXRlci4kdXJsUm91dGVyUHJvdmlkZXIjcnVsZVxuICAgKiBAbWV0aG9kT2YgdWkucm91dGVyLnJvdXRlci4kdXJsUm91dGVyUHJvdmlkZXJcbiAgICpcbiAgICogQGRlc2NyaXB0aW9uXG4gICAqIERlZmluZXMgcnVsZXMgdGhhdCBhcmUgdXNlZCBieSBgJHVybFJvdXRlclByb3ZpZGVyYCB0byBmaW5kIG1hdGNoZXMgZm9yXG4gICAqIHNwZWNpZmljIFVSTHMuXG4gICAqXG4gICAqIEBleGFtcGxlXG4gICAqIDxwcmU+XG4gICAqIHZhciBhcHAgPSBhbmd1bGFyLm1vZHVsZSgnYXBwJywgWyd1aS5yb3V0ZXIucm91dGVyJ10pO1xuICAgKlxuICAgKiBhcHAuY29uZmlnKGZ1bmN0aW9uICgkdXJsUm91dGVyUHJvdmlkZXIpIHtcbiAgICogICAvLyBIZXJlJ3MgYW4gZXhhbXBsZSBvZiBob3cgeW91IG1pZ2h0IGFsbG93IGNhc2UgaW5zZW5zaXRpdmUgdXJsc1xuICAgKiAgICR1cmxSb3V0ZXJQcm92aWRlci5ydWxlKGZ1bmN0aW9uICgkaW5qZWN0b3IsICRsb2NhdGlvbikge1xuICAgKiAgICAgdmFyIHBhdGggPSAkbG9jYXRpb24ucGF0aCgpLFxuICAgKiAgICAgICAgIG5vcm1hbGl6ZWQgPSBwYXRoLnRvTG93ZXJDYXNlKCk7XG4gICAqXG4gICAqICAgICBpZiAocGF0aCAhPT0gbm9ybWFsaXplZCkge1xuICAgKiAgICAgICByZXR1cm4gbm9ybWFsaXplZDtcbiAgICogICAgIH1cbiAgICogICB9KTtcbiAgICogfSk7XG4gICAqIDwvcHJlPlxuICAgKlxuICAgKiBAcGFyYW0ge29iamVjdH0gcnVsZSBIYW5kbGVyIGZ1bmN0aW9uIHRoYXQgdGFrZXMgYCRpbmplY3RvcmAgYW5kIGAkbG9jYXRpb25gXG4gICAqIHNlcnZpY2VzIGFzIGFyZ3VtZW50cy4gWW91IGNhbiB1c2UgdGhlbSB0byByZXR1cm4gYSB2YWxpZCBwYXRoIGFzIGEgc3RyaW5nLlxuICAgKlxuICAgKiBAcmV0dXJuIHtvYmplY3R9IGAkdXJsUm91dGVyUHJvdmlkZXJgIC0gYCR1cmxSb3V0ZXJQcm92aWRlcmAgaW5zdGFuY2VcbiAgICovXG4gIHRoaXMucnVsZSA9IGZ1bmN0aW9uIChydWxlKSB7XG4gICAgaWYgKCFpc0Z1bmN0aW9uKHJ1bGUpKSB0aHJvdyBuZXcgRXJyb3IoXCIncnVsZScgbXVzdCBiZSBhIGZ1bmN0aW9uXCIpO1xuICAgIHJ1bGVzLnB1c2gocnVsZSk7XG4gICAgcmV0dXJuIHRoaXM7XG4gIH07XG5cbiAgLyoqXG4gICAqIEBuZ2RvYyBvYmplY3RcbiAgICogQG5hbWUgdWkucm91dGVyLnJvdXRlci4kdXJsUm91dGVyUHJvdmlkZXIjb3RoZXJ3aXNlXG4gICAqIEBtZXRob2RPZiB1aS5yb3V0ZXIucm91dGVyLiR1cmxSb3V0ZXJQcm92aWRlclxuICAgKlxuICAgKiBAZGVzY3JpcHRpb25cbiAgICogRGVmaW5lcyBhIHBhdGggdGhhdCBpcyB1c2VkIHdoZW4gYW4gaW52YWxpZCByb3V0ZSBpcyByZXF1ZXN0ZWQuXG4gICAqXG4gICAqIEBleGFtcGxlXG4gICAqIDxwcmU+XG4gICAqIHZhciBhcHAgPSBhbmd1bGFyLm1vZHVsZSgnYXBwJywgWyd1aS5yb3V0ZXIucm91dGVyJ10pO1xuICAgKlxuICAgKiBhcHAuY29uZmlnKGZ1bmN0aW9uICgkdXJsUm91dGVyUHJvdmlkZXIpIHtcbiAgICogICAvLyBpZiB0aGUgcGF0aCBkb2Vzbid0IG1hdGNoIGFueSBvZiB0aGUgdXJscyB5b3UgY29uZmlndXJlZFxuICAgKiAgIC8vIG90aGVyd2lzZSB3aWxsIHRha2UgY2FyZSBvZiByb3V0aW5nIHRoZSB1c2VyIHRvIHRoZVxuICAgKiAgIC8vIHNwZWNpZmllZCB1cmxcbiAgICogICAkdXJsUm91dGVyUHJvdmlkZXIub3RoZXJ3aXNlKCcvaW5kZXgnKTtcbiAgICpcbiAgICogICAvLyBFeGFtcGxlIG9mIHVzaW5nIGZ1bmN0aW9uIHJ1bGUgYXMgcGFyYW1cbiAgICogICAkdXJsUm91dGVyUHJvdmlkZXIub3RoZXJ3aXNlKGZ1bmN0aW9uICgkaW5qZWN0b3IsICRsb2NhdGlvbikge1xuICAgKiAgICAgcmV0dXJuICcvYS92YWxpZC91cmwnO1xuICAgKiAgIH0pO1xuICAgKiB9KTtcbiAgICogPC9wcmU+XG4gICAqXG4gICAqIEBwYXJhbSB7c3RyaW5nfG9iamVjdH0gcnVsZSBUaGUgdXJsIHBhdGggeW91IHdhbnQgdG8gcmVkaXJlY3QgdG8gb3IgYSBmdW5jdGlvbiBcbiAgICogcnVsZSB0aGF0IHJldHVybnMgdGhlIHVybCBwYXRoLiBUaGUgZnVuY3Rpb24gdmVyc2lvbiBpcyBwYXNzZWQgdHdvIHBhcmFtczogXG4gICAqIGAkaW5qZWN0b3JgIGFuZCBgJGxvY2F0aW9uYCBzZXJ2aWNlcywgYW5kIG11c3QgcmV0dXJuIGEgdXJsIHN0cmluZy5cbiAgICpcbiAgICogQHJldHVybiB7b2JqZWN0fSBgJHVybFJvdXRlclByb3ZpZGVyYCAtIGAkdXJsUm91dGVyUHJvdmlkZXJgIGluc3RhbmNlXG4gICAqL1xuICB0aGlzLm90aGVyd2lzZSA9IGZ1bmN0aW9uIChydWxlKSB7XG4gICAgaWYgKGlzU3RyaW5nKHJ1bGUpKSB7XG4gICAgICB2YXIgcmVkaXJlY3QgPSBydWxlO1xuICAgICAgcnVsZSA9IGZ1bmN0aW9uICgpIHsgcmV0dXJuIHJlZGlyZWN0OyB9O1xuICAgIH1cbiAgICBlbHNlIGlmICghaXNGdW5jdGlvbihydWxlKSkgdGhyb3cgbmV3IEVycm9yKFwiJ3J1bGUnIG11c3QgYmUgYSBmdW5jdGlvblwiKTtcbiAgICBvdGhlcndpc2UgPSBydWxlO1xuICAgIHJldHVybiB0aGlzO1xuICB9O1xuXG5cbiAgZnVuY3Rpb24gaGFuZGxlSWZNYXRjaCgkaW5qZWN0b3IsIGhhbmRsZXIsIG1hdGNoKSB7XG4gICAgaWYgKCFtYXRjaCkgcmV0dXJuIGZhbHNlO1xuICAgIHZhciByZXN1bHQgPSAkaW5qZWN0b3IuaW52b2tlKGhhbmRsZXIsIGhhbmRsZXIsIHsgJG1hdGNoOiBtYXRjaCB9KTtcbiAgICByZXR1cm4gaXNEZWZpbmVkKHJlc3VsdCkgPyByZXN1bHQgOiB0cnVlO1xuICB9XG5cbiAgLyoqXG4gICAqIEBuZ2RvYyBmdW5jdGlvblxuICAgKiBAbmFtZSB1aS5yb3V0ZXIucm91dGVyLiR1cmxSb3V0ZXJQcm92aWRlciN3aGVuXG4gICAqIEBtZXRob2RPZiB1aS5yb3V0ZXIucm91dGVyLiR1cmxSb3V0ZXJQcm92aWRlclxuICAgKlxuICAgKiBAZGVzY3JpcHRpb25cbiAgICogUmVnaXN0ZXJzIGEgaGFuZGxlciBmb3IgYSBnaXZlbiB1cmwgbWF0Y2hpbmcuIGlmIGhhbmRsZSBpcyBhIHN0cmluZywgaXQgaXNcbiAgICogdHJlYXRlZCBhcyBhIHJlZGlyZWN0LCBhbmQgaXMgaW50ZXJwb2xhdGVkIGFjY29yZGluZyB0byB0aGUgc3ludGF4IG9mIG1hdGNoXG4gICAqIChpLmUuIGxpa2UgYFN0cmluZy5yZXBsYWNlKClgIGZvciBgUmVnRXhwYCwgb3IgbGlrZSBhIGBVcmxNYXRjaGVyYCBwYXR0ZXJuIG90aGVyd2lzZSkuXG4gICAqXG4gICAqIElmIHRoZSBoYW5kbGVyIGlzIGEgZnVuY3Rpb24sIGl0IGlzIGluamVjdGFibGUuIEl0IGdldHMgaW52b2tlZCBpZiBgJGxvY2F0aW9uYFxuICAgKiBtYXRjaGVzLiBZb3UgaGF2ZSB0aGUgb3B0aW9uIG9mIGluamVjdCB0aGUgbWF0Y2ggb2JqZWN0IGFzIGAkbWF0Y2hgLlxuICAgKlxuICAgKiBUaGUgaGFuZGxlciBjYW4gcmV0dXJuXG4gICAqXG4gICAqIC0gKipmYWxzeSoqIHRvIGluZGljYXRlIHRoYXQgdGhlIHJ1bGUgZGlkbid0IG1hdGNoIGFmdGVyIGFsbCwgdGhlbiBgJHVybFJvdXRlcmBcbiAgICogICB3aWxsIGNvbnRpbnVlIHRyeWluZyB0byBmaW5kIGFub3RoZXIgb25lIHRoYXQgbWF0Y2hlcy5cbiAgICogLSAqKnN0cmluZyoqIHdoaWNoIGlzIHRyZWF0ZWQgYXMgYSByZWRpcmVjdCBhbmQgcGFzc2VkIHRvIGAkbG9jYXRpb24udXJsKClgXG4gICAqIC0gKip2b2lkKiogb3IgYW55ICoqdHJ1dGh5KiogdmFsdWUgdGVsbHMgYCR1cmxSb3V0ZXJgIHRoYXQgdGhlIHVybCB3YXMgaGFuZGxlZC5cbiAgICpcbiAgICogQGV4YW1wbGVcbiAgICogPHByZT5cbiAgICogdmFyIGFwcCA9IGFuZ3VsYXIubW9kdWxlKCdhcHAnLCBbJ3VpLnJvdXRlci5yb3V0ZXInXSk7XG4gICAqXG4gICAqIGFwcC5jb25maWcoZnVuY3Rpb24gKCR1cmxSb3V0ZXJQcm92aWRlcikge1xuICAgKiAgICR1cmxSb3V0ZXJQcm92aWRlci53aGVuKCRzdGF0ZS51cmwsIGZ1bmN0aW9uICgkbWF0Y2gsICRzdGF0ZVBhcmFtcykge1xuICAgKiAgICAgaWYgKCRzdGF0ZS4kY3VycmVudC5uYXZpZ2FibGUgIT09IHN0YXRlIHx8XG4gICAqICAgICAgICAgIWVxdWFsRm9yS2V5cygkbWF0Y2gsICRzdGF0ZVBhcmFtcykge1xuICAgKiAgICAgICRzdGF0ZS50cmFuc2l0aW9uVG8oc3RhdGUsICRtYXRjaCwgZmFsc2UpO1xuICAgKiAgICAgfVxuICAgKiAgIH0pO1xuICAgKiB9KTtcbiAgICogPC9wcmU+XG4gICAqXG4gICAqIEBwYXJhbSB7c3RyaW5nfG9iamVjdH0gd2hhdCBUaGUgaW5jb21pbmcgcGF0aCB0aGF0IHlvdSB3YW50IHRvIHJlZGlyZWN0LlxuICAgKiBAcGFyYW0ge3N0cmluZ3xvYmplY3R9IGhhbmRsZXIgVGhlIHBhdGggeW91IHdhbnQgdG8gcmVkaXJlY3QgeW91ciB1c2VyIHRvLlxuICAgKi9cbiAgdGhpcy53aGVuID0gZnVuY3Rpb24gKHdoYXQsIGhhbmRsZXIpIHtcbiAgICB2YXIgcmVkaXJlY3QsIGhhbmRsZXJJc1N0cmluZyA9IGlzU3RyaW5nKGhhbmRsZXIpO1xuICAgIGlmIChpc1N0cmluZyh3aGF0KSkgd2hhdCA9ICR1cmxNYXRjaGVyRmFjdG9yeS5jb21waWxlKHdoYXQpO1xuXG4gICAgaWYgKCFoYW5kbGVySXNTdHJpbmcgJiYgIWlzRnVuY3Rpb24oaGFuZGxlcikgJiYgIWlzQXJyYXkoaGFuZGxlcikpXG4gICAgICB0aHJvdyBuZXcgRXJyb3IoXCJpbnZhbGlkICdoYW5kbGVyJyBpbiB3aGVuKClcIik7XG5cbiAgICB2YXIgc3RyYXRlZ2llcyA9IHtcbiAgICAgIG1hdGNoZXI6IGZ1bmN0aW9uICh3aGF0LCBoYW5kbGVyKSB7XG4gICAgICAgIGlmIChoYW5kbGVySXNTdHJpbmcpIHtcbiAgICAgICAgICByZWRpcmVjdCA9ICR1cmxNYXRjaGVyRmFjdG9yeS5jb21waWxlKGhhbmRsZXIpO1xuICAgICAgICAgIGhhbmRsZXIgPSBbJyRtYXRjaCcsIGZ1bmN0aW9uICgkbWF0Y2gpIHsgcmV0dXJuIHJlZGlyZWN0LmZvcm1hdCgkbWF0Y2gpOyB9XTtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gZXh0ZW5kKGZ1bmN0aW9uICgkaW5qZWN0b3IsICRsb2NhdGlvbikge1xuICAgICAgICAgIHJldHVybiBoYW5kbGVJZk1hdGNoKCRpbmplY3RvciwgaGFuZGxlciwgd2hhdC5leGVjKCRsb2NhdGlvbi5wYXRoKCksICRsb2NhdGlvbi5zZWFyY2goKSkpO1xuICAgICAgICB9LCB7XG4gICAgICAgICAgcHJlZml4OiBpc1N0cmluZyh3aGF0LnByZWZpeCkgPyB3aGF0LnByZWZpeCA6ICcnXG4gICAgICAgIH0pO1xuICAgICAgfSxcbiAgICAgIHJlZ2V4OiBmdW5jdGlvbiAod2hhdCwgaGFuZGxlcikge1xuICAgICAgICBpZiAod2hhdC5nbG9iYWwgfHwgd2hhdC5zdGlja3kpIHRocm93IG5ldyBFcnJvcihcIndoZW4oKSBSZWdFeHAgbXVzdCBub3QgYmUgZ2xvYmFsIG9yIHN0aWNreVwiKTtcblxuICAgICAgICBpZiAoaGFuZGxlcklzU3RyaW5nKSB7XG4gICAgICAgICAgcmVkaXJlY3QgPSBoYW5kbGVyO1xuICAgICAgICAgIGhhbmRsZXIgPSBbJyRtYXRjaCcsIGZ1bmN0aW9uICgkbWF0Y2gpIHsgcmV0dXJuIGludGVycG9sYXRlKHJlZGlyZWN0LCAkbWF0Y2gpOyB9XTtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gZXh0ZW5kKGZ1bmN0aW9uICgkaW5qZWN0b3IsICRsb2NhdGlvbikge1xuICAgICAgICAgIHJldHVybiBoYW5kbGVJZk1hdGNoKCRpbmplY3RvciwgaGFuZGxlciwgd2hhdC5leGVjKCRsb2NhdGlvbi5wYXRoKCkpKTtcbiAgICAgICAgfSwge1xuICAgICAgICAgIHByZWZpeDogcmVnRXhwUHJlZml4KHdoYXQpXG4gICAgICAgIH0pO1xuICAgICAgfVxuICAgIH07XG5cbiAgICB2YXIgY2hlY2sgPSB7IG1hdGNoZXI6ICR1cmxNYXRjaGVyRmFjdG9yeS5pc01hdGNoZXIod2hhdCksIHJlZ2V4OiB3aGF0IGluc3RhbmNlb2YgUmVnRXhwIH07XG5cbiAgICBmb3IgKHZhciBuIGluIGNoZWNrKSB7XG4gICAgICBpZiAoY2hlY2tbbl0pIHJldHVybiB0aGlzLnJ1bGUoc3RyYXRlZ2llc1tuXSh3aGF0LCBoYW5kbGVyKSk7XG4gICAgfVxuXG4gICAgdGhyb3cgbmV3IEVycm9yKFwiaW52YWxpZCAnd2hhdCcgaW4gd2hlbigpXCIpO1xuICB9O1xuXG4gIC8qKlxuICAgKiBAbmdkb2MgZnVuY3Rpb25cbiAgICogQG5hbWUgdWkucm91dGVyLnJvdXRlci4kdXJsUm91dGVyUHJvdmlkZXIjZGVmZXJJbnRlcmNlcHRcbiAgICogQG1ldGhvZE9mIHVpLnJvdXRlci5yb3V0ZXIuJHVybFJvdXRlclByb3ZpZGVyXG4gICAqXG4gICAqIEBkZXNjcmlwdGlvblxuICAgKiBEaXNhYmxlcyAob3IgZW5hYmxlcykgZGVmZXJyaW5nIGxvY2F0aW9uIGNoYW5nZSBpbnRlcmNlcHRpb24uXG4gICAqXG4gICAqIElmIHlvdSB3aXNoIHRvIGN1c3RvbWl6ZSB0aGUgYmVoYXZpb3Igb2Ygc3luY2luZyB0aGUgVVJMIChmb3IgZXhhbXBsZSwgaWYgeW91IHdpc2ggdG9cbiAgICogZGVmZXIgYSB0cmFuc2l0aW9uIGJ1dCBtYWludGFpbiB0aGUgY3VycmVudCBVUkwpLCBjYWxsIHRoaXMgbWV0aG9kIGF0IGNvbmZpZ3VyYXRpb24gdGltZS5cbiAgICogVGhlbiwgYXQgcnVuIHRpbWUsIGNhbGwgYCR1cmxSb3V0ZXIubGlzdGVuKClgIGFmdGVyIHlvdSBoYXZlIGNvbmZpZ3VyZWQgeW91ciBvd25cbiAgICogYCRsb2NhdGlvbkNoYW5nZVN1Y2Nlc3NgIGV2ZW50IGhhbmRsZXIuXG4gICAqXG4gICAqIEBleGFtcGxlXG4gICAqIDxwcmU+XG4gICAqIHZhciBhcHAgPSBhbmd1bGFyLm1vZHVsZSgnYXBwJywgWyd1aS5yb3V0ZXIucm91dGVyJ10pO1xuICAgKlxuICAgKiBhcHAuY29uZmlnKGZ1bmN0aW9uICgkdXJsUm91dGVyUHJvdmlkZXIpIHtcbiAgICpcbiAgICogICAvLyBQcmV2ZW50ICR1cmxSb3V0ZXIgZnJvbSBhdXRvbWF0aWNhbGx5IGludGVyY2VwdGluZyBVUkwgY2hhbmdlcztcbiAgICogICAvLyB0aGlzIGFsbG93cyB5b3UgdG8gY29uZmlndXJlIGN1c3RvbSBiZWhhdmlvciBpbiBiZXR3ZWVuXG4gICAqICAgLy8gbG9jYXRpb24gY2hhbmdlcyBhbmQgcm91dGUgc3luY2hyb25pemF0aW9uOlxuICAgKiAgICR1cmxSb3V0ZXJQcm92aWRlci5kZWZlckludGVyY2VwdCgpO1xuICAgKlxuICAgKiB9KS5ydW4oZnVuY3Rpb24gKCRyb290U2NvcGUsICR1cmxSb3V0ZXIsIFVzZXJTZXJ2aWNlKSB7XG4gICAqXG4gICAqICAgJHJvb3RTY29wZS4kb24oJyRsb2NhdGlvbkNoYW5nZVN1Y2Nlc3MnLCBmdW5jdGlvbihlKSB7XG4gICAqICAgICAvLyBVc2VyU2VydmljZSBpcyBhbiBleGFtcGxlIHNlcnZpY2UgZm9yIG1hbmFnaW5nIHVzZXIgc3RhdGVcbiAgICogICAgIGlmIChVc2VyU2VydmljZS5pc0xvZ2dlZEluKCkpIHJldHVybjtcbiAgICpcbiAgICogICAgIC8vIFByZXZlbnQgJHVybFJvdXRlcidzIGRlZmF1bHQgaGFuZGxlciBmcm9tIGZpcmluZ1xuICAgKiAgICAgZS5wcmV2ZW50RGVmYXVsdCgpO1xuICAgKlxuICAgKiAgICAgVXNlclNlcnZpY2UuaGFuZGxlTG9naW4oKS50aGVuKGZ1bmN0aW9uKCkge1xuICAgKiAgICAgICAvLyBPbmNlIHRoZSB1c2VyIGhhcyBsb2dnZWQgaW4sIHN5bmMgdGhlIGN1cnJlbnQgVVJMXG4gICAqICAgICAgIC8vIHRvIHRoZSByb3V0ZXI6XG4gICAqICAgICAgICR1cmxSb3V0ZXIuc3luYygpO1xuICAgKiAgICAgfSk7XG4gICAqICAgfSk7XG4gICAqXG4gICAqICAgLy8gQ29uZmlndXJlcyAkdXJsUm91dGVyJ3MgbGlzdGVuZXIgKmFmdGVyKiB5b3VyIGN1c3RvbSBsaXN0ZW5lclxuICAgKiAgICR1cmxSb3V0ZXIubGlzdGVuKCk7XG4gICAqIH0pO1xuICAgKiA8L3ByZT5cbiAgICpcbiAgICogQHBhcmFtIHtib29sZWFufSBkZWZlciBJbmRpY2F0ZXMgd2hldGhlciB0byBkZWZlciBsb2NhdGlvbiBjaGFuZ2UgaW50ZXJjZXB0aW9uLiBQYXNzaW5nXG4gICAgICAgICAgICBubyBwYXJhbWV0ZXIgaXMgZXF1aXZhbGVudCB0byBgdHJ1ZWAuXG4gICAqL1xuICB0aGlzLmRlZmVySW50ZXJjZXB0ID0gZnVuY3Rpb24gKGRlZmVyKSB7XG4gICAgaWYgKGRlZmVyID09PSB1bmRlZmluZWQpIGRlZmVyID0gdHJ1ZTtcbiAgICBpbnRlcmNlcHREZWZlcnJlZCA9IGRlZmVyO1xuICB9O1xuXG4gIC8qKlxuICAgKiBAbmdkb2Mgb2JqZWN0XG4gICAqIEBuYW1lIHVpLnJvdXRlci5yb3V0ZXIuJHVybFJvdXRlclxuICAgKlxuICAgKiBAcmVxdWlyZXMgJGxvY2F0aW9uXG4gICAqIEByZXF1aXJlcyAkcm9vdFNjb3BlXG4gICAqIEByZXF1aXJlcyAkaW5qZWN0b3JcbiAgICogQHJlcXVpcmVzICRicm93c2VyXG4gICAqXG4gICAqIEBkZXNjcmlwdGlvblxuICAgKlxuICAgKi9cbiAgdGhpcy4kZ2V0ID0gJGdldDtcbiAgJGdldC4kaW5qZWN0ID0gWyckbG9jYXRpb24nLCAnJHJvb3RTY29wZScsICckaW5qZWN0b3InLCAnJGJyb3dzZXInXTtcbiAgZnVuY3Rpb24gJGdldCggICAkbG9jYXRpb24sICAgJHJvb3RTY29wZSwgICAkaW5qZWN0b3IsICAgJGJyb3dzZXIpIHtcblxuICAgIHZhciBiYXNlSHJlZiA9ICRicm93c2VyLmJhc2VIcmVmKCksIGxvY2F0aW9uID0gJGxvY2F0aW9uLnVybCgpLCBsYXN0UHVzaGVkVXJsO1xuXG4gICAgZnVuY3Rpb24gYXBwZW5kQmFzZVBhdGgodXJsLCBpc0h0bWw1LCBhYnNvbHV0ZSkge1xuICAgICAgaWYgKGJhc2VIcmVmID09PSAnLycpIHJldHVybiB1cmw7XG4gICAgICBpZiAoaXNIdG1sNSkgcmV0dXJuIGJhc2VIcmVmLnNsaWNlKDAsIC0xKSArIHVybDtcbiAgICAgIGlmIChhYnNvbHV0ZSkgcmV0dXJuIGJhc2VIcmVmLnNsaWNlKDEpICsgdXJsO1xuICAgICAgcmV0dXJuIHVybDtcbiAgICB9XG5cbiAgICAvLyBUT0RPOiBPcHRpbWl6ZSBncm91cHMgb2YgcnVsZXMgd2l0aCBub24tZW1wdHkgcHJlZml4IGludG8gc29tZSBzb3J0IG9mIGRlY2lzaW9uIHRyZWVcbiAgICBmdW5jdGlvbiB1cGRhdGUoZXZ0KSB7XG4gICAgICBpZiAoZXZ0ICYmIGV2dC5kZWZhdWx0UHJldmVudGVkKSByZXR1cm47XG4gICAgICB2YXIgaWdub3JlVXBkYXRlID0gbGFzdFB1c2hlZFVybCAmJiAkbG9jYXRpb24udXJsKCkgPT09IGxhc3RQdXNoZWRVcmw7XG4gICAgICBsYXN0UHVzaGVkVXJsID0gdW5kZWZpbmVkO1xuICAgICAgLy8gVE9ETzogUmUtaW1wbGVtZW50IHRoaXMgaW4gMS4wIGZvciBodHRwczovL2dpdGh1Yi5jb20vYW5ndWxhci11aS91aS1yb3V0ZXIvaXNzdWVzLzE1NzNcbiAgICAgIC8vaWYgKGlnbm9yZVVwZGF0ZSkgcmV0dXJuIHRydWU7XG5cbiAgICAgIGZ1bmN0aW9uIGNoZWNrKHJ1bGUpIHtcbiAgICAgICAgdmFyIGhhbmRsZWQgPSBydWxlKCRpbmplY3RvciwgJGxvY2F0aW9uKTtcblxuICAgICAgICBpZiAoIWhhbmRsZWQpIHJldHVybiBmYWxzZTtcbiAgICAgICAgaWYgKGlzU3RyaW5nKGhhbmRsZWQpKSAkbG9jYXRpb24ucmVwbGFjZSgpLnVybChoYW5kbGVkKTtcbiAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgICB9XG4gICAgICB2YXIgbiA9IHJ1bGVzLmxlbmd0aCwgaTtcblxuICAgICAgZm9yIChpID0gMDsgaSA8IG47IGkrKykge1xuICAgICAgICBpZiAoY2hlY2socnVsZXNbaV0pKSByZXR1cm47XG4gICAgICB9XG4gICAgICAvLyBhbHdheXMgY2hlY2sgb3RoZXJ3aXNlIGxhc3QgdG8gYWxsb3cgZHluYW1pYyB1cGRhdGVzIHRvIHRoZSBzZXQgb2YgcnVsZXNcbiAgICAgIGlmIChvdGhlcndpc2UpIGNoZWNrKG90aGVyd2lzZSk7XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gbGlzdGVuKCkge1xuICAgICAgbGlzdGVuZXIgPSBsaXN0ZW5lciB8fCAkcm9vdFNjb3BlLiRvbignJGxvY2F0aW9uQ2hhbmdlU3VjY2VzcycsIHVwZGF0ZSk7XG4gICAgICByZXR1cm4gbGlzdGVuZXI7XG4gICAgfVxuXG4gICAgaWYgKCFpbnRlcmNlcHREZWZlcnJlZCkgbGlzdGVuKCk7XG5cbiAgICByZXR1cm4ge1xuICAgICAgLyoqXG4gICAgICAgKiBAbmdkb2MgZnVuY3Rpb25cbiAgICAgICAqIEBuYW1lIHVpLnJvdXRlci5yb3V0ZXIuJHVybFJvdXRlciNzeW5jXG4gICAgICAgKiBAbWV0aG9kT2YgdWkucm91dGVyLnJvdXRlci4kdXJsUm91dGVyXG4gICAgICAgKlxuICAgICAgICogQGRlc2NyaXB0aW9uXG4gICAgICAgKiBUcmlnZ2VycyBhbiB1cGRhdGU7IHRoZSBzYW1lIHVwZGF0ZSB0aGF0IGhhcHBlbnMgd2hlbiB0aGUgYWRkcmVzcyBiYXIgdXJsIGNoYW5nZXMsIGFrYSBgJGxvY2F0aW9uQ2hhbmdlU3VjY2Vzc2AuXG4gICAgICAgKiBUaGlzIG1ldGhvZCBpcyB1c2VmdWwgd2hlbiB5b3UgbmVlZCB0byB1c2UgYHByZXZlbnREZWZhdWx0KClgIG9uIHRoZSBgJGxvY2F0aW9uQ2hhbmdlU3VjY2Vzc2AgZXZlbnQsXG4gICAgICAgKiBwZXJmb3JtIHNvbWUgY3VzdG9tIGxvZ2ljIChyb3V0ZSBwcm90ZWN0aW9uLCBhdXRoLCBjb25maWcsIHJlZGlyZWN0aW9uLCBldGMpIGFuZCB0aGVuIGZpbmFsbHkgcHJvY2VlZFxuICAgICAgICogd2l0aCB0aGUgdHJhbnNpdGlvbiBieSBjYWxsaW5nIGAkdXJsUm91dGVyLnN5bmMoKWAuXG4gICAgICAgKlxuICAgICAgICogQGV4YW1wbGVcbiAgICAgICAqIDxwcmU+XG4gICAgICAgKiBhbmd1bGFyLm1vZHVsZSgnYXBwJywgWyd1aS5yb3V0ZXInXSlcbiAgICAgICAqICAgLnJ1bihmdW5jdGlvbigkcm9vdFNjb3BlLCAkdXJsUm91dGVyKSB7XG4gICAgICAgKiAgICAgJHJvb3RTY29wZS4kb24oJyRsb2NhdGlvbkNoYW5nZVN1Y2Nlc3MnLCBmdW5jdGlvbihldnQpIHtcbiAgICAgICAqICAgICAgIC8vIEhhbHQgc3RhdGUgY2hhbmdlIGZyb20gZXZlbiBzdGFydGluZ1xuICAgICAgICogICAgICAgZXZ0LnByZXZlbnREZWZhdWx0KCk7XG4gICAgICAgKiAgICAgICAvLyBQZXJmb3JtIGN1c3RvbSBsb2dpY1xuICAgICAgICogICAgICAgdmFyIG1lZXRzUmVxdWlyZW1lbnQgPSAuLi5cbiAgICAgICAqICAgICAgIC8vIENvbnRpbnVlIHdpdGggdGhlIHVwZGF0ZSBhbmQgc3RhdGUgdHJhbnNpdGlvbiBpZiBsb2dpYyBhbGxvd3NcbiAgICAgICAqICAgICAgIGlmIChtZWV0c1JlcXVpcmVtZW50KSAkdXJsUm91dGVyLnN5bmMoKTtcbiAgICAgICAqICAgICB9KTtcbiAgICAgICAqIH0pO1xuICAgICAgICogPC9wcmU+XG4gICAgICAgKi9cbiAgICAgIHN5bmM6IGZ1bmN0aW9uKCkge1xuICAgICAgICB1cGRhdGUoKTtcbiAgICAgIH0sXG5cbiAgICAgIGxpc3RlbjogZnVuY3Rpb24oKSB7XG4gICAgICAgIHJldHVybiBsaXN0ZW4oKTtcbiAgICAgIH0sXG5cbiAgICAgIHVwZGF0ZTogZnVuY3Rpb24ocmVhZCkge1xuICAgICAgICBpZiAocmVhZCkge1xuICAgICAgICAgIGxvY2F0aW9uID0gJGxvY2F0aW9uLnVybCgpO1xuICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuICAgICAgICBpZiAoJGxvY2F0aW9uLnVybCgpID09PSBsb2NhdGlvbikgcmV0dXJuO1xuXG4gICAgICAgICRsb2NhdGlvbi51cmwobG9jYXRpb24pO1xuICAgICAgICAkbG9jYXRpb24ucmVwbGFjZSgpO1xuICAgICAgfSxcblxuICAgICAgcHVzaDogZnVuY3Rpb24odXJsTWF0Y2hlciwgcGFyYW1zLCBvcHRpb25zKSB7XG4gICAgICAgICB2YXIgdXJsID0gdXJsTWF0Y2hlci5mb3JtYXQocGFyYW1zIHx8IHt9KTtcblxuICAgICAgICAvLyBIYW5kbGUgdGhlIHNwZWNpYWwgaGFzaCBwYXJhbSwgaWYgbmVlZGVkXG4gICAgICAgIGlmICh1cmwgIT09IG51bGwgJiYgcGFyYW1zICYmIHBhcmFtc1snIyddKSB7XG4gICAgICAgICAgICB1cmwgKz0gJyMnICsgcGFyYW1zWycjJ107XG4gICAgICAgIH1cblxuICAgICAgICAkbG9jYXRpb24udXJsKHVybCk7XG4gICAgICAgIGxhc3RQdXNoZWRVcmwgPSBvcHRpb25zICYmIG9wdGlvbnMuJCRhdm9pZFJlc3luYyA/ICRsb2NhdGlvbi51cmwoKSA6IHVuZGVmaW5lZDtcbiAgICAgICAgaWYgKG9wdGlvbnMgJiYgb3B0aW9ucy5yZXBsYWNlKSAkbG9jYXRpb24ucmVwbGFjZSgpO1xuICAgICAgfSxcblxuICAgICAgLyoqXG4gICAgICAgKiBAbmdkb2MgZnVuY3Rpb25cbiAgICAgICAqIEBuYW1lIHVpLnJvdXRlci5yb3V0ZXIuJHVybFJvdXRlciNocmVmXG4gICAgICAgKiBAbWV0aG9kT2YgdWkucm91dGVyLnJvdXRlci4kdXJsUm91dGVyXG4gICAgICAgKlxuICAgICAgICogQGRlc2NyaXB0aW9uXG4gICAgICAgKiBBIFVSTCBnZW5lcmF0aW9uIG1ldGhvZCB0aGF0IHJldHVybnMgdGhlIGNvbXBpbGVkIFVSTCBmb3IgYSBnaXZlblxuICAgICAgICoge0BsaW5rIHVpLnJvdXRlci51dGlsLnR5cGU6VXJsTWF0Y2hlciBgVXJsTWF0Y2hlcmB9LCBwb3B1bGF0ZWQgd2l0aCB0aGUgcHJvdmlkZWQgcGFyYW1ldGVycy5cbiAgICAgICAqXG4gICAgICAgKiBAZXhhbXBsZVxuICAgICAgICogPHByZT5cbiAgICAgICAqICRib2IgPSAkdXJsUm91dGVyLmhyZWYobmV3IFVybE1hdGNoZXIoXCIvYWJvdXQvOnBlcnNvblwiKSwge1xuICAgICAgICogICBwZXJzb246IFwiYm9iXCJcbiAgICAgICAqIH0pO1xuICAgICAgICogLy8gJGJvYiA9PSBcIi9hYm91dC9ib2JcIjtcbiAgICAgICAqIDwvcHJlPlxuICAgICAgICpcbiAgICAgICAqIEBwYXJhbSB7VXJsTWF0Y2hlcn0gdXJsTWF0Y2hlciBUaGUgYFVybE1hdGNoZXJgIG9iamVjdCB3aGljaCBpcyB1c2VkIGFzIHRoZSB0ZW1wbGF0ZSBvZiB0aGUgVVJMIHRvIGdlbmVyYXRlLlxuICAgICAgICogQHBhcmFtIHtvYmplY3Q9fSBwYXJhbXMgQW4gb2JqZWN0IG9mIHBhcmFtZXRlciB2YWx1ZXMgdG8gZmlsbCB0aGUgbWF0Y2hlcidzIHJlcXVpcmVkIHBhcmFtZXRlcnMuXG4gICAgICAgKiBAcGFyYW0ge29iamVjdD19IG9wdGlvbnMgT3B0aW9ucyBvYmplY3QuIFRoZSBvcHRpb25zIGFyZTpcbiAgICAgICAqXG4gICAgICAgKiAtICoqYGFic29sdXRlYCoqIC0ge2Jvb2xlYW49ZmFsc2V9LCAgSWYgdHJ1ZSB3aWxsIGdlbmVyYXRlIGFuIGFic29sdXRlIHVybCwgZS5nLiBcImh0dHA6Ly93d3cuZXhhbXBsZS5jb20vZnVsbHVybFwiLlxuICAgICAgICpcbiAgICAgICAqIEByZXR1cm5zIHtzdHJpbmd9IFJldHVybnMgdGhlIGZ1bGx5IGNvbXBpbGVkIFVSTCwgb3IgYG51bGxgIGlmIGBwYXJhbXNgIGZhaWwgdmFsaWRhdGlvbiBhZ2FpbnN0IGB1cmxNYXRjaGVyYFxuICAgICAgICovXG4gICAgICBocmVmOiBmdW5jdGlvbih1cmxNYXRjaGVyLCBwYXJhbXMsIG9wdGlvbnMpIHtcbiAgICAgICAgaWYgKCF1cmxNYXRjaGVyLnZhbGlkYXRlcyhwYXJhbXMpKSByZXR1cm4gbnVsbDtcblxuICAgICAgICB2YXIgaXNIdG1sNSA9ICRsb2NhdGlvblByb3ZpZGVyLmh0bWw1TW9kZSgpO1xuICAgICAgICBpZiAoYW5ndWxhci5pc09iamVjdChpc0h0bWw1KSkge1xuICAgICAgICAgIGlzSHRtbDUgPSBpc0h0bWw1LmVuYWJsZWQ7XG4gICAgICAgIH1cbiAgICAgICAgXG4gICAgICAgIHZhciB1cmwgPSB1cmxNYXRjaGVyLmZvcm1hdChwYXJhbXMpO1xuICAgICAgICBvcHRpb25zID0gb3B0aW9ucyB8fCB7fTtcblxuICAgICAgICBpZiAoIWlzSHRtbDUgJiYgdXJsICE9PSBudWxsKSB7XG4gICAgICAgICAgdXJsID0gXCIjXCIgKyAkbG9jYXRpb25Qcm92aWRlci5oYXNoUHJlZml4KCkgKyB1cmw7XG4gICAgICAgIH1cblxuICAgICAgICAvLyBIYW5kbGUgc3BlY2lhbCBoYXNoIHBhcmFtLCBpZiBuZWVkZWRcbiAgICAgICAgaWYgKHVybCAhPT0gbnVsbCAmJiBwYXJhbXMgJiYgcGFyYW1zWycjJ10pIHtcbiAgICAgICAgICB1cmwgKz0gJyMnICsgcGFyYW1zWycjJ107XG4gICAgICAgIH1cblxuICAgICAgICB1cmwgPSBhcHBlbmRCYXNlUGF0aCh1cmwsIGlzSHRtbDUsIG9wdGlvbnMuYWJzb2x1dGUpO1xuXG4gICAgICAgIGlmICghb3B0aW9ucy5hYnNvbHV0ZSB8fCAhdXJsKSB7XG4gICAgICAgICAgcmV0dXJuIHVybDtcbiAgICAgICAgfVxuXG4gICAgICAgIHZhciBzbGFzaCA9ICghaXNIdG1sNSAmJiB1cmwgPyAnLycgOiAnJyksIHBvcnQgPSAkbG9jYXRpb24ucG9ydCgpO1xuICAgICAgICBwb3J0ID0gKHBvcnQgPT09IDgwIHx8IHBvcnQgPT09IDQ0MyA/ICcnIDogJzonICsgcG9ydCk7XG5cbiAgICAgICAgcmV0dXJuIFskbG9jYXRpb24ucHJvdG9jb2woKSwgJzovLycsICRsb2NhdGlvbi5ob3N0KCksIHBvcnQsIHNsYXNoLCB1cmxdLmpvaW4oJycpO1xuICAgICAgfVxuICAgIH07XG4gIH1cbn1cblxuYW5ndWxhci5tb2R1bGUoJ3VpLnJvdXRlci5yb3V0ZXInKS5wcm92aWRlcignJHVybFJvdXRlcicsICRVcmxSb3V0ZXJQcm92aWRlcik7XG5cbi8qKlxuICogQG5nZG9jIG9iamVjdFxuICogQG5hbWUgdWkucm91dGVyLnN0YXRlLiRzdGF0ZVByb3ZpZGVyXG4gKlxuICogQHJlcXVpcmVzIHVpLnJvdXRlci5yb3V0ZXIuJHVybFJvdXRlclByb3ZpZGVyXG4gKiBAcmVxdWlyZXMgdWkucm91dGVyLnV0aWwuJHVybE1hdGNoZXJGYWN0b3J5UHJvdmlkZXJcbiAqXG4gKiBAZGVzY3JpcHRpb25cbiAqIFRoZSBuZXcgYCRzdGF0ZVByb3ZpZGVyYCB3b3JrcyBzaW1pbGFyIHRvIEFuZ3VsYXIncyB2MSByb3V0ZXIsIGJ1dCBpdCBmb2N1c2VzIHB1cmVseVxuICogb24gc3RhdGUuXG4gKlxuICogQSBzdGF0ZSBjb3JyZXNwb25kcyB0byBhIFwicGxhY2VcIiBpbiB0aGUgYXBwbGljYXRpb24gaW4gdGVybXMgb2YgdGhlIG92ZXJhbGwgVUkgYW5kXG4gKiBuYXZpZ2F0aW9uLiBBIHN0YXRlIGRlc2NyaWJlcyAodmlhIHRoZSBjb250cm9sbGVyIC8gdGVtcGxhdGUgLyB2aWV3IHByb3BlcnRpZXMpIHdoYXRcbiAqIHRoZSBVSSBsb29rcyBsaWtlIGFuZCBkb2VzIGF0IHRoYXQgcGxhY2UuXG4gKlxuICogU3RhdGVzIG9mdGVuIGhhdmUgdGhpbmdzIGluIGNvbW1vbiwgYW5kIHRoZSBwcmltYXJ5IHdheSBvZiBmYWN0b3Jpbmcgb3V0IHRoZXNlXG4gKiBjb21tb25hbGl0aWVzIGluIHRoaXMgbW9kZWwgaXMgdmlhIHRoZSBzdGF0ZSBoaWVyYXJjaHksIGkuZS4gcGFyZW50L2NoaWxkIHN0YXRlcyBha2FcbiAqIG5lc3RlZCBzdGF0ZXMuXG4gKlxuICogVGhlIGAkc3RhdGVQcm92aWRlcmAgcHJvdmlkZXMgaW50ZXJmYWNlcyB0byBkZWNsYXJlIHRoZXNlIHN0YXRlcyBmb3IgeW91ciBhcHAuXG4gKi9cbiRTdGF0ZVByb3ZpZGVyLiRpbmplY3QgPSBbJyR1cmxSb3V0ZXJQcm92aWRlcicsICckdXJsTWF0Y2hlckZhY3RvcnlQcm92aWRlciddO1xuZnVuY3Rpb24gJFN0YXRlUHJvdmlkZXIoICAgJHVybFJvdXRlclByb3ZpZGVyLCAgICR1cmxNYXRjaGVyRmFjdG9yeSkge1xuXG4gIHZhciByb290LCBzdGF0ZXMgPSB7fSwgJHN0YXRlLCBxdWV1ZSA9IHt9LCBhYnN0cmFjdEtleSA9ICdhYnN0cmFjdCc7XG5cbiAgLy8gQnVpbGRzIHN0YXRlIHByb3BlcnRpZXMgZnJvbSBkZWZpbml0aW9uIHBhc3NlZCB0byByZWdpc3RlclN0YXRlKClcbiAgdmFyIHN0YXRlQnVpbGRlciA9IHtcblxuICAgIC8vIERlcml2ZSBwYXJlbnQgc3RhdGUgZnJvbSBhIGhpZXJhcmNoaWNhbCBuYW1lIG9ubHkgaWYgJ3BhcmVudCcgaXMgbm90IGV4cGxpY2l0bHkgZGVmaW5lZC5cbiAgICAvLyBzdGF0ZS5jaGlsZHJlbiA9IFtdO1xuICAgIC8vIGlmIChwYXJlbnQpIHBhcmVudC5jaGlsZHJlbi5wdXNoKHN0YXRlKTtcbiAgICBwYXJlbnQ6IGZ1bmN0aW9uKHN0YXRlKSB7XG4gICAgICBpZiAoaXNEZWZpbmVkKHN0YXRlLnBhcmVudCkgJiYgc3RhdGUucGFyZW50KSByZXR1cm4gZmluZFN0YXRlKHN0YXRlLnBhcmVudCk7XG4gICAgICAvLyByZWdleCBtYXRjaGVzIGFueSB2YWxpZCBjb21wb3NpdGUgc3RhdGUgbmFtZVxuICAgICAgLy8gd291bGQgbWF0Y2ggXCJjb250YWN0Lmxpc3RcIiBidXQgbm90IFwiY29udGFjdHNcIlxuICAgICAgdmFyIGNvbXBvc2l0ZU5hbWUgPSAvXiguKylcXC5bXi5dKyQvLmV4ZWMoc3RhdGUubmFtZSk7XG4gICAgICByZXR1cm4gY29tcG9zaXRlTmFtZSA/IGZpbmRTdGF0ZShjb21wb3NpdGVOYW1lWzFdKSA6IHJvb3Q7XG4gICAgfSxcblxuICAgIC8vIGluaGVyaXQgJ2RhdGEnIGZyb20gcGFyZW50IGFuZCBvdmVycmlkZSBieSBvd24gdmFsdWVzIChpZiBhbnkpXG4gICAgZGF0YTogZnVuY3Rpb24oc3RhdGUpIHtcbiAgICAgIGlmIChzdGF0ZS5wYXJlbnQgJiYgc3RhdGUucGFyZW50LmRhdGEpIHtcbiAgICAgICAgc3RhdGUuZGF0YSA9IHN0YXRlLnNlbGYuZGF0YSA9IGV4dGVuZCh7fSwgc3RhdGUucGFyZW50LmRhdGEsIHN0YXRlLmRhdGEpO1xuICAgICAgfVxuICAgICAgcmV0dXJuIHN0YXRlLmRhdGE7XG4gICAgfSxcblxuICAgIC8vIEJ1aWxkIGEgVVJMTWF0Y2hlciBpZiBuZWNlc3NhcnksIGVpdGhlciB2aWEgYSByZWxhdGl2ZSBvciBhYnNvbHV0ZSBVUkxcbiAgICB1cmw6IGZ1bmN0aW9uKHN0YXRlKSB7XG4gICAgICB2YXIgdXJsID0gc3RhdGUudXJsLCBjb25maWcgPSB7IHBhcmFtczogc3RhdGUucGFyYW1zIHx8IHt9IH07XG5cbiAgICAgIGlmIChpc1N0cmluZyh1cmwpKSB7XG4gICAgICAgIGlmICh1cmwuY2hhckF0KDApID09ICdeJykgcmV0dXJuICR1cmxNYXRjaGVyRmFjdG9yeS5jb21waWxlKHVybC5zdWJzdHJpbmcoMSksIGNvbmZpZyk7XG4gICAgICAgIHJldHVybiAoc3RhdGUucGFyZW50Lm5hdmlnYWJsZSB8fCByb290KS51cmwuY29uY2F0KHVybCwgY29uZmlnKTtcbiAgICAgIH1cblxuICAgICAgaWYgKCF1cmwgfHwgJHVybE1hdGNoZXJGYWN0b3J5LmlzTWF0Y2hlcih1cmwpKSByZXR1cm4gdXJsO1xuICAgICAgdGhyb3cgbmV3IEVycm9yKFwiSW52YWxpZCB1cmwgJ1wiICsgdXJsICsgXCInIGluIHN0YXRlICdcIiArIHN0YXRlICsgXCInXCIpO1xuICAgIH0sXG5cbiAgICAvLyBLZWVwIHRyYWNrIG9mIHRoZSBjbG9zZXN0IGFuY2VzdG9yIHN0YXRlIHRoYXQgaGFzIGEgVVJMIChpLmUuIGlzIG5hdmlnYWJsZSlcbiAgICBuYXZpZ2FibGU6IGZ1bmN0aW9uKHN0YXRlKSB7XG4gICAgICByZXR1cm4gc3RhdGUudXJsID8gc3RhdGUgOiAoc3RhdGUucGFyZW50ID8gc3RhdGUucGFyZW50Lm5hdmlnYWJsZSA6IG51bGwpO1xuICAgIH0sXG5cbiAgICAvLyBPd24gcGFyYW1ldGVycyBmb3IgdGhpcyBzdGF0ZS4gc3RhdGUudXJsLnBhcmFtcyBpcyBhbHJlYWR5IGJ1aWx0IGF0IHRoaXMgcG9pbnQuIENyZWF0ZSBhbmQgYWRkIG5vbi11cmwgcGFyYW1zXG4gICAgb3duUGFyYW1zOiBmdW5jdGlvbihzdGF0ZSkge1xuICAgICAgdmFyIHBhcmFtcyA9IHN0YXRlLnVybCAmJiBzdGF0ZS51cmwucGFyYW1zIHx8IG5ldyAkJFVNRlAuUGFyYW1TZXQoKTtcbiAgICAgIGZvckVhY2goc3RhdGUucGFyYW1zIHx8IHt9LCBmdW5jdGlvbihjb25maWcsIGlkKSB7XG4gICAgICAgIGlmICghcGFyYW1zW2lkXSkgcGFyYW1zW2lkXSA9IG5ldyAkJFVNRlAuUGFyYW0oaWQsIG51bGwsIGNvbmZpZywgXCJjb25maWdcIik7XG4gICAgICB9KTtcbiAgICAgIHJldHVybiBwYXJhbXM7XG4gICAgfSxcblxuICAgIC8vIERlcml2ZSBwYXJhbWV0ZXJzIGZvciB0aGlzIHN0YXRlIGFuZCBlbnN1cmUgdGhleSdyZSBhIHN1cGVyLXNldCBvZiBwYXJlbnQncyBwYXJhbWV0ZXJzXG4gICAgcGFyYW1zOiBmdW5jdGlvbihzdGF0ZSkge1xuICAgICAgcmV0dXJuIHN0YXRlLnBhcmVudCAmJiBzdGF0ZS5wYXJlbnQucGFyYW1zID8gZXh0ZW5kKHN0YXRlLnBhcmVudC5wYXJhbXMuJCRuZXcoKSwgc3RhdGUub3duUGFyYW1zKSA6IG5ldyAkJFVNRlAuUGFyYW1TZXQoKTtcbiAgICB9LFxuXG4gICAgLy8gSWYgdGhlcmUgaXMgbm8gZXhwbGljaXQgbXVsdGktdmlldyBjb25maWd1cmF0aW9uLCBtYWtlIG9uZSB1cCBzbyB3ZSBkb24ndCBoYXZlXG4gICAgLy8gdG8gaGFuZGxlIGJvdGggY2FzZXMgaW4gdGhlIHZpZXcgZGlyZWN0aXZlIGxhdGVyLiBOb3RlIHRoYXQgaGF2aW5nIGFuIGV4cGxpY2l0XG4gICAgLy8gJ3ZpZXdzJyBwcm9wZXJ0eSB3aWxsIG1lYW4gdGhlIGRlZmF1bHQgdW5uYW1lZCB2aWV3IHByb3BlcnRpZXMgYXJlIGlnbm9yZWQuIFRoaXNcbiAgICAvLyBpcyBhbHNvIGEgZ29vZCB0aW1lIHRvIHJlc29sdmUgdmlldyBuYW1lcyB0byBhYnNvbHV0ZSBuYW1lcywgc28gZXZlcnl0aGluZyBpcyBhXG4gICAgLy8gc3RyYWlnaHQgbG9va3VwIGF0IGxpbmsgdGltZS5cbiAgICB2aWV3czogZnVuY3Rpb24oc3RhdGUpIHtcbiAgICAgIHZhciB2aWV3cyA9IHt9O1xuXG4gICAgICBmb3JFYWNoKGlzRGVmaW5lZChzdGF0ZS52aWV3cykgPyBzdGF0ZS52aWV3cyA6IHsgJyc6IHN0YXRlIH0sIGZ1bmN0aW9uICh2aWV3LCBuYW1lKSB7XG4gICAgICAgIGlmIChuYW1lLmluZGV4T2YoJ0AnKSA8IDApIG5hbWUgKz0gJ0AnICsgc3RhdGUucGFyZW50Lm5hbWU7XG4gICAgICAgIHZpZXdzW25hbWVdID0gdmlldztcbiAgICAgIH0pO1xuICAgICAgcmV0dXJuIHZpZXdzO1xuICAgIH0sXG5cbiAgICAvLyBLZWVwIGEgZnVsbCBwYXRoIGZyb20gdGhlIHJvb3QgZG93biB0byB0aGlzIHN0YXRlIGFzIHRoaXMgaXMgbmVlZGVkIGZvciBzdGF0ZSBhY3RpdmF0aW9uLlxuICAgIHBhdGg6IGZ1bmN0aW9uKHN0YXRlKSB7XG4gICAgICByZXR1cm4gc3RhdGUucGFyZW50ID8gc3RhdGUucGFyZW50LnBhdGguY29uY2F0KHN0YXRlKSA6IFtdOyAvLyBleGNsdWRlIHJvb3QgZnJvbSBwYXRoXG4gICAgfSxcblxuICAgIC8vIFNwZWVkIHVwICRzdGF0ZS5jb250YWlucygpIGFzIGl0J3MgdXNlZCBhIGxvdFxuICAgIGluY2x1ZGVzOiBmdW5jdGlvbihzdGF0ZSkge1xuICAgICAgdmFyIGluY2x1ZGVzID0gc3RhdGUucGFyZW50ID8gZXh0ZW5kKHt9LCBzdGF0ZS5wYXJlbnQuaW5jbHVkZXMpIDoge307XG4gICAgICBpbmNsdWRlc1tzdGF0ZS5uYW1lXSA9IHRydWU7XG4gICAgICByZXR1cm4gaW5jbHVkZXM7XG4gICAgfSxcblxuICAgICRkZWxlZ2F0ZXM6IHt9XG4gIH07XG5cbiAgZnVuY3Rpb24gaXNSZWxhdGl2ZShzdGF0ZU5hbWUpIHtcbiAgICByZXR1cm4gc3RhdGVOYW1lLmluZGV4T2YoXCIuXCIpID09PSAwIHx8IHN0YXRlTmFtZS5pbmRleE9mKFwiXlwiKSA9PT0gMDtcbiAgfVxuXG4gIGZ1bmN0aW9uIGZpbmRTdGF0ZShzdGF0ZU9yTmFtZSwgYmFzZSkge1xuICAgIGlmICghc3RhdGVPck5hbWUpIHJldHVybiB1bmRlZmluZWQ7XG5cbiAgICB2YXIgaXNTdHIgPSBpc1N0cmluZyhzdGF0ZU9yTmFtZSksXG4gICAgICAgIG5hbWUgID0gaXNTdHIgPyBzdGF0ZU9yTmFtZSA6IHN0YXRlT3JOYW1lLm5hbWUsXG4gICAgICAgIHBhdGggID0gaXNSZWxhdGl2ZShuYW1lKTtcblxuICAgIGlmIChwYXRoKSB7XG4gICAgICBpZiAoIWJhc2UpIHRocm93IG5ldyBFcnJvcihcIk5vIHJlZmVyZW5jZSBwb2ludCBnaXZlbiBmb3IgcGF0aCAnXCIgICsgbmFtZSArIFwiJ1wiKTtcbiAgICAgIGJhc2UgPSBmaW5kU3RhdGUoYmFzZSk7XG4gICAgICBcbiAgICAgIHZhciByZWwgPSBuYW1lLnNwbGl0KFwiLlwiKSwgaSA9IDAsIHBhdGhMZW5ndGggPSByZWwubGVuZ3RoLCBjdXJyZW50ID0gYmFzZTtcblxuICAgICAgZm9yICg7IGkgPCBwYXRoTGVuZ3RoOyBpKyspIHtcbiAgICAgICAgaWYgKHJlbFtpXSA9PT0gXCJcIiAmJiBpID09PSAwKSB7XG4gICAgICAgICAgY3VycmVudCA9IGJhc2U7XG4gICAgICAgICAgY29udGludWU7XG4gICAgICAgIH1cbiAgICAgICAgaWYgKHJlbFtpXSA9PT0gXCJeXCIpIHtcbiAgICAgICAgICBpZiAoIWN1cnJlbnQucGFyZW50KSB0aHJvdyBuZXcgRXJyb3IoXCJQYXRoICdcIiArIG5hbWUgKyBcIicgbm90IHZhbGlkIGZvciBzdGF0ZSAnXCIgKyBiYXNlLm5hbWUgKyBcIidcIik7XG4gICAgICAgICAgY3VycmVudCA9IGN1cnJlbnQucGFyZW50O1xuICAgICAgICAgIGNvbnRpbnVlO1xuICAgICAgICB9XG4gICAgICAgIGJyZWFrO1xuICAgICAgfVxuICAgICAgcmVsID0gcmVsLnNsaWNlKGkpLmpvaW4oXCIuXCIpO1xuICAgICAgbmFtZSA9IGN1cnJlbnQubmFtZSArIChjdXJyZW50Lm5hbWUgJiYgcmVsID8gXCIuXCIgOiBcIlwiKSArIHJlbDtcbiAgICB9XG4gICAgdmFyIHN0YXRlID0gc3RhdGVzW25hbWVdO1xuXG4gICAgaWYgKHN0YXRlICYmIChpc1N0ciB8fCAoIWlzU3RyICYmIChzdGF0ZSA9PT0gc3RhdGVPck5hbWUgfHwgc3RhdGUuc2VsZiA9PT0gc3RhdGVPck5hbWUpKSkpIHtcbiAgICAgIHJldHVybiBzdGF0ZTtcbiAgICB9XG4gICAgcmV0dXJuIHVuZGVmaW5lZDtcbiAgfVxuXG4gIGZ1bmN0aW9uIHF1ZXVlU3RhdGUocGFyZW50TmFtZSwgc3RhdGUpIHtcbiAgICBpZiAoIXF1ZXVlW3BhcmVudE5hbWVdKSB7XG4gICAgICBxdWV1ZVtwYXJlbnROYW1lXSA9IFtdO1xuICAgIH1cbiAgICBxdWV1ZVtwYXJlbnROYW1lXS5wdXNoKHN0YXRlKTtcbiAgfVxuXG4gIGZ1bmN0aW9uIGZsdXNoUXVldWVkQ2hpbGRyZW4ocGFyZW50TmFtZSkge1xuICAgIHZhciBxdWV1ZWQgPSBxdWV1ZVtwYXJlbnROYW1lXSB8fCBbXTtcbiAgICB3aGlsZShxdWV1ZWQubGVuZ3RoKSB7XG4gICAgICByZWdpc3RlclN0YXRlKHF1ZXVlZC5zaGlmdCgpKTtcbiAgICB9XG4gIH1cblxuICBmdW5jdGlvbiByZWdpc3RlclN0YXRlKHN0YXRlKSB7XG4gICAgLy8gV3JhcCBhIG5ldyBvYmplY3QgYXJvdW5kIHRoZSBzdGF0ZSBzbyB3ZSBjYW4gc3RvcmUgb3VyIHByaXZhdGUgZGV0YWlscyBlYXNpbHkuXG4gICAgc3RhdGUgPSBpbmhlcml0KHN0YXRlLCB7XG4gICAgICBzZWxmOiBzdGF0ZSxcbiAgICAgIHJlc29sdmU6IHN0YXRlLnJlc29sdmUgfHwge30sXG4gICAgICB0b1N0cmluZzogZnVuY3Rpb24oKSB7IHJldHVybiB0aGlzLm5hbWU7IH1cbiAgICB9KTtcblxuICAgIHZhciBuYW1lID0gc3RhdGUubmFtZTtcbiAgICBpZiAoIWlzU3RyaW5nKG5hbWUpIHx8IG5hbWUuaW5kZXhPZignQCcpID49IDApIHRocm93IG5ldyBFcnJvcihcIlN0YXRlIG11c3QgaGF2ZSBhIHZhbGlkIG5hbWVcIik7XG4gICAgaWYgKHN0YXRlcy5oYXNPd25Qcm9wZXJ0eShuYW1lKSkgdGhyb3cgbmV3IEVycm9yKFwiU3RhdGUgJ1wiICsgbmFtZSArIFwiJycgaXMgYWxyZWFkeSBkZWZpbmVkXCIpO1xuXG4gICAgLy8gR2V0IHBhcmVudCBuYW1lXG4gICAgdmFyIHBhcmVudE5hbWUgPSAobmFtZS5pbmRleE9mKCcuJykgIT09IC0xKSA/IG5hbWUuc3Vic3RyaW5nKDAsIG5hbWUubGFzdEluZGV4T2YoJy4nKSlcbiAgICAgICAgOiAoaXNTdHJpbmcoc3RhdGUucGFyZW50KSkgPyBzdGF0ZS5wYXJlbnRcbiAgICAgICAgOiAoaXNPYmplY3Qoc3RhdGUucGFyZW50KSAmJiBpc1N0cmluZyhzdGF0ZS5wYXJlbnQubmFtZSkpID8gc3RhdGUucGFyZW50Lm5hbWVcbiAgICAgICAgOiAnJztcblxuICAgIC8vIElmIHBhcmVudCBpcyBub3QgcmVnaXN0ZXJlZCB5ZXQsIGFkZCBzdGF0ZSB0byBxdWV1ZSBhbmQgcmVnaXN0ZXIgbGF0ZXJcbiAgICBpZiAocGFyZW50TmFtZSAmJiAhc3RhdGVzW3BhcmVudE5hbWVdKSB7XG4gICAgICByZXR1cm4gcXVldWVTdGF0ZShwYXJlbnROYW1lLCBzdGF0ZS5zZWxmKTtcbiAgICB9XG5cbiAgICBmb3IgKHZhciBrZXkgaW4gc3RhdGVCdWlsZGVyKSB7XG4gICAgICBpZiAoaXNGdW5jdGlvbihzdGF0ZUJ1aWxkZXJba2V5XSkpIHN0YXRlW2tleV0gPSBzdGF0ZUJ1aWxkZXJba2V5XShzdGF0ZSwgc3RhdGVCdWlsZGVyLiRkZWxlZ2F0ZXNba2V5XSk7XG4gICAgfVxuICAgIHN0YXRlc1tuYW1lXSA9IHN0YXRlO1xuXG4gICAgLy8gUmVnaXN0ZXIgdGhlIHN0YXRlIGluIHRoZSBnbG9iYWwgc3RhdGUgbGlzdCBhbmQgd2l0aCAkdXJsUm91dGVyIGlmIG5lY2Vzc2FyeS5cbiAgICBpZiAoIXN0YXRlW2Fic3RyYWN0S2V5XSAmJiBzdGF0ZS51cmwpIHtcbiAgICAgICR1cmxSb3V0ZXJQcm92aWRlci53aGVuKHN0YXRlLnVybCwgWyckbWF0Y2gnLCAnJHN0YXRlUGFyYW1zJywgZnVuY3Rpb24gKCRtYXRjaCwgJHN0YXRlUGFyYW1zKSB7XG4gICAgICAgIGlmICgkc3RhdGUuJGN1cnJlbnQubmF2aWdhYmxlICE9IHN0YXRlIHx8ICFlcXVhbEZvcktleXMoJG1hdGNoLCAkc3RhdGVQYXJhbXMpKSB7XG4gICAgICAgICAgJHN0YXRlLnRyYW5zaXRpb25UbyhzdGF0ZSwgJG1hdGNoLCB7IGluaGVyaXQ6IHRydWUsIGxvY2F0aW9uOiBmYWxzZSB9KTtcbiAgICAgICAgfVxuICAgICAgfV0pO1xuICAgIH1cblxuICAgIC8vIFJlZ2lzdGVyIGFueSBxdWV1ZWQgY2hpbGRyZW5cbiAgICBmbHVzaFF1ZXVlZENoaWxkcmVuKG5hbWUpO1xuXG4gICAgcmV0dXJuIHN0YXRlO1xuICB9XG5cbiAgLy8gQ2hlY2tzIHRleHQgdG8gc2VlIGlmIGl0IGxvb2tzIGxpa2UgYSBnbG9iLlxuICBmdW5jdGlvbiBpc0dsb2IgKHRleHQpIHtcbiAgICByZXR1cm4gdGV4dC5pbmRleE9mKCcqJykgPiAtMTtcbiAgfVxuXG4gIC8vIFJldHVybnMgdHJ1ZSBpZiBnbG9iIG1hdGNoZXMgY3VycmVudCAkc3RhdGUgbmFtZS5cbiAgZnVuY3Rpb24gZG9lc1N0YXRlTWF0Y2hHbG9iIChnbG9iKSB7XG4gICAgdmFyIGdsb2JTZWdtZW50cyA9IGdsb2Iuc3BsaXQoJy4nKSxcbiAgICAgICAgc2VnbWVudHMgPSAkc3RhdGUuJGN1cnJlbnQubmFtZS5zcGxpdCgnLicpO1xuXG4gICAgLy9tYXRjaCBzaW5nbGUgc3RhcnNcbiAgICBmb3IgKHZhciBpID0gMCwgbCA9IGdsb2JTZWdtZW50cy5sZW5ndGg7IGkgPCBsOyBpKyspIHtcbiAgICAgIGlmIChnbG9iU2VnbWVudHNbaV0gPT09ICcqJykge1xuICAgICAgICBzZWdtZW50c1tpXSA9ICcqJztcbiAgICAgIH1cbiAgICB9XG5cbiAgICAvL21hdGNoIGdyZWVkeSBzdGFydHNcbiAgICBpZiAoZ2xvYlNlZ21lbnRzWzBdID09PSAnKionKSB7XG4gICAgICAgc2VnbWVudHMgPSBzZWdtZW50cy5zbGljZShpbmRleE9mKHNlZ21lbnRzLCBnbG9iU2VnbWVudHNbMV0pKTtcbiAgICAgICBzZWdtZW50cy51bnNoaWZ0KCcqKicpO1xuICAgIH1cbiAgICAvL21hdGNoIGdyZWVkeSBlbmRzXG4gICAgaWYgKGdsb2JTZWdtZW50c1tnbG9iU2VnbWVudHMubGVuZ3RoIC0gMV0gPT09ICcqKicpIHtcbiAgICAgICBzZWdtZW50cy5zcGxpY2UoaW5kZXhPZihzZWdtZW50cywgZ2xvYlNlZ21lbnRzW2dsb2JTZWdtZW50cy5sZW5ndGggLSAyXSkgKyAxLCBOdW1iZXIuTUFYX1ZBTFVFKTtcbiAgICAgICBzZWdtZW50cy5wdXNoKCcqKicpO1xuICAgIH1cblxuICAgIGlmIChnbG9iU2VnbWVudHMubGVuZ3RoICE9IHNlZ21lbnRzLmxlbmd0aCkge1xuICAgICAgcmV0dXJuIGZhbHNlO1xuICAgIH1cblxuICAgIHJldHVybiBzZWdtZW50cy5qb2luKCcnKSA9PT0gZ2xvYlNlZ21lbnRzLmpvaW4oJycpO1xuICB9XG5cblxuICAvLyBJbXBsaWNpdCByb290IHN0YXRlIHRoYXQgaXMgYWx3YXlzIGFjdGl2ZVxuICByb290ID0gcmVnaXN0ZXJTdGF0ZSh7XG4gICAgbmFtZTogJycsXG4gICAgdXJsOiAnXicsXG4gICAgdmlld3M6IG51bGwsXG4gICAgJ2Fic3RyYWN0JzogdHJ1ZVxuICB9KTtcbiAgcm9vdC5uYXZpZ2FibGUgPSBudWxsO1xuXG5cbiAgLyoqXG4gICAqIEBuZ2RvYyBmdW5jdGlvblxuICAgKiBAbmFtZSB1aS5yb3V0ZXIuc3RhdGUuJHN0YXRlUHJvdmlkZXIjZGVjb3JhdG9yXG4gICAqIEBtZXRob2RPZiB1aS5yb3V0ZXIuc3RhdGUuJHN0YXRlUHJvdmlkZXJcbiAgICpcbiAgICogQGRlc2NyaXB0aW9uXG4gICAqIEFsbG93cyB5b3UgdG8gZXh0ZW5kIChjYXJlZnVsbHkpIG9yIG92ZXJyaWRlIChhdCB5b3VyIG93biBwZXJpbCkgdGhlIFxuICAgKiBgc3RhdGVCdWlsZGVyYCBvYmplY3QgdXNlZCBpbnRlcm5hbGx5IGJ5IGAkc3RhdGVQcm92aWRlcmAuIFRoaXMgY2FuIGJlIHVzZWQgXG4gICAqIHRvIGFkZCBjdXN0b20gZnVuY3Rpb25hbGl0eSB0byB1aS1yb3V0ZXIsIGZvciBleGFtcGxlIGluZmVycmluZyB0ZW1wbGF0ZVVybCBcbiAgICogYmFzZWQgb24gdGhlIHN0YXRlIG5hbWUuXG4gICAqXG4gICAqIFdoZW4gcGFzc2luZyBvbmx5IGEgbmFtZSwgaXQgcmV0dXJucyB0aGUgY3VycmVudCAob3JpZ2luYWwgb3IgZGVjb3JhdGVkKSBidWlsZGVyXG4gICAqIGZ1bmN0aW9uIHRoYXQgbWF0Y2hlcyBgbmFtZWAuXG4gICAqXG4gICAqIFRoZSBidWlsZGVyIGZ1bmN0aW9ucyB0aGF0IGNhbiBiZSBkZWNvcmF0ZWQgYXJlIGxpc3RlZCBiZWxvdy4gVGhvdWdoIG5vdCBhbGxcbiAgICogbmVjZXNzYXJpbHkgaGF2ZSBhIGdvb2QgdXNlIGNhc2UgZm9yIGRlY29yYXRpb24sIHRoYXQgaXMgdXAgdG8geW91IHRvIGRlY2lkZS5cbiAgICpcbiAgICogSW4gYWRkaXRpb24sIHVzZXJzIGNhbiBhdHRhY2ggY3VzdG9tIGRlY29yYXRvcnMsIHdoaWNoIHdpbGwgZ2VuZXJhdGUgbmV3IFxuICAgKiBwcm9wZXJ0aWVzIHdpdGhpbiB0aGUgc3RhdGUncyBpbnRlcm5hbCBkZWZpbml0aW9uLiBUaGVyZSBpcyBjdXJyZW50bHkgbm8gY2xlYXIgXG4gICAqIHVzZS1jYXNlIGZvciB0aGlzIGJleW9uZCBhY2Nlc3NpbmcgaW50ZXJuYWwgc3RhdGVzIChpLmUuICRzdGF0ZS4kY3VycmVudCksIFxuICAgKiBob3dldmVyLCBleHBlY3QgdGhpcyB0byBiZWNvbWUgaW5jcmVhc2luZ2x5IHJlbGV2YW50IGFzIHdlIGludHJvZHVjZSBhZGRpdGlvbmFsIFxuICAgKiBtZXRhLXByb2dyYW1taW5nIGZlYXR1cmVzLlxuICAgKlxuICAgKiAqKldhcm5pbmcqKjogRGVjb3JhdG9ycyBzaG91bGQgbm90IGJlIGludGVyZGVwZW5kZW50IGJlY2F1c2UgdGhlIG9yZGVyIG9mIFxuICAgKiBleGVjdXRpb24gb2YgdGhlIGJ1aWxkZXIgZnVuY3Rpb25zIGluIG5vbi1kZXRlcm1pbmlzdGljLiBCdWlsZGVyIGZ1bmN0aW9ucyBcbiAgICogc2hvdWxkIG9ubHkgYmUgZGVwZW5kZW50IG9uIHRoZSBzdGF0ZSBkZWZpbml0aW9uIG9iamVjdCBhbmQgc3VwZXIgZnVuY3Rpb24uXG4gICAqXG4gICAqXG4gICAqIEV4aXN0aW5nIGJ1aWxkZXIgZnVuY3Rpb25zIGFuZCBjdXJyZW50IHJldHVybiB2YWx1ZXM6XG4gICAqXG4gICAqIC0gKipwYXJlbnQqKiBge29iamVjdH1gIC0gcmV0dXJucyB0aGUgcGFyZW50IHN0YXRlIG9iamVjdC5cbiAgICogLSAqKmRhdGEqKiBge29iamVjdH1gIC0gcmV0dXJucyBzdGF0ZSBkYXRhLCBpbmNsdWRpbmcgYW55IGluaGVyaXRlZCBkYXRhIHRoYXQgaXMgbm90XG4gICAqICAgb3ZlcnJpZGRlbiBieSBvd24gdmFsdWVzIChpZiBhbnkpLlxuICAgKiAtICoqdXJsKiogYHtvYmplY3R9YCAtIHJldHVybnMgYSB7QGxpbmsgdWkucm91dGVyLnV0aWwudHlwZTpVcmxNYXRjaGVyIFVybE1hdGNoZXJ9XG4gICAqICAgb3IgYG51bGxgLlxuICAgKiAtICoqbmF2aWdhYmxlKiogYHtvYmplY3R9YCAtIHJldHVybnMgY2xvc2VzdCBhbmNlc3RvciBzdGF0ZSB0aGF0IGhhcyBhIFVSTCAoYWthIGlzIFxuICAgKiAgIG5hdmlnYWJsZSkuXG4gICAqIC0gKipwYXJhbXMqKiBge29iamVjdH1gIC0gcmV0dXJucyBhbiBhcnJheSBvZiBzdGF0ZSBwYXJhbXMgdGhhdCBhcmUgZW5zdXJlZCB0byBcbiAgICogICBiZSBhIHN1cGVyLXNldCBvZiBwYXJlbnQncyBwYXJhbXMuXG4gICAqIC0gKip2aWV3cyoqIGB7b2JqZWN0fWAgLSByZXR1cm5zIGEgdmlld3Mgb2JqZWN0IHdoZXJlIGVhY2gga2V5IGlzIGFuIGFic29sdXRlIHZpZXcgXG4gICAqICAgbmFtZSAoaS5lLiBcInZpZXdOYW1lQHN0YXRlTmFtZVwiKSBhbmQgZWFjaCB2YWx1ZSBpcyB0aGUgY29uZmlnIG9iamVjdCBcbiAgICogICAodGVtcGxhdGUsIGNvbnRyb2xsZXIpIGZvciB0aGUgdmlldy4gRXZlbiB3aGVuIHlvdSBkb24ndCB1c2UgdGhlIHZpZXdzIG9iamVjdCBcbiAgICogICBleHBsaWNpdGx5IG9uIGEgc3RhdGUgY29uZmlnLCBvbmUgaXMgc3RpbGwgY3JlYXRlZCBmb3IgeW91IGludGVybmFsbHkuXG4gICAqICAgU28gYnkgZGVjb3JhdGluZyB0aGlzIGJ1aWxkZXIgZnVuY3Rpb24geW91IGhhdmUgYWNjZXNzIHRvIGRlY29yYXRpbmcgdGVtcGxhdGUgXG4gICAqICAgYW5kIGNvbnRyb2xsZXIgcHJvcGVydGllcy5cbiAgICogLSAqKm93blBhcmFtcyoqIGB7b2JqZWN0fWAgLSByZXR1cm5zIGFuIGFycmF5IG9mIHBhcmFtcyB0aGF0IGJlbG9uZyB0byB0aGUgc3RhdGUsIFxuICAgKiAgIG5vdCBpbmNsdWRpbmcgYW55IHBhcmFtcyBkZWZpbmVkIGJ5IGFuY2VzdG9yIHN0YXRlcy5cbiAgICogLSAqKnBhdGgqKiBge3N0cmluZ31gIC0gcmV0dXJucyB0aGUgZnVsbCBwYXRoIGZyb20gdGhlIHJvb3QgZG93biB0byB0aGlzIHN0YXRlLiBcbiAgICogICBOZWVkZWQgZm9yIHN0YXRlIGFjdGl2YXRpb24uXG4gICAqIC0gKippbmNsdWRlcyoqIGB7b2JqZWN0fWAgLSByZXR1cm5zIGFuIG9iamVjdCB0aGF0IGluY2x1ZGVzIGV2ZXJ5IHN0YXRlIHRoYXQgXG4gICAqICAgd291bGQgcGFzcyBhIGAkc3RhdGUuaW5jbHVkZXMoKWAgdGVzdC5cbiAgICpcbiAgICogQGV4YW1wbGVcbiAgICogPHByZT5cbiAgICogLy8gT3ZlcnJpZGUgdGhlIGludGVybmFsICd2aWV3cycgYnVpbGRlciB3aXRoIGEgZnVuY3Rpb24gdGhhdCB0YWtlcyB0aGUgc3RhdGVcbiAgICogLy8gZGVmaW5pdGlvbiwgYW5kIGEgcmVmZXJlbmNlIHRvIHRoZSBpbnRlcm5hbCBmdW5jdGlvbiBiZWluZyBvdmVycmlkZGVuOlxuICAgKiAkc3RhdGVQcm92aWRlci5kZWNvcmF0b3IoJ3ZpZXdzJywgZnVuY3Rpb24gKHN0YXRlLCBwYXJlbnQpIHtcbiAgICogICB2YXIgcmVzdWx0ID0ge30sXG4gICAqICAgICAgIHZpZXdzID0gcGFyZW50KHN0YXRlKTtcbiAgICpcbiAgICogICBhbmd1bGFyLmZvckVhY2godmlld3MsIGZ1bmN0aW9uIChjb25maWcsIG5hbWUpIHtcbiAgICogICAgIHZhciBhdXRvTmFtZSA9IChzdGF0ZS5uYW1lICsgJy4nICsgbmFtZSkucmVwbGFjZSgnLicsICcvJyk7XG4gICAqICAgICBjb25maWcudGVtcGxhdGVVcmwgPSBjb25maWcudGVtcGxhdGVVcmwgfHwgJy9wYXJ0aWFscy8nICsgYXV0b05hbWUgKyAnLmh0bWwnO1xuICAgKiAgICAgcmVzdWx0W25hbWVdID0gY29uZmlnO1xuICAgKiAgIH0pO1xuICAgKiAgIHJldHVybiByZXN1bHQ7XG4gICAqIH0pO1xuICAgKlxuICAgKiAkc3RhdGVQcm92aWRlci5zdGF0ZSgnaG9tZScsIHtcbiAgICogICB2aWV3czoge1xuICAgKiAgICAgJ2NvbnRhY3QubGlzdCc6IHsgY29udHJvbGxlcjogJ0xpc3RDb250cm9sbGVyJyB9LFxuICAgKiAgICAgJ2NvbnRhY3QuaXRlbSc6IHsgY29udHJvbGxlcjogJ0l0ZW1Db250cm9sbGVyJyB9XG4gICAqICAgfVxuICAgKiB9KTtcbiAgICpcbiAgICogLy8gLi4uXG4gICAqXG4gICAqICRzdGF0ZS5nbygnaG9tZScpO1xuICAgKiAvLyBBdXRvLXBvcHVsYXRlcyBsaXN0IGFuZCBpdGVtIHZpZXdzIHdpdGggL3BhcnRpYWxzL2hvbWUvY29udGFjdC9saXN0Lmh0bWwsXG4gICAqIC8vIGFuZCAvcGFydGlhbHMvaG9tZS9jb250YWN0L2l0ZW0uaHRtbCwgcmVzcGVjdGl2ZWx5LlxuICAgKiA8L3ByZT5cbiAgICpcbiAgICogQHBhcmFtIHtzdHJpbmd9IG5hbWUgVGhlIG5hbWUgb2YgdGhlIGJ1aWxkZXIgZnVuY3Rpb24gdG8gZGVjb3JhdGUuIFxuICAgKiBAcGFyYW0ge29iamVjdH0gZnVuYyBBIGZ1bmN0aW9uIHRoYXQgaXMgcmVzcG9uc2libGUgZm9yIGRlY29yYXRpbmcgdGhlIG9yaWdpbmFsIFxuICAgKiBidWlsZGVyIGZ1bmN0aW9uLiBUaGUgZnVuY3Rpb24gcmVjZWl2ZXMgdHdvIHBhcmFtZXRlcnM6XG4gICAqXG4gICAqICAgLSBge29iamVjdH1gIC0gc3RhdGUgLSBUaGUgc3RhdGUgY29uZmlnIG9iamVjdC5cbiAgICogICAtIGB7b2JqZWN0fWAgLSBzdXBlciAtIFRoZSBvcmlnaW5hbCBidWlsZGVyIGZ1bmN0aW9uLlxuICAgKlxuICAgKiBAcmV0dXJuIHtvYmplY3R9ICRzdGF0ZVByb3ZpZGVyIC0gJHN0YXRlUHJvdmlkZXIgaW5zdGFuY2VcbiAgICovXG4gIHRoaXMuZGVjb3JhdG9yID0gZGVjb3JhdG9yO1xuICBmdW5jdGlvbiBkZWNvcmF0b3IobmFtZSwgZnVuYykge1xuICAgIC8qanNoaW50IHZhbGlkdGhpczogdHJ1ZSAqL1xuICAgIGlmIChpc1N0cmluZyhuYW1lKSAmJiAhaXNEZWZpbmVkKGZ1bmMpKSB7XG4gICAgICByZXR1cm4gc3RhdGVCdWlsZGVyW25hbWVdO1xuICAgIH1cbiAgICBpZiAoIWlzRnVuY3Rpb24oZnVuYykgfHwgIWlzU3RyaW5nKG5hbWUpKSB7XG4gICAgICByZXR1cm4gdGhpcztcbiAgICB9XG4gICAgaWYgKHN0YXRlQnVpbGRlcltuYW1lXSAmJiAhc3RhdGVCdWlsZGVyLiRkZWxlZ2F0ZXNbbmFtZV0pIHtcbiAgICAgIHN0YXRlQnVpbGRlci4kZGVsZWdhdGVzW25hbWVdID0gc3RhdGVCdWlsZGVyW25hbWVdO1xuICAgIH1cbiAgICBzdGF0ZUJ1aWxkZXJbbmFtZV0gPSBmdW5jO1xuICAgIHJldHVybiB0aGlzO1xuICB9XG5cbiAgLyoqXG4gICAqIEBuZ2RvYyBmdW5jdGlvblxuICAgKiBAbmFtZSB1aS5yb3V0ZXIuc3RhdGUuJHN0YXRlUHJvdmlkZXIjc3RhdGVcbiAgICogQG1ldGhvZE9mIHVpLnJvdXRlci5zdGF0ZS4kc3RhdGVQcm92aWRlclxuICAgKlxuICAgKiBAZGVzY3JpcHRpb25cbiAgICogUmVnaXN0ZXJzIGEgc3RhdGUgY29uZmlndXJhdGlvbiB1bmRlciBhIGdpdmVuIHN0YXRlIG5hbWUuIFRoZSBzdGF0ZUNvbmZpZyBvYmplY3RcbiAgICogaGFzIHRoZSBmb2xsb3dpbmcgYWNjZXB0YWJsZSBwcm9wZXJ0aWVzLlxuICAgKlxuICAgKiBAcGFyYW0ge3N0cmluZ30gbmFtZSBBIHVuaXF1ZSBzdGF0ZSBuYW1lLCBlLmcuIFwiaG9tZVwiLCBcImFib3V0XCIsIFwiY29udGFjdHNcIi5cbiAgICogVG8gY3JlYXRlIGEgcGFyZW50L2NoaWxkIHN0YXRlIHVzZSBhIGRvdCwgZS5nLiBcImFib3V0LnNhbGVzXCIsIFwiaG9tZS5uZXdlc3RcIi5cbiAgICogQHBhcmFtIHtvYmplY3R9IHN0YXRlQ29uZmlnIFN0YXRlIGNvbmZpZ3VyYXRpb24gb2JqZWN0LlxuICAgKiBAcGFyYW0ge3N0cmluZ3xmdW5jdGlvbj19IHN0YXRlQ29uZmlnLnRlbXBsYXRlXG4gICAqIDxhIGlkPSd0ZW1wbGF0ZSc+PC9hPlxuICAgKiAgIGh0bWwgdGVtcGxhdGUgYXMgYSBzdHJpbmcgb3IgYSBmdW5jdGlvbiB0aGF0IHJldHVybnNcbiAgICogICBhbiBodG1sIHRlbXBsYXRlIGFzIGEgc3RyaW5nIHdoaWNoIHNob3VsZCBiZSB1c2VkIGJ5IHRoZSB1aVZpZXcgZGlyZWN0aXZlcy4gVGhpcyBwcm9wZXJ0eSBcbiAgICogICB0YWtlcyBwcmVjZWRlbmNlIG92ZXIgdGVtcGxhdGVVcmwuXG4gICAqICAgXG4gICAqICAgSWYgYHRlbXBsYXRlYCBpcyBhIGZ1bmN0aW9uLCBpdCB3aWxsIGJlIGNhbGxlZCB3aXRoIHRoZSBmb2xsb3dpbmcgcGFyYW1ldGVyczpcbiAgICpcbiAgICogICAtIHthcnJheS4mbHQ7b2JqZWN0Jmd0O30gLSBzdGF0ZSBwYXJhbWV0ZXJzIGV4dHJhY3RlZCBmcm9tIHRoZSBjdXJyZW50ICRsb2NhdGlvbi5wYXRoKCkgYnlcbiAgICogICAgIGFwcGx5aW5nIHRoZSBjdXJyZW50IHN0YXRlXG4gICAqXG4gICAqIDxwcmU+dGVtcGxhdGU6XG4gICAqICAgXCI8aDE+aW5saW5lIHRlbXBsYXRlIGRlZmluaXRpb248L2gxPlwiICtcbiAgICogICBcIjxkaXYgdWktdmlldz48L2Rpdj5cIjwvcHJlPlxuICAgKiA8cHJlPnRlbXBsYXRlOiBmdW5jdGlvbihwYXJhbXMpIHtcbiAgICogICAgICAgcmV0dXJuIFwiPGgxPmdlbmVyYXRlZCB0ZW1wbGF0ZTwvaDE+XCI7IH08L3ByZT5cbiAgICogPC9kaXY+XG4gICAqXG4gICAqIEBwYXJhbSB7c3RyaW5nfGZ1bmN0aW9uPX0gc3RhdGVDb25maWcudGVtcGxhdGVVcmxcbiAgICogPGEgaWQ9J3RlbXBsYXRlVXJsJz48L2E+XG4gICAqXG4gICAqICAgcGF0aCBvciBmdW5jdGlvbiB0aGF0IHJldHVybnMgYSBwYXRoIHRvIGFuIGh0bWxcbiAgICogICB0ZW1wbGF0ZSB0aGF0IHNob3VsZCBiZSB1c2VkIGJ5IHVpVmlldy5cbiAgICogICBcbiAgICogICBJZiBgdGVtcGxhdGVVcmxgIGlzIGEgZnVuY3Rpb24sIGl0IHdpbGwgYmUgY2FsbGVkIHdpdGggdGhlIGZvbGxvd2luZyBwYXJhbWV0ZXJzOlxuICAgKlxuICAgKiAgIC0ge2FycmF5LiZsdDtvYmplY3QmZ3Q7fSAtIHN0YXRlIHBhcmFtZXRlcnMgZXh0cmFjdGVkIGZyb20gdGhlIGN1cnJlbnQgJGxvY2F0aW9uLnBhdGgoKSBieSBcbiAgICogICAgIGFwcGx5aW5nIHRoZSBjdXJyZW50IHN0YXRlXG4gICAqXG4gICAqIDxwcmU+dGVtcGxhdGVVcmw6IFwiaG9tZS5odG1sXCI8L3ByZT5cbiAgICogPHByZT50ZW1wbGF0ZVVybDogZnVuY3Rpb24ocGFyYW1zKSB7XG4gICAqICAgICByZXR1cm4gbXlUZW1wbGF0ZXNbcGFyYW1zLnBhZ2VJZF07IH08L3ByZT5cbiAgICpcbiAgICogQHBhcmFtIHtmdW5jdGlvbj19IHN0YXRlQ29uZmlnLnRlbXBsYXRlUHJvdmlkZXJcbiAgICogPGEgaWQ9J3RlbXBsYXRlUHJvdmlkZXInPjwvYT5cbiAgICogICAgUHJvdmlkZXIgZnVuY3Rpb24gdGhhdCByZXR1cm5zIEhUTUwgY29udGVudCBzdHJpbmcuXG4gICAqIDxwcmU+IHRlbXBsYXRlUHJvdmlkZXI6XG4gICAqICAgICAgIGZ1bmN0aW9uKE15VGVtcGxhdGVTZXJ2aWNlLCBwYXJhbXMpIHtcbiAgICogICAgICAgICByZXR1cm4gTXlUZW1wbGF0ZVNlcnZpY2UuZ2V0VGVtcGxhdGUocGFyYW1zLnBhZ2VJZCk7XG4gICAqICAgICAgIH08L3ByZT5cbiAgICpcbiAgICogQHBhcmFtIHtzdHJpbmd8ZnVuY3Rpb249fSBzdGF0ZUNvbmZpZy5jb250cm9sbGVyXG4gICAqIDxhIGlkPSdjb250cm9sbGVyJz48L2E+XG4gICAqXG4gICAqICBDb250cm9sbGVyIGZuIHRoYXQgc2hvdWxkIGJlIGFzc29jaWF0ZWQgd2l0aCBuZXdseVxuICAgKiAgIHJlbGF0ZWQgc2NvcGUgb3IgdGhlIG5hbWUgb2YgYSByZWdpc3RlcmVkIGNvbnRyb2xsZXIgaWYgcGFzc2VkIGFzIGEgc3RyaW5nLlxuICAgKiAgIE9wdGlvbmFsbHksIHRoZSBDb250cm9sbGVyQXMgbWF5IGJlIGRlY2xhcmVkIGhlcmUuXG4gICAqIDxwcmU+Y29udHJvbGxlcjogXCJNeVJlZ2lzdGVyZWRDb250cm9sbGVyXCI8L3ByZT5cbiAgICogPHByZT5jb250cm9sbGVyOlxuICAgKiAgICAgXCJNeVJlZ2lzdGVyZWRDb250cm9sbGVyIGFzIGZvb0N0cmxcIn08L3ByZT5cbiAgICogPHByZT5jb250cm9sbGVyOiBmdW5jdGlvbigkc2NvcGUsIE15U2VydmljZSkge1xuICAgKiAgICAgJHNjb3BlLmRhdGEgPSBNeVNlcnZpY2UuZ2V0RGF0YSgpOyB9PC9wcmU+XG4gICAqXG4gICAqIEBwYXJhbSB7ZnVuY3Rpb249fSBzdGF0ZUNvbmZpZy5jb250cm9sbGVyUHJvdmlkZXJcbiAgICogPGEgaWQ9J2NvbnRyb2xsZXJQcm92aWRlcic+PC9hPlxuICAgKlxuICAgKiBJbmplY3RhYmxlIHByb3ZpZGVyIGZ1bmN0aW9uIHRoYXQgcmV0dXJucyB0aGUgYWN0dWFsIGNvbnRyb2xsZXIgb3Igc3RyaW5nLlxuICAgKiA8cHJlPmNvbnRyb2xsZXJQcm92aWRlcjpcbiAgICogICBmdW5jdGlvbihNeVJlc29sdmVEYXRhKSB7XG4gICAqICAgICBpZiAoTXlSZXNvbHZlRGF0YS5mb28pXG4gICAqICAgICAgIHJldHVybiBcIkZvb0N0cmxcIlxuICAgKiAgICAgZWxzZSBpZiAoTXlSZXNvbHZlRGF0YS5iYXIpXG4gICAqICAgICAgIHJldHVybiBcIkJhckN0cmxcIjtcbiAgICogICAgIGVsc2UgcmV0dXJuIGZ1bmN0aW9uKCRzY29wZSkge1xuICAgKiAgICAgICAkc2NvcGUuYmF6ID0gXCJRdXhcIjtcbiAgICogICAgIH1cbiAgICogICB9PC9wcmU+XG4gICAqXG4gICAqIEBwYXJhbSB7c3RyaW5nPX0gc3RhdGVDb25maWcuY29udHJvbGxlckFzXG4gICAqIDxhIGlkPSdjb250cm9sbGVyQXMnPjwvYT5cbiAgICogXG4gICAqIEEgY29udHJvbGxlciBhbGlhcyBuYW1lLiBJZiBwcmVzZW50IHRoZSBjb250cm9sbGVyIHdpbGwgYmVcbiAgICogICBwdWJsaXNoZWQgdG8gc2NvcGUgdW5kZXIgdGhlIGNvbnRyb2xsZXJBcyBuYW1lLlxuICAgKiA8cHJlPmNvbnRyb2xsZXJBczogXCJteUN0cmxcIjwvcHJlPlxuICAgKlxuICAgKiBAcGFyYW0ge3N0cmluZ3xvYmplY3Q9fSBzdGF0ZUNvbmZpZy5wYXJlbnRcbiAgICogPGEgaWQ9J3BhcmVudCc+PC9hPlxuICAgKiBPcHRpb25hbGx5IHNwZWNpZmllcyB0aGUgcGFyZW50IHN0YXRlIG9mIHRoaXMgc3RhdGUuXG4gICAqXG4gICAqIDxwcmU+cGFyZW50OiAncGFyZW50U3RhdGUnPC9wcmU+XG4gICAqIDxwcmU+cGFyZW50OiBwYXJlbnRTdGF0ZSAvLyBKUyB2YXJpYWJsZTwvcHJlPlxuICAgKlxuICAgKiBAcGFyYW0ge29iamVjdD19IHN0YXRlQ29uZmlnLnJlc29sdmVcbiAgICogPGEgaWQ9J3Jlc29sdmUnPjwvYT5cbiAgICpcbiAgICogQW4gb3B0aW9uYWwgbWFwJmx0O3N0cmluZywgZnVuY3Rpb24mZ3Q7IG9mIGRlcGVuZGVuY2llcyB3aGljaFxuICAgKiAgIHNob3VsZCBiZSBpbmplY3RlZCBpbnRvIHRoZSBjb250cm9sbGVyLiBJZiBhbnkgb2YgdGhlc2UgZGVwZW5kZW5jaWVzIGFyZSBwcm9taXNlcywgXG4gICAqICAgdGhlIHJvdXRlciB3aWxsIHdhaXQgZm9yIHRoZW0gYWxsIHRvIGJlIHJlc29sdmVkIGJlZm9yZSB0aGUgY29udHJvbGxlciBpcyBpbnN0YW50aWF0ZWQuXG4gICAqICAgSWYgYWxsIHRoZSBwcm9taXNlcyBhcmUgcmVzb2x2ZWQgc3VjY2Vzc2Z1bGx5LCB0aGUgJHN0YXRlQ2hhbmdlU3VjY2VzcyBldmVudCBpcyBmaXJlZFxuICAgKiAgIGFuZCB0aGUgdmFsdWVzIG9mIHRoZSByZXNvbHZlZCBwcm9taXNlcyBhcmUgaW5qZWN0ZWQgaW50byBhbnkgY29udHJvbGxlcnMgdGhhdCByZWZlcmVuY2UgdGhlbS5cbiAgICogICBJZiBhbnkgIG9mIHRoZSBwcm9taXNlcyBhcmUgcmVqZWN0ZWQgdGhlICRzdGF0ZUNoYW5nZUVycm9yIGV2ZW50IGlzIGZpcmVkLlxuICAgKlxuICAgKiAgIFRoZSBtYXAgb2JqZWN0IGlzOlxuICAgKiAgIFxuICAgKiAgIC0ga2V5IC0ge3N0cmluZ306IG5hbWUgb2YgZGVwZW5kZW5jeSB0byBiZSBpbmplY3RlZCBpbnRvIGNvbnRyb2xsZXJcbiAgICogICAtIGZhY3RvcnkgLSB7c3RyaW5nfGZ1bmN0aW9ufTogSWYgc3RyaW5nIHRoZW4gaXQgaXMgYWxpYXMgZm9yIHNlcnZpY2UuIE90aGVyd2lzZSBpZiBmdW5jdGlvbiwgXG4gICAqICAgICBpdCBpcyBpbmplY3RlZCBhbmQgcmV0dXJuIHZhbHVlIGl0IHRyZWF0ZWQgYXMgZGVwZW5kZW5jeS4gSWYgcmVzdWx0IGlzIGEgcHJvbWlzZSwgaXQgaXMgXG4gICAqICAgICByZXNvbHZlZCBiZWZvcmUgaXRzIHZhbHVlIGlzIGluamVjdGVkIGludG8gY29udHJvbGxlci5cbiAgICpcbiAgICogPHByZT5yZXNvbHZlOiB7XG4gICAqICAgICBteVJlc29sdmUxOlxuICAgKiAgICAgICBmdW5jdGlvbigkaHR0cCwgJHN0YXRlUGFyYW1zKSB7XG4gICAqICAgICAgICAgcmV0dXJuICRodHRwLmdldChcIi9hcGkvZm9vcy9cIitzdGF0ZVBhcmFtcy5mb29JRCk7XG4gICAqICAgICAgIH1cbiAgICogICAgIH08L3ByZT5cbiAgICpcbiAgICogQHBhcmFtIHtzdHJpbmc9fSBzdGF0ZUNvbmZpZy51cmxcbiAgICogPGEgaWQ9J3VybCc+PC9hPlxuICAgKlxuICAgKiAgIEEgdXJsIGZyYWdtZW50IHdpdGggb3B0aW9uYWwgcGFyYW1ldGVycy4gV2hlbiBhIHN0YXRlIGlzIG5hdmlnYXRlZCBvclxuICAgKiAgIHRyYW5zaXRpb25lZCB0bywgdGhlIGAkc3RhdGVQYXJhbXNgIHNlcnZpY2Ugd2lsbCBiZSBwb3B1bGF0ZWQgd2l0aCBhbnkgXG4gICAqICAgcGFyYW1ldGVycyB0aGF0IHdlcmUgcGFzc2VkLlxuICAgKlxuICAgKiAgIChTZWUge0BsaW5rIHVpLnJvdXRlci51dGlsLnR5cGU6VXJsTWF0Y2hlciBVcmxNYXRjaGVyfSBgVXJsTWF0Y2hlcmB9IGZvclxuICAgKiAgIG1vcmUgZGV0YWlscyBvbiBhY2NlcHRhYmxlIHBhdHRlcm5zIClcbiAgICpcbiAgICogZXhhbXBsZXM6XG4gICAqIDxwcmU+dXJsOiBcIi9ob21lXCJcbiAgICogdXJsOiBcIi91c2Vycy86dXNlcmlkXCJcbiAgICogdXJsOiBcIi9ib29rcy97Ym9va2lkOlthLXpBLVpfLV19XCJcbiAgICogdXJsOiBcIi9ib29rcy97Y2F0ZWdvcnlpZDppbnR9XCJcbiAgICogdXJsOiBcIi9ib29rcy97cHVibGlzaGVybmFtZTpzdHJpbmd9L3tjYXRlZ29yeWlkOmludH1cIlxuICAgKiB1cmw6IFwiL21lc3NhZ2VzP2JlZm9yZSZhZnRlclwiXG4gICAqIHVybDogXCIvbWVzc2FnZXM/e2JlZm9yZTpkYXRlfSZ7YWZ0ZXI6ZGF0ZX1cIlxuICAgKiB1cmw6IFwiL21lc3NhZ2VzLzptYWlsYm94aWQ/e2JlZm9yZTpkYXRlfSZ7YWZ0ZXI6ZGF0ZX1cIlxuICAgKiA8L3ByZT5cbiAgICpcbiAgICogQHBhcmFtIHtvYmplY3Q9fSBzdGF0ZUNvbmZpZy52aWV3c1xuICAgKiA8YSBpZD0ndmlld3MnPjwvYT5cbiAgICogYW4gb3B0aW9uYWwgbWFwJmx0O3N0cmluZywgb2JqZWN0Jmd0OyB3aGljaCBkZWZpbmVkIG11bHRpcGxlIHZpZXdzLCBvciB0YXJnZXRzIHZpZXdzXG4gICAqIG1hbnVhbGx5L2V4cGxpY2l0bHkuXG4gICAqXG4gICAqIEV4YW1wbGVzOlxuICAgKlxuICAgKiBUYXJnZXRzIHRocmVlIG5hbWVkIGB1aS12aWV3YHMgaW4gdGhlIHBhcmVudCBzdGF0ZSdzIHRlbXBsYXRlXG4gICAqIDxwcmU+dmlld3M6IHtcbiAgICogICAgIGhlYWRlcjoge1xuICAgKiAgICAgICBjb250cm9sbGVyOiBcImhlYWRlckN0cmxcIixcbiAgICogICAgICAgdGVtcGxhdGVVcmw6IFwiaGVhZGVyLmh0bWxcIlxuICAgKiAgICAgfSwgYm9keToge1xuICAgKiAgICAgICBjb250cm9sbGVyOiBcImJvZHlDdHJsXCIsXG4gICAqICAgICAgIHRlbXBsYXRlVXJsOiBcImJvZHkuaHRtbFwiXG4gICAqICAgICB9LCBmb290ZXI6IHtcbiAgICogICAgICAgY29udHJvbGxlcjogXCJmb290Q3RybFwiLFxuICAgKiAgICAgICB0ZW1wbGF0ZVVybDogXCJmb290ZXIuaHRtbFwiXG4gICAqICAgICB9XG4gICAqICAgfTwvcHJlPlxuICAgKlxuICAgKiBUYXJnZXRzIG5hbWVkIGB1aS12aWV3PVwiaGVhZGVyXCJgIGZyb20gZ3JhbmRwYXJlbnQgc3RhdGUgJ3RvcCcncyB0ZW1wbGF0ZSwgYW5kIG5hbWVkIGB1aS12aWV3PVwiYm9keVwiIGZyb20gcGFyZW50IHN0YXRlJ3MgdGVtcGxhdGUuXG4gICAqIDxwcmU+dmlld3M6IHtcbiAgICogICAgICdoZWFkZXJAdG9wJzoge1xuICAgKiAgICAgICBjb250cm9sbGVyOiBcIm1zZ0hlYWRlckN0cmxcIixcbiAgICogICAgICAgdGVtcGxhdGVVcmw6IFwibXNnSGVhZGVyLmh0bWxcIlxuICAgKiAgICAgfSwgJ2JvZHknOiB7XG4gICAqICAgICAgIGNvbnRyb2xsZXI6IFwibWVzc2FnZXNDdHJsXCIsXG4gICAqICAgICAgIHRlbXBsYXRlVXJsOiBcIm1lc3NhZ2VzLmh0bWxcIlxuICAgKiAgICAgfVxuICAgKiAgIH08L3ByZT5cbiAgICpcbiAgICogQHBhcmFtIHtib29sZWFuPX0gW3N0YXRlQ29uZmlnLmFic3RyYWN0PWZhbHNlXVxuICAgKiA8YSBpZD0nYWJzdHJhY3QnPjwvYT5cbiAgICogQW4gYWJzdHJhY3Qgc3RhdGUgd2lsbCBuZXZlciBiZSBkaXJlY3RseSBhY3RpdmF0ZWQsXG4gICAqICAgYnV0IGNhbiBwcm92aWRlIGluaGVyaXRlZCBwcm9wZXJ0aWVzIHRvIGl0cyBjb21tb24gY2hpbGRyZW4gc3RhdGVzLlxuICAgKiA8cHJlPmFic3RyYWN0OiB0cnVlPC9wcmU+XG4gICAqXG4gICAqIEBwYXJhbSB7ZnVuY3Rpb249fSBzdGF0ZUNvbmZpZy5vbkVudGVyXG4gICAqIDxhIGlkPSdvbkVudGVyJz48L2E+XG4gICAqXG4gICAqIENhbGxiYWNrIGZ1bmN0aW9uIGZvciB3aGVuIGEgc3RhdGUgaXMgZW50ZXJlZC4gR29vZCB3YXlcbiAgICogICB0byB0cmlnZ2VyIGFuIGFjdGlvbiBvciBkaXNwYXRjaCBhbiBldmVudCwgc3VjaCBhcyBvcGVuaW5nIGEgZGlhbG9nLlxuICAgKiBJZiBtaW5pZnlpbmcgeW91ciBzY3JpcHRzLCBtYWtlIHN1cmUgdG8gZXhwbGljdGx5IGFubm90YXRlIHRoaXMgZnVuY3Rpb24sXG4gICAqIGJlY2F1c2UgaXQgd29uJ3QgYmUgYXV0b21hdGljYWxseSBhbm5vdGF0ZWQgYnkgeW91ciBidWlsZCB0b29scy5cbiAgICpcbiAgICogPHByZT5vbkVudGVyOiBmdW5jdGlvbihNeVNlcnZpY2UsICRzdGF0ZVBhcmFtcykge1xuICAgKiAgICAgTXlTZXJ2aWNlLmZvbygkc3RhdGVQYXJhbXMubXlQYXJhbSk7XG4gICAqIH08L3ByZT5cbiAgICpcbiAgICogQHBhcmFtIHtmdW5jdGlvbj19IHN0YXRlQ29uZmlnLm9uRXhpdFxuICAgKiA8YSBpZD0nb25FeGl0Jz48L2E+XG4gICAqXG4gICAqIENhbGxiYWNrIGZ1bmN0aW9uIGZvciB3aGVuIGEgc3RhdGUgaXMgZXhpdGVkLiBHb29kIHdheSB0b1xuICAgKiAgIHRyaWdnZXIgYW4gYWN0aW9uIG9yIGRpc3BhdGNoIGFuIGV2ZW50LCBzdWNoIGFzIG9wZW5pbmcgYSBkaWFsb2cuXG4gICAqIElmIG1pbmlmeWluZyB5b3VyIHNjcmlwdHMsIG1ha2Ugc3VyZSB0byBleHBsaWN0bHkgYW5ub3RhdGUgdGhpcyBmdW5jdGlvbixcbiAgICogYmVjYXVzZSBpdCB3b24ndCBiZSBhdXRvbWF0aWNhbGx5IGFubm90YXRlZCBieSB5b3VyIGJ1aWxkIHRvb2xzLlxuICAgKlxuICAgKiA8cHJlPm9uRXhpdDogZnVuY3Rpb24oTXlTZXJ2aWNlLCAkc3RhdGVQYXJhbXMpIHtcbiAgICogICAgIE15U2VydmljZS5jbGVhbnVwKCRzdGF0ZVBhcmFtcy5teVBhcmFtKTtcbiAgICogfTwvcHJlPlxuICAgKlxuICAgKiBAcGFyYW0ge2Jvb2xlYW49fSBbc3RhdGVDb25maWcucmVsb2FkT25TZWFyY2g9dHJ1ZV1cbiAgICogPGEgaWQ9J3JlbG9hZE9uU2VhcmNoJz48L2E+XG4gICAqXG4gICAqIElmIGBmYWxzZWAsIHdpbGwgbm90IHJldHJpZ2dlciB0aGUgc2FtZSBzdGF0ZVxuICAgKiAgIGp1c3QgYmVjYXVzZSBhIHNlYXJjaC9xdWVyeSBwYXJhbWV0ZXIgaGFzIGNoYW5nZWQgKHZpYSAkbG9jYXRpb24uc2VhcmNoKCkgb3IgJGxvY2F0aW9uLmhhc2goKSkuIFxuICAgKiAgIFVzZWZ1bCBmb3Igd2hlbiB5b3UnZCBsaWtlIHRvIG1vZGlmeSAkbG9jYXRpb24uc2VhcmNoKCkgd2l0aG91dCB0cmlnZ2VyaW5nIGEgcmVsb2FkLlxuICAgKiA8cHJlPnJlbG9hZE9uU2VhcmNoOiBmYWxzZTwvcHJlPlxuICAgKlxuICAgKiBAcGFyYW0ge29iamVjdD19IHN0YXRlQ29uZmlnLmRhdGFcbiAgICogPGEgaWQ9J2RhdGEnPjwvYT5cbiAgICpcbiAgICogQXJiaXRyYXJ5IGRhdGEgb2JqZWN0LCB1c2VmdWwgZm9yIGN1c3RvbSBjb25maWd1cmF0aW9uLiAgVGhlIHBhcmVudCBzdGF0ZSdzIGBkYXRhYCBpc1xuICAgKiAgIHByb3RvdHlwYWxseSBpbmhlcml0ZWQuICBJbiBvdGhlciB3b3JkcywgYWRkaW5nIGEgZGF0YSBwcm9wZXJ0eSB0byBhIHN0YXRlIGFkZHMgaXQgdG9cbiAgICogICB0aGUgZW50aXJlIHN1YnRyZWUgdmlhIHByb3RvdHlwYWwgaW5oZXJpdGFuY2UuXG4gICAqXG4gICAqIDxwcmU+ZGF0YToge1xuICAgKiAgICAgcmVxdWlyZWRSb2xlOiAnZm9vJ1xuICAgKiB9IDwvcHJlPlxuICAgKlxuICAgKiBAcGFyYW0ge29iamVjdD19IHN0YXRlQ29uZmlnLnBhcmFtc1xuICAgKiA8YSBpZD0ncGFyYW1zJz48L2E+XG4gICAqXG4gICAqIEEgbWFwIHdoaWNoIG9wdGlvbmFsbHkgY29uZmlndXJlcyBwYXJhbWV0ZXJzIGRlY2xhcmVkIGluIHRoZSBgdXJsYCwgb3JcbiAgICogICBkZWZpbmVzIGFkZGl0aW9uYWwgbm9uLXVybCBwYXJhbWV0ZXJzLiAgRm9yIGVhY2ggcGFyYW1ldGVyIGJlaW5nXG4gICAqICAgY29uZmlndXJlZCwgYWRkIGEgY29uZmlndXJhdGlvbiBvYmplY3Qga2V5ZWQgdG8gdGhlIG5hbWUgb2YgdGhlIHBhcmFtZXRlci5cbiAgICpcbiAgICogICBFYWNoIHBhcmFtZXRlciBjb25maWd1cmF0aW9uIG9iamVjdCBtYXkgY29udGFpbiB0aGUgZm9sbG93aW5nIHByb3BlcnRpZXM6XG4gICAqXG4gICAqICAgLSAqKiB2YWx1ZSAqKiAtIHtvYmplY3R8ZnVuY3Rpb249fTogc3BlY2lmaWVzIHRoZSBkZWZhdWx0IHZhbHVlIGZvciB0aGlzXG4gICAqICAgICBwYXJhbWV0ZXIuICBUaGlzIGltcGxpY2l0bHkgc2V0cyB0aGlzIHBhcmFtZXRlciBhcyBvcHRpb25hbC5cbiAgICpcbiAgICogICAgIFdoZW4gVUktUm91dGVyIHJvdXRlcyB0byBhIHN0YXRlIGFuZCBubyB2YWx1ZSBpc1xuICAgKiAgICAgc3BlY2lmaWVkIGZvciB0aGlzIHBhcmFtZXRlciBpbiB0aGUgVVJMIG9yIHRyYW5zaXRpb24sIHRoZVxuICAgKiAgICAgZGVmYXVsdCB2YWx1ZSB3aWxsIGJlIHVzZWQgaW5zdGVhZC4gIElmIGB2YWx1ZWAgaXMgYSBmdW5jdGlvbixcbiAgICogICAgIGl0IHdpbGwgYmUgaW5qZWN0ZWQgYW5kIGludm9rZWQsIGFuZCB0aGUgcmV0dXJuIHZhbHVlIHVzZWQuXG4gICAqXG4gICAqICAgICAqTm90ZSo6IGB1bmRlZmluZWRgIGlzIHRyZWF0ZWQgYXMgXCJubyBkZWZhdWx0IHZhbHVlXCIgd2hpbGUgYG51bGxgXG4gICAqICAgICBpcyB0cmVhdGVkIGFzIFwidGhlIGRlZmF1bHQgdmFsdWUgaXMgYG51bGxgXCIuXG4gICAqXG4gICAqICAgICAqU2hvcnRoYW5kKjogSWYgeW91IG9ubHkgbmVlZCB0byBjb25maWd1cmUgdGhlIGRlZmF1bHQgdmFsdWUgb2YgdGhlXG4gICAqICAgICBwYXJhbWV0ZXIsIHlvdSBtYXkgdXNlIGEgc2hvcnRoYW5kIHN5bnRheC4gICBJbiB0aGUgKipgcGFyYW1zYCoqXG4gICAqICAgICBtYXAsIGluc3RlYWQgbWFwcGluZyB0aGUgcGFyYW0gbmFtZSB0byBhIGZ1bGwgcGFyYW1ldGVyIGNvbmZpZ3VyYXRpb25cbiAgICogICAgIG9iamVjdCwgc2ltcGx5IHNldCBtYXAgaXQgdG8gdGhlIGRlZmF1bHQgcGFyYW1ldGVyIHZhbHVlLCBlLmcuOlxuICAgKlxuICAgKiA8cHJlPi8vIGRlZmluZSBhIHBhcmFtZXRlcidzIGRlZmF1bHQgdmFsdWVcbiAgICogcGFyYW1zOiB7XG4gICAqICAgICBwYXJhbTE6IHsgdmFsdWU6IFwiZGVmYXVsdFZhbHVlXCIgfVxuICAgKiB9XG4gICAqIC8vIHNob3J0aGFuZCBkZWZhdWx0IHZhbHVlc1xuICAgKiBwYXJhbXM6IHtcbiAgICogICAgIHBhcmFtMTogXCJkZWZhdWx0VmFsdWVcIixcbiAgICogICAgIHBhcmFtMjogXCJwYXJhbTJEZWZhdWx0XCJcbiAgICogfTwvcHJlPlxuICAgKlxuICAgKiAgIC0gKiogYXJyYXkgKiogLSB7Ym9vbGVhbj19OiAqKGRlZmF1bHQ6IGZhbHNlKSogSWYgdHJ1ZSwgdGhlIHBhcmFtIHZhbHVlIHdpbGwgYmVcbiAgICogICAgIHRyZWF0ZWQgYXMgYW4gYXJyYXkgb2YgdmFsdWVzLiAgSWYgeW91IHNwZWNpZmllZCBhIFR5cGUsIHRoZSB2YWx1ZSB3aWxsIGJlXG4gICAqICAgICB0cmVhdGVkIGFzIGFuIGFycmF5IG9mIHRoZSBzcGVjaWZpZWQgVHlwZS4gIE5vdGU6IHF1ZXJ5IHBhcmFtZXRlciB2YWx1ZXNcbiAgICogICAgIGRlZmF1bHQgdG8gYSBzcGVjaWFsIGBcImF1dG9cImAgbW9kZS5cbiAgICpcbiAgICogICAgIEZvciBxdWVyeSBwYXJhbWV0ZXJzIGluIGBcImF1dG9cImAgbW9kZSwgaWYgbXVsdGlwbGUgIHZhbHVlcyBmb3IgYSBzaW5nbGUgcGFyYW1ldGVyXG4gICAqICAgICBhcmUgcHJlc2VudCBpbiB0aGUgVVJMIChlLmcuOiBgL2Zvbz9iYXI9MSZiYXI9MiZiYXI9M2ApIHRoZW4gdGhlIHZhbHVlc1xuICAgKiAgICAgYXJlIG1hcHBlZCB0byBhbiBhcnJheSAoZS5nLjogYHsgZm9vOiBbICcxJywgJzInLCAnMycgXSB9YCkuICBIb3dldmVyLCBpZlxuICAgKiAgICAgb25seSBvbmUgdmFsdWUgaXMgcHJlc2VudCAoZS5nLjogYC9mb28/YmFyPTFgKSB0aGVuIHRoZSB2YWx1ZSBpcyB0cmVhdGVkIGFzIHNpbmdsZVxuICAgKiAgICAgdmFsdWUgKGUuZy46IGB7IGZvbzogJzEnIH1gKS5cbiAgICpcbiAgICogPHByZT5wYXJhbXM6IHtcbiAgICogICAgIHBhcmFtMTogeyBhcnJheTogdHJ1ZSB9XG4gICAqIH08L3ByZT5cbiAgICpcbiAgICogICAtICoqIHNxdWFzaCAqKiAtIHtib29sfHN0cmluZz19OiBgc3F1YXNoYCBjb25maWd1cmVzIGhvdyBhIGRlZmF1bHQgcGFyYW1ldGVyIHZhbHVlIGlzIHJlcHJlc2VudGVkIGluIHRoZSBVUkwgd2hlblxuICAgKiAgICAgdGhlIGN1cnJlbnQgcGFyYW1ldGVyIHZhbHVlIGlzIHRoZSBzYW1lIGFzIHRoZSBkZWZhdWx0IHZhbHVlLiBJZiBgc3F1YXNoYCBpcyBub3Qgc2V0LCBpdCB1c2VzIHRoZVxuICAgKiAgICAgY29uZmlndXJlZCBkZWZhdWx0IHNxdWFzaCBwb2xpY3kuXG4gICAqICAgICAoU2VlIHtAbGluayB1aS5yb3V0ZXIudXRpbC4kdXJsTWF0Y2hlckZhY3RvcnkjbWV0aG9kc19kZWZhdWx0U3F1YXNoUG9saWN5IGBkZWZhdWx0U3F1YXNoUG9saWN5KClgfSlcbiAgICpcbiAgICogICBUaGVyZSBhcmUgdGhyZWUgc3F1YXNoIHNldHRpbmdzOlxuICAgKlxuICAgKiAgICAgLSBmYWxzZTogVGhlIHBhcmFtZXRlcidzIGRlZmF1bHQgdmFsdWUgaXMgbm90IHNxdWFzaGVkLiAgSXQgaXMgZW5jb2RlZCBhbmQgaW5jbHVkZWQgaW4gdGhlIFVSTFxuICAgKiAgICAgLSB0cnVlOiBUaGUgcGFyYW1ldGVyJ3MgZGVmYXVsdCB2YWx1ZSBpcyBvbWl0dGVkIGZyb20gdGhlIFVSTC4gIElmIHRoZSBwYXJhbWV0ZXIgaXMgcHJlY2VlZGVkIGFuZCBmb2xsb3dlZFxuICAgKiAgICAgICBieSBzbGFzaGVzIGluIHRoZSBzdGF0ZSdzIGB1cmxgIGRlY2xhcmF0aW9uLCB0aGVuIG9uZSBvZiB0aG9zZSBzbGFzaGVzIGFyZSBvbWl0dGVkLlxuICAgKiAgICAgICBUaGlzIGNhbiBhbGxvdyBmb3IgY2xlYW5lciBsb29raW5nIFVSTHMuXG4gICAqICAgICAtIGBcIjxhcmJpdHJhcnkgc3RyaW5nPlwiYDogVGhlIHBhcmFtZXRlcidzIGRlZmF1bHQgdmFsdWUgaXMgcmVwbGFjZWQgd2l0aCBhbiBhcmJpdHJhcnkgcGxhY2Vob2xkZXIgb2YgIHlvdXIgY2hvaWNlLlxuICAgKlxuICAgKiA8cHJlPnBhcmFtczoge1xuICAgKiAgICAgcGFyYW0xOiB7XG4gICAqICAgICAgIHZhbHVlOiBcImRlZmF1bHRJZFwiLFxuICAgKiAgICAgICBzcXVhc2g6IHRydWVcbiAgICogfSB9XG4gICAqIC8vIHNxdWFzaCBcImRlZmF1bHRWYWx1ZVwiIHRvIFwiflwiXG4gICAqIHBhcmFtczoge1xuICAgKiAgICAgcGFyYW0xOiB7XG4gICAqICAgICAgIHZhbHVlOiBcImRlZmF1bHRWYWx1ZVwiLFxuICAgKiAgICAgICBzcXVhc2g6IFwiflwiXG4gICAqIH0gfVxuICAgKiA8L3ByZT5cbiAgICpcbiAgICpcbiAgICogQGV4YW1wbGVcbiAgICogPHByZT5cbiAgICogLy8gU29tZSBzdGF0ZSBuYW1lIGV4YW1wbGVzXG4gICAqXG4gICAqIC8vIHN0YXRlTmFtZSBjYW4gYmUgYSBzaW5nbGUgdG9wLWxldmVsIG5hbWUgKG11c3QgYmUgdW5pcXVlKS5cbiAgICogJHN0YXRlUHJvdmlkZXIuc3RhdGUoXCJob21lXCIsIHt9KTtcbiAgICpcbiAgICogLy8gT3IgaXQgY2FuIGJlIGEgbmVzdGVkIHN0YXRlIG5hbWUuIFRoaXMgc3RhdGUgaXMgYSBjaGlsZCBvZiB0aGVcbiAgICogLy8gYWJvdmUgXCJob21lXCIgc3RhdGUuXG4gICAqICRzdGF0ZVByb3ZpZGVyLnN0YXRlKFwiaG9tZS5uZXdlc3RcIiwge30pO1xuICAgKlxuICAgKiAvLyBOZXN0IHN0YXRlcyBhcyBkZWVwbHkgYXMgbmVlZGVkLlxuICAgKiAkc3RhdGVQcm92aWRlci5zdGF0ZShcImhvbWUubmV3ZXN0LmFiYy54eXouaW5jZXB0aW9uXCIsIHt9KTtcbiAgICpcbiAgICogLy8gc3RhdGUoKSByZXR1cm5zICRzdGF0ZVByb3ZpZGVyLCBzbyB5b3UgY2FuIGNoYWluIHN0YXRlIGRlY2xhcmF0aW9ucy5cbiAgICogJHN0YXRlUHJvdmlkZXJcbiAgICogICAuc3RhdGUoXCJob21lXCIsIHt9KVxuICAgKiAgIC5zdGF0ZShcImFib3V0XCIsIHt9KVxuICAgKiAgIC5zdGF0ZShcImNvbnRhY3RzXCIsIHt9KTtcbiAgICogPC9wcmU+XG4gICAqXG4gICAqL1xuICB0aGlzLnN0YXRlID0gc3RhdGU7XG4gIGZ1bmN0aW9uIHN0YXRlKG5hbWUsIGRlZmluaXRpb24pIHtcbiAgICAvKmpzaGludCB2YWxpZHRoaXM6IHRydWUgKi9cbiAgICBpZiAoaXNPYmplY3QobmFtZSkpIGRlZmluaXRpb24gPSBuYW1lO1xuICAgIGVsc2UgZGVmaW5pdGlvbi5uYW1lID0gbmFtZTtcbiAgICByZWdpc3RlclN0YXRlKGRlZmluaXRpb24pO1xuICAgIHJldHVybiB0aGlzO1xuICB9XG5cbiAgLyoqXG4gICAqIEBuZ2RvYyBvYmplY3RcbiAgICogQG5hbWUgdWkucm91dGVyLnN0YXRlLiRzdGF0ZVxuICAgKlxuICAgKiBAcmVxdWlyZXMgJHJvb3RTY29wZVxuICAgKiBAcmVxdWlyZXMgJHFcbiAgICogQHJlcXVpcmVzIHVpLnJvdXRlci5zdGF0ZS4kdmlld1xuICAgKiBAcmVxdWlyZXMgJGluamVjdG9yXG4gICAqIEByZXF1aXJlcyB1aS5yb3V0ZXIudXRpbC4kcmVzb2x2ZVxuICAgKiBAcmVxdWlyZXMgdWkucm91dGVyLnN0YXRlLiRzdGF0ZVBhcmFtc1xuICAgKiBAcmVxdWlyZXMgdWkucm91dGVyLnJvdXRlci4kdXJsUm91dGVyXG4gICAqXG4gICAqIEBwcm9wZXJ0eSB7b2JqZWN0fSBwYXJhbXMgQSBwYXJhbSBvYmplY3QsIGUuZy4ge3NlY3Rpb25JZDogc2VjdGlvbi5pZCl9LCB0aGF0IFxuICAgKiB5b3UnZCBsaWtlIHRvIHRlc3QgYWdhaW5zdCB0aGUgY3VycmVudCBhY3RpdmUgc3RhdGUuXG4gICAqIEBwcm9wZXJ0eSB7b2JqZWN0fSBjdXJyZW50IEEgcmVmZXJlbmNlIHRvIHRoZSBzdGF0ZSdzIGNvbmZpZyBvYmplY3QuIEhvd2V2ZXIgXG4gICAqIHlvdSBwYXNzZWQgaXQgaW4uIFVzZWZ1bCBmb3IgYWNjZXNzaW5nIGN1c3RvbSBkYXRhLlxuICAgKiBAcHJvcGVydHkge29iamVjdH0gdHJhbnNpdGlvbiBDdXJyZW50bHkgcGVuZGluZyB0cmFuc2l0aW9uLiBBIHByb21pc2UgdGhhdCdsbCBcbiAgICogcmVzb2x2ZSBvciByZWplY3QuXG4gICAqXG4gICAqIEBkZXNjcmlwdGlvblxuICAgKiBgJHN0YXRlYCBzZXJ2aWNlIGlzIHJlc3BvbnNpYmxlIGZvciByZXByZXNlbnRpbmcgc3RhdGVzIGFzIHdlbGwgYXMgdHJhbnNpdGlvbmluZ1xuICAgKiBiZXR3ZWVuIHRoZW0uIEl0IGFsc28gcHJvdmlkZXMgaW50ZXJmYWNlcyB0byBhc2sgZm9yIGN1cnJlbnQgc3RhdGUgb3IgZXZlbiBzdGF0ZXNcbiAgICogeW91J3JlIGNvbWluZyBmcm9tLlxuICAgKi9cbiAgdGhpcy4kZ2V0ID0gJGdldDtcbiAgJGdldC4kaW5qZWN0ID0gWyckcm9vdFNjb3BlJywgJyRxJywgJyR2aWV3JywgJyRpbmplY3RvcicsICckcmVzb2x2ZScsICckc3RhdGVQYXJhbXMnLCAnJHVybFJvdXRlcicsICckbG9jYXRpb24nLCAnJHVybE1hdGNoZXJGYWN0b3J5J107XG4gIGZ1bmN0aW9uICRnZXQoICAgJHJvb3RTY29wZSwgICAkcSwgICAkdmlldywgICAkaW5qZWN0b3IsICAgJHJlc29sdmUsICAgJHN0YXRlUGFyYW1zLCAgICR1cmxSb3V0ZXIsICAgJGxvY2F0aW9uLCAgICR1cmxNYXRjaGVyRmFjdG9yeSkge1xuXG4gICAgdmFyIFRyYW5zaXRpb25TdXBlcnNlZGVkID0gJHEucmVqZWN0KG5ldyBFcnJvcigndHJhbnNpdGlvbiBzdXBlcnNlZGVkJykpO1xuICAgIHZhciBUcmFuc2l0aW9uUHJldmVudGVkID0gJHEucmVqZWN0KG5ldyBFcnJvcigndHJhbnNpdGlvbiBwcmV2ZW50ZWQnKSk7XG4gICAgdmFyIFRyYW5zaXRpb25BYm9ydGVkID0gJHEucmVqZWN0KG5ldyBFcnJvcigndHJhbnNpdGlvbiBhYm9ydGVkJykpO1xuICAgIHZhciBUcmFuc2l0aW9uRmFpbGVkID0gJHEucmVqZWN0KG5ldyBFcnJvcigndHJhbnNpdGlvbiBmYWlsZWQnKSk7XG5cbiAgICAvLyBIYW5kbGVzIHRoZSBjYXNlIHdoZXJlIGEgc3RhdGUgd2hpY2ggaXMgdGhlIHRhcmdldCBvZiBhIHRyYW5zaXRpb24gaXMgbm90IGZvdW5kLCBhbmQgdGhlIHVzZXJcbiAgICAvLyBjYW4gb3B0aW9uYWxseSByZXRyeSBvciBkZWZlciB0aGUgdHJhbnNpdGlvblxuICAgIGZ1bmN0aW9uIGhhbmRsZVJlZGlyZWN0KHJlZGlyZWN0LCBzdGF0ZSwgcGFyYW1zLCBvcHRpb25zKSB7XG4gICAgICAvKipcbiAgICAgICAqIEBuZ2RvYyBldmVudFxuICAgICAgICogQG5hbWUgdWkucm91dGVyLnN0YXRlLiRzdGF0ZSMkc3RhdGVOb3RGb3VuZFxuICAgICAgICogQGV2ZW50T2YgdWkucm91dGVyLnN0YXRlLiRzdGF0ZVxuICAgICAgICogQGV2ZW50VHlwZSBicm9hZGNhc3Qgb24gcm9vdCBzY29wZVxuICAgICAgICogQGRlc2NyaXB0aW9uXG4gICAgICAgKiBGaXJlZCB3aGVuIGEgcmVxdWVzdGVkIHN0YXRlICoqY2Fubm90IGJlIGZvdW5kKiogdXNpbmcgdGhlIHByb3ZpZGVkIHN0YXRlIG5hbWUgZHVyaW5nIHRyYW5zaXRpb24uXG4gICAgICAgKiBUaGUgZXZlbnQgaXMgYnJvYWRjYXN0IGFsbG93aW5nIGFueSBoYW5kbGVycyBhIHNpbmdsZSBjaGFuY2UgdG8gZGVhbCB3aXRoIHRoZSBlcnJvciAodXN1YWxseSBieVxuICAgICAgICogbGF6eS1sb2FkaW5nIHRoZSB1bmZvdW5kIHN0YXRlKS4gQSBzcGVjaWFsIGB1bmZvdW5kU3RhdGVgIG9iamVjdCBpcyBwYXNzZWQgdG8gdGhlIGxpc3RlbmVyIGhhbmRsZXIsXG4gICAgICAgKiB5b3UgY2FuIHNlZSBpdHMgdGhyZWUgcHJvcGVydGllcyBpbiB0aGUgZXhhbXBsZS4gWW91IGNhbiB1c2UgYGV2ZW50LnByZXZlbnREZWZhdWx0KClgIHRvIGFib3J0IHRoZVxuICAgICAgICogdHJhbnNpdGlvbiBhbmQgdGhlIHByb21pc2UgcmV0dXJuZWQgZnJvbSBgZ29gIHdpbGwgYmUgcmVqZWN0ZWQgd2l0aCBhIGAndHJhbnNpdGlvbiBhYm9ydGVkJ2AgdmFsdWUuXG4gICAgICAgKlxuICAgICAgICogQHBhcmFtIHtPYmplY3R9IGV2ZW50IEV2ZW50IG9iamVjdC5cbiAgICAgICAqIEBwYXJhbSB7T2JqZWN0fSB1bmZvdW5kU3RhdGUgVW5mb3VuZCBTdGF0ZSBpbmZvcm1hdGlvbi4gQ29udGFpbnM6IGB0bywgdG9QYXJhbXMsIG9wdGlvbnNgIHByb3BlcnRpZXMuXG4gICAgICAgKiBAcGFyYW0ge1N0YXRlfSBmcm9tU3RhdGUgQ3VycmVudCBzdGF0ZSBvYmplY3QuXG4gICAgICAgKiBAcGFyYW0ge09iamVjdH0gZnJvbVBhcmFtcyBDdXJyZW50IHN0YXRlIHBhcmFtcy5cbiAgICAgICAqXG4gICAgICAgKiBAZXhhbXBsZVxuICAgICAgICpcbiAgICAgICAqIDxwcmU+XG4gICAgICAgKiAvLyBzb21ld2hlcmUsIGFzc3VtZSBsYXp5LnN0YXRlIGhhcyBub3QgYmVlbiBkZWZpbmVkXG4gICAgICAgKiAkc3RhdGUuZ28oXCJsYXp5LnN0YXRlXCIsIHthOjEsIGI6Mn0sIHtpbmhlcml0OmZhbHNlfSk7XG4gICAgICAgKlxuICAgICAgICogLy8gc29tZXdoZXJlIGVsc2VcbiAgICAgICAqICRzY29wZS4kb24oJyRzdGF0ZU5vdEZvdW5kJyxcbiAgICAgICAqIGZ1bmN0aW9uKGV2ZW50LCB1bmZvdW5kU3RhdGUsIGZyb21TdGF0ZSwgZnJvbVBhcmFtcyl7XG4gICAgICAgKiAgICAgY29uc29sZS5sb2codW5mb3VuZFN0YXRlLnRvKTsgLy8gXCJsYXp5LnN0YXRlXCJcbiAgICAgICAqICAgICBjb25zb2xlLmxvZyh1bmZvdW5kU3RhdGUudG9QYXJhbXMpOyAvLyB7YToxLCBiOjJ9XG4gICAgICAgKiAgICAgY29uc29sZS5sb2codW5mb3VuZFN0YXRlLm9wdGlvbnMpOyAvLyB7aW5oZXJpdDpmYWxzZX0gKyBkZWZhdWx0IG9wdGlvbnNcbiAgICAgICAqIH0pXG4gICAgICAgKiA8L3ByZT5cbiAgICAgICAqL1xuICAgICAgdmFyIGV2dCA9ICRyb290U2NvcGUuJGJyb2FkY2FzdCgnJHN0YXRlTm90Rm91bmQnLCByZWRpcmVjdCwgc3RhdGUsIHBhcmFtcyk7XG5cbiAgICAgIGlmIChldnQuZGVmYXVsdFByZXZlbnRlZCkge1xuICAgICAgICAkdXJsUm91dGVyLnVwZGF0ZSgpO1xuICAgICAgICByZXR1cm4gVHJhbnNpdGlvbkFib3J0ZWQ7XG4gICAgICB9XG5cbiAgICAgIGlmICghZXZ0LnJldHJ5KSB7XG4gICAgICAgIHJldHVybiBudWxsO1xuICAgICAgfVxuXG4gICAgICAvLyBBbGxvdyB0aGUgaGFuZGxlciB0byByZXR1cm4gYSBwcm9taXNlIHRvIGRlZmVyIHN0YXRlIGxvb2t1cCByZXRyeVxuICAgICAgaWYgKG9wdGlvbnMuJHJldHJ5KSB7XG4gICAgICAgICR1cmxSb3V0ZXIudXBkYXRlKCk7XG4gICAgICAgIHJldHVybiBUcmFuc2l0aW9uRmFpbGVkO1xuICAgICAgfVxuICAgICAgdmFyIHJldHJ5VHJhbnNpdGlvbiA9ICRzdGF0ZS50cmFuc2l0aW9uID0gJHEud2hlbihldnQucmV0cnkpO1xuXG4gICAgICByZXRyeVRyYW5zaXRpb24udGhlbihmdW5jdGlvbigpIHtcbiAgICAgICAgaWYgKHJldHJ5VHJhbnNpdGlvbiAhPT0gJHN0YXRlLnRyYW5zaXRpb24pIHJldHVybiBUcmFuc2l0aW9uU3VwZXJzZWRlZDtcbiAgICAgICAgcmVkaXJlY3Qub3B0aW9ucy4kcmV0cnkgPSB0cnVlO1xuICAgICAgICByZXR1cm4gJHN0YXRlLnRyYW5zaXRpb25UbyhyZWRpcmVjdC50bywgcmVkaXJlY3QudG9QYXJhbXMsIHJlZGlyZWN0Lm9wdGlvbnMpO1xuICAgICAgfSwgZnVuY3Rpb24oKSB7XG4gICAgICAgIHJldHVybiBUcmFuc2l0aW9uQWJvcnRlZDtcbiAgICAgIH0pO1xuICAgICAgJHVybFJvdXRlci51cGRhdGUoKTtcblxuICAgICAgcmV0dXJuIHJldHJ5VHJhbnNpdGlvbjtcbiAgICB9XG5cbiAgICByb290LmxvY2FscyA9IHsgcmVzb2x2ZTogbnVsbCwgZ2xvYmFsczogeyAkc3RhdGVQYXJhbXM6IHt9IH0gfTtcblxuICAgICRzdGF0ZSA9IHtcbiAgICAgIHBhcmFtczoge30sXG4gICAgICBjdXJyZW50OiByb290LnNlbGYsXG4gICAgICAkY3VycmVudDogcm9vdCxcbiAgICAgIHRyYW5zaXRpb246IG51bGxcbiAgICB9O1xuXG4gICAgLyoqXG4gICAgICogQG5nZG9jIGZ1bmN0aW9uXG4gICAgICogQG5hbWUgdWkucm91dGVyLnN0YXRlLiRzdGF0ZSNyZWxvYWRcbiAgICAgKiBAbWV0aG9kT2YgdWkucm91dGVyLnN0YXRlLiRzdGF0ZVxuICAgICAqXG4gICAgICogQGRlc2NyaXB0aW9uXG4gICAgICogQSBtZXRob2QgdGhhdCBmb3JjZSByZWxvYWRzIHRoZSBjdXJyZW50IHN0YXRlLiBBbGwgcmVzb2x2ZXMgYXJlIHJlLXJlc29sdmVkLFxuICAgICAqIGNvbnRyb2xsZXJzIHJlaW5zdGFudGlhdGVkLCBhbmQgZXZlbnRzIHJlLWZpcmVkLlxuICAgICAqXG4gICAgICogQGV4YW1wbGVcbiAgICAgKiA8cHJlPlxuICAgICAqIHZhciBhcHAgYW5ndWxhci5tb2R1bGUoJ2FwcCcsIFsndWkucm91dGVyJ10pO1xuICAgICAqXG4gICAgICogYXBwLmNvbnRyb2xsZXIoJ2N0cmwnLCBmdW5jdGlvbiAoJHNjb3BlLCAkc3RhdGUpIHtcbiAgICAgKiAgICRzY29wZS5yZWxvYWQgPSBmdW5jdGlvbigpe1xuICAgICAqICAgICAkc3RhdGUucmVsb2FkKCk7XG4gICAgICogICB9XG4gICAgICogfSk7XG4gICAgICogPC9wcmU+XG4gICAgICpcbiAgICAgKiBgcmVsb2FkKClgIGlzIGp1c3QgYW4gYWxpYXMgZm9yOlxuICAgICAqIDxwcmU+XG4gICAgICogJHN0YXRlLnRyYW5zaXRpb25Ubygkc3RhdGUuY3VycmVudCwgJHN0YXRlUGFyYW1zLCB7IFxuICAgICAqICAgcmVsb2FkOiB0cnVlLCBpbmhlcml0OiBmYWxzZSwgbm90aWZ5OiB0cnVlXG4gICAgICogfSk7XG4gICAgICogPC9wcmU+XG4gICAgICpcbiAgICAgKiBAcGFyYW0ge3N0cmluZz18b2JqZWN0PX0gc3RhdGUgLSBBIHN0YXRlIG5hbWUgb3IgYSBzdGF0ZSBvYmplY3QsIHdoaWNoIGlzIHRoZSByb290IG9mIHRoZSByZXNvbHZlcyB0byBiZSByZS1yZXNvbHZlZC5cbiAgICAgKiBAZXhhbXBsZVxuICAgICAqIDxwcmU+XG4gICAgICogLy9hc3N1bWluZyBhcHAgYXBwbGljYXRpb24gY29uc2lzdHMgb2YgMyBzdGF0ZXM6ICdjb250YWN0cycsICdjb250YWN0cy5kZXRhaWwnLCAnY29udGFjdHMuZGV0YWlsLml0ZW0nIFxuICAgICAqIC8vYW5kIGN1cnJlbnQgc3RhdGUgaXMgJ2NvbnRhY3RzLmRldGFpbC5pdGVtJ1xuICAgICAqIHZhciBhcHAgYW5ndWxhci5tb2R1bGUoJ2FwcCcsIFsndWkucm91dGVyJ10pO1xuICAgICAqXG4gICAgICogYXBwLmNvbnRyb2xsZXIoJ2N0cmwnLCBmdW5jdGlvbiAoJHNjb3BlLCAkc3RhdGUpIHtcbiAgICAgKiAgICRzY29wZS5yZWxvYWQgPSBmdW5jdGlvbigpe1xuICAgICAqICAgICAvL3dpbGwgcmVsb2FkICdjb250YWN0LmRldGFpbCcgYW5kICdjb250YWN0LmRldGFpbC5pdGVtJyBzdGF0ZXNcbiAgICAgKiAgICAgJHN0YXRlLnJlbG9hZCgnY29udGFjdC5kZXRhaWwnKTtcbiAgICAgKiAgIH1cbiAgICAgKiB9KTtcbiAgICAgKiA8L3ByZT5cbiAgICAgKlxuICAgICAqIGByZWxvYWQoKWAgaXMganVzdCBhbiBhbGlhcyBmb3I6XG4gICAgICogPHByZT5cbiAgICAgKiAkc3RhdGUudHJhbnNpdGlvblRvKCRzdGF0ZS5jdXJyZW50LCAkc3RhdGVQYXJhbXMsIHsgXG4gICAgICogICByZWxvYWQ6IHRydWUsIGluaGVyaXQ6IGZhbHNlLCBub3RpZnk6IHRydWVcbiAgICAgKiB9KTtcbiAgICAgKiA8L3ByZT5cblxuICAgICAqIEByZXR1cm5zIHtwcm9taXNlfSBBIHByb21pc2UgcmVwcmVzZW50aW5nIHRoZSBzdGF0ZSBvZiB0aGUgbmV3IHRyYW5zaXRpb24uIFNlZVxuICAgICAqIHtAbGluayB1aS5yb3V0ZXIuc3RhdGUuJHN0YXRlI21ldGhvZHNfZ28gJHN0YXRlLmdvfS5cbiAgICAgKi9cbiAgICAkc3RhdGUucmVsb2FkID0gZnVuY3Rpb24gcmVsb2FkKHN0YXRlKSB7XG4gICAgICByZXR1cm4gJHN0YXRlLnRyYW5zaXRpb25Ubygkc3RhdGUuY3VycmVudCwgJHN0YXRlUGFyYW1zLCB7IHJlbG9hZDogc3RhdGUgfHwgdHJ1ZSwgaW5oZXJpdDogZmFsc2UsIG5vdGlmeTogdHJ1ZX0pO1xuICAgIH07XG5cbiAgICAvKipcbiAgICAgKiBAbmdkb2MgZnVuY3Rpb25cbiAgICAgKiBAbmFtZSB1aS5yb3V0ZXIuc3RhdGUuJHN0YXRlI2dvXG4gICAgICogQG1ldGhvZE9mIHVpLnJvdXRlci5zdGF0ZS4kc3RhdGVcbiAgICAgKlxuICAgICAqIEBkZXNjcmlwdGlvblxuICAgICAqIENvbnZlbmllbmNlIG1ldGhvZCBmb3IgdHJhbnNpdGlvbmluZyB0byBhIG5ldyBzdGF0ZS4gYCRzdGF0ZS5nb2AgY2FsbHMgXG4gICAgICogYCRzdGF0ZS50cmFuc2l0aW9uVG9gIGludGVybmFsbHkgYnV0IGF1dG9tYXRpY2FsbHkgc2V0cyBvcHRpb25zIHRvIFxuICAgICAqIGB7IGxvY2F0aW9uOiB0cnVlLCBpbmhlcml0OiB0cnVlLCByZWxhdGl2ZTogJHN0YXRlLiRjdXJyZW50LCBub3RpZnk6IHRydWUgfWAuIFxuICAgICAqIFRoaXMgYWxsb3dzIHlvdSB0byBlYXNpbHkgdXNlIGFuIGFic29sdXRlIG9yIHJlbGF0aXZlIHRvIHBhdGggYW5kIHNwZWNpZnkgXG4gICAgICogb25seSB0aGUgcGFyYW1ldGVycyB5b3UnZCBsaWtlIHRvIHVwZGF0ZSAod2hpbGUgbGV0dGluZyB1bnNwZWNpZmllZCBwYXJhbWV0ZXJzIFxuICAgICAqIGluaGVyaXQgZnJvbSB0aGUgY3VycmVudGx5IGFjdGl2ZSBhbmNlc3RvciBzdGF0ZXMpLlxuICAgICAqXG4gICAgICogQGV4YW1wbGVcbiAgICAgKiA8cHJlPlxuICAgICAqIHZhciBhcHAgPSBhbmd1bGFyLm1vZHVsZSgnYXBwJywgWyd1aS5yb3V0ZXInXSk7XG4gICAgICpcbiAgICAgKiBhcHAuY29udHJvbGxlcignY3RybCcsIGZ1bmN0aW9uICgkc2NvcGUsICRzdGF0ZSkge1xuICAgICAqICAgJHNjb3BlLmNoYW5nZVN0YXRlID0gZnVuY3Rpb24gKCkge1xuICAgICAqICAgICAkc3RhdGUuZ28oJ2NvbnRhY3QuZGV0YWlsJyk7XG4gICAgICogICB9O1xuICAgICAqIH0pO1xuICAgICAqIDwvcHJlPlxuICAgICAqIDxpbWcgc3JjPScuLi9uZ2RvY19hc3NldHMvU3RhdGVHb0V4YW1wbGVzLnBuZycvPlxuICAgICAqXG4gICAgICogQHBhcmFtIHtzdHJpbmd9IHRvIEFic29sdXRlIHN0YXRlIG5hbWUgb3IgcmVsYXRpdmUgc3RhdGUgcGF0aC4gU29tZSBleGFtcGxlczpcbiAgICAgKlxuICAgICAqIC0gYCRzdGF0ZS5nbygnY29udGFjdC5kZXRhaWwnKWAgLSB3aWxsIGdvIHRvIHRoZSBgY29udGFjdC5kZXRhaWxgIHN0YXRlXG4gICAgICogLSBgJHN0YXRlLmdvKCdeJylgIC0gd2lsbCBnbyB0byBhIHBhcmVudCBzdGF0ZVxuICAgICAqIC0gYCRzdGF0ZS5nbygnXi5zaWJsaW5nJylgIC0gd2lsbCBnbyB0byBhIHNpYmxpbmcgc3RhdGVcbiAgICAgKiAtIGAkc3RhdGUuZ28oJy5jaGlsZC5ncmFuZGNoaWxkJylgIC0gd2lsbCBnbyB0byBncmFuZGNoaWxkIHN0YXRlXG4gICAgICpcbiAgICAgKiBAcGFyYW0ge29iamVjdD19IHBhcmFtcyBBIG1hcCBvZiB0aGUgcGFyYW1ldGVycyB0aGF0IHdpbGwgYmUgc2VudCB0byB0aGUgc3RhdGUsIFxuICAgICAqIHdpbGwgcG9wdWxhdGUgJHN0YXRlUGFyYW1zLiBBbnkgcGFyYW1ldGVycyB0aGF0IGFyZSBub3Qgc3BlY2lmaWVkIHdpbGwgYmUgaW5oZXJpdGVkIGZyb20gY3VycmVudGx5IFxuICAgICAqIGRlZmluZWQgcGFyYW1ldGVycy4gVGhpcyBhbGxvd3MsIGZvciBleGFtcGxlLCBnb2luZyB0byBhIHNpYmxpbmcgc3RhdGUgdGhhdCBzaGFyZXMgcGFyYW1ldGVyc1xuICAgICAqIHNwZWNpZmllZCBpbiBhIHBhcmVudCBzdGF0ZS4gUGFyYW1ldGVyIGluaGVyaXRhbmNlIG9ubHkgd29ya3MgYmV0d2VlbiBjb21tb24gYW5jZXN0b3Igc3RhdGVzLCBJLmUuXG4gICAgICogdHJhbnNpdGlvbmluZyB0byBhIHNpYmxpbmcgd2lsbCBnZXQgeW91IHRoZSBwYXJhbWV0ZXJzIGZvciBhbGwgcGFyZW50cywgdHJhbnNpdGlvbmluZyB0byBhIGNoaWxkXG4gICAgICogd2lsbCBnZXQgeW91IGFsbCBjdXJyZW50IHBhcmFtZXRlcnMsIGV0Yy5cbiAgICAgKiBAcGFyYW0ge29iamVjdD19IG9wdGlvbnMgT3B0aW9ucyBvYmplY3QuIFRoZSBvcHRpb25zIGFyZTpcbiAgICAgKlxuICAgICAqIC0gKipgbG9jYXRpb25gKiogLSB7Ym9vbGVhbj10cnVlfHN0cmluZz19IC0gSWYgYHRydWVgIHdpbGwgdXBkYXRlIHRoZSB1cmwgaW4gdGhlIGxvY2F0aW9uIGJhciwgaWYgYGZhbHNlYFxuICAgICAqICAgIHdpbGwgbm90LiBJZiBzdHJpbmcsIG11c3QgYmUgYFwicmVwbGFjZVwiYCwgd2hpY2ggd2lsbCB1cGRhdGUgdXJsIGFuZCBhbHNvIHJlcGxhY2UgbGFzdCBoaXN0b3J5IHJlY29yZC5cbiAgICAgKiAtICoqYGluaGVyaXRgKiogLSB7Ym9vbGVhbj10cnVlfSwgSWYgYHRydWVgIHdpbGwgaW5oZXJpdCB1cmwgcGFyYW1ldGVycyBmcm9tIGN1cnJlbnQgdXJsLlxuICAgICAqIC0gKipgcmVsYXRpdmVgKiogLSB7b2JqZWN0PSRzdGF0ZS4kY3VycmVudH0sIFdoZW4gdHJhbnNpdGlvbmluZyB3aXRoIHJlbGF0aXZlIHBhdGggKGUuZyAnXicpLCBcbiAgICAgKiAgICBkZWZpbmVzIHdoaWNoIHN0YXRlIHRvIGJlIHJlbGF0aXZlIGZyb20uXG4gICAgICogLSAqKmBub3RpZnlgKiogLSB7Ym9vbGVhbj10cnVlfSwgSWYgYHRydWVgIHdpbGwgYnJvYWRjYXN0ICRzdGF0ZUNoYW5nZVN0YXJ0IGFuZCAkc3RhdGVDaGFuZ2VTdWNjZXNzIGV2ZW50cy5cbiAgICAgKiAtICoqYHJlbG9hZGAqKiAodjAuMi41KSAtIHtib29sZWFuPWZhbHNlfSwgSWYgYHRydWVgIHdpbGwgZm9yY2UgdHJhbnNpdGlvbiBldmVuIGlmIHRoZSBzdGF0ZSBvciBwYXJhbXMgXG4gICAgICogICAgaGF2ZSBub3QgY2hhbmdlZCwgYWthIGEgcmVsb2FkIG9mIHRoZSBzYW1lIHN0YXRlLiBJdCBkaWZmZXJzIGZyb20gcmVsb2FkT25TZWFyY2ggYmVjYXVzZSB5b3UnZFxuICAgICAqICAgIHVzZSB0aGlzIHdoZW4geW91IHdhbnQgdG8gZm9yY2UgYSByZWxvYWQgd2hlbiAqZXZlcnl0aGluZyogaXMgdGhlIHNhbWUsIGluY2x1ZGluZyBzZWFyY2ggcGFyYW1zLlxuICAgICAqXG4gICAgICogQHJldHVybnMge3Byb21pc2V9IEEgcHJvbWlzZSByZXByZXNlbnRpbmcgdGhlIHN0YXRlIG9mIHRoZSBuZXcgdHJhbnNpdGlvbi5cbiAgICAgKlxuICAgICAqIFBvc3NpYmxlIHN1Y2Nlc3MgdmFsdWVzOlxuICAgICAqXG4gICAgICogLSAkc3RhdGUuY3VycmVudFxuICAgICAqXG4gICAgICogPGJyLz5Qb3NzaWJsZSByZWplY3Rpb24gdmFsdWVzOlxuICAgICAqXG4gICAgICogLSAndHJhbnNpdGlvbiBzdXBlcnNlZGVkJyAtIHdoZW4gYSBuZXdlciB0cmFuc2l0aW9uIGhhcyBiZWVuIHN0YXJ0ZWQgYWZ0ZXIgdGhpcyBvbmVcbiAgICAgKiAtICd0cmFuc2l0aW9uIHByZXZlbnRlZCcgLSB3aGVuIGBldmVudC5wcmV2ZW50RGVmYXVsdCgpYCBoYXMgYmVlbiBjYWxsZWQgaW4gYSBgJHN0YXRlQ2hhbmdlU3RhcnRgIGxpc3RlbmVyXG4gICAgICogLSAndHJhbnNpdGlvbiBhYm9ydGVkJyAtIHdoZW4gYGV2ZW50LnByZXZlbnREZWZhdWx0KClgIGhhcyBiZWVuIGNhbGxlZCBpbiBhIGAkc3RhdGVOb3RGb3VuZGAgbGlzdGVuZXIgb3JcbiAgICAgKiAgIHdoZW4gYSBgJHN0YXRlTm90Rm91bmRgIGBldmVudC5yZXRyeWAgcHJvbWlzZSBlcnJvcnMuXG4gICAgICogLSAndHJhbnNpdGlvbiBmYWlsZWQnIC0gd2hlbiBhIHN0YXRlIGhhcyBiZWVuIHVuc3VjY2Vzc2Z1bGx5IGZvdW5kIGFmdGVyIDIgdHJpZXMuXG4gICAgICogLSAqcmVzb2x2ZSBlcnJvciogLSB3aGVuIGFuIGVycm9yIGhhcyBvY2N1cnJlZCB3aXRoIGEgYHJlc29sdmVgXG4gICAgICpcbiAgICAgKi9cbiAgICAkc3RhdGUuZ28gPSBmdW5jdGlvbiBnbyh0bywgcGFyYW1zLCBvcHRpb25zKSB7XG4gICAgICByZXR1cm4gJHN0YXRlLnRyYW5zaXRpb25Ubyh0bywgcGFyYW1zLCBleHRlbmQoeyBpbmhlcml0OiB0cnVlLCByZWxhdGl2ZTogJHN0YXRlLiRjdXJyZW50IH0sIG9wdGlvbnMpKTtcbiAgICB9O1xuXG4gICAgLyoqXG4gICAgICogQG5nZG9jIGZ1bmN0aW9uXG4gICAgICogQG5hbWUgdWkucm91dGVyLnN0YXRlLiRzdGF0ZSN0cmFuc2l0aW9uVG9cbiAgICAgKiBAbWV0aG9kT2YgdWkucm91dGVyLnN0YXRlLiRzdGF0ZVxuICAgICAqXG4gICAgICogQGRlc2NyaXB0aW9uXG4gICAgICogTG93LWxldmVsIG1ldGhvZCBmb3IgdHJhbnNpdGlvbmluZyB0byBhIG5ldyBzdGF0ZS4ge0BsaW5rIHVpLnJvdXRlci5zdGF0ZS4kc3RhdGUjbWV0aG9kc19nbyAkc3RhdGUuZ299XG4gICAgICogdXNlcyBgdHJhbnNpdGlvblRvYCBpbnRlcm5hbGx5LiBgJHN0YXRlLmdvYCBpcyByZWNvbW1lbmRlZCBpbiBtb3N0IHNpdHVhdGlvbnMuXG4gICAgICpcbiAgICAgKiBAZXhhbXBsZVxuICAgICAqIDxwcmU+XG4gICAgICogdmFyIGFwcCA9IGFuZ3VsYXIubW9kdWxlKCdhcHAnLCBbJ3VpLnJvdXRlciddKTtcbiAgICAgKlxuICAgICAqIGFwcC5jb250cm9sbGVyKCdjdHJsJywgZnVuY3Rpb24gKCRzY29wZSwgJHN0YXRlKSB7XG4gICAgICogICAkc2NvcGUuY2hhbmdlU3RhdGUgPSBmdW5jdGlvbiAoKSB7XG4gICAgICogICAgICRzdGF0ZS50cmFuc2l0aW9uVG8oJ2NvbnRhY3QuZGV0YWlsJyk7XG4gICAgICogICB9O1xuICAgICAqIH0pO1xuICAgICAqIDwvcHJlPlxuICAgICAqXG4gICAgICogQHBhcmFtIHtzdHJpbmd9IHRvIFN0YXRlIG5hbWUuXG4gICAgICogQHBhcmFtIHtvYmplY3Q9fSB0b1BhcmFtcyBBIG1hcCBvZiB0aGUgcGFyYW1ldGVycyB0aGF0IHdpbGwgYmUgc2VudCB0byB0aGUgc3RhdGUsXG4gICAgICogd2lsbCBwb3B1bGF0ZSAkc3RhdGVQYXJhbXMuXG4gICAgICogQHBhcmFtIHtvYmplY3Q9fSBvcHRpb25zIE9wdGlvbnMgb2JqZWN0LiBUaGUgb3B0aW9ucyBhcmU6XG4gICAgICpcbiAgICAgKiAtICoqYGxvY2F0aW9uYCoqIC0ge2Jvb2xlYW49dHJ1ZXxzdHJpbmc9fSAtIElmIGB0cnVlYCB3aWxsIHVwZGF0ZSB0aGUgdXJsIGluIHRoZSBsb2NhdGlvbiBiYXIsIGlmIGBmYWxzZWBcbiAgICAgKiAgICB3aWxsIG5vdC4gSWYgc3RyaW5nLCBtdXN0IGJlIGBcInJlcGxhY2VcImAsIHdoaWNoIHdpbGwgdXBkYXRlIHVybCBhbmQgYWxzbyByZXBsYWNlIGxhc3QgaGlzdG9yeSByZWNvcmQuXG4gICAgICogLSAqKmBpbmhlcml0YCoqIC0ge2Jvb2xlYW49ZmFsc2V9LCBJZiBgdHJ1ZWAgd2lsbCBpbmhlcml0IHVybCBwYXJhbWV0ZXJzIGZyb20gY3VycmVudCB1cmwuXG4gICAgICogLSAqKmByZWxhdGl2ZWAqKiAtIHtvYmplY3Q9fSwgV2hlbiB0cmFuc2l0aW9uaW5nIHdpdGggcmVsYXRpdmUgcGF0aCAoZS5nICdeJyksIFxuICAgICAqICAgIGRlZmluZXMgd2hpY2ggc3RhdGUgdG8gYmUgcmVsYXRpdmUgZnJvbS5cbiAgICAgKiAtICoqYG5vdGlmeWAqKiAtIHtib29sZWFuPXRydWV9LCBJZiBgdHJ1ZWAgd2lsbCBicm9hZGNhc3QgJHN0YXRlQ2hhbmdlU3RhcnQgYW5kICRzdGF0ZUNoYW5nZVN1Y2Nlc3MgZXZlbnRzLlxuICAgICAqIC0gKipgcmVsb2FkYCoqICh2MC4yLjUpIC0ge2Jvb2xlYW49ZmFsc2V8c3RyaW5nPXxvYmplY3Q9fSwgSWYgYHRydWVgIHdpbGwgZm9yY2UgdHJhbnNpdGlvbiBldmVuIGlmIHRoZSBzdGF0ZSBvciBwYXJhbXMgXG4gICAgICogICAgaGF2ZSBub3QgY2hhbmdlZCwgYWthIGEgcmVsb2FkIG9mIHRoZSBzYW1lIHN0YXRlLiBJdCBkaWZmZXJzIGZyb20gcmVsb2FkT25TZWFyY2ggYmVjYXVzZSB5b3UnZFxuICAgICAqICAgIHVzZSB0aGlzIHdoZW4geW91IHdhbnQgdG8gZm9yY2UgYSByZWxvYWQgd2hlbiAqZXZlcnl0aGluZyogaXMgdGhlIHNhbWUsIGluY2x1ZGluZyBzZWFyY2ggcGFyYW1zLlxuICAgICAqICAgIGlmIFN0cmluZywgdGhlbiB3aWxsIHJlbG9hZCB0aGUgc3RhdGUgd2l0aCB0aGUgbmFtZSBnaXZlbiBpbiByZWxvYWQsIGFuZCBhbnkgY2hpbGRyZW4uXG4gICAgICogICAgaWYgT2JqZWN0LCB0aGVuIGEgc3RhdGVPYmogaXMgZXhwZWN0ZWQsIHdpbGwgcmVsb2FkIHRoZSBzdGF0ZSBmb3VuZCBpbiBzdGF0ZU9iaiwgYW5kIGFueSBjaGlsZHJlbi5cbiAgICAgKlxuICAgICAqIEByZXR1cm5zIHtwcm9taXNlfSBBIHByb21pc2UgcmVwcmVzZW50aW5nIHRoZSBzdGF0ZSBvZiB0aGUgbmV3IHRyYW5zaXRpb24uIFNlZVxuICAgICAqIHtAbGluayB1aS5yb3V0ZXIuc3RhdGUuJHN0YXRlI21ldGhvZHNfZ28gJHN0YXRlLmdvfS5cbiAgICAgKi9cbiAgICAkc3RhdGUudHJhbnNpdGlvblRvID0gZnVuY3Rpb24gdHJhbnNpdGlvblRvKHRvLCB0b1BhcmFtcywgb3B0aW9ucykge1xuICAgICAgdG9QYXJhbXMgPSB0b1BhcmFtcyB8fCB7fTtcbiAgICAgIG9wdGlvbnMgPSBleHRlbmQoe1xuICAgICAgICBsb2NhdGlvbjogdHJ1ZSwgaW5oZXJpdDogZmFsc2UsIHJlbGF0aXZlOiBudWxsLCBub3RpZnk6IHRydWUsIHJlbG9hZDogZmFsc2UsICRyZXRyeTogZmFsc2VcbiAgICAgIH0sIG9wdGlvbnMgfHwge30pO1xuXG4gICAgICB2YXIgZnJvbSA9ICRzdGF0ZS4kY3VycmVudCwgZnJvbVBhcmFtcyA9ICRzdGF0ZS5wYXJhbXMsIGZyb21QYXRoID0gZnJvbS5wYXRoO1xuICAgICAgdmFyIGV2dCwgdG9TdGF0ZSA9IGZpbmRTdGF0ZSh0bywgb3B0aW9ucy5yZWxhdGl2ZSk7XG5cbiAgICAgIC8vIFN0b3JlIHRoZSBoYXNoIHBhcmFtIGZvciBsYXRlciAoc2luY2UgaXQgd2lsbCBiZSBzdHJpcHBlZCBvdXQgYnkgdmFyaW91cyBtZXRob2RzKVxuICAgICAgdmFyIGhhc2ggPSB0b1BhcmFtc1snIyddO1xuXG4gICAgICBpZiAoIWlzRGVmaW5lZCh0b1N0YXRlKSkge1xuICAgICAgICB2YXIgcmVkaXJlY3QgPSB7IHRvOiB0bywgdG9QYXJhbXM6IHRvUGFyYW1zLCBvcHRpb25zOiBvcHRpb25zIH07XG4gICAgICAgIHZhciByZWRpcmVjdFJlc3VsdCA9IGhhbmRsZVJlZGlyZWN0KHJlZGlyZWN0LCBmcm9tLnNlbGYsIGZyb21QYXJhbXMsIG9wdGlvbnMpO1xuXG4gICAgICAgIGlmIChyZWRpcmVjdFJlc3VsdCkge1xuICAgICAgICAgIHJldHVybiByZWRpcmVjdFJlc3VsdDtcbiAgICAgICAgfVxuXG4gICAgICAgIC8vIEFsd2F5cyByZXRyeSBvbmNlIGlmIHRoZSAkc3RhdGVOb3RGb3VuZCB3YXMgbm90IHByZXZlbnRlZFxuICAgICAgICAvLyAoaGFuZGxlcyBlaXRoZXIgcmVkaXJlY3QgY2hhbmdlZCBvciBzdGF0ZSBsYXp5LWRlZmluaXRpb24pXG4gICAgICAgIHRvID0gcmVkaXJlY3QudG87XG4gICAgICAgIHRvUGFyYW1zID0gcmVkaXJlY3QudG9QYXJhbXM7XG4gICAgICAgIG9wdGlvbnMgPSByZWRpcmVjdC5vcHRpb25zO1xuICAgICAgICB0b1N0YXRlID0gZmluZFN0YXRlKHRvLCBvcHRpb25zLnJlbGF0aXZlKTtcblxuICAgICAgICBpZiAoIWlzRGVmaW5lZCh0b1N0YXRlKSkge1xuICAgICAgICAgIGlmICghb3B0aW9ucy5yZWxhdGl2ZSkgdGhyb3cgbmV3IEVycm9yKFwiTm8gc3VjaCBzdGF0ZSAnXCIgKyB0byArIFwiJ1wiKTtcbiAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoXCJDb3VsZCBub3QgcmVzb2x2ZSAnXCIgKyB0byArIFwiJyBmcm9tIHN0YXRlICdcIiArIG9wdGlvbnMucmVsYXRpdmUgKyBcIidcIik7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICAgIGlmICh0b1N0YXRlW2Fic3RyYWN0S2V5XSkgdGhyb3cgbmV3IEVycm9yKFwiQ2Fubm90IHRyYW5zaXRpb24gdG8gYWJzdHJhY3Qgc3RhdGUgJ1wiICsgdG8gKyBcIidcIik7XG4gICAgICBpZiAob3B0aW9ucy5pbmhlcml0KSB0b1BhcmFtcyA9IGluaGVyaXRQYXJhbXMoJHN0YXRlUGFyYW1zLCB0b1BhcmFtcyB8fCB7fSwgJHN0YXRlLiRjdXJyZW50LCB0b1N0YXRlKTtcbiAgICAgIGlmICghdG9TdGF0ZS5wYXJhbXMuJCR2YWxpZGF0ZXModG9QYXJhbXMpKSByZXR1cm4gVHJhbnNpdGlvbkZhaWxlZDtcblxuICAgICAgdG9QYXJhbXMgPSB0b1N0YXRlLnBhcmFtcy4kJHZhbHVlcyh0b1BhcmFtcyk7XG4gICAgICB0byA9IHRvU3RhdGU7XG5cbiAgICAgIHZhciB0b1BhdGggPSB0by5wYXRoO1xuXG4gICAgICAvLyBTdGFydGluZyBmcm9tIHRoZSByb290IG9mIHRoZSBwYXRoLCBrZWVwIGFsbCBsZXZlbHMgdGhhdCBoYXZlbid0IGNoYW5nZWRcbiAgICAgIHZhciBrZWVwID0gMCwgc3RhdGUgPSB0b1BhdGhba2VlcF0sIGxvY2FscyA9IHJvb3QubG9jYWxzLCB0b0xvY2FscyA9IFtdO1xuXG4gICAgICBpZiAoIW9wdGlvbnMucmVsb2FkKSB7XG4gICAgICAgIHdoaWxlIChzdGF0ZSAmJiBzdGF0ZSA9PT0gZnJvbVBhdGhba2VlcF0gJiYgc3RhdGUub3duUGFyYW1zLiQkZXF1YWxzKHRvUGFyYW1zLCBmcm9tUGFyYW1zKSkge1xuICAgICAgICAgIGxvY2FscyA9IHRvTG9jYWxzW2tlZXBdID0gc3RhdGUubG9jYWxzO1xuICAgICAgICAgIGtlZXArKztcbiAgICAgICAgICBzdGF0ZSA9IHRvUGF0aFtrZWVwXTtcbiAgICAgICAgfVxuICAgICAgfSBlbHNlIGlmIChpc1N0cmluZyhvcHRpb25zLnJlbG9hZCkgfHwgaXNPYmplY3Qob3B0aW9ucy5yZWxvYWQpKSB7XG4gICAgICAgIGlmIChpc09iamVjdChvcHRpb25zLnJlbG9hZCkgJiYgIW9wdGlvbnMucmVsb2FkLm5hbWUpIHtcbiAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoJ0ludmFsaWQgcmVsb2FkIHN0YXRlIG9iamVjdCcpO1xuICAgICAgICB9XG4gICAgICAgIFxuICAgICAgICB2YXIgcmVsb2FkU3RhdGUgPSBvcHRpb25zLnJlbG9hZCA9PT0gdHJ1ZSA/IGZyb21QYXRoWzBdIDogZmluZFN0YXRlKG9wdGlvbnMucmVsb2FkKTtcbiAgICAgICAgaWYgKG9wdGlvbnMucmVsb2FkICYmICFyZWxvYWRTdGF0ZSkge1xuICAgICAgICAgIHRocm93IG5ldyBFcnJvcihcIk5vIHN1Y2ggcmVsb2FkIHN0YXRlICdcIiArIChpc1N0cmluZyhvcHRpb25zLnJlbG9hZCkgPyBvcHRpb25zLnJlbG9hZCA6IG9wdGlvbnMucmVsb2FkLm5hbWUpICsgXCInXCIpO1xuICAgICAgICB9XG5cbiAgICAgICAgd2hpbGUgKHN0YXRlICYmIHN0YXRlID09PSBmcm9tUGF0aFtrZWVwXSAmJiBzdGF0ZSAhPT0gcmVsb2FkU3RhdGUpIHtcbiAgICAgICAgICBsb2NhbHMgPSB0b0xvY2Fsc1trZWVwXSA9IHN0YXRlLmxvY2FscztcbiAgICAgICAgICBrZWVwKys7XG4gICAgICAgICAgc3RhdGUgPSB0b1BhdGhba2VlcF07XG4gICAgICAgIH1cbiAgICAgIH1cblxuICAgICAgLy8gSWYgd2UncmUgZ29pbmcgdG8gdGhlIHNhbWUgc3RhdGUgYW5kIGFsbCBsb2NhbHMgYXJlIGtlcHQsIHdlJ3ZlIGdvdCBub3RoaW5nIHRvIGRvLlxuICAgICAgLy8gQnV0IGNsZWFyICd0cmFuc2l0aW9uJywgYXMgd2Ugc3RpbGwgd2FudCB0byBjYW5jZWwgYW55IG90aGVyIHBlbmRpbmcgdHJhbnNpdGlvbnMuXG4gICAgICAvLyBUT0RPOiBXZSBtYXkgbm90IHdhbnQgdG8gYnVtcCAndHJhbnNpdGlvbicgaWYgd2UncmUgY2FsbGVkIGZyb20gYSBsb2NhdGlvbiBjaGFuZ2VcbiAgICAgIC8vIHRoYXQgd2UndmUgaW5pdGlhdGVkIG91cnNlbHZlcywgYmVjYXVzZSB3ZSBtaWdodCBhY2NpZGVudGFsbHkgYWJvcnQgYSBsZWdpdGltYXRlXG4gICAgICAvLyB0cmFuc2l0aW9uIGluaXRpYXRlZCBmcm9tIGNvZGU/XG4gICAgICBpZiAoc2hvdWxkU2tpcFJlbG9hZCh0bywgdG9QYXJhbXMsIGZyb20sIGZyb21QYXJhbXMsIGxvY2Fscywgb3B0aW9ucykpIHtcbiAgICAgICAgaWYgKGhhc2gpIHRvUGFyYW1zWycjJ10gPSBoYXNoO1xuICAgICAgICAkc3RhdGUucGFyYW1zID0gdG9QYXJhbXM7XG4gICAgICAgIGNvcHkoJHN0YXRlLnBhcmFtcywgJHN0YXRlUGFyYW1zKTtcbiAgICAgICAgaWYgKG9wdGlvbnMubG9jYXRpb24gJiYgdG8ubmF2aWdhYmxlICYmIHRvLm5hdmlnYWJsZS51cmwpIHtcbiAgICAgICAgICAkdXJsUm91dGVyLnB1c2godG8ubmF2aWdhYmxlLnVybCwgdG9QYXJhbXMsIHtcbiAgICAgICAgICAgICQkYXZvaWRSZXN5bmM6IHRydWUsIHJlcGxhY2U6IG9wdGlvbnMubG9jYXRpb24gPT09ICdyZXBsYWNlJ1xuICAgICAgICAgIH0pO1xuICAgICAgICAgICR1cmxSb3V0ZXIudXBkYXRlKHRydWUpO1xuICAgICAgICB9XG4gICAgICAgICRzdGF0ZS50cmFuc2l0aW9uID0gbnVsbDtcbiAgICAgICAgcmV0dXJuICRxLndoZW4oJHN0YXRlLmN1cnJlbnQpO1xuICAgICAgfVxuXG4gICAgICAvLyBGaWx0ZXIgcGFyYW1ldGVycyBiZWZvcmUgd2UgcGFzcyB0aGVtIHRvIGV2ZW50IGhhbmRsZXJzIGV0Yy5cbiAgICAgIHRvUGFyYW1zID0gZmlsdGVyQnlLZXlzKHRvLnBhcmFtcy4kJGtleXMoKSwgdG9QYXJhbXMgfHwge30pO1xuXG4gICAgICAvLyBCcm9hZGNhc3Qgc3RhcnQgZXZlbnQgYW5kIGNhbmNlbCB0aGUgdHJhbnNpdGlvbiBpZiByZXF1ZXN0ZWRcbiAgICAgIGlmIChvcHRpb25zLm5vdGlmeSkge1xuICAgICAgICAvKipcbiAgICAgICAgICogQG5nZG9jIGV2ZW50XG4gICAgICAgICAqIEBuYW1lIHVpLnJvdXRlci5zdGF0ZS4kc3RhdGUjJHN0YXRlQ2hhbmdlU3RhcnRcbiAgICAgICAgICogQGV2ZW50T2YgdWkucm91dGVyLnN0YXRlLiRzdGF0ZVxuICAgICAgICAgKiBAZXZlbnRUeXBlIGJyb2FkY2FzdCBvbiByb290IHNjb3BlXG4gICAgICAgICAqIEBkZXNjcmlwdGlvblxuICAgICAgICAgKiBGaXJlZCB3aGVuIHRoZSBzdGF0ZSB0cmFuc2l0aW9uICoqYmVnaW5zKiouIFlvdSBjYW4gdXNlIGBldmVudC5wcmV2ZW50RGVmYXVsdCgpYFxuICAgICAgICAgKiB0byBwcmV2ZW50IHRoZSB0cmFuc2l0aW9uIGZyb20gaGFwcGVuaW5nIGFuZCB0aGVuIHRoZSB0cmFuc2l0aW9uIHByb21pc2Ugd2lsbCBiZVxuICAgICAgICAgKiByZWplY3RlZCB3aXRoIGEgYCd0cmFuc2l0aW9uIHByZXZlbnRlZCdgIHZhbHVlLlxuICAgICAgICAgKlxuICAgICAgICAgKiBAcGFyYW0ge09iamVjdH0gZXZlbnQgRXZlbnQgb2JqZWN0LlxuICAgICAgICAgKiBAcGFyYW0ge1N0YXRlfSB0b1N0YXRlIFRoZSBzdGF0ZSBiZWluZyB0cmFuc2l0aW9uZWQgdG8uXG4gICAgICAgICAqIEBwYXJhbSB7T2JqZWN0fSB0b1BhcmFtcyBUaGUgcGFyYW1zIHN1cHBsaWVkIHRvIHRoZSBgdG9TdGF0ZWAuXG4gICAgICAgICAqIEBwYXJhbSB7U3RhdGV9IGZyb21TdGF0ZSBUaGUgY3VycmVudCBzdGF0ZSwgcHJlLXRyYW5zaXRpb24uXG4gICAgICAgICAqIEBwYXJhbSB7T2JqZWN0fSBmcm9tUGFyYW1zIFRoZSBwYXJhbXMgc3VwcGxpZWQgdG8gdGhlIGBmcm9tU3RhdGVgLlxuICAgICAgICAgKlxuICAgICAgICAgKiBAZXhhbXBsZVxuICAgICAgICAgKlxuICAgICAgICAgKiA8cHJlPlxuICAgICAgICAgKiAkcm9vdFNjb3BlLiRvbignJHN0YXRlQ2hhbmdlU3RhcnQnLFxuICAgICAgICAgKiBmdW5jdGlvbihldmVudCwgdG9TdGF0ZSwgdG9QYXJhbXMsIGZyb21TdGF0ZSwgZnJvbVBhcmFtcyl7XG4gICAgICAgICAqICAgICBldmVudC5wcmV2ZW50RGVmYXVsdCgpO1xuICAgICAgICAgKiAgICAgLy8gdHJhbnNpdGlvblRvKCkgcHJvbWlzZSB3aWxsIGJlIHJlamVjdGVkIHdpdGhcbiAgICAgICAgICogICAgIC8vIGEgJ3RyYW5zaXRpb24gcHJldmVudGVkJyBlcnJvclxuICAgICAgICAgKiB9KVxuICAgICAgICAgKiA8L3ByZT5cbiAgICAgICAgICovXG4gICAgICAgIGlmICgkcm9vdFNjb3BlLiRicm9hZGNhc3QoJyRzdGF0ZUNoYW5nZVN0YXJ0JywgdG8uc2VsZiwgdG9QYXJhbXMsIGZyb20uc2VsZiwgZnJvbVBhcmFtcykuZGVmYXVsdFByZXZlbnRlZCkge1xuICAgICAgICAgICRyb290U2NvcGUuJGJyb2FkY2FzdCgnJHN0YXRlQ2hhbmdlQ2FuY2VsJywgdG8uc2VsZiwgdG9QYXJhbXMsIGZyb20uc2VsZiwgZnJvbVBhcmFtcyk7XG4gICAgICAgICAgJHVybFJvdXRlci51cGRhdGUoKTtcbiAgICAgICAgICByZXR1cm4gVHJhbnNpdGlvblByZXZlbnRlZDtcbiAgICAgICAgfVxuICAgICAgfVxuXG4gICAgICAvLyBSZXNvbHZlIGxvY2FscyBmb3IgdGhlIHJlbWFpbmluZyBzdGF0ZXMsIGJ1dCBkb24ndCB1cGRhdGUgYW55IGdsb2JhbCBzdGF0ZSBqdXN0XG4gICAgICAvLyB5ZXQgLS0gaWYgYW55dGhpbmcgZmFpbHMgdG8gcmVzb2x2ZSB0aGUgY3VycmVudCBzdGF0ZSBuZWVkcyB0byByZW1haW4gdW50b3VjaGVkLlxuICAgICAgLy8gV2UgYWxzbyBzZXQgdXAgYW4gaW5oZXJpdGFuY2UgY2hhaW4gZm9yIHRoZSBsb2NhbHMgaGVyZS4gVGhpcyBhbGxvd3MgdGhlIHZpZXcgZGlyZWN0aXZlXG4gICAgICAvLyB0byBxdWlja2x5IGxvb2sgdXAgdGhlIGNvcnJlY3QgZGVmaW5pdGlvbiBmb3IgZWFjaCB2aWV3IGluIHRoZSBjdXJyZW50IHN0YXRlLiBFdmVuXG4gICAgICAvLyB0aG91Z2ggd2UgY3JlYXRlIHRoZSBsb2NhbHMgb2JqZWN0IGl0c2VsZiBvdXRzaWRlIHJlc29sdmVTdGF0ZSgpLCBpdCBpcyBpbml0aWFsbHlcbiAgICAgIC8vIGVtcHR5IGFuZCBnZXRzIGZpbGxlZCBhc3luY2hyb25vdXNseS4gV2UgbmVlZCB0byBrZWVwIHRyYWNrIG9mIHRoZSBwcm9taXNlIGZvciB0aGVcbiAgICAgIC8vIChmdWxseSByZXNvbHZlZCkgY3VycmVudCBsb2NhbHMsIGFuZCBwYXNzIHRoaXMgZG93biB0aGUgY2hhaW4uXG4gICAgICB2YXIgcmVzb2x2ZWQgPSAkcS53aGVuKGxvY2Fscyk7XG5cbiAgICAgIGZvciAodmFyIGwgPSBrZWVwOyBsIDwgdG9QYXRoLmxlbmd0aDsgbCsrLCBzdGF0ZSA9IHRvUGF0aFtsXSkge1xuICAgICAgICBsb2NhbHMgPSB0b0xvY2Fsc1tsXSA9IGluaGVyaXQobG9jYWxzKTtcbiAgICAgICAgcmVzb2x2ZWQgPSByZXNvbHZlU3RhdGUoc3RhdGUsIHRvUGFyYW1zLCBzdGF0ZSA9PT0gdG8sIHJlc29sdmVkLCBsb2NhbHMsIG9wdGlvbnMpO1xuICAgICAgfVxuXG4gICAgICAvLyBPbmNlIGV2ZXJ5dGhpbmcgaXMgcmVzb2x2ZWQsIHdlIGFyZSByZWFkeSB0byBwZXJmb3JtIHRoZSBhY3R1YWwgdHJhbnNpdGlvblxuICAgICAgLy8gYW5kIHJldHVybiBhIHByb21pc2UgZm9yIHRoZSBuZXcgc3RhdGUuIFdlIGFsc28ga2VlcCB0cmFjayBvZiB3aGF0IHRoZVxuICAgICAgLy8gY3VycmVudCBwcm9taXNlIGlzLCBzbyB0aGF0IHdlIGNhbiBkZXRlY3Qgb3ZlcmxhcHBpbmcgdHJhbnNpdGlvbnMgYW5kXG4gICAgICAvLyBrZWVwIG9ubHkgdGhlIG91dGNvbWUgb2YgdGhlIGxhc3QgdHJhbnNpdGlvbi5cbiAgICAgIHZhciB0cmFuc2l0aW9uID0gJHN0YXRlLnRyYW5zaXRpb24gPSByZXNvbHZlZC50aGVuKGZ1bmN0aW9uICgpIHtcbiAgICAgICAgdmFyIGwsIGVudGVyaW5nLCBleGl0aW5nO1xuXG4gICAgICAgIGlmICgkc3RhdGUudHJhbnNpdGlvbiAhPT0gdHJhbnNpdGlvbikgcmV0dXJuIFRyYW5zaXRpb25TdXBlcnNlZGVkO1xuXG4gICAgICAgIC8vIEV4aXQgJ2Zyb20nIHN0YXRlcyBub3Qga2VwdFxuICAgICAgICBmb3IgKGwgPSBmcm9tUGF0aC5sZW5ndGggLSAxOyBsID49IGtlZXA7IGwtLSkge1xuICAgICAgICAgIGV4aXRpbmcgPSBmcm9tUGF0aFtsXTtcbiAgICAgICAgICBpZiAoZXhpdGluZy5zZWxmLm9uRXhpdCkge1xuICAgICAgICAgICAgJGluamVjdG9yLmludm9rZShleGl0aW5nLnNlbGYub25FeGl0LCBleGl0aW5nLnNlbGYsIGV4aXRpbmcubG9jYWxzLmdsb2JhbHMpO1xuICAgICAgICAgIH1cbiAgICAgICAgICBleGl0aW5nLmxvY2FscyA9IG51bGw7XG4gICAgICAgIH1cblxuICAgICAgICAvLyBFbnRlciAndG8nIHN0YXRlcyBub3Qga2VwdFxuICAgICAgICBmb3IgKGwgPSBrZWVwOyBsIDwgdG9QYXRoLmxlbmd0aDsgbCsrKSB7XG4gICAgICAgICAgZW50ZXJpbmcgPSB0b1BhdGhbbF07XG4gICAgICAgICAgZW50ZXJpbmcubG9jYWxzID0gdG9Mb2NhbHNbbF07XG4gICAgICAgICAgaWYgKGVudGVyaW5nLnNlbGYub25FbnRlcikge1xuICAgICAgICAgICAgJGluamVjdG9yLmludm9rZShlbnRlcmluZy5zZWxmLm9uRW50ZXIsIGVudGVyaW5nLnNlbGYsIGVudGVyaW5nLmxvY2Fscy5nbG9iYWxzKTtcbiAgICAgICAgICB9XG4gICAgICAgIH1cblxuICAgICAgICAvLyBSZS1hZGQgdGhlIHNhdmVkIGhhc2ggYmVmb3JlIHdlIHN0YXJ0IHJldHVybmluZyB0aGluZ3NcbiAgICAgICAgaWYgKGhhc2gpIHRvUGFyYW1zWycjJ10gPSBoYXNoO1xuXG4gICAgICAgIC8vIFJ1biBpdCBhZ2FpbiwgdG8gY2F0Y2ggYW55IHRyYW5zaXRpb25zIGluIGNhbGxiYWNrc1xuICAgICAgICBpZiAoJHN0YXRlLnRyYW5zaXRpb24gIT09IHRyYW5zaXRpb24pIHJldHVybiBUcmFuc2l0aW9uU3VwZXJzZWRlZDtcblxuICAgICAgICAvLyBVcGRhdGUgZ2xvYmFscyBpbiAkc3RhdGVcbiAgICAgICAgJHN0YXRlLiRjdXJyZW50ID0gdG87XG4gICAgICAgICRzdGF0ZS5jdXJyZW50ID0gdG8uc2VsZjtcbiAgICAgICAgJHN0YXRlLnBhcmFtcyA9IHRvUGFyYW1zO1xuICAgICAgICBjb3B5KCRzdGF0ZS5wYXJhbXMsICRzdGF0ZVBhcmFtcyk7XG4gICAgICAgICRzdGF0ZS50cmFuc2l0aW9uID0gbnVsbDtcblxuICAgICAgICBpZiAob3B0aW9ucy5sb2NhdGlvbiAmJiB0by5uYXZpZ2FibGUpIHtcbiAgICAgICAgICAkdXJsUm91dGVyLnB1c2godG8ubmF2aWdhYmxlLnVybCwgdG8ubmF2aWdhYmxlLmxvY2Fscy5nbG9iYWxzLiRzdGF0ZVBhcmFtcywge1xuICAgICAgICAgICAgJCRhdm9pZFJlc3luYzogdHJ1ZSwgcmVwbGFjZTogb3B0aW9ucy5sb2NhdGlvbiA9PT0gJ3JlcGxhY2UnXG4gICAgICAgICAgfSk7XG4gICAgICAgIH1cblxuICAgICAgICBpZiAob3B0aW9ucy5ub3RpZnkpIHtcbiAgICAgICAgLyoqXG4gICAgICAgICAqIEBuZ2RvYyBldmVudFxuICAgICAgICAgKiBAbmFtZSB1aS5yb3V0ZXIuc3RhdGUuJHN0YXRlIyRzdGF0ZUNoYW5nZVN1Y2Nlc3NcbiAgICAgICAgICogQGV2ZW50T2YgdWkucm91dGVyLnN0YXRlLiRzdGF0ZVxuICAgICAgICAgKiBAZXZlbnRUeXBlIGJyb2FkY2FzdCBvbiByb290IHNjb3BlXG4gICAgICAgICAqIEBkZXNjcmlwdGlvblxuICAgICAgICAgKiBGaXJlZCBvbmNlIHRoZSBzdGF0ZSB0cmFuc2l0aW9uIGlzICoqY29tcGxldGUqKi5cbiAgICAgICAgICpcbiAgICAgICAgICogQHBhcmFtIHtPYmplY3R9IGV2ZW50IEV2ZW50IG9iamVjdC5cbiAgICAgICAgICogQHBhcmFtIHtTdGF0ZX0gdG9TdGF0ZSBUaGUgc3RhdGUgYmVpbmcgdHJhbnNpdGlvbmVkIHRvLlxuICAgICAgICAgKiBAcGFyYW0ge09iamVjdH0gdG9QYXJhbXMgVGhlIHBhcmFtcyBzdXBwbGllZCB0byB0aGUgYHRvU3RhdGVgLlxuICAgICAgICAgKiBAcGFyYW0ge1N0YXRlfSBmcm9tU3RhdGUgVGhlIGN1cnJlbnQgc3RhdGUsIHByZS10cmFuc2l0aW9uLlxuICAgICAgICAgKiBAcGFyYW0ge09iamVjdH0gZnJvbVBhcmFtcyBUaGUgcGFyYW1zIHN1cHBsaWVkIHRvIHRoZSBgZnJvbVN0YXRlYC5cbiAgICAgICAgICovXG4gICAgICAgICAgJHJvb3RTY29wZS4kYnJvYWRjYXN0KCckc3RhdGVDaGFuZ2VTdWNjZXNzJywgdG8uc2VsZiwgdG9QYXJhbXMsIGZyb20uc2VsZiwgZnJvbVBhcmFtcyk7XG4gICAgICAgIH1cbiAgICAgICAgJHVybFJvdXRlci51cGRhdGUodHJ1ZSk7XG5cbiAgICAgICAgcmV0dXJuICRzdGF0ZS5jdXJyZW50O1xuICAgICAgfSwgZnVuY3Rpb24gKGVycm9yKSB7XG4gICAgICAgIGlmICgkc3RhdGUudHJhbnNpdGlvbiAhPT0gdHJhbnNpdGlvbikgcmV0dXJuIFRyYW5zaXRpb25TdXBlcnNlZGVkO1xuXG4gICAgICAgICRzdGF0ZS50cmFuc2l0aW9uID0gbnVsbDtcbiAgICAgICAgLyoqXG4gICAgICAgICAqIEBuZ2RvYyBldmVudFxuICAgICAgICAgKiBAbmFtZSB1aS5yb3V0ZXIuc3RhdGUuJHN0YXRlIyRzdGF0ZUNoYW5nZUVycm9yXG4gICAgICAgICAqIEBldmVudE9mIHVpLnJvdXRlci5zdGF0ZS4kc3RhdGVcbiAgICAgICAgICogQGV2ZW50VHlwZSBicm9hZGNhc3Qgb24gcm9vdCBzY29wZVxuICAgICAgICAgKiBAZGVzY3JpcHRpb25cbiAgICAgICAgICogRmlyZWQgd2hlbiBhbiAqKmVycm9yIG9jY3VycyoqIGR1cmluZyB0cmFuc2l0aW9uLiBJdCdzIGltcG9ydGFudCB0byBub3RlIHRoYXQgaWYgeW91XG4gICAgICAgICAqIGhhdmUgYW55IGVycm9ycyBpbiB5b3VyIHJlc29sdmUgZnVuY3Rpb25zIChqYXZhc2NyaXB0IGVycm9ycywgbm9uLWV4aXN0ZW50IHNlcnZpY2VzLCBldGMpXG4gICAgICAgICAqIHRoZXkgd2lsbCBub3QgdGhyb3cgdHJhZGl0aW9uYWxseS4gWW91IG11c3QgbGlzdGVuIGZvciB0aGlzICRzdGF0ZUNoYW5nZUVycm9yIGV2ZW50IHRvXG4gICAgICAgICAqIGNhdGNoICoqQUxMKiogZXJyb3JzLlxuICAgICAgICAgKlxuICAgICAgICAgKiBAcGFyYW0ge09iamVjdH0gZXZlbnQgRXZlbnQgb2JqZWN0LlxuICAgICAgICAgKiBAcGFyYW0ge1N0YXRlfSB0b1N0YXRlIFRoZSBzdGF0ZSBiZWluZyB0cmFuc2l0aW9uZWQgdG8uXG4gICAgICAgICAqIEBwYXJhbSB7T2JqZWN0fSB0b1BhcmFtcyBUaGUgcGFyYW1zIHN1cHBsaWVkIHRvIHRoZSBgdG9TdGF0ZWAuXG4gICAgICAgICAqIEBwYXJhbSB7U3RhdGV9IGZyb21TdGF0ZSBUaGUgY3VycmVudCBzdGF0ZSwgcHJlLXRyYW5zaXRpb24uXG4gICAgICAgICAqIEBwYXJhbSB7T2JqZWN0fSBmcm9tUGFyYW1zIFRoZSBwYXJhbXMgc3VwcGxpZWQgdG8gdGhlIGBmcm9tU3RhdGVgLlxuICAgICAgICAgKiBAcGFyYW0ge0Vycm9yfSBlcnJvciBUaGUgcmVzb2x2ZSBlcnJvciBvYmplY3QuXG4gICAgICAgICAqL1xuICAgICAgICBldnQgPSAkcm9vdFNjb3BlLiRicm9hZGNhc3QoJyRzdGF0ZUNoYW5nZUVycm9yJywgdG8uc2VsZiwgdG9QYXJhbXMsIGZyb20uc2VsZiwgZnJvbVBhcmFtcywgZXJyb3IpO1xuXG4gICAgICAgIGlmICghZXZ0LmRlZmF1bHRQcmV2ZW50ZWQpIHtcbiAgICAgICAgICAgICR1cmxSb3V0ZXIudXBkYXRlKCk7XG4gICAgICAgIH1cblxuICAgICAgICByZXR1cm4gJHEucmVqZWN0KGVycm9yKTtcbiAgICAgIH0pO1xuXG4gICAgICByZXR1cm4gdHJhbnNpdGlvbjtcbiAgICB9O1xuXG4gICAgLyoqXG4gICAgICogQG5nZG9jIGZ1bmN0aW9uXG4gICAgICogQG5hbWUgdWkucm91dGVyLnN0YXRlLiRzdGF0ZSNpc1xuICAgICAqIEBtZXRob2RPZiB1aS5yb3V0ZXIuc3RhdGUuJHN0YXRlXG4gICAgICpcbiAgICAgKiBAZGVzY3JpcHRpb25cbiAgICAgKiBTaW1pbGFyIHRvIHtAbGluayB1aS5yb3V0ZXIuc3RhdGUuJHN0YXRlI21ldGhvZHNfaW5jbHVkZXMgJHN0YXRlLmluY2x1ZGVzfSxcbiAgICAgKiBidXQgb25seSBjaGVja3MgZm9yIHRoZSBmdWxsIHN0YXRlIG5hbWUuIElmIHBhcmFtcyBpcyBzdXBwbGllZCB0aGVuIGl0IHdpbGwgYmVcbiAgICAgKiB0ZXN0ZWQgZm9yIHN0cmljdCBlcXVhbGl0eSBhZ2FpbnN0IHRoZSBjdXJyZW50IGFjdGl2ZSBwYXJhbXMgb2JqZWN0LCBzbyBhbGwgcGFyYW1zXG4gICAgICogbXVzdCBtYXRjaCB3aXRoIG5vbmUgbWlzc2luZyBhbmQgbm8gZXh0cmFzLlxuICAgICAqXG4gICAgICogQGV4YW1wbGVcbiAgICAgKiA8cHJlPlxuICAgICAqICRzdGF0ZS4kY3VycmVudC5uYW1lID0gJ2NvbnRhY3RzLmRldGFpbHMuaXRlbSc7XG4gICAgICpcbiAgICAgKiAvLyBhYnNvbHV0ZSBuYW1lXG4gICAgICogJHN0YXRlLmlzKCdjb250YWN0LmRldGFpbHMuaXRlbScpOyAvLyByZXR1cm5zIHRydWVcbiAgICAgKiAkc3RhdGUuaXMoY29udGFjdERldGFpbEl0ZW1TdGF0ZU9iamVjdCk7IC8vIHJldHVybnMgdHJ1ZVxuICAgICAqXG4gICAgICogLy8gcmVsYXRpdmUgbmFtZSAoLiBhbmQgXiksIHR5cGljYWxseSBmcm9tIGEgdGVtcGxhdGVcbiAgICAgKiAvLyBFLmcuIGZyb20gdGhlICdjb250YWN0cy5kZXRhaWxzJyB0ZW1wbGF0ZVxuICAgICAqIDxkaXYgbmctY2xhc3M9XCJ7aGlnaGxpZ2h0ZWQ6ICRzdGF0ZS5pcygnLml0ZW0nKX1cIj5JdGVtPC9kaXY+XG4gICAgICogPC9wcmU+XG4gICAgICpcbiAgICAgKiBAcGFyYW0ge3N0cmluZ3xvYmplY3R9IHN0YXRlT3JOYW1lIFRoZSBzdGF0ZSBuYW1lIChhYnNvbHV0ZSBvciByZWxhdGl2ZSkgb3Igc3RhdGUgb2JqZWN0IHlvdSdkIGxpa2UgdG8gY2hlY2suXG4gICAgICogQHBhcmFtIHtvYmplY3Q9fSBwYXJhbXMgQSBwYXJhbSBvYmplY3QsIGUuZy4gYHtzZWN0aW9uSWQ6IHNlY3Rpb24uaWR9YCwgdGhhdCB5b3UnZCBsaWtlXG4gICAgICogdG8gdGVzdCBhZ2FpbnN0IHRoZSBjdXJyZW50IGFjdGl2ZSBzdGF0ZS5cbiAgICAgKiBAcGFyYW0ge29iamVjdD19IG9wdGlvbnMgQW4gb3B0aW9ucyBvYmplY3QuICBUaGUgb3B0aW9ucyBhcmU6XG4gICAgICpcbiAgICAgKiAtICoqYHJlbGF0aXZlYCoqIC0ge3N0cmluZ3xvYmplY3R9IC0gIElmIGBzdGF0ZU9yTmFtZWAgaXMgYSByZWxhdGl2ZSBzdGF0ZSBuYW1lIGFuZCBgb3B0aW9ucy5yZWxhdGl2ZWAgaXMgc2V0LCAuaXMgd2lsbFxuICAgICAqIHRlc3QgcmVsYXRpdmUgdG8gYG9wdGlvbnMucmVsYXRpdmVgIHN0YXRlIChvciBuYW1lKS5cbiAgICAgKlxuICAgICAqIEByZXR1cm5zIHtib29sZWFufSBSZXR1cm5zIHRydWUgaWYgaXQgaXMgdGhlIHN0YXRlLlxuICAgICAqL1xuICAgICRzdGF0ZS5pcyA9IGZ1bmN0aW9uIGlzKHN0YXRlT3JOYW1lLCBwYXJhbXMsIG9wdGlvbnMpIHtcbiAgICAgIG9wdGlvbnMgPSBleHRlbmQoeyByZWxhdGl2ZTogJHN0YXRlLiRjdXJyZW50IH0sIG9wdGlvbnMgfHwge30pO1xuICAgICAgdmFyIHN0YXRlID0gZmluZFN0YXRlKHN0YXRlT3JOYW1lLCBvcHRpb25zLnJlbGF0aXZlKTtcblxuICAgICAgaWYgKCFpc0RlZmluZWQoc3RhdGUpKSB7IHJldHVybiB1bmRlZmluZWQ7IH1cbiAgICAgIGlmICgkc3RhdGUuJGN1cnJlbnQgIT09IHN0YXRlKSB7IHJldHVybiBmYWxzZTsgfVxuICAgICAgcmV0dXJuIHBhcmFtcyA/IGVxdWFsRm9yS2V5cyhzdGF0ZS5wYXJhbXMuJCR2YWx1ZXMocGFyYW1zKSwgJHN0YXRlUGFyYW1zKSA6IHRydWU7XG4gICAgfTtcblxuICAgIC8qKlxuICAgICAqIEBuZ2RvYyBmdW5jdGlvblxuICAgICAqIEBuYW1lIHVpLnJvdXRlci5zdGF0ZS4kc3RhdGUjaW5jbHVkZXNcbiAgICAgKiBAbWV0aG9kT2YgdWkucm91dGVyLnN0YXRlLiRzdGF0ZVxuICAgICAqXG4gICAgICogQGRlc2NyaXB0aW9uXG4gICAgICogQSBtZXRob2QgdG8gZGV0ZXJtaW5lIGlmIHRoZSBjdXJyZW50IGFjdGl2ZSBzdGF0ZSBpcyBlcXVhbCB0byBvciBpcyB0aGUgY2hpbGQgb2YgdGhlXG4gICAgICogc3RhdGUgc3RhdGVOYW1lLiBJZiBhbnkgcGFyYW1zIGFyZSBwYXNzZWQgdGhlbiB0aGV5IHdpbGwgYmUgdGVzdGVkIGZvciBhIG1hdGNoIGFzIHdlbGwuXG4gICAgICogTm90IGFsbCB0aGUgcGFyYW1ldGVycyBuZWVkIHRvIGJlIHBhc3NlZCwganVzdCB0aGUgb25lcyB5b3UnZCBsaWtlIHRvIHRlc3QgZm9yIGVxdWFsaXR5LlxuICAgICAqXG4gICAgICogQGV4YW1wbGVcbiAgICAgKiBQYXJ0aWFsIGFuZCByZWxhdGl2ZSBuYW1lc1xuICAgICAqIDxwcmU+XG4gICAgICogJHN0YXRlLiRjdXJyZW50Lm5hbWUgPSAnY29udGFjdHMuZGV0YWlscy5pdGVtJztcbiAgICAgKlxuICAgICAqIC8vIFVzaW5nIHBhcnRpYWwgbmFtZXNcbiAgICAgKiAkc3RhdGUuaW5jbHVkZXMoXCJjb250YWN0c1wiKTsgLy8gcmV0dXJucyB0cnVlXG4gICAgICogJHN0YXRlLmluY2x1ZGVzKFwiY29udGFjdHMuZGV0YWlsc1wiKTsgLy8gcmV0dXJucyB0cnVlXG4gICAgICogJHN0YXRlLmluY2x1ZGVzKFwiY29udGFjdHMuZGV0YWlscy5pdGVtXCIpOyAvLyByZXR1cm5zIHRydWVcbiAgICAgKiAkc3RhdGUuaW5jbHVkZXMoXCJjb250YWN0cy5saXN0XCIpOyAvLyByZXR1cm5zIGZhbHNlXG4gICAgICogJHN0YXRlLmluY2x1ZGVzKFwiYWJvdXRcIik7IC8vIHJldHVybnMgZmFsc2VcbiAgICAgKlxuICAgICAqIC8vIFVzaW5nIHJlbGF0aXZlIG5hbWVzICguIGFuZCBeKSwgdHlwaWNhbGx5IGZyb20gYSB0ZW1wbGF0ZVxuICAgICAqIC8vIEUuZy4gZnJvbSB0aGUgJ2NvbnRhY3RzLmRldGFpbHMnIHRlbXBsYXRlXG4gICAgICogPGRpdiBuZy1jbGFzcz1cIntoaWdobGlnaHRlZDogJHN0YXRlLmluY2x1ZGVzKCcuaXRlbScpfVwiPkl0ZW08L2Rpdj5cbiAgICAgKiA8L3ByZT5cbiAgICAgKlxuICAgICAqIEJhc2ljIGdsb2JiaW5nIHBhdHRlcm5zXG4gICAgICogPHByZT5cbiAgICAgKiAkc3RhdGUuJGN1cnJlbnQubmFtZSA9ICdjb250YWN0cy5kZXRhaWxzLml0ZW0udXJsJztcbiAgICAgKlxuICAgICAqICRzdGF0ZS5pbmNsdWRlcyhcIiouZGV0YWlscy4qLipcIik7IC8vIHJldHVybnMgdHJ1ZVxuICAgICAqICRzdGF0ZS5pbmNsdWRlcyhcIiouZGV0YWlscy4qKlwiKTsgLy8gcmV0dXJucyB0cnVlXG4gICAgICogJHN0YXRlLmluY2x1ZGVzKFwiKiouaXRlbS4qKlwiKTsgLy8gcmV0dXJucyB0cnVlXG4gICAgICogJHN0YXRlLmluY2x1ZGVzKFwiKi5kZXRhaWxzLml0ZW0udXJsXCIpOyAvLyByZXR1cm5zIHRydWVcbiAgICAgKiAkc3RhdGUuaW5jbHVkZXMoXCIqLmRldGFpbHMuKi51cmxcIik7IC8vIHJldHVybnMgdHJ1ZVxuICAgICAqICRzdGF0ZS5pbmNsdWRlcyhcIiouZGV0YWlscy4qXCIpOyAvLyByZXR1cm5zIGZhbHNlXG4gICAgICogJHN0YXRlLmluY2x1ZGVzKFwiaXRlbS4qKlwiKTsgLy8gcmV0dXJucyBmYWxzZVxuICAgICAqIDwvcHJlPlxuICAgICAqXG4gICAgICogQHBhcmFtIHtzdHJpbmd9IHN0YXRlT3JOYW1lIEEgcGFydGlhbCBuYW1lLCByZWxhdGl2ZSBuYW1lLCBvciBnbG9iIHBhdHRlcm5cbiAgICAgKiB0byBiZSBzZWFyY2hlZCBmb3Igd2l0aGluIHRoZSBjdXJyZW50IHN0YXRlIG5hbWUuXG4gICAgICogQHBhcmFtIHtvYmplY3Q9fSBwYXJhbXMgQSBwYXJhbSBvYmplY3QsIGUuZy4gYHtzZWN0aW9uSWQ6IHNlY3Rpb24uaWR9YCxcbiAgICAgKiB0aGF0IHlvdSdkIGxpa2UgdG8gdGVzdCBhZ2FpbnN0IHRoZSBjdXJyZW50IGFjdGl2ZSBzdGF0ZS5cbiAgICAgKiBAcGFyYW0ge29iamVjdD19IG9wdGlvbnMgQW4gb3B0aW9ucyBvYmplY3QuICBUaGUgb3B0aW9ucyBhcmU6XG4gICAgICpcbiAgICAgKiAtICoqYHJlbGF0aXZlYCoqIC0ge3N0cmluZ3xvYmplY3Q9fSAtICBJZiBgc3RhdGVPck5hbWVgIGlzIGEgcmVsYXRpdmUgc3RhdGUgcmVmZXJlbmNlIGFuZCBgb3B0aW9ucy5yZWxhdGl2ZWAgaXMgc2V0LFxuICAgICAqIC5pbmNsdWRlcyB3aWxsIHRlc3QgcmVsYXRpdmUgdG8gYG9wdGlvbnMucmVsYXRpdmVgIHN0YXRlIChvciBuYW1lKS5cbiAgICAgKlxuICAgICAqIEByZXR1cm5zIHtib29sZWFufSBSZXR1cm5zIHRydWUgaWYgaXQgZG9lcyBpbmNsdWRlIHRoZSBzdGF0ZVxuICAgICAqL1xuICAgICRzdGF0ZS5pbmNsdWRlcyA9IGZ1bmN0aW9uIGluY2x1ZGVzKHN0YXRlT3JOYW1lLCBwYXJhbXMsIG9wdGlvbnMpIHtcbiAgICAgIG9wdGlvbnMgPSBleHRlbmQoeyByZWxhdGl2ZTogJHN0YXRlLiRjdXJyZW50IH0sIG9wdGlvbnMgfHwge30pO1xuICAgICAgaWYgKGlzU3RyaW5nKHN0YXRlT3JOYW1lKSAmJiBpc0dsb2Ioc3RhdGVPck5hbWUpKSB7XG4gICAgICAgIGlmICghZG9lc1N0YXRlTWF0Y2hHbG9iKHN0YXRlT3JOYW1lKSkge1xuICAgICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgICAgfVxuICAgICAgICBzdGF0ZU9yTmFtZSA9ICRzdGF0ZS4kY3VycmVudC5uYW1lO1xuICAgICAgfVxuXG4gICAgICB2YXIgc3RhdGUgPSBmaW5kU3RhdGUoc3RhdGVPck5hbWUsIG9wdGlvbnMucmVsYXRpdmUpO1xuICAgICAgaWYgKCFpc0RlZmluZWQoc3RhdGUpKSB7IHJldHVybiB1bmRlZmluZWQ7IH1cbiAgICAgIGlmICghaXNEZWZpbmVkKCRzdGF0ZS4kY3VycmVudC5pbmNsdWRlc1tzdGF0ZS5uYW1lXSkpIHsgcmV0dXJuIGZhbHNlOyB9XG4gICAgICByZXR1cm4gcGFyYW1zID8gZXF1YWxGb3JLZXlzKHN0YXRlLnBhcmFtcy4kJHZhbHVlcyhwYXJhbXMpLCAkc3RhdGVQYXJhbXMsIG9iamVjdEtleXMocGFyYW1zKSkgOiB0cnVlO1xuICAgIH07XG5cblxuICAgIC8qKlxuICAgICAqIEBuZ2RvYyBmdW5jdGlvblxuICAgICAqIEBuYW1lIHVpLnJvdXRlci5zdGF0ZS4kc3RhdGUjaHJlZlxuICAgICAqIEBtZXRob2RPZiB1aS5yb3V0ZXIuc3RhdGUuJHN0YXRlXG4gICAgICpcbiAgICAgKiBAZGVzY3JpcHRpb25cbiAgICAgKiBBIHVybCBnZW5lcmF0aW9uIG1ldGhvZCB0aGF0IHJldHVybnMgdGhlIGNvbXBpbGVkIHVybCBmb3IgdGhlIGdpdmVuIHN0YXRlIHBvcHVsYXRlZCB3aXRoIHRoZSBnaXZlbiBwYXJhbXMuXG4gICAgICpcbiAgICAgKiBAZXhhbXBsZVxuICAgICAqIDxwcmU+XG4gICAgICogZXhwZWN0KCRzdGF0ZS5ocmVmKFwiYWJvdXQucGVyc29uXCIsIHsgcGVyc29uOiBcImJvYlwiIH0pKS50b0VxdWFsKFwiL2Fib3V0L2JvYlwiKTtcbiAgICAgKiA8L3ByZT5cbiAgICAgKlxuICAgICAqIEBwYXJhbSB7c3RyaW5nfG9iamVjdH0gc3RhdGVPck5hbWUgVGhlIHN0YXRlIG5hbWUgb3Igc3RhdGUgb2JqZWN0IHlvdSdkIGxpa2UgdG8gZ2VuZXJhdGUgYSB1cmwgZnJvbS5cbiAgICAgKiBAcGFyYW0ge29iamVjdD19IHBhcmFtcyBBbiBvYmplY3Qgb2YgcGFyYW1ldGVyIHZhbHVlcyB0byBmaWxsIHRoZSBzdGF0ZSdzIHJlcXVpcmVkIHBhcmFtZXRlcnMuXG4gICAgICogQHBhcmFtIHtvYmplY3Q9fSBvcHRpb25zIE9wdGlvbnMgb2JqZWN0LiBUaGUgb3B0aW9ucyBhcmU6XG4gICAgICpcbiAgICAgKiAtICoqYGxvc3N5YCoqIC0ge2Jvb2xlYW49dHJ1ZX0gLSAgSWYgdHJ1ZSwgYW5kIGlmIHRoZXJlIGlzIG5vIHVybCBhc3NvY2lhdGVkIHdpdGggdGhlIHN0YXRlIHByb3ZpZGVkIGluIHRoZVxuICAgICAqICAgIGZpcnN0IHBhcmFtZXRlciwgdGhlbiB0aGUgY29uc3RydWN0ZWQgaHJlZiB1cmwgd2lsbCBiZSBidWlsdCBmcm9tIHRoZSBmaXJzdCBuYXZpZ2FibGUgYW5jZXN0b3IgKGFrYVxuICAgICAqICAgIGFuY2VzdG9yIHdpdGggYSB2YWxpZCB1cmwpLlxuICAgICAqIC0gKipgaW5oZXJpdGAqKiAtIHtib29sZWFuPXRydWV9LCBJZiBgdHJ1ZWAgd2lsbCBpbmhlcml0IHVybCBwYXJhbWV0ZXJzIGZyb20gY3VycmVudCB1cmwuXG4gICAgICogLSAqKmByZWxhdGl2ZWAqKiAtIHtvYmplY3Q9JHN0YXRlLiRjdXJyZW50fSwgV2hlbiB0cmFuc2l0aW9uaW5nIHdpdGggcmVsYXRpdmUgcGF0aCAoZS5nICdeJyksIFxuICAgICAqICAgIGRlZmluZXMgd2hpY2ggc3RhdGUgdG8gYmUgcmVsYXRpdmUgZnJvbS5cbiAgICAgKiAtICoqYGFic29sdXRlYCoqIC0ge2Jvb2xlYW49ZmFsc2V9LCAgSWYgdHJ1ZSB3aWxsIGdlbmVyYXRlIGFuIGFic29sdXRlIHVybCwgZS5nLiBcImh0dHA6Ly93d3cuZXhhbXBsZS5jb20vZnVsbHVybFwiLlxuICAgICAqIFxuICAgICAqIEByZXR1cm5zIHtzdHJpbmd9IGNvbXBpbGVkIHN0YXRlIHVybFxuICAgICAqL1xuICAgICRzdGF0ZS5ocmVmID0gZnVuY3Rpb24gaHJlZihzdGF0ZU9yTmFtZSwgcGFyYW1zLCBvcHRpb25zKSB7XG4gICAgICBvcHRpb25zID0gZXh0ZW5kKHtcbiAgICAgICAgbG9zc3k6ICAgIHRydWUsXG4gICAgICAgIGluaGVyaXQ6ICB0cnVlLFxuICAgICAgICBhYnNvbHV0ZTogZmFsc2UsXG4gICAgICAgIHJlbGF0aXZlOiAkc3RhdGUuJGN1cnJlbnRcbiAgICAgIH0sIG9wdGlvbnMgfHwge30pO1xuXG4gICAgICB2YXIgc3RhdGUgPSBmaW5kU3RhdGUoc3RhdGVPck5hbWUsIG9wdGlvbnMucmVsYXRpdmUpO1xuXG4gICAgICBpZiAoIWlzRGVmaW5lZChzdGF0ZSkpIHJldHVybiBudWxsO1xuICAgICAgaWYgKG9wdGlvbnMuaW5oZXJpdCkgcGFyYW1zID0gaW5oZXJpdFBhcmFtcygkc3RhdGVQYXJhbXMsIHBhcmFtcyB8fCB7fSwgJHN0YXRlLiRjdXJyZW50LCBzdGF0ZSk7XG4gICAgICBcbiAgICAgIHZhciBuYXYgPSAoc3RhdGUgJiYgb3B0aW9ucy5sb3NzeSkgPyBzdGF0ZS5uYXZpZ2FibGUgOiBzdGF0ZTtcblxuICAgICAgaWYgKCFuYXYgfHwgbmF2LnVybCA9PT0gdW5kZWZpbmVkIHx8IG5hdi51cmwgPT09IG51bGwpIHtcbiAgICAgICAgcmV0dXJuIG51bGw7XG4gICAgICB9XG4gICAgICByZXR1cm4gJHVybFJvdXRlci5ocmVmKG5hdi51cmwsIGZpbHRlckJ5S2V5cyhzdGF0ZS5wYXJhbXMuJCRrZXlzKCkuY29uY2F0KCcjJyksIHBhcmFtcyB8fCB7fSksIHtcbiAgICAgICAgYWJzb2x1dGU6IG9wdGlvbnMuYWJzb2x1dGVcbiAgICAgIH0pO1xuICAgIH07XG5cbiAgICAvKipcbiAgICAgKiBAbmdkb2MgZnVuY3Rpb25cbiAgICAgKiBAbmFtZSB1aS5yb3V0ZXIuc3RhdGUuJHN0YXRlI2dldFxuICAgICAqIEBtZXRob2RPZiB1aS5yb3V0ZXIuc3RhdGUuJHN0YXRlXG4gICAgICpcbiAgICAgKiBAZGVzY3JpcHRpb25cbiAgICAgKiBSZXR1cm5zIHRoZSBzdGF0ZSBjb25maWd1cmF0aW9uIG9iamVjdCBmb3IgYW55IHNwZWNpZmljIHN0YXRlIG9yIGFsbCBzdGF0ZXMuXG4gICAgICpcbiAgICAgKiBAcGFyYW0ge3N0cmluZ3xvYmplY3Q9fSBzdGF0ZU9yTmFtZSAoYWJzb2x1dGUgb3IgcmVsYXRpdmUpIElmIHByb3ZpZGVkLCB3aWxsIG9ubHkgZ2V0IHRoZSBjb25maWcgZm9yXG4gICAgICogdGhlIHJlcXVlc3RlZCBzdGF0ZS4gSWYgbm90IHByb3ZpZGVkLCByZXR1cm5zIGFuIGFycmF5IG9mIEFMTCBzdGF0ZSBjb25maWdzLlxuICAgICAqIEBwYXJhbSB7c3RyaW5nfG9iamVjdD19IGNvbnRleHQgV2hlbiBzdGF0ZU9yTmFtZSBpcyBhIHJlbGF0aXZlIHN0YXRlIHJlZmVyZW5jZSwgdGhlIHN0YXRlIHdpbGwgYmUgcmV0cmlldmVkIHJlbGF0aXZlIHRvIGNvbnRleHQuXG4gICAgICogQHJldHVybnMge09iamVjdHxBcnJheX0gU3RhdGUgY29uZmlndXJhdGlvbiBvYmplY3Qgb3IgYXJyYXkgb2YgYWxsIG9iamVjdHMuXG4gICAgICovXG4gICAgJHN0YXRlLmdldCA9IGZ1bmN0aW9uIChzdGF0ZU9yTmFtZSwgY29udGV4dCkge1xuICAgICAgaWYgKGFyZ3VtZW50cy5sZW5ndGggPT09IDApIHJldHVybiBtYXAob2JqZWN0S2V5cyhzdGF0ZXMpLCBmdW5jdGlvbihuYW1lKSB7IHJldHVybiBzdGF0ZXNbbmFtZV0uc2VsZjsgfSk7XG4gICAgICB2YXIgc3RhdGUgPSBmaW5kU3RhdGUoc3RhdGVPck5hbWUsIGNvbnRleHQgfHwgJHN0YXRlLiRjdXJyZW50KTtcbiAgICAgIHJldHVybiAoc3RhdGUgJiYgc3RhdGUuc2VsZikgPyBzdGF0ZS5zZWxmIDogbnVsbDtcbiAgICB9O1xuXG4gICAgZnVuY3Rpb24gcmVzb2x2ZVN0YXRlKHN0YXRlLCBwYXJhbXMsIHBhcmFtc0FyZUZpbHRlcmVkLCBpbmhlcml0ZWQsIGRzdCwgb3B0aW9ucykge1xuICAgICAgLy8gTWFrZSBhIHJlc3RyaWN0ZWQgJHN0YXRlUGFyYW1zIHdpdGggb25seSB0aGUgcGFyYW1ldGVycyB0aGF0IGFwcGx5IHRvIHRoaXMgc3RhdGUgaWZcbiAgICAgIC8vIG5lY2Vzc2FyeS4gSW4gYWRkaXRpb24gdG8gYmVpbmcgYXZhaWxhYmxlIHRvIHRoZSBjb250cm9sbGVyIGFuZCBvbkVudGVyL29uRXhpdCBjYWxsYmFja3MsXG4gICAgICAvLyB3ZSBhbHNvIG5lZWQgJHN0YXRlUGFyYW1zIHRvIGJlIGF2YWlsYWJsZSBmb3IgYW55ICRpbmplY3RvciBjYWxscyB3ZSBtYWtlIGR1cmluZyB0aGVcbiAgICAgIC8vIGRlcGVuZGVuY3kgcmVzb2x1dGlvbiBwcm9jZXNzLlxuICAgICAgdmFyICRzdGF0ZVBhcmFtcyA9IChwYXJhbXNBcmVGaWx0ZXJlZCkgPyBwYXJhbXMgOiBmaWx0ZXJCeUtleXMoc3RhdGUucGFyYW1zLiQka2V5cygpLCBwYXJhbXMpO1xuICAgICAgdmFyIGxvY2FscyA9IHsgJHN0YXRlUGFyYW1zOiAkc3RhdGVQYXJhbXMgfTtcblxuICAgICAgLy8gUmVzb2x2ZSAnZ2xvYmFsJyBkZXBlbmRlbmNpZXMgZm9yIHRoZSBzdGF0ZSwgaS5lLiB0aG9zZSBub3Qgc3BlY2lmaWMgdG8gYSB2aWV3LlxuICAgICAgLy8gV2UncmUgYWxzbyBpbmNsdWRpbmcgJHN0YXRlUGFyYW1zIGluIHRoaXM7IHRoYXQgd2F5IHRoZSBwYXJhbWV0ZXJzIGFyZSByZXN0cmljdGVkXG4gICAgICAvLyB0byB0aGUgc2V0IHRoYXQgc2hvdWxkIGJlIHZpc2libGUgdG8gdGhlIHN0YXRlLCBhbmQgYXJlIGluZGVwZW5kZW50IG9mIHdoZW4gd2UgdXBkYXRlXG4gICAgICAvLyB0aGUgZ2xvYmFsICRzdGF0ZSBhbmQgJHN0YXRlUGFyYW1zIHZhbHVlcy5cbiAgICAgIGRzdC5yZXNvbHZlID0gJHJlc29sdmUucmVzb2x2ZShzdGF0ZS5yZXNvbHZlLCBsb2NhbHMsIGRzdC5yZXNvbHZlLCBzdGF0ZSk7XG4gICAgICB2YXIgcHJvbWlzZXMgPSBbZHN0LnJlc29sdmUudGhlbihmdW5jdGlvbiAoZ2xvYmFscykge1xuICAgICAgICBkc3QuZ2xvYmFscyA9IGdsb2JhbHM7XG4gICAgICB9KV07XG4gICAgICBpZiAoaW5oZXJpdGVkKSBwcm9taXNlcy5wdXNoKGluaGVyaXRlZCk7XG5cbiAgICAgIGZ1bmN0aW9uIHJlc29sdmVWaWV3cygpIHtcbiAgICAgICAgdmFyIHZpZXdzUHJvbWlzZXMgPSBbXTtcblxuICAgICAgICAvLyBSZXNvbHZlIHRlbXBsYXRlIGFuZCBkZXBlbmRlbmNpZXMgZm9yIGFsbCB2aWV3cy5cbiAgICAgICAgZm9yRWFjaChzdGF0ZS52aWV3cywgZnVuY3Rpb24gKHZpZXcsIG5hbWUpIHtcbiAgICAgICAgICB2YXIgaW5qZWN0YWJsZXMgPSAodmlldy5yZXNvbHZlICYmIHZpZXcucmVzb2x2ZSAhPT0gc3RhdGUucmVzb2x2ZSA/IHZpZXcucmVzb2x2ZSA6IHt9KTtcbiAgICAgICAgICBpbmplY3RhYmxlcy4kdGVtcGxhdGUgPSBbIGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgIHJldHVybiAkdmlldy5sb2FkKG5hbWUsIHsgdmlldzogdmlldywgbG9jYWxzOiBkc3QuZ2xvYmFscywgcGFyYW1zOiAkc3RhdGVQYXJhbXMsIG5vdGlmeTogb3B0aW9ucy5ub3RpZnkgfSkgfHwgJyc7XG4gICAgICAgICAgfV07XG5cbiAgICAgICAgICB2aWV3c1Byb21pc2VzLnB1c2goJHJlc29sdmUucmVzb2x2ZShpbmplY3RhYmxlcywgZHN0Lmdsb2JhbHMsIGRzdC5yZXNvbHZlLCBzdGF0ZSkudGhlbihmdW5jdGlvbiAocmVzdWx0KSB7XG4gICAgICAgICAgICAvLyBSZWZlcmVuY2VzIHRvIHRoZSBjb250cm9sbGVyIChvbmx5IGluc3RhbnRpYXRlZCBhdCBsaW5rIHRpbWUpXG4gICAgICAgICAgICBpZiAoaXNGdW5jdGlvbih2aWV3LmNvbnRyb2xsZXJQcm92aWRlcikgfHwgaXNBcnJheSh2aWV3LmNvbnRyb2xsZXJQcm92aWRlcikpIHtcbiAgICAgICAgICAgICAgdmFyIGluamVjdExvY2FscyA9IGFuZ3VsYXIuZXh0ZW5kKHt9LCBpbmplY3RhYmxlcywgZHN0Lmdsb2JhbHMpO1xuICAgICAgICAgICAgICByZXN1bHQuJCRjb250cm9sbGVyID0gJGluamVjdG9yLmludm9rZSh2aWV3LmNvbnRyb2xsZXJQcm92aWRlciwgbnVsbCwgaW5qZWN0TG9jYWxzKTtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgIHJlc3VsdC4kJGNvbnRyb2xsZXIgPSB2aWV3LmNvbnRyb2xsZXI7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICAvLyBQcm92aWRlIGFjY2VzcyB0byB0aGUgc3RhdGUgaXRzZWxmIGZvciBpbnRlcm5hbCB1c2VcbiAgICAgICAgICAgIHJlc3VsdC4kJHN0YXRlID0gc3RhdGU7XG4gICAgICAgICAgICByZXN1bHQuJCRjb250cm9sbGVyQXMgPSB2aWV3LmNvbnRyb2xsZXJBcztcbiAgICAgICAgICAgIGRzdFtuYW1lXSA9IHJlc3VsdDtcbiAgICAgICAgICB9KSk7XG4gICAgICAgIH0pO1xuXG4gICAgICAgIHJldHVybiAkcS5hbGwodmlld3NQcm9taXNlcykudGhlbihmdW5jdGlvbigpe1xuICAgICAgICAgIHJldHVybiBkc3QuZ2xvYmFscztcbiAgICAgICAgfSk7XG4gICAgICB9XG5cbiAgICAgIC8vIFdhaXQgZm9yIGFsbCB0aGUgcHJvbWlzZXMgYW5kIHRoZW4gcmV0dXJuIHRoZSBhY3RpdmF0aW9uIG9iamVjdFxuICAgICAgcmV0dXJuICRxLmFsbChwcm9taXNlcykudGhlbihyZXNvbHZlVmlld3MpLnRoZW4oZnVuY3Rpb24gKHZhbHVlcykge1xuICAgICAgICByZXR1cm4gZHN0O1xuICAgICAgfSk7XG4gICAgfVxuXG4gICAgcmV0dXJuICRzdGF0ZTtcbiAgfVxuXG4gIGZ1bmN0aW9uIHNob3VsZFNraXBSZWxvYWQodG8sIHRvUGFyYW1zLCBmcm9tLCBmcm9tUGFyYW1zLCBsb2NhbHMsIG9wdGlvbnMpIHtcbiAgICAvLyBSZXR1cm4gdHJ1ZSBpZiB0aGVyZSBhcmUgbm8gZGlmZmVyZW5jZXMgaW4gbm9uLXNlYXJjaCAocGF0aC9vYmplY3QpIHBhcmFtcywgZmFsc2UgaWYgdGhlcmUgYXJlIGRpZmZlcmVuY2VzXG4gICAgZnVuY3Rpb24gbm9uU2VhcmNoUGFyYW1zRXF1YWwoZnJvbUFuZFRvU3RhdGUsIGZyb21QYXJhbXMsIHRvUGFyYW1zKSB7XG4gICAgICAvLyBJZGVudGlmeSB3aGV0aGVyIGFsbCB0aGUgcGFyYW1ldGVycyB0aGF0IGRpZmZlciBiZXR3ZWVuIGBmcm9tUGFyYW1zYCBhbmQgYHRvUGFyYW1zYCB3ZXJlIHNlYXJjaCBwYXJhbXMuXG4gICAgICBmdW5jdGlvbiBub3RTZWFyY2hQYXJhbShrZXkpIHtcbiAgICAgICAgcmV0dXJuIGZyb21BbmRUb1N0YXRlLnBhcmFtc1trZXldLmxvY2F0aW9uICE9IFwic2VhcmNoXCI7XG4gICAgICB9XG4gICAgICB2YXIgbm9uUXVlcnlQYXJhbUtleXMgPSBmcm9tQW5kVG9TdGF0ZS5wYXJhbXMuJCRrZXlzKCkuZmlsdGVyKG5vdFNlYXJjaFBhcmFtKTtcbiAgICAgIHZhciBub25RdWVyeVBhcmFtcyA9IHBpY2suYXBwbHkoe30sIFtmcm9tQW5kVG9TdGF0ZS5wYXJhbXNdLmNvbmNhdChub25RdWVyeVBhcmFtS2V5cykpO1xuICAgICAgdmFyIG5vblF1ZXJ5UGFyYW1TZXQgPSBuZXcgJCRVTUZQLlBhcmFtU2V0KG5vblF1ZXJ5UGFyYW1zKTtcbiAgICAgIHJldHVybiBub25RdWVyeVBhcmFtU2V0LiQkZXF1YWxzKGZyb21QYXJhbXMsIHRvUGFyYW1zKTtcbiAgICB9XG5cbiAgICAvLyBJZiByZWxvYWQgd2FzIG5vdCBleHBsaWNpdGx5IHJlcXVlc3RlZFxuICAgIC8vIGFuZCB3ZSdyZSB0cmFuc2l0aW9uaW5nIHRvIHRoZSBzYW1lIHN0YXRlIHdlJ3JlIGFscmVhZHkgaW5cbiAgICAvLyBhbmQgICAgdGhlIGxvY2FscyBkaWRuJ3QgY2hhbmdlXG4gICAgLy8gICAgIG9yIHRoZXkgY2hhbmdlZCBpbiBhIHdheSB0aGF0IGRvZXNuJ3QgbWVyaXQgcmVsb2FkaW5nXG4gICAgLy8gICAgICAgIChyZWxvYWRPblBhcmFtczpmYWxzZSwgb3IgcmVsb2FkT25TZWFyY2guZmFsc2UgYW5kIG9ubHkgc2VhcmNoIHBhcmFtcyBjaGFuZ2VkKVxuICAgIC8vIFRoZW4gcmV0dXJuIHRydWUuXG4gICAgaWYgKCFvcHRpb25zLnJlbG9hZCAmJiB0byA9PT0gZnJvbSAmJlxuICAgICAgKGxvY2FscyA9PT0gZnJvbS5sb2NhbHMgfHwgKHRvLnNlbGYucmVsb2FkT25TZWFyY2ggPT09IGZhbHNlICYmIG5vblNlYXJjaFBhcmFtc0VxdWFsKGZyb20sIGZyb21QYXJhbXMsIHRvUGFyYW1zKSkpKSB7XG4gICAgICByZXR1cm4gdHJ1ZTtcbiAgICB9XG4gIH1cbn1cblxuYW5ndWxhci5tb2R1bGUoJ3VpLnJvdXRlci5zdGF0ZScpXG4gIC52YWx1ZSgnJHN0YXRlUGFyYW1zJywge30pXG4gIC5wcm92aWRlcignJHN0YXRlJywgJFN0YXRlUHJvdmlkZXIpO1xuXG5cbiRWaWV3UHJvdmlkZXIuJGluamVjdCA9IFtdO1xuZnVuY3Rpb24gJFZpZXdQcm92aWRlcigpIHtcblxuICB0aGlzLiRnZXQgPSAkZ2V0O1xuICAvKipcbiAgICogQG5nZG9jIG9iamVjdFxuICAgKiBAbmFtZSB1aS5yb3V0ZXIuc3RhdGUuJHZpZXdcbiAgICpcbiAgICogQHJlcXVpcmVzIHVpLnJvdXRlci51dGlsLiR0ZW1wbGF0ZUZhY3RvcnlcbiAgICogQHJlcXVpcmVzICRyb290U2NvcGVcbiAgICpcbiAgICogQGRlc2NyaXB0aW9uXG4gICAqXG4gICAqL1xuICAkZ2V0LiRpbmplY3QgPSBbJyRyb290U2NvcGUnLCAnJHRlbXBsYXRlRmFjdG9yeSddO1xuICBmdW5jdGlvbiAkZ2V0KCAgICRyb290U2NvcGUsICAgJHRlbXBsYXRlRmFjdG9yeSkge1xuICAgIHJldHVybiB7XG4gICAgICAvLyAkdmlldy5sb2FkKCdmdWxsLnZpZXdOYW1lJywgeyB0ZW1wbGF0ZTogLi4uLCBjb250cm9sbGVyOiAuLi4sIHJlc29sdmU6IC4uLiwgYXN5bmM6IGZhbHNlLCBwYXJhbXM6IC4uLiB9KVxuICAgICAgLyoqXG4gICAgICAgKiBAbmdkb2MgZnVuY3Rpb25cbiAgICAgICAqIEBuYW1lIHVpLnJvdXRlci5zdGF0ZS4kdmlldyNsb2FkXG4gICAgICAgKiBAbWV0aG9kT2YgdWkucm91dGVyLnN0YXRlLiR2aWV3XG4gICAgICAgKlxuICAgICAgICogQGRlc2NyaXB0aW9uXG4gICAgICAgKlxuICAgICAgICogQHBhcmFtIHtzdHJpbmd9IG5hbWUgbmFtZVxuICAgICAgICogQHBhcmFtIHtvYmplY3R9IG9wdGlvbnMgb3B0aW9uIG9iamVjdC5cbiAgICAgICAqL1xuICAgICAgbG9hZDogZnVuY3Rpb24gbG9hZChuYW1lLCBvcHRpb25zKSB7XG4gICAgICAgIHZhciByZXN1bHQsIGRlZmF1bHRzID0ge1xuICAgICAgICAgIHRlbXBsYXRlOiBudWxsLCBjb250cm9sbGVyOiBudWxsLCB2aWV3OiBudWxsLCBsb2NhbHM6IG51bGwsIG5vdGlmeTogdHJ1ZSwgYXN5bmM6IHRydWUsIHBhcmFtczoge31cbiAgICAgICAgfTtcbiAgICAgICAgb3B0aW9ucyA9IGV4dGVuZChkZWZhdWx0cywgb3B0aW9ucyk7XG5cbiAgICAgICAgaWYgKG9wdGlvbnMudmlldykge1xuICAgICAgICAgIHJlc3VsdCA9ICR0ZW1wbGF0ZUZhY3RvcnkuZnJvbUNvbmZpZyhvcHRpb25zLnZpZXcsIG9wdGlvbnMucGFyYW1zLCBvcHRpb25zLmxvY2Fscyk7XG4gICAgICAgIH1cbiAgICAgICAgaWYgKHJlc3VsdCAmJiBvcHRpb25zLm5vdGlmeSkge1xuICAgICAgICAvKipcbiAgICAgICAgICogQG5nZG9jIGV2ZW50XG4gICAgICAgICAqIEBuYW1lIHVpLnJvdXRlci5zdGF0ZS4kc3RhdGUjJHZpZXdDb250ZW50TG9hZGluZ1xuICAgICAgICAgKiBAZXZlbnRPZiB1aS5yb3V0ZXIuc3RhdGUuJHZpZXdcbiAgICAgICAgICogQGV2ZW50VHlwZSBicm9hZGNhc3Qgb24gcm9vdCBzY29wZVxuICAgICAgICAgKiBAZGVzY3JpcHRpb25cbiAgICAgICAgICpcbiAgICAgICAgICogRmlyZWQgb25jZSB0aGUgdmlldyAqKmJlZ2lucyBsb2FkaW5nKiosICpiZWZvcmUqIHRoZSBET00gaXMgcmVuZGVyZWQuXG4gICAgICAgICAqXG4gICAgICAgICAqIEBwYXJhbSB7T2JqZWN0fSBldmVudCBFdmVudCBvYmplY3QuXG4gICAgICAgICAqIEBwYXJhbSB7T2JqZWN0fSB2aWV3Q29uZmlnIFRoZSB2aWV3IGNvbmZpZyBwcm9wZXJ0aWVzICh0ZW1wbGF0ZSwgY29udHJvbGxlciwgZXRjKS5cbiAgICAgICAgICpcbiAgICAgICAgICogQGV4YW1wbGVcbiAgICAgICAgICpcbiAgICAgICAgICogPHByZT5cbiAgICAgICAgICogJHNjb3BlLiRvbignJHZpZXdDb250ZW50TG9hZGluZycsXG4gICAgICAgICAqIGZ1bmN0aW9uKGV2ZW50LCB2aWV3Q29uZmlnKXtcbiAgICAgICAgICogICAgIC8vIEFjY2VzcyB0byBhbGwgdGhlIHZpZXcgY29uZmlnIHByb3BlcnRpZXMuXG4gICAgICAgICAqICAgICAvLyBhbmQgb25lIHNwZWNpYWwgcHJvcGVydHkgJ3RhcmdldFZpZXcnXG4gICAgICAgICAqICAgICAvLyB2aWV3Q29uZmlnLnRhcmdldFZpZXdcbiAgICAgICAgICogfSk7XG4gICAgICAgICAqIDwvcHJlPlxuICAgICAgICAgKi9cbiAgICAgICAgICAkcm9vdFNjb3BlLiRicm9hZGNhc3QoJyR2aWV3Q29udGVudExvYWRpbmcnLCBvcHRpb25zKTtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gcmVzdWx0O1xuICAgICAgfVxuICAgIH07XG4gIH1cbn1cblxuYW5ndWxhci5tb2R1bGUoJ3VpLnJvdXRlci5zdGF0ZScpLnByb3ZpZGVyKCckdmlldycsICRWaWV3UHJvdmlkZXIpO1xuXG4vKipcbiAqIEBuZ2RvYyBvYmplY3RcbiAqIEBuYW1lIHVpLnJvdXRlci5zdGF0ZS4kdWlWaWV3U2Nyb2xsUHJvdmlkZXJcbiAqXG4gKiBAZGVzY3JpcHRpb25cbiAqIFByb3ZpZGVyIHRoYXQgcmV0dXJucyB0aGUge0BsaW5rIHVpLnJvdXRlci5zdGF0ZS4kdWlWaWV3U2Nyb2xsfSBzZXJ2aWNlIGZ1bmN0aW9uLlxuICovXG5mdW5jdGlvbiAkVmlld1Njcm9sbFByb3ZpZGVyKCkge1xuXG4gIHZhciB1c2VBbmNob3JTY3JvbGwgPSBmYWxzZTtcblxuICAvKipcbiAgICogQG5nZG9jIGZ1bmN0aW9uXG4gICAqIEBuYW1lIHVpLnJvdXRlci5zdGF0ZS4kdWlWaWV3U2Nyb2xsUHJvdmlkZXIjdXNlQW5jaG9yU2Nyb2xsXG4gICAqIEBtZXRob2RPZiB1aS5yb3V0ZXIuc3RhdGUuJHVpVmlld1Njcm9sbFByb3ZpZGVyXG4gICAqXG4gICAqIEBkZXNjcmlwdGlvblxuICAgKiBSZXZlcnRzIGJhY2sgdG8gdXNpbmcgdGhlIGNvcmUgW2AkYW5jaG9yU2Nyb2xsYF0oaHR0cDovL2RvY3MuYW5ndWxhcmpzLm9yZy9hcGkvbmcuJGFuY2hvclNjcm9sbCkgc2VydmljZSBmb3JcbiAgICogc2Nyb2xsaW5nIGJhc2VkIG9uIHRoZSB1cmwgYW5jaG9yLlxuICAgKi9cbiAgdGhpcy51c2VBbmNob3JTY3JvbGwgPSBmdW5jdGlvbiAoKSB7XG4gICAgdXNlQW5jaG9yU2Nyb2xsID0gdHJ1ZTtcbiAgfTtcblxuICAvKipcbiAgICogQG5nZG9jIG9iamVjdFxuICAgKiBAbmFtZSB1aS5yb3V0ZXIuc3RhdGUuJHVpVmlld1Njcm9sbFxuICAgKlxuICAgKiBAcmVxdWlyZXMgJGFuY2hvclNjcm9sbFxuICAgKiBAcmVxdWlyZXMgJHRpbWVvdXRcbiAgICpcbiAgICogQGRlc2NyaXB0aW9uXG4gICAqIFdoZW4gY2FsbGVkIHdpdGggYSBqcUxpdGUgZWxlbWVudCwgaXQgc2Nyb2xscyB0aGUgZWxlbWVudCBpbnRvIHZpZXcgKGFmdGVyIGFcbiAgICogYCR0aW1lb3V0YCBzbyB0aGUgRE9NIGhhcyB0aW1lIHRvIHJlZnJlc2gpLlxuICAgKlxuICAgKiBJZiB5b3UgcHJlZmVyIHRvIHJlbHkgb24gYCRhbmNob3JTY3JvbGxgIHRvIHNjcm9sbCB0aGUgdmlldyB0byB0aGUgYW5jaG9yLFxuICAgKiB0aGlzIGNhbiBiZSBlbmFibGVkIGJ5IGNhbGxpbmcge0BsaW5rIHVpLnJvdXRlci5zdGF0ZS4kdWlWaWV3U2Nyb2xsUHJvdmlkZXIjbWV0aG9kc191c2VBbmNob3JTY3JvbGwgYCR1aVZpZXdTY3JvbGxQcm92aWRlci51c2VBbmNob3JTY3JvbGwoKWB9LlxuICAgKi9cbiAgdGhpcy4kZ2V0ID0gWyckYW5jaG9yU2Nyb2xsJywgJyR0aW1lb3V0JywgZnVuY3Rpb24gKCRhbmNob3JTY3JvbGwsICR0aW1lb3V0KSB7XG4gICAgaWYgKHVzZUFuY2hvclNjcm9sbCkge1xuICAgICAgcmV0dXJuICRhbmNob3JTY3JvbGw7XG4gICAgfVxuXG4gICAgcmV0dXJuIGZ1bmN0aW9uICgkZWxlbWVudCkge1xuICAgICAgcmV0dXJuICR0aW1lb3V0KGZ1bmN0aW9uICgpIHtcbiAgICAgICAgJGVsZW1lbnRbMF0uc2Nyb2xsSW50b1ZpZXcoKTtcbiAgICAgIH0sIDAsIGZhbHNlKTtcbiAgICB9O1xuICB9XTtcbn1cblxuYW5ndWxhci5tb2R1bGUoJ3VpLnJvdXRlci5zdGF0ZScpLnByb3ZpZGVyKCckdWlWaWV3U2Nyb2xsJywgJFZpZXdTY3JvbGxQcm92aWRlcik7XG5cbi8qKlxuICogQG5nZG9jIGRpcmVjdGl2ZVxuICogQG5hbWUgdWkucm91dGVyLnN0YXRlLmRpcmVjdGl2ZTp1aS12aWV3XG4gKlxuICogQHJlcXVpcmVzIHVpLnJvdXRlci5zdGF0ZS4kc3RhdGVcbiAqIEByZXF1aXJlcyAkY29tcGlsZVxuICogQHJlcXVpcmVzICRjb250cm9sbGVyXG4gKiBAcmVxdWlyZXMgJGluamVjdG9yXG4gKiBAcmVxdWlyZXMgdWkucm91dGVyLnN0YXRlLiR1aVZpZXdTY3JvbGxcbiAqIEByZXF1aXJlcyAkZG9jdW1lbnRcbiAqXG4gKiBAcmVzdHJpY3QgRUNBXG4gKlxuICogQGRlc2NyaXB0aW9uXG4gKiBUaGUgdWktdmlldyBkaXJlY3RpdmUgdGVsbHMgJHN0YXRlIHdoZXJlIHRvIHBsYWNlIHlvdXIgdGVtcGxhdGVzLlxuICpcbiAqIEBwYXJhbSB7c3RyaW5nPX0gbmFtZSBBIHZpZXcgbmFtZS4gVGhlIG5hbWUgc2hvdWxkIGJlIHVuaXF1ZSBhbW9uZ3N0IHRoZSBvdGhlciB2aWV3cyBpbiB0aGVcbiAqIHNhbWUgc3RhdGUuIFlvdSBjYW4gaGF2ZSB2aWV3cyBvZiB0aGUgc2FtZSBuYW1lIHRoYXQgbGl2ZSBpbiBkaWZmZXJlbnQgc3RhdGVzLlxuICpcbiAqIEBwYXJhbSB7c3RyaW5nPX0gYXV0b3Njcm9sbCBJdCBhbGxvd3MgeW91IHRvIHNldCB0aGUgc2Nyb2xsIGJlaGF2aW9yIG9mIHRoZSBicm93c2VyIHdpbmRvd1xuICogd2hlbiBhIHZpZXcgaXMgcG9wdWxhdGVkLiBCeSBkZWZhdWx0LCAkYW5jaG9yU2Nyb2xsIGlzIG92ZXJyaWRkZW4gYnkgdWktcm91dGVyJ3MgY3VzdG9tIHNjcm9sbFxuICogc2VydmljZSwge0BsaW5rIHVpLnJvdXRlci5zdGF0ZS4kdWlWaWV3U2Nyb2xsfS4gVGhpcyBjdXN0b20gc2VydmljZSBsZXQncyB5b3VcbiAqIHNjcm9sbCB1aS12aWV3IGVsZW1lbnRzIGludG8gdmlldyB3aGVuIHRoZXkgYXJlIHBvcHVsYXRlZCBkdXJpbmcgYSBzdGF0ZSBhY3RpdmF0aW9uLlxuICpcbiAqICpOb3RlOiBUbyByZXZlcnQgYmFjayB0byBvbGQgW2AkYW5jaG9yU2Nyb2xsYF0oaHR0cDovL2RvY3MuYW5ndWxhcmpzLm9yZy9hcGkvbmcuJGFuY2hvclNjcm9sbClcbiAqIGZ1bmN0aW9uYWxpdHksIGNhbGwgYCR1aVZpZXdTY3JvbGxQcm92aWRlci51c2VBbmNob3JTY3JvbGwoKWAuKlxuICpcbiAqIEBwYXJhbSB7c3RyaW5nPX0gb25sb2FkIEV4cHJlc3Npb24gdG8gZXZhbHVhdGUgd2hlbmV2ZXIgdGhlIHZpZXcgdXBkYXRlcy5cbiAqIFxuICogQGV4YW1wbGVcbiAqIEEgdmlldyBjYW4gYmUgdW5uYW1lZCBvciBuYW1lZC4gXG4gKiA8cHJlPlxuICogPCEtLSBVbm5hbWVkIC0tPlxuICogPGRpdiB1aS12aWV3PjwvZGl2PiBcbiAqIFxuICogPCEtLSBOYW1lZCAtLT5cbiAqIDxkaXYgdWktdmlldz1cInZpZXdOYW1lXCI+PC9kaXY+XG4gKiA8L3ByZT5cbiAqXG4gKiBZb3UgY2FuIG9ubHkgaGF2ZSBvbmUgdW5uYW1lZCB2aWV3IHdpdGhpbiBhbnkgdGVtcGxhdGUgKG9yIHJvb3QgaHRtbCkuIElmIHlvdSBhcmUgb25seSB1c2luZyBhIFxuICogc2luZ2xlIHZpZXcgYW5kIGl0IGlzIHVubmFtZWQgdGhlbiB5b3UgY2FuIHBvcHVsYXRlIGl0IGxpa2Ugc286XG4gKiA8cHJlPlxuICogPGRpdiB1aS12aWV3PjwvZGl2PiBcbiAqICRzdGF0ZVByb3ZpZGVyLnN0YXRlKFwiaG9tZVwiLCB7XG4gKiAgIHRlbXBsYXRlOiBcIjxoMT5IRUxMTyE8L2gxPlwiXG4gKiB9KVxuICogPC9wcmU+XG4gKiBcbiAqIFRoZSBhYm92ZSBpcyBhIGNvbnZlbmllbnQgc2hvcnRjdXQgZXF1aXZhbGVudCB0byBzcGVjaWZ5aW5nIHlvdXIgdmlldyBleHBsaWNpdGx5IHdpdGggdGhlIHtAbGluayB1aS5yb3V0ZXIuc3RhdGUuJHN0YXRlUHJvdmlkZXIjdmlld3MgYHZpZXdzYH1cbiAqIGNvbmZpZyBwcm9wZXJ0eSwgYnkgbmFtZSwgaW4gdGhpcyBjYXNlIGFuIGVtcHR5IG5hbWU6XG4gKiA8cHJlPlxuICogJHN0YXRlUHJvdmlkZXIuc3RhdGUoXCJob21lXCIsIHtcbiAqICAgdmlld3M6IHtcbiAqICAgICBcIlwiOiB7XG4gKiAgICAgICB0ZW1wbGF0ZTogXCI8aDE+SEVMTE8hPC9oMT5cIlxuICogICAgIH1cbiAqICAgfSAgICBcbiAqIH0pXG4gKiA8L3ByZT5cbiAqIFxuICogQnV0IHR5cGljYWxseSB5b3UnbGwgb25seSB1c2UgdGhlIHZpZXdzIHByb3BlcnR5IGlmIHlvdSBuYW1lIHlvdXIgdmlldyBvciBoYXZlIG1vcmUgdGhhbiBvbmUgdmlldyBcbiAqIGluIHRoZSBzYW1lIHRlbXBsYXRlLiBUaGVyZSdzIG5vdCByZWFsbHkgYSBjb21wZWxsaW5nIHJlYXNvbiB0byBuYW1lIGEgdmlldyBpZiBpdHMgdGhlIG9ubHkgb25lLCBcbiAqIGJ1dCB5b3UgY291bGQgaWYgeW91IHdhbnRlZCwgbGlrZSBzbzpcbiAqIDxwcmU+XG4gKiA8ZGl2IHVpLXZpZXc9XCJtYWluXCI+PC9kaXY+XG4gKiA8L3ByZT4gXG4gKiA8cHJlPlxuICogJHN0YXRlUHJvdmlkZXIuc3RhdGUoXCJob21lXCIsIHtcbiAqICAgdmlld3M6IHtcbiAqICAgICBcIm1haW5cIjoge1xuICogICAgICAgdGVtcGxhdGU6IFwiPGgxPkhFTExPITwvaDE+XCJcbiAqICAgICB9XG4gKiAgIH0gICAgXG4gKiB9KVxuICogPC9wcmU+XG4gKiBcbiAqIFJlYWxseSB0aG91Z2gsIHlvdSdsbCB1c2Ugdmlld3MgdG8gc2V0IHVwIG11bHRpcGxlIHZpZXdzOlxuICogPHByZT5cbiAqIDxkaXYgdWktdmlldz48L2Rpdj5cbiAqIDxkaXYgdWktdmlldz1cImNoYXJ0XCI+PC9kaXY+IFxuICogPGRpdiB1aS12aWV3PVwiZGF0YVwiPjwvZGl2PiBcbiAqIDwvcHJlPlxuICogXG4gKiA8cHJlPlxuICogJHN0YXRlUHJvdmlkZXIuc3RhdGUoXCJob21lXCIsIHtcbiAqICAgdmlld3M6IHtcbiAqICAgICBcIlwiOiB7XG4gKiAgICAgICB0ZW1wbGF0ZTogXCI8aDE+SEVMTE8hPC9oMT5cIlxuICogICAgIH0sXG4gKiAgICAgXCJjaGFydFwiOiB7XG4gKiAgICAgICB0ZW1wbGF0ZTogXCI8Y2hhcnRfdGhpbmcvPlwiXG4gKiAgICAgfSxcbiAqICAgICBcImRhdGFcIjoge1xuICogICAgICAgdGVtcGxhdGU6IFwiPGRhdGFfdGhpbmcvPlwiXG4gKiAgICAgfVxuICogICB9ICAgIFxuICogfSlcbiAqIDwvcHJlPlxuICpcbiAqIEV4YW1wbGVzIGZvciBgYXV0b3Njcm9sbGA6XG4gKlxuICogPHByZT5cbiAqIDwhLS0gSWYgYXV0b3Njcm9sbCBwcmVzZW50IHdpdGggbm8gZXhwcmVzc2lvbixcbiAqICAgICAgdGhlbiBzY3JvbGwgdWktdmlldyBpbnRvIHZpZXcgLS0+XG4gKiA8dWktdmlldyBhdXRvc2Nyb2xsLz5cbiAqXG4gKiA8IS0tIElmIGF1dG9zY3JvbGwgcHJlc2VudCB3aXRoIHZhbGlkIGV4cHJlc3Npb24sXG4gKiAgICAgIHRoZW4gc2Nyb2xsIHVpLXZpZXcgaW50byB2aWV3IGlmIGV4cHJlc3Npb24gZXZhbHVhdGVzIHRvIHRydWUgLS0+XG4gKiA8dWktdmlldyBhdXRvc2Nyb2xsPSd0cnVlJy8+XG4gKiA8dWktdmlldyBhdXRvc2Nyb2xsPSdmYWxzZScvPlxuICogPHVpLXZpZXcgYXV0b3Njcm9sbD0nc2NvcGVWYXJpYWJsZScvPlxuICogPC9wcmU+XG4gKi9cbiRWaWV3RGlyZWN0aXZlLiRpbmplY3QgPSBbJyRzdGF0ZScsICckaW5qZWN0b3InLCAnJHVpVmlld1Njcm9sbCcsICckaW50ZXJwb2xhdGUnXTtcbmZ1bmN0aW9uICRWaWV3RGlyZWN0aXZlKCAgICRzdGF0ZSwgICAkaW5qZWN0b3IsICAgJHVpVmlld1Njcm9sbCwgICAkaW50ZXJwb2xhdGUpIHtcblxuICBmdW5jdGlvbiBnZXRTZXJ2aWNlKCkge1xuICAgIHJldHVybiAoJGluamVjdG9yLmhhcykgPyBmdW5jdGlvbihzZXJ2aWNlKSB7XG4gICAgICByZXR1cm4gJGluamVjdG9yLmhhcyhzZXJ2aWNlKSA/ICRpbmplY3Rvci5nZXQoc2VydmljZSkgOiBudWxsO1xuICAgIH0gOiBmdW5jdGlvbihzZXJ2aWNlKSB7XG4gICAgICB0cnkge1xuICAgICAgICByZXR1cm4gJGluamVjdG9yLmdldChzZXJ2aWNlKTtcbiAgICAgIH0gY2F0Y2ggKGUpIHtcbiAgICAgICAgcmV0dXJuIG51bGw7XG4gICAgICB9XG4gICAgfTtcbiAgfVxuXG4gIHZhciBzZXJ2aWNlID0gZ2V0U2VydmljZSgpLFxuICAgICAgJGFuaW1hdG9yID0gc2VydmljZSgnJGFuaW1hdG9yJyksXG4gICAgICAkYW5pbWF0ZSA9IHNlcnZpY2UoJyRhbmltYXRlJyk7XG5cbiAgLy8gUmV0dXJucyBhIHNldCBvZiBET00gbWFuaXB1bGF0aW9uIGZ1bmN0aW9ucyBiYXNlZCBvbiB3aGljaCBBbmd1bGFyIHZlcnNpb25cbiAgLy8gaXQgc2hvdWxkIHVzZVxuICBmdW5jdGlvbiBnZXRSZW5kZXJlcihhdHRycywgc2NvcGUpIHtcbiAgICB2YXIgc3RhdGljcyA9IGZ1bmN0aW9uKCkge1xuICAgICAgcmV0dXJuIHtcbiAgICAgICAgZW50ZXI6IGZ1bmN0aW9uIChlbGVtZW50LCB0YXJnZXQsIGNiKSB7IHRhcmdldC5hZnRlcihlbGVtZW50KTsgY2IoKTsgfSxcbiAgICAgICAgbGVhdmU6IGZ1bmN0aW9uIChlbGVtZW50LCBjYikgeyBlbGVtZW50LnJlbW92ZSgpOyBjYigpOyB9XG4gICAgICB9O1xuICAgIH07XG5cbiAgICBpZiAoJGFuaW1hdGUpIHtcbiAgICAgIHJldHVybiB7XG4gICAgICAgIGVudGVyOiBmdW5jdGlvbihlbGVtZW50LCB0YXJnZXQsIGNiKSB7XG4gICAgICAgICAgdmFyIHByb21pc2UgPSAkYW5pbWF0ZS5lbnRlcihlbGVtZW50LCBudWxsLCB0YXJnZXQsIGNiKTtcbiAgICAgICAgICBpZiAocHJvbWlzZSAmJiBwcm9taXNlLnRoZW4pIHByb21pc2UudGhlbihjYik7XG4gICAgICAgIH0sXG4gICAgICAgIGxlYXZlOiBmdW5jdGlvbihlbGVtZW50LCBjYikge1xuICAgICAgICAgIHZhciBwcm9taXNlID0gJGFuaW1hdGUubGVhdmUoZWxlbWVudCwgY2IpO1xuICAgICAgICAgIGlmIChwcm9taXNlICYmIHByb21pc2UudGhlbikgcHJvbWlzZS50aGVuKGNiKTtcbiAgICAgICAgfVxuICAgICAgfTtcbiAgICB9XG5cbiAgICBpZiAoJGFuaW1hdG9yKSB7XG4gICAgICB2YXIgYW5pbWF0ZSA9ICRhbmltYXRvciAmJiAkYW5pbWF0b3Ioc2NvcGUsIGF0dHJzKTtcblxuICAgICAgcmV0dXJuIHtcbiAgICAgICAgZW50ZXI6IGZ1bmN0aW9uKGVsZW1lbnQsIHRhcmdldCwgY2IpIHthbmltYXRlLmVudGVyKGVsZW1lbnQsIG51bGwsIHRhcmdldCk7IGNiKCk7IH0sXG4gICAgICAgIGxlYXZlOiBmdW5jdGlvbihlbGVtZW50LCBjYikgeyBhbmltYXRlLmxlYXZlKGVsZW1lbnQpOyBjYigpOyB9XG4gICAgICB9O1xuICAgIH1cblxuICAgIHJldHVybiBzdGF0aWNzKCk7XG4gIH1cblxuICB2YXIgZGlyZWN0aXZlID0ge1xuICAgIHJlc3RyaWN0OiAnRUNBJyxcbiAgICB0ZXJtaW5hbDogdHJ1ZSxcbiAgICBwcmlvcml0eTogNDAwLFxuICAgIHRyYW5zY2x1ZGU6ICdlbGVtZW50JyxcbiAgICBjb21waWxlOiBmdW5jdGlvbiAodEVsZW1lbnQsIHRBdHRycywgJHRyYW5zY2x1ZGUpIHtcbiAgICAgIHJldHVybiBmdW5jdGlvbiAoc2NvcGUsICRlbGVtZW50LCBhdHRycykge1xuICAgICAgICB2YXIgcHJldmlvdXNFbCwgY3VycmVudEVsLCBjdXJyZW50U2NvcGUsIGxhdGVzdExvY2FscyxcbiAgICAgICAgICAgIG9ubG9hZEV4cCAgICAgPSBhdHRycy5vbmxvYWQgfHwgJycsXG4gICAgICAgICAgICBhdXRvU2Nyb2xsRXhwID0gYXR0cnMuYXV0b3Njcm9sbCxcbiAgICAgICAgICAgIHJlbmRlcmVyICAgICAgPSBnZXRSZW5kZXJlcihhdHRycywgc2NvcGUpO1xuXG4gICAgICAgIHNjb3BlLiRvbignJHN0YXRlQ2hhbmdlU3VjY2VzcycsIGZ1bmN0aW9uKCkge1xuICAgICAgICAgIHVwZGF0ZVZpZXcoZmFsc2UpO1xuICAgICAgICB9KTtcbiAgICAgICAgc2NvcGUuJG9uKCckdmlld0NvbnRlbnRMb2FkaW5nJywgZnVuY3Rpb24oKSB7XG4gICAgICAgICAgdXBkYXRlVmlldyhmYWxzZSk7XG4gICAgICAgIH0pO1xuXG4gICAgICAgIHVwZGF0ZVZpZXcodHJ1ZSk7XG5cbiAgICAgICAgZnVuY3Rpb24gY2xlYW51cExhc3RWaWV3KCkge1xuICAgICAgICAgIGlmIChwcmV2aW91c0VsKSB7XG4gICAgICAgICAgICBwcmV2aW91c0VsLnJlbW92ZSgpO1xuICAgICAgICAgICAgcHJldmlvdXNFbCA9IG51bGw7XG4gICAgICAgICAgfVxuXG4gICAgICAgICAgaWYgKGN1cnJlbnRTY29wZSkge1xuICAgICAgICAgICAgY3VycmVudFNjb3BlLiRkZXN0cm95KCk7XG4gICAgICAgICAgICBjdXJyZW50U2NvcGUgPSBudWxsO1xuICAgICAgICAgIH1cblxuICAgICAgICAgIGlmIChjdXJyZW50RWwpIHtcbiAgICAgICAgICAgIHJlbmRlcmVyLmxlYXZlKGN1cnJlbnRFbCwgZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICAgIHByZXZpb3VzRWwgPSBudWxsO1xuICAgICAgICAgICAgfSk7XG5cbiAgICAgICAgICAgIHByZXZpb3VzRWwgPSBjdXJyZW50RWw7XG4gICAgICAgICAgICBjdXJyZW50RWwgPSBudWxsO1xuICAgICAgICAgIH1cbiAgICAgICAgfVxuXG4gICAgICAgIGZ1bmN0aW9uIHVwZGF0ZVZpZXcoZmlyc3RUaW1lKSB7XG4gICAgICAgICAgdmFyIG5ld1Njb3BlLFxuICAgICAgICAgICAgICBuYW1lICAgICAgICAgICAgPSBnZXRVaVZpZXdOYW1lKHNjb3BlLCBhdHRycywgJGVsZW1lbnQsICRpbnRlcnBvbGF0ZSksXG4gICAgICAgICAgICAgIHByZXZpb3VzTG9jYWxzICA9IG5hbWUgJiYgJHN0YXRlLiRjdXJyZW50ICYmICRzdGF0ZS4kY3VycmVudC5sb2NhbHNbbmFtZV07XG5cbiAgICAgICAgICBpZiAoIWZpcnN0VGltZSAmJiBwcmV2aW91c0xvY2FscyA9PT0gbGF0ZXN0TG9jYWxzKSByZXR1cm47IC8vIG5vdGhpbmcgdG8gZG9cbiAgICAgICAgICBuZXdTY29wZSA9IHNjb3BlLiRuZXcoKTtcbiAgICAgICAgICBsYXRlc3RMb2NhbHMgPSAkc3RhdGUuJGN1cnJlbnQubG9jYWxzW25hbWVdO1xuXG4gICAgICAgICAgdmFyIGNsb25lID0gJHRyYW5zY2x1ZGUobmV3U2NvcGUsIGZ1bmN0aW9uKGNsb25lKSB7XG4gICAgICAgICAgICByZW5kZXJlci5lbnRlcihjbG9uZSwgJGVsZW1lbnQsIGZ1bmN0aW9uIG9uVWlWaWV3RW50ZXIoKSB7XG4gICAgICAgICAgICAgIGlmKGN1cnJlbnRTY29wZSkge1xuICAgICAgICAgICAgICAgIGN1cnJlbnRTY29wZS4kZW1pdCgnJHZpZXdDb250ZW50QW5pbWF0aW9uRW5kZWQnKTtcbiAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgIGlmIChhbmd1bGFyLmlzRGVmaW5lZChhdXRvU2Nyb2xsRXhwKSAmJiAhYXV0b1Njcm9sbEV4cCB8fCBzY29wZS4kZXZhbChhdXRvU2Nyb2xsRXhwKSkge1xuICAgICAgICAgICAgICAgICR1aVZpZXdTY3JvbGwoY2xvbmUpO1xuICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIGNsZWFudXBMYXN0VmlldygpO1xuICAgICAgICAgIH0pO1xuXG4gICAgICAgICAgY3VycmVudEVsID0gY2xvbmU7XG4gICAgICAgICAgY3VycmVudFNjb3BlID0gbmV3U2NvcGU7XG4gICAgICAgICAgLyoqXG4gICAgICAgICAgICogQG5nZG9jIGV2ZW50XG4gICAgICAgICAgICogQG5hbWUgdWkucm91dGVyLnN0YXRlLmRpcmVjdGl2ZTp1aS12aWV3IyR2aWV3Q29udGVudExvYWRlZFxuICAgICAgICAgICAqIEBldmVudE9mIHVpLnJvdXRlci5zdGF0ZS5kaXJlY3RpdmU6dWktdmlld1xuICAgICAgICAgICAqIEBldmVudFR5cGUgZW1pdHMgb24gdWktdmlldyBkaXJlY3RpdmUgc2NvcGVcbiAgICAgICAgICAgKiBAZGVzY3JpcHRpb24gICAgICAgICAgICpcbiAgICAgICAgICAgKiBGaXJlZCBvbmNlIHRoZSB2aWV3IGlzICoqbG9hZGVkKiosICphZnRlciogdGhlIERPTSBpcyByZW5kZXJlZC5cbiAgICAgICAgICAgKlxuICAgICAgICAgICAqIEBwYXJhbSB7T2JqZWN0fSBldmVudCBFdmVudCBvYmplY3QuXG4gICAgICAgICAgICovXG4gICAgICAgICAgY3VycmVudFNjb3BlLiRlbWl0KCckdmlld0NvbnRlbnRMb2FkZWQnKTtcbiAgICAgICAgICBjdXJyZW50U2NvcGUuJGV2YWwob25sb2FkRXhwKTtcbiAgICAgICAgfVxuICAgICAgfTtcbiAgICB9XG4gIH07XG5cbiAgcmV0dXJuIGRpcmVjdGl2ZTtcbn1cblxuJFZpZXdEaXJlY3RpdmVGaWxsLiRpbmplY3QgPSBbJyRjb21waWxlJywgJyRjb250cm9sbGVyJywgJyRzdGF0ZScsICckaW50ZXJwb2xhdGUnXTtcbmZ1bmN0aW9uICRWaWV3RGlyZWN0aXZlRmlsbCAoICAkY29tcGlsZSwgICAkY29udHJvbGxlciwgICAkc3RhdGUsICAgJGludGVycG9sYXRlKSB7XG4gIHJldHVybiB7XG4gICAgcmVzdHJpY3Q6ICdFQ0EnLFxuICAgIHByaW9yaXR5OiAtNDAwLFxuICAgIGNvbXBpbGU6IGZ1bmN0aW9uICh0RWxlbWVudCkge1xuICAgICAgdmFyIGluaXRpYWwgPSB0RWxlbWVudC5odG1sKCk7XG4gICAgICByZXR1cm4gZnVuY3Rpb24gKHNjb3BlLCAkZWxlbWVudCwgYXR0cnMpIHtcbiAgICAgICAgdmFyIGN1cnJlbnQgPSAkc3RhdGUuJGN1cnJlbnQsXG4gICAgICAgICAgICBuYW1lID0gZ2V0VWlWaWV3TmFtZShzY29wZSwgYXR0cnMsICRlbGVtZW50LCAkaW50ZXJwb2xhdGUpLFxuICAgICAgICAgICAgbG9jYWxzICA9IGN1cnJlbnQgJiYgY3VycmVudC5sb2NhbHNbbmFtZV07XG5cbiAgICAgICAgaWYgKCEgbG9jYWxzKSB7XG4gICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG5cbiAgICAgICAgJGVsZW1lbnQuZGF0YSgnJHVpVmlldycsIHsgbmFtZTogbmFtZSwgc3RhdGU6IGxvY2Fscy4kJHN0YXRlIH0pO1xuICAgICAgICAkZWxlbWVudC5odG1sKGxvY2Fscy4kdGVtcGxhdGUgPyBsb2NhbHMuJHRlbXBsYXRlIDogaW5pdGlhbCk7XG5cbiAgICAgICAgdmFyIGxpbmsgPSAkY29tcGlsZSgkZWxlbWVudC5jb250ZW50cygpKTtcblxuICAgICAgICBpZiAobG9jYWxzLiQkY29udHJvbGxlcikge1xuICAgICAgICAgIGxvY2Fscy4kc2NvcGUgPSBzY29wZTtcbiAgICAgICAgICBsb2NhbHMuJGVsZW1lbnQgPSAkZWxlbWVudDtcbiAgICAgICAgICB2YXIgY29udHJvbGxlciA9ICRjb250cm9sbGVyKGxvY2Fscy4kJGNvbnRyb2xsZXIsIGxvY2Fscyk7XG4gICAgICAgICAgaWYgKGxvY2Fscy4kJGNvbnRyb2xsZXJBcykge1xuICAgICAgICAgICAgc2NvcGVbbG9jYWxzLiQkY29udHJvbGxlckFzXSA9IGNvbnRyb2xsZXI7XG4gICAgICAgICAgfVxuICAgICAgICAgICRlbGVtZW50LmRhdGEoJyRuZ0NvbnRyb2xsZXJDb250cm9sbGVyJywgY29udHJvbGxlcik7XG4gICAgICAgICAgJGVsZW1lbnQuY2hpbGRyZW4oKS5kYXRhKCckbmdDb250cm9sbGVyQ29udHJvbGxlcicsIGNvbnRyb2xsZXIpO1xuICAgICAgICB9XG5cbiAgICAgICAgbGluayhzY29wZSk7XG4gICAgICB9O1xuICAgIH1cbiAgfTtcbn1cblxuLyoqXG4gKiBTaGFyZWQgdWktdmlldyBjb2RlIGZvciBib3RoIGRpcmVjdGl2ZXM6XG4gKiBHaXZlbiBzY29wZSwgZWxlbWVudCwgYW5kIGl0cyBhdHRyaWJ1dGVzLCByZXR1cm4gdGhlIHZpZXcncyBuYW1lXG4gKi9cbmZ1bmN0aW9uIGdldFVpVmlld05hbWUoc2NvcGUsIGF0dHJzLCBlbGVtZW50LCAkaW50ZXJwb2xhdGUpIHtcbiAgdmFyIG5hbWUgPSAkaW50ZXJwb2xhdGUoYXR0cnMudWlWaWV3IHx8IGF0dHJzLm5hbWUgfHwgJycpKHNjb3BlKTtcbiAgdmFyIGluaGVyaXRlZCA9IGVsZW1lbnQuaW5oZXJpdGVkRGF0YSgnJHVpVmlldycpO1xuICByZXR1cm4gbmFtZS5pbmRleE9mKCdAJykgPj0gMCA/ICBuYW1lIDogIChuYW1lICsgJ0AnICsgKGluaGVyaXRlZCA/IGluaGVyaXRlZC5zdGF0ZS5uYW1lIDogJycpKTtcbn1cblxuYW5ndWxhci5tb2R1bGUoJ3VpLnJvdXRlci5zdGF0ZScpLmRpcmVjdGl2ZSgndWlWaWV3JywgJFZpZXdEaXJlY3RpdmUpO1xuYW5ndWxhci5tb2R1bGUoJ3VpLnJvdXRlci5zdGF0ZScpLmRpcmVjdGl2ZSgndWlWaWV3JywgJFZpZXdEaXJlY3RpdmVGaWxsKTtcblxuZnVuY3Rpb24gcGFyc2VTdGF0ZVJlZihyZWYsIGN1cnJlbnQpIHtcbiAgdmFyIHByZXBhcnNlZCA9IHJlZi5tYXRjaCgvXlxccyooe1tefV0qfSlcXHMqJC8pLCBwYXJzZWQ7XG4gIGlmIChwcmVwYXJzZWQpIHJlZiA9IGN1cnJlbnQgKyAnKCcgKyBwcmVwYXJzZWRbMV0gKyAnKSc7XG4gIHBhcnNlZCA9IHJlZi5yZXBsYWNlKC9cXG4vZywgXCIgXCIpLm1hdGNoKC9eKFteKF0rPylcXHMqKFxcKCguKilcXCkpPyQvKTtcbiAgaWYgKCFwYXJzZWQgfHwgcGFyc2VkLmxlbmd0aCAhPT0gNCkgdGhyb3cgbmV3IEVycm9yKFwiSW52YWxpZCBzdGF0ZSByZWYgJ1wiICsgcmVmICsgXCInXCIpO1xuICByZXR1cm4geyBzdGF0ZTogcGFyc2VkWzFdLCBwYXJhbUV4cHI6IHBhcnNlZFszXSB8fCBudWxsIH07XG59XG5cbmZ1bmN0aW9uIHN0YXRlQ29udGV4dChlbCkge1xuICB2YXIgc3RhdGVEYXRhID0gZWwucGFyZW50KCkuaW5oZXJpdGVkRGF0YSgnJHVpVmlldycpO1xuXG4gIGlmIChzdGF0ZURhdGEgJiYgc3RhdGVEYXRhLnN0YXRlICYmIHN0YXRlRGF0YS5zdGF0ZS5uYW1lKSB7XG4gICAgcmV0dXJuIHN0YXRlRGF0YS5zdGF0ZTtcbiAgfVxufVxuXG4vKipcbiAqIEBuZ2RvYyBkaXJlY3RpdmVcbiAqIEBuYW1lIHVpLnJvdXRlci5zdGF0ZS5kaXJlY3RpdmU6dWktc3JlZlxuICpcbiAqIEByZXF1aXJlcyB1aS5yb3V0ZXIuc3RhdGUuJHN0YXRlXG4gKiBAcmVxdWlyZXMgJHRpbWVvdXRcbiAqXG4gKiBAcmVzdHJpY3QgQVxuICpcbiAqIEBkZXNjcmlwdGlvblxuICogQSBkaXJlY3RpdmUgdGhhdCBiaW5kcyBhIGxpbmsgKGA8YT5gIHRhZykgdG8gYSBzdGF0ZS4gSWYgdGhlIHN0YXRlIGhhcyBhbiBhc3NvY2lhdGVkIFxuICogVVJMLCB0aGUgZGlyZWN0aXZlIHdpbGwgYXV0b21hdGljYWxseSBnZW5lcmF0ZSAmIHVwZGF0ZSB0aGUgYGhyZWZgIGF0dHJpYnV0ZSB2aWEgXG4gKiB0aGUge0BsaW5rIHVpLnJvdXRlci5zdGF0ZS4kc3RhdGUjbWV0aG9kc19ocmVmICRzdGF0ZS5ocmVmKCl9IG1ldGhvZC4gQ2xpY2tpbmcgXG4gKiB0aGUgbGluayB3aWxsIHRyaWdnZXIgYSBzdGF0ZSB0cmFuc2l0aW9uIHdpdGggb3B0aW9uYWwgcGFyYW1ldGVycy4gXG4gKlxuICogQWxzbyBtaWRkbGUtY2xpY2tpbmcsIHJpZ2h0LWNsaWNraW5nLCBhbmQgY3RybC1jbGlja2luZyBvbiB0aGUgbGluayB3aWxsIGJlIFxuICogaGFuZGxlZCBuYXRpdmVseSBieSB0aGUgYnJvd3Nlci5cbiAqXG4gKiBZb3UgY2FuIGFsc28gdXNlIHJlbGF0aXZlIHN0YXRlIHBhdGhzIHdpdGhpbiB1aS1zcmVmLCBqdXN0IGxpa2UgdGhlIHJlbGF0aXZlIFxuICogcGF0aHMgcGFzc2VkIHRvIGAkc3RhdGUuZ28oKWAuIFlvdSBqdXN0IG5lZWQgdG8gYmUgYXdhcmUgdGhhdCB0aGUgcGF0aCBpcyByZWxhdGl2ZVxuICogdG8gdGhlIHN0YXRlIHRoYXQgdGhlIGxpbmsgbGl2ZXMgaW4sIGluIG90aGVyIHdvcmRzIHRoZSBzdGF0ZSB0aGF0IGxvYWRlZCB0aGUgXG4gKiB0ZW1wbGF0ZSBjb250YWluaW5nIHRoZSBsaW5rLlxuICpcbiAqIFlvdSBjYW4gc3BlY2lmeSBvcHRpb25zIHRvIHBhc3MgdG8ge0BsaW5rIHVpLnJvdXRlci5zdGF0ZS4kc3RhdGUjZ28gJHN0YXRlLmdvKCl9XG4gKiB1c2luZyB0aGUgYHVpLXNyZWYtb3B0c2AgYXR0cmlidXRlLiBPcHRpb25zIGFyZSByZXN0cmljdGVkIHRvIGBsb2NhdGlvbmAsIGBpbmhlcml0YCxcbiAqIGFuZCBgcmVsb2FkYC5cbiAqXG4gKiBAZXhhbXBsZVxuICogSGVyZSdzIGFuIGV4YW1wbGUgb2YgaG93IHlvdSdkIHVzZSB1aS1zcmVmIGFuZCBob3cgaXQgd291bGQgY29tcGlsZS4gSWYgeW91IGhhdmUgdGhlIFxuICogZm9sbG93aW5nIHRlbXBsYXRlOlxuICogPHByZT5cbiAqIDxhIHVpLXNyZWY9XCJob21lXCI+SG9tZTwvYT4gfCA8YSB1aS1zcmVmPVwiYWJvdXRcIj5BYm91dDwvYT4gfCA8YSB1aS1zcmVmPVwie3BhZ2U6IDJ9XCI+TmV4dCBwYWdlPC9hPlxuICogXG4gKiA8dWw+XG4gKiAgICAgPGxpIG5nLXJlcGVhdD1cImNvbnRhY3QgaW4gY29udGFjdHNcIj5cbiAqICAgICAgICAgPGEgdWktc3JlZj1cImNvbnRhY3RzLmRldGFpbCh7IGlkOiBjb250YWN0LmlkIH0pXCI+e3sgY29udGFjdC5uYW1lIH19PC9hPlxuICogICAgIDwvbGk+XG4gKiA8L3VsPlxuICogPC9wcmU+XG4gKiBcbiAqIFRoZW4gdGhlIGNvbXBpbGVkIGh0bWwgd291bGQgYmUgKGFzc3VtaW5nIEh0bWw1TW9kZSBpcyBvZmYgYW5kIGN1cnJlbnQgc3RhdGUgaXMgY29udGFjdHMpOlxuICogPHByZT5cbiAqIDxhIGhyZWY9XCIjL2hvbWVcIiB1aS1zcmVmPVwiaG9tZVwiPkhvbWU8L2E+IHwgPGEgaHJlZj1cIiMvYWJvdXRcIiB1aS1zcmVmPVwiYWJvdXRcIj5BYm91dDwvYT4gfCA8YSBocmVmPVwiIy9jb250YWN0cz9wYWdlPTJcIiB1aS1zcmVmPVwie3BhZ2U6IDJ9XCI+TmV4dCBwYWdlPC9hPlxuICogXG4gKiA8dWw+XG4gKiAgICAgPGxpIG5nLXJlcGVhdD1cImNvbnRhY3QgaW4gY29udGFjdHNcIj5cbiAqICAgICAgICAgPGEgaHJlZj1cIiMvY29udGFjdHMvMVwiIHVpLXNyZWY9XCJjb250YWN0cy5kZXRhaWwoeyBpZDogY29udGFjdC5pZCB9KVwiPkpvZTwvYT5cbiAqICAgICA8L2xpPlxuICogICAgIDxsaSBuZy1yZXBlYXQ9XCJjb250YWN0IGluIGNvbnRhY3RzXCI+XG4gKiAgICAgICAgIDxhIGhyZWY9XCIjL2NvbnRhY3RzLzJcIiB1aS1zcmVmPVwiY29udGFjdHMuZGV0YWlsKHsgaWQ6IGNvbnRhY3QuaWQgfSlcIj5BbGljZTwvYT5cbiAqICAgICA8L2xpPlxuICogICAgIDxsaSBuZy1yZXBlYXQ9XCJjb250YWN0IGluIGNvbnRhY3RzXCI+XG4gKiAgICAgICAgIDxhIGhyZWY9XCIjL2NvbnRhY3RzLzNcIiB1aS1zcmVmPVwiY29udGFjdHMuZGV0YWlsKHsgaWQ6IGNvbnRhY3QuaWQgfSlcIj5Cb2I8L2E+XG4gKiAgICAgPC9saT5cbiAqIDwvdWw+XG4gKlxuICogPGEgdWktc3JlZj1cImhvbWVcIiB1aS1zcmVmLW9wdHM9XCJ7cmVsb2FkOiB0cnVlfVwiPkhvbWU8L2E+XG4gKiA8L3ByZT5cbiAqXG4gKiBAcGFyYW0ge3N0cmluZ30gdWktc3JlZiAnc3RhdGVOYW1lJyBjYW4gYmUgYW55IHZhbGlkIGFic29sdXRlIG9yIHJlbGF0aXZlIHN0YXRlXG4gKiBAcGFyYW0ge09iamVjdH0gdWktc3JlZi1vcHRzIG9wdGlvbnMgdG8gcGFzcyB0byB7QGxpbmsgdWkucm91dGVyLnN0YXRlLiRzdGF0ZSNnbyAkc3RhdGUuZ28oKX1cbiAqL1xuJFN0YXRlUmVmRGlyZWN0aXZlLiRpbmplY3QgPSBbJyRzdGF0ZScsICckdGltZW91dCddO1xuZnVuY3Rpb24gJFN0YXRlUmVmRGlyZWN0aXZlKCRzdGF0ZSwgJHRpbWVvdXQpIHtcbiAgdmFyIGFsbG93ZWRPcHRpb25zID0gWydsb2NhdGlvbicsICdpbmhlcml0JywgJ3JlbG9hZCcsICdhYnNvbHV0ZSddO1xuXG4gIHJldHVybiB7XG4gICAgcmVzdHJpY3Q6ICdBJyxcbiAgICByZXF1aXJlOiBbJz9edWlTcmVmQWN0aXZlJywgJz9edWlTcmVmQWN0aXZlRXEnXSxcbiAgICBsaW5rOiBmdW5jdGlvbihzY29wZSwgZWxlbWVudCwgYXR0cnMsIHVpU3JlZkFjdGl2ZSkge1xuICAgICAgdmFyIHJlZiA9IHBhcnNlU3RhdGVSZWYoYXR0cnMudWlTcmVmLCAkc3RhdGUuY3VycmVudC5uYW1lKTtcbiAgICAgIHZhciBwYXJhbXMgPSBudWxsLCB1cmwgPSBudWxsLCBiYXNlID0gc3RhdGVDb250ZXh0KGVsZW1lbnQpIHx8ICRzdGF0ZS4kY3VycmVudDtcbiAgICAgIC8vIFNWR0FFbGVtZW50IGRvZXMgbm90IHVzZSB0aGUgaHJlZiBhdHRyaWJ1dGUsIGJ1dCByYXRoZXIgdGhlICd4bGlua0hyZWYnIGF0dHJpYnV0ZS5cbiAgICAgIHZhciBocmVmS2luZCA9IE9iamVjdC5wcm90b3R5cGUudG9TdHJpbmcuY2FsbChlbGVtZW50LnByb3AoJ2hyZWYnKSkgPT09ICdbb2JqZWN0IFNWR0FuaW1hdGVkU3RyaW5nXScgP1xuICAgICAgICAgICAgICAgICAneGxpbms6aHJlZicgOiAnaHJlZic7XG4gICAgICB2YXIgbmV3SHJlZiA9IG51bGwsIGlzQW5jaG9yID0gZWxlbWVudC5wcm9wKFwidGFnTmFtZVwiKS50b1VwcGVyQ2FzZSgpID09PSBcIkFcIjtcbiAgICAgIHZhciBpc0Zvcm0gPSBlbGVtZW50WzBdLm5vZGVOYW1lID09PSBcIkZPUk1cIjtcbiAgICAgIHZhciBhdHRyID0gaXNGb3JtID8gXCJhY3Rpb25cIiA6IGhyZWZLaW5kLCBuYXYgPSB0cnVlO1xuXG4gICAgICB2YXIgb3B0aW9ucyA9IHsgcmVsYXRpdmU6IGJhc2UsIGluaGVyaXQ6IHRydWUgfTtcbiAgICAgIHZhciBvcHRpb25zT3ZlcnJpZGUgPSBzY29wZS4kZXZhbChhdHRycy51aVNyZWZPcHRzKSB8fCB7fTtcblxuICAgICAgYW5ndWxhci5mb3JFYWNoKGFsbG93ZWRPcHRpb25zLCBmdW5jdGlvbihvcHRpb24pIHtcbiAgICAgICAgaWYgKG9wdGlvbiBpbiBvcHRpb25zT3ZlcnJpZGUpIHtcbiAgICAgICAgICBvcHRpb25zW29wdGlvbl0gPSBvcHRpb25zT3ZlcnJpZGVbb3B0aW9uXTtcbiAgICAgICAgfVxuICAgICAgfSk7XG5cbiAgICAgIHZhciB1cGRhdGUgPSBmdW5jdGlvbihuZXdWYWwpIHtcbiAgICAgICAgaWYgKG5ld1ZhbCkgcGFyYW1zID0gYW5ndWxhci5jb3B5KG5ld1ZhbCk7XG4gICAgICAgIGlmICghbmF2KSByZXR1cm47XG5cbiAgICAgICAgbmV3SHJlZiA9ICRzdGF0ZS5ocmVmKHJlZi5zdGF0ZSwgcGFyYW1zLCBvcHRpb25zKTtcblxuICAgICAgICB2YXIgYWN0aXZlRGlyZWN0aXZlID0gdWlTcmVmQWN0aXZlWzFdIHx8IHVpU3JlZkFjdGl2ZVswXTtcbiAgICAgICAgaWYgKGFjdGl2ZURpcmVjdGl2ZSkge1xuICAgICAgICAgIGFjdGl2ZURpcmVjdGl2ZS4kJGFkZFN0YXRlSW5mbyhyZWYuc3RhdGUsIHBhcmFtcyk7XG4gICAgICAgIH1cbiAgICAgICAgaWYgKG5ld0hyZWYgPT09IG51bGwpIHtcbiAgICAgICAgICBuYXYgPSBmYWxzZTtcbiAgICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICAgIH1cbiAgICAgICAgYXR0cnMuJHNldChhdHRyLCBuZXdIcmVmKTtcbiAgICAgIH07XG5cbiAgICAgIGlmIChyZWYucGFyYW1FeHByKSB7XG4gICAgICAgIHNjb3BlLiR3YXRjaChyZWYucGFyYW1FeHByLCBmdW5jdGlvbihuZXdWYWwsIG9sZFZhbCkge1xuICAgICAgICAgIGlmIChuZXdWYWwgIT09IHBhcmFtcykgdXBkYXRlKG5ld1ZhbCk7XG4gICAgICAgIH0sIHRydWUpO1xuICAgICAgICBwYXJhbXMgPSBhbmd1bGFyLmNvcHkoc2NvcGUuJGV2YWwocmVmLnBhcmFtRXhwcikpO1xuICAgICAgfVxuICAgICAgdXBkYXRlKCk7XG5cbiAgICAgIGlmIChpc0Zvcm0pIHJldHVybjtcblxuICAgICAgZWxlbWVudC5iaW5kKFwiY2xpY2tcIiwgZnVuY3Rpb24oZSkge1xuICAgICAgICB2YXIgYnV0dG9uID0gZS53aGljaCB8fCBlLmJ1dHRvbjtcbiAgICAgICAgaWYgKCAhKGJ1dHRvbiA+IDEgfHwgZS5jdHJsS2V5IHx8IGUubWV0YUtleSB8fCBlLnNoaWZ0S2V5IHx8IGVsZW1lbnQuYXR0cigndGFyZ2V0JykpICkge1xuICAgICAgICAgIC8vIEhBQ0s6IFRoaXMgaXMgdG8gYWxsb3cgbmctY2xpY2tzIHRvIGJlIHByb2Nlc3NlZCBiZWZvcmUgdGhlIHRyYW5zaXRpb24gaXMgaW5pdGlhdGVkOlxuICAgICAgICAgIHZhciB0cmFuc2l0aW9uID0gJHRpbWVvdXQoZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICAkc3RhdGUuZ28ocmVmLnN0YXRlLCBwYXJhbXMsIG9wdGlvbnMpO1xuICAgICAgICAgIH0pO1xuICAgICAgICAgIGUucHJldmVudERlZmF1bHQoKTtcblxuICAgICAgICAgIC8vIGlmIHRoZSBzdGF0ZSBoYXMgbm8gVVJMLCBpZ25vcmUgb25lIHByZXZlbnREZWZhdWx0IGZyb20gdGhlIDxhPiBkaXJlY3RpdmUuXG4gICAgICAgICAgdmFyIGlnbm9yZVByZXZlbnREZWZhdWx0Q291bnQgPSBpc0FuY2hvciAmJiAhbmV3SHJlZiA/IDE6IDA7XG4gICAgICAgICAgZS5wcmV2ZW50RGVmYXVsdCA9IGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgaWYgKGlnbm9yZVByZXZlbnREZWZhdWx0Q291bnQtLSA8PSAwKVxuICAgICAgICAgICAgICAkdGltZW91dC5jYW5jZWwodHJhbnNpdGlvbik7XG4gICAgICAgICAgfTtcbiAgICAgICAgfVxuICAgICAgfSk7XG4gICAgfVxuICB9O1xufVxuXG4vKipcbiAqIEBuZ2RvYyBkaXJlY3RpdmVcbiAqIEBuYW1lIHVpLnJvdXRlci5zdGF0ZS5kaXJlY3RpdmU6dWktc3JlZi1hY3RpdmVcbiAqXG4gKiBAcmVxdWlyZXMgdWkucm91dGVyLnN0YXRlLiRzdGF0ZVxuICogQHJlcXVpcmVzIHVpLnJvdXRlci5zdGF0ZS4kc3RhdGVQYXJhbXNcbiAqIEByZXF1aXJlcyAkaW50ZXJwb2xhdGVcbiAqXG4gKiBAcmVzdHJpY3QgQVxuICpcbiAqIEBkZXNjcmlwdGlvblxuICogQSBkaXJlY3RpdmUgd29ya2luZyBhbG9uZ3NpZGUgdWktc3JlZiB0byBhZGQgY2xhc3NlcyB0byBhbiBlbGVtZW50IHdoZW4gdGhlXG4gKiByZWxhdGVkIHVpLXNyZWYgZGlyZWN0aXZlJ3Mgc3RhdGUgaXMgYWN0aXZlLCBhbmQgcmVtb3ZpbmcgdGhlbSB3aGVuIGl0IGlzIGluYWN0aXZlLlxuICogVGhlIHByaW1hcnkgdXNlLWNhc2UgaXMgdG8gc2ltcGxpZnkgdGhlIHNwZWNpYWwgYXBwZWFyYW5jZSBvZiBuYXZpZ2F0aW9uIG1lbnVzXG4gKiByZWx5aW5nIG9uIGB1aS1zcmVmYCwgYnkgaGF2aW5nIHRoZSBcImFjdGl2ZVwiIHN0YXRlJ3MgbWVudSBidXR0b24gYXBwZWFyIGRpZmZlcmVudCxcbiAqIGRpc3Rpbmd1aXNoaW5nIGl0IGZyb20gdGhlIGluYWN0aXZlIG1lbnUgaXRlbXMuXG4gKlxuICogdWktc3JlZi1hY3RpdmUgY2FuIGxpdmUgb24gdGhlIHNhbWUgZWxlbWVudCBhcyB1aS1zcmVmIG9yIG9uIGEgcGFyZW50IGVsZW1lbnQuIFRoZSBmaXJzdFxuICogdWktc3JlZi1hY3RpdmUgZm91bmQgYXQgdGhlIHNhbWUgbGV2ZWwgb3IgYWJvdmUgdGhlIHVpLXNyZWYgd2lsbCBiZSB1c2VkLlxuICpcbiAqIFdpbGwgYWN0aXZhdGUgd2hlbiB0aGUgdWktc3JlZidzIHRhcmdldCBzdGF0ZSBvciBhbnkgY2hpbGQgc3RhdGUgaXMgYWN0aXZlLiBJZiB5b3VcbiAqIG5lZWQgdG8gYWN0aXZhdGUgb25seSB3aGVuIHRoZSB1aS1zcmVmIHRhcmdldCBzdGF0ZSBpcyBhY3RpdmUgYW5kICpub3QqIGFueSBvZlxuICogaXQncyBjaGlsZHJlbiwgdGhlbiB5b3Ugd2lsbCB1c2VcbiAqIHtAbGluayB1aS5yb3V0ZXIuc3RhdGUuZGlyZWN0aXZlOnVpLXNyZWYtYWN0aXZlLWVxIHVpLXNyZWYtYWN0aXZlLWVxfVxuICpcbiAqIEBleGFtcGxlXG4gKiBHaXZlbiB0aGUgZm9sbG93aW5nIHRlbXBsYXRlOlxuICogPHByZT5cbiAqIDx1bD5cbiAqICAgPGxpIHVpLXNyZWYtYWN0aXZlPVwiYWN0aXZlXCIgY2xhc3M9XCJpdGVtXCI+XG4gKiAgICAgPGEgaHJlZiB1aS1zcmVmPVwiYXBwLnVzZXIoe3VzZXI6ICdiaWxib2JhZ2dpbnMnfSlcIj5AYmlsYm9iYWdnaW5zPC9hPlxuICogICA8L2xpPlxuICogPC91bD5cbiAqIDwvcHJlPlxuICpcbiAqXG4gKiBXaGVuIHRoZSBhcHAgc3RhdGUgaXMgXCJhcHAudXNlclwiIChvciBhbnkgY2hpbGRyZW4gc3RhdGVzKSwgYW5kIGNvbnRhaW5zIHRoZSBzdGF0ZSBwYXJhbWV0ZXIgXCJ1c2VyXCIgd2l0aCB2YWx1ZSBcImJpbGJvYmFnZ2luc1wiLFxuICogdGhlIHJlc3VsdGluZyBIVE1MIHdpbGwgYXBwZWFyIGFzIChub3RlIHRoZSAnYWN0aXZlJyBjbGFzcyk6XG4gKiA8cHJlPlxuICogPHVsPlxuICogICA8bGkgdWktc3JlZi1hY3RpdmU9XCJhY3RpdmVcIiBjbGFzcz1cIml0ZW0gYWN0aXZlXCI+XG4gKiAgICAgPGEgdWktc3JlZj1cImFwcC51c2VyKHt1c2VyOiAnYmlsYm9iYWdnaW5zJ30pXCIgaHJlZj1cIi91c2Vycy9iaWxib2JhZ2dpbnNcIj5AYmlsYm9iYWdnaW5zPC9hPlxuICogICA8L2xpPlxuICogPC91bD5cbiAqIDwvcHJlPlxuICpcbiAqIFRoZSBjbGFzcyBuYW1lIGlzIGludGVycG9sYXRlZCAqKm9uY2UqKiBkdXJpbmcgdGhlIGRpcmVjdGl2ZXMgbGluayB0aW1lIChhbnkgZnVydGhlciBjaGFuZ2VzIHRvIHRoZVxuICogaW50ZXJwb2xhdGVkIHZhbHVlIGFyZSBpZ25vcmVkKS5cbiAqXG4gKiBNdWx0aXBsZSBjbGFzc2VzIG1heSBiZSBzcGVjaWZpZWQgaW4gYSBzcGFjZS1zZXBhcmF0ZWQgZm9ybWF0OlxuICogPHByZT5cbiAqIDx1bD5cbiAqICAgPGxpIHVpLXNyZWYtYWN0aXZlPSdjbGFzczEgY2xhc3MyIGNsYXNzMyc+XG4gKiAgICAgPGEgdWktc3JlZj1cImFwcC51c2VyXCI+bGluazwvYT5cbiAqICAgPC9saT5cbiAqIDwvdWw+XG4gKiA8L3ByZT5cbiAqL1xuXG4vKipcbiAqIEBuZ2RvYyBkaXJlY3RpdmVcbiAqIEBuYW1lIHVpLnJvdXRlci5zdGF0ZS5kaXJlY3RpdmU6dWktc3JlZi1hY3RpdmUtZXFcbiAqXG4gKiBAcmVxdWlyZXMgdWkucm91dGVyLnN0YXRlLiRzdGF0ZVxuICogQHJlcXVpcmVzIHVpLnJvdXRlci5zdGF0ZS4kc3RhdGVQYXJhbXNcbiAqIEByZXF1aXJlcyAkaW50ZXJwb2xhdGVcbiAqXG4gKiBAcmVzdHJpY3QgQVxuICpcbiAqIEBkZXNjcmlwdGlvblxuICogVGhlIHNhbWUgYXMge0BsaW5rIHVpLnJvdXRlci5zdGF0ZS5kaXJlY3RpdmU6dWktc3JlZi1hY3RpdmUgdWktc3JlZi1hY3RpdmV9IGJ1dCB3aWxsIG9ubHkgYWN0aXZhdGVcbiAqIHdoZW4gdGhlIGV4YWN0IHRhcmdldCBzdGF0ZSB1c2VkIGluIHRoZSBgdWktc3JlZmAgaXMgYWN0aXZlOyBubyBjaGlsZCBzdGF0ZXMuXG4gKlxuICovXG4kU3RhdGVSZWZBY3RpdmVEaXJlY3RpdmUuJGluamVjdCA9IFsnJHN0YXRlJywgJyRzdGF0ZVBhcmFtcycsICckaW50ZXJwb2xhdGUnXTtcbmZ1bmN0aW9uICRTdGF0ZVJlZkFjdGl2ZURpcmVjdGl2ZSgkc3RhdGUsICRzdGF0ZVBhcmFtcywgJGludGVycG9sYXRlKSB7XG4gIHJldHVybiAge1xuICAgIHJlc3RyaWN0OiBcIkFcIixcbiAgICBjb250cm9sbGVyOiBbJyRzY29wZScsICckZWxlbWVudCcsICckYXR0cnMnLCBmdW5jdGlvbiAoJHNjb3BlLCAkZWxlbWVudCwgJGF0dHJzKSB7XG4gICAgICB2YXIgc3RhdGVzID0gW10sIGFjdGl2ZUNsYXNzO1xuXG4gICAgICAvLyBUaGVyZSBwcm9iYWJseSBpc24ndCBtdWNoIHBvaW50IGluICRvYnNlcnZpbmcgdGhpc1xuICAgICAgLy8gdWlTcmVmQWN0aXZlIGFuZCB1aVNyZWZBY3RpdmVFcSBzaGFyZSB0aGUgc2FtZSBkaXJlY3RpdmUgb2JqZWN0IHdpdGggc29tZVxuICAgICAgLy8gc2xpZ2h0IGRpZmZlcmVuY2UgaW4gbG9naWMgcm91dGluZ1xuICAgICAgYWN0aXZlQ2xhc3MgPSAkaW50ZXJwb2xhdGUoJGF0dHJzLnVpU3JlZkFjdGl2ZUVxIHx8ICRhdHRycy51aVNyZWZBY3RpdmUgfHwgJycsIGZhbHNlKSgkc2NvcGUpO1xuXG4gICAgICAvLyBBbGxvdyB1aVNyZWYgdG8gY29tbXVuaWNhdGUgd2l0aCB1aVNyZWZBY3RpdmVbRXF1YWxzXVxuICAgICAgdGhpcy4kJGFkZFN0YXRlSW5mbyA9IGZ1bmN0aW9uIChuZXdTdGF0ZSwgbmV3UGFyYW1zKSB7XG4gICAgICAgIHZhciBzdGF0ZSA9ICRzdGF0ZS5nZXQobmV3U3RhdGUsIHN0YXRlQ29udGV4dCgkZWxlbWVudCkpO1xuXG4gICAgICAgIHN0YXRlcy5wdXNoKHtcbiAgICAgICAgICBzdGF0ZTogc3RhdGUgfHwgeyBuYW1lOiBuZXdTdGF0ZSB9LFxuICAgICAgICAgIHBhcmFtczogbmV3UGFyYW1zXG4gICAgICAgIH0pO1xuXG4gICAgICAgIHVwZGF0ZSgpO1xuICAgICAgfTtcblxuICAgICAgJHNjb3BlLiRvbignJHN0YXRlQ2hhbmdlU3VjY2VzcycsIHVwZGF0ZSk7XG5cbiAgICAgIC8vIFVwZGF0ZSByb3V0ZSBzdGF0ZVxuICAgICAgZnVuY3Rpb24gdXBkYXRlKCkge1xuICAgICAgICBpZiAoYW55TWF0Y2goKSkge1xuICAgICAgICAgICRlbGVtZW50LmFkZENsYXNzKGFjdGl2ZUNsYXNzKTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAkZWxlbWVudC5yZW1vdmVDbGFzcyhhY3RpdmVDbGFzcyk7XG4gICAgICAgIH1cbiAgICAgIH1cblxuICAgICAgZnVuY3Rpb24gYW55TWF0Y2goKSB7XG4gICAgICAgIGZvciAodmFyIGkgPSAwOyBpIDwgc3RhdGVzLmxlbmd0aDsgaSsrKSB7XG4gICAgICAgICAgaWYgKGlzTWF0Y2goc3RhdGVzW2ldLnN0YXRlLCBzdGF0ZXNbaV0ucGFyYW1zKSkge1xuICAgICAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgIH1cblxuICAgICAgZnVuY3Rpb24gaXNNYXRjaChzdGF0ZSwgcGFyYW1zKSB7XG4gICAgICAgIGlmICh0eXBlb2YgJGF0dHJzLnVpU3JlZkFjdGl2ZUVxICE9PSAndW5kZWZpbmVkJykge1xuICAgICAgICAgIHJldHVybiAkc3RhdGUuaXMoc3RhdGUubmFtZSwgcGFyYW1zKTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICByZXR1cm4gJHN0YXRlLmluY2x1ZGVzKHN0YXRlLm5hbWUsIHBhcmFtcyk7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9XVxuICB9O1xufVxuXG5hbmd1bGFyLm1vZHVsZSgndWkucm91dGVyLnN0YXRlJylcbiAgLmRpcmVjdGl2ZSgndWlTcmVmJywgJFN0YXRlUmVmRGlyZWN0aXZlKVxuICAuZGlyZWN0aXZlKCd1aVNyZWZBY3RpdmUnLCAkU3RhdGVSZWZBY3RpdmVEaXJlY3RpdmUpXG4gIC5kaXJlY3RpdmUoJ3VpU3JlZkFjdGl2ZUVxJywgJFN0YXRlUmVmQWN0aXZlRGlyZWN0aXZlKTtcblxuLyoqXG4gKiBAbmdkb2MgZmlsdGVyXG4gKiBAbmFtZSB1aS5yb3V0ZXIuc3RhdGUuZmlsdGVyOmlzU3RhdGVcbiAqXG4gKiBAcmVxdWlyZXMgdWkucm91dGVyLnN0YXRlLiRzdGF0ZVxuICpcbiAqIEBkZXNjcmlwdGlvblxuICogVHJhbnNsYXRlcyB0byB7QGxpbmsgdWkucm91dGVyLnN0YXRlLiRzdGF0ZSNtZXRob2RzX2lzICRzdGF0ZS5pcyhcInN0YXRlTmFtZVwiKX0uXG4gKi9cbiRJc1N0YXRlRmlsdGVyLiRpbmplY3QgPSBbJyRzdGF0ZSddO1xuZnVuY3Rpb24gJElzU3RhdGVGaWx0ZXIoJHN0YXRlKSB7XG4gIHZhciBpc0ZpbHRlciA9IGZ1bmN0aW9uIChzdGF0ZSkge1xuICAgIHJldHVybiAkc3RhdGUuaXMoc3RhdGUpO1xuICB9O1xuICBpc0ZpbHRlci4kc3RhdGVmdWwgPSB0cnVlO1xuICByZXR1cm4gaXNGaWx0ZXI7XG59XG5cbi8qKlxuICogQG5nZG9jIGZpbHRlclxuICogQG5hbWUgdWkucm91dGVyLnN0YXRlLmZpbHRlcjppbmNsdWRlZEJ5U3RhdGVcbiAqXG4gKiBAcmVxdWlyZXMgdWkucm91dGVyLnN0YXRlLiRzdGF0ZVxuICpcbiAqIEBkZXNjcmlwdGlvblxuICogVHJhbnNsYXRlcyB0byB7QGxpbmsgdWkucm91dGVyLnN0YXRlLiRzdGF0ZSNtZXRob2RzX2luY2x1ZGVzICRzdGF0ZS5pbmNsdWRlcygnZnVsbE9yUGFydGlhbFN0YXRlTmFtZScpfS5cbiAqL1xuJEluY2x1ZGVkQnlTdGF0ZUZpbHRlci4kaW5qZWN0ID0gWyckc3RhdGUnXTtcbmZ1bmN0aW9uICRJbmNsdWRlZEJ5U3RhdGVGaWx0ZXIoJHN0YXRlKSB7XG4gIHZhciBpbmNsdWRlc0ZpbHRlciA9IGZ1bmN0aW9uIChzdGF0ZSkge1xuICAgIHJldHVybiAkc3RhdGUuaW5jbHVkZXMoc3RhdGUpO1xuICB9O1xuICBpbmNsdWRlc0ZpbHRlci4kc3RhdGVmdWwgPSB0cnVlO1xuICByZXR1cm4gIGluY2x1ZGVzRmlsdGVyO1xufVxuXG5hbmd1bGFyLm1vZHVsZSgndWkucm91dGVyLnN0YXRlJylcbiAgLmZpbHRlcignaXNTdGF0ZScsICRJc1N0YXRlRmlsdGVyKVxuICAuZmlsdGVyKCdpbmNsdWRlZEJ5U3RhdGUnLCAkSW5jbHVkZWRCeVN0YXRlRmlsdGVyKTtcbn0pKHdpbmRvdywgd2luZG93LmFuZ3VsYXIpOyJdLCJmaWxlIjoiYW5ndWxhci11aS1yb3V0ZXIuanMiLCJzb3VyY2VSb290IjoiL3NvdXJjZS8ifQ==