(function() {
  'use strict';

  angular.module('pages').controller('PagesController', function($stateParams, GetPageFactory) {
    var vm = this;

    GetPageFactory.get({pageSlug: $stateParams.pageSlug}, function(data) {
      vm.title = data.title;
      vm.content = data.content;
    }, function() {
      console.log('error');
    });
  });

})();