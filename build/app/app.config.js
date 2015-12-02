(function() {
  'use strict';

  /**
   *  Application config
   */
  angular.module('littleBigApplication').config(['$urlRouterProvider', '$locationProvider', '$httpProvider', '$translateProvider', function($urlRouterProvider, $locationProvider, $httpProvider, $translateProvider) {

    /** 
     *  Default route
     **/
    // $urlRouterProvider.otherwise('/page/homepage');

    /**
     *  Html5 mode
     **/
    $locationProvider.html5Mode(true);

    /**
     *  Add the interceptor to the $httpProvider.
     **/
    $httpProvider.interceptors.push('HttpInterceptor');

    /**
     *  Translation language
     **/
    $translateProvider.preferredLanguage('en');
  }]);

  /**
   *  HttpInterceptor
   **/
  angular.module('littleBigApplication').factory('HttpInterceptor', ['$q', '$rootScope', '$timeout', function($q, $rootScope, $timeout) {
    return {
      // On request success
      request: function (config) {
        $rootScope.$emit('lbaContentLoader.activate');
        // console.log(config); // Contains the data about the request before it is sent.

        // Return the config or wrap it in a promise if blank.
        return config || $q.when(config);
      },

      // On request failure
      requestError: function (rejection) {
        $timeout(function() {
          $rootScope.$emit('lbaContentLoader.deactivate');
        }, 1000);
        // console.log(rejection); // Contains the data about the error on the request.
        
        // Return the promise rejection.
        return $q.reject(rejection);
      },

      // On response success
      response: function (response) {
        $timeout(function() {
          $rootScope.$emit('lbaContentLoader.deactivate');
        }, 1000);
        // console.log(response); // Contains the data from the response.
        
        // Return the response or promise.
        return response || $q.when(response);
      },

      // On response failture
      responseError: function (rejection) {
        $timeout(function() {
          $rootScope.$emit('lbaContentLoader.deactivate');
        }, 1000);
        // console.log(rejection); // Contains the data about the error.
        
        // Return the promise rejection.
        return $q.reject(rejection);
      }
    };
  }]);
  
})();