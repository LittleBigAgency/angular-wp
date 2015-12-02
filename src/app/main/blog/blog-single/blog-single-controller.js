(function() {
  'use strict';

  angular.module('blog').controller('BlogSingleController', function($stateParams, GetPostsBySlugFactory) {
    var vm = this;

    GetPostsBySlugFactory.query({postSlug: $stateParams.postSlug}).$promise.then(function(data) {
      vm.post = data[0];
    }, function(error) {
      console.log(error);
    });
  });

})();