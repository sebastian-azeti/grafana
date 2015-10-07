define([
  'angular',
],
function (angular) {
  'use strict';

  var module = angular.module('grafana.directives');

  module.directive('metricQueryEditorJson', function() {
    return {controller: 'JsonQueryCtrl', templateUrl: 'app/plugins/datasource/json/partials/query.editor.html'};
  });

  // module.directive('metricQueryOptionsJson', function() {
  //   return {templateUrl: 'app/plugins/datasource/json/partials/query.options.html'};
  // });

});
