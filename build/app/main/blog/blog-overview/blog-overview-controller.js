(function() {
  'use strict';

  angular.module('blog').controller('BlogOverviewController', ['$stateParams', 'GetPostsFactory', 'GetCurrentUserFactory', function($stateParams, GetPostsFactory, GetCurrentUserFactory) {
    var vm = this;

    GetPostsFactory.query().$promise.then(function(data) {
      vm.posts = data;
    }, function(error) {
      console.log(error);
    });

    GetCurrentUserFactory.get();
  }]);

})();