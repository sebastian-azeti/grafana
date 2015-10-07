define([
  'angular',
  'lodash',
  './directives',
  './query_ctrl',
],
function (angular, _) {
  'use strict';

  var module = angular.module('grafana.services');

  module.factory('JsonDatasource', ['$q', '$http', 'backendSrv', 'templateSrv', function($q, $http, backendSrv, templateSrv) {
    function JsonDatasource(datasource) {
      var self = this;

      console.log({datasource: datasource});
      this.url = datasource.url;
      this.endpointsList = datasource.jsonData.endpoints;

      this.endpoints = {};
      _.each(this.endpointsList, function(endpoint) {
        self.endpoints[endpoint.name] = endpoint;
      });
    }

    JsonDatasource.prototype._endpointRequest = function(endpoint, context) {
      if (endpoint.access === "direct") {
        var options = {
          url: templateSrv.replace(endpoint.url, context),
          method: endpoint.method || 'GET',
        };

        if (endpoint.basicAuth) {
          options.withCredentials = true;
          options.headers = {
            "Authorization": this.basicAuth
          };
        }

        console.log({options: options});
        return $http(options);
      } else if (endpoint.access === "proxy") {
        var simpleContext = {};
        _.each(context, function(value, key) {
          simpleContext[key] = value.value.toString();
        });
        var data = {
          name: endpoint.name,
          context: simpleContext
        };
        return backendSrv.post(this.url, data);
      } else {
        return $q.reject("Unknown access mode: " + endpoint.access);
      }
    };

    JsonDatasource.prototype.convertTimeValue = function(when, whenType) {
      if (whenType === 'epoch_ms') {
        return Math.round(when.valueOf());
      } else if (whenType === 'epoch_seconds') {
        return Math.round(when.valueOf() / 1000.0);
      } else if (whenType === 'iso8601') {
        return when.toJSON();
      } else {
        throw "Unknown time conversion type: " + whenType;
      }
    };

    // Query for metric targets within the specified time range.
    // Returns the promise of a result dictionary. See the convertResponse comment
    // for specifics of the result dictionary.
    JsonDatasource.prototype.query = function(queryOptions) {
      var self = this;

      var targetPromises = _(queryOptions.targets)
        .filter(function(target) { return target.target.length > 0 && !target.hide; })
        .map(function(target) {
          var endpoint = self.endpoints[target.target];
          var from = self.convertTimeValue(queryOptions.range.from, endpoint.timeFormat);
          var to = self.convertTimeValue(queryOptions.range.to, endpoint.timeFormat);
          var context = {
            from: {value: from},
            to: {value: to},
          };
          return self._endpointRequest(endpoint, context);
        })
        .value();

      return $q.all(targetPromises).then(function(responses) {
        console.log({responses: responses});

        var result = {data: []};
        _.each(responses, function(response) {
          _.each(response.data.data, function(timeseries) {
            result.data.push(timeseries);
          });
        });

        return result;
      });
    };

    return JsonDatasource;
  }]);
});
