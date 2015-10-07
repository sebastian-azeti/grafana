package api

import (
	"encoding/json"
	"fmt"
	"net/http"
	"net/http/httputil"
	"net/url"
	"io/ioutil"
	"strings"

	"github.com/grafana/grafana/pkg/log"
	"github.com/grafana/grafana/pkg/middleware"
	m "github.com/grafana/grafana/pkg/models"
	"github.com/grafana/grafana/pkg/util"
)

type dataRequest struct {
		Name string `json:"name"`
		Context map[string]string `json:"context"`
}

type endpointConfig struct {
	Name string `json:"name"`
	Url string `json:"url"`
	Method string `json:"method"`
	Access string `json:"access"`
	TimeFormat string `json:"timeFormat"`
	BasicAuth         bool `json:"basicAuth"`
	BasicAuthUser     string `json:"basicAuthUser"`
	BasicAuthPassword string `json:"basicAuthPassword"`
}

// Proxy any URL configured for as a JSON endpoint.
func ProxyJsonDataSourceRequest(ds *m.DataSource, c *middleware.Context) {
	body, _ := ioutil.ReadAll(c.Req.Request.Body)

	var dataReq dataRequest 
	json.Unmarshal([]byte(body), &dataReq)

	log.Info("dataReq = %v", dataReq)
	log.Info("endpoints = %v", ds.JsonData["endpoints"])

	rawConfigs := ds.JsonData["endpoints"].([]interface{})

	var theConfig map[string]interface{}
	for _, rawConfig := range rawConfigs {
		log.Info("rawConfig = %v", rawConfig)
		config := rawConfig.(map[string]interface{})
		if dataReq.Name == config["name"].(string) {
			theConfig = config
			break
		}
	}

	updatedUrl := theConfig["url"].(string)
	for key, value := range dataReq.Context {
		var replacementKey = fmt.Sprintf("$%v", key)
		updatedUrl = strings.Replace(updatedUrl, replacementKey, value, -1)
	}

	log.Info("updatedUrl = %s", updatedUrl)

	targetUrl, _ := url.Parse(updatedUrl)

	director := func(req *http.Request) {
		req.URL.Scheme = targetUrl.Scheme
		req.URL.Host = targetUrl.Host
		req.Host = targetUrl.Host
		req.URL.Path = targetUrl.Path

		if theConfig["basicAuth"].(bool) {
			req.Header.Del("Authorization")
			req.Header.Add("Authorization", util.GetBasicAuthHeader(theConfig["basicAuthUser"].(string), theConfig["basicAuthPassword"].(string)))
		}

		// clear cookie headers
		req.Header.Del("Cookie")
		req.Header.Del("Set-Cookie")
	}

	proxy := httputil.ReverseProxy{Director: director}
	proxy.Transport = dataProxyTransport
	proxy.ServeHTTP(c.RW(), c.Req.Request)
}
