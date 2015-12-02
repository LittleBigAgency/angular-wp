(function() {
  'use strict';

  angular.module('nike-plus').controller('NikePlusController', ['$stateParams', 'GetPostsByTypeFactory', function($stateParams, GetPostsByTypeFactory) {
    var vm = this;

    GetPostsByTypeFactory.query({postType: 'nikeplus_runs'}, function(data) {
      vm.title = data.title;
      vm.content = data.content;
    }, function() {
      console.log('error');
    });
  }]);

})();