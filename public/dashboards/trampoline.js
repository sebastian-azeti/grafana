/* global _ */

/*
 * Trampoline - Inject externally-loaded dashboard model into Grafana.
 *
 * Make Grafana show a dashboard provided from an externally-loaded JSON model.
 * To use, have the path for the Grafana URL be:
 *
 *   /dashboard/script/trampoline.js?url=URL_WITH_DASHBOARD_JSON
 * 
 * URL_WITH_DASHBOARD_JSON is a URL that returns the JSON for the dashboard
 * to display. Because of Cross-origin Resource Sharing (CORS) issues, 
 * the server serving URL_WITH_DASHBOARD_JSON will need to return the 
 * appropriate CORS header (Access-Control-Allow-Origin).
 */

// accessible variables in this scope
var window, document, ARGS, $, jQuery, moment, kbn;

return function(callback) {
  $.ajax({
    url: ARGS['url'],
    method: 'GET',
    success: function(data) {
      callback(data);
    }
  });
};

