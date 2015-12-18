/**
 * Grafana Datasource Plugin for PRTG API Interface (ALPHA)
 * Datasource Definition
 * 20151206 03:10 Jason Lashua
 * Proof of Concept. Based on publicly available plugins.
 */
'use strict';
define([
  'angular',
  'lodash',
  'app/core/utils/datemath',
  './directives',
  './api_wrapper',
  './query_ctrl'
],
function (angular, _, dateMath)
{
    var module = angular.module('grafana.services');

    module.factory('PRTGAPIDataSource', function($q, backendSrv, templateSrv, alertSrv, PRTGAPI)
    {
        /**
         * PRTG Datasource
         * 
         * @param {object} Grafana Datasource Object
         */
        function PRTGAPIDataSource(datasource)
        {
            this.name =     datasource.name;
            this.url =      datasource.url;
            this.username = datasource.jsonData.prtgApiUser;
            this.password = datasource.jsonData.prtgApiPassword;
            this.useCache = datasource.jsonData.useCache || false;
            this.cacheTimeoutMintues = datasource.jsonData.cacheTimeoutMinutes || 5;
            this.limitmetrics = datasource.meta.limitmetrics || 100;
            this.prtgAPI = new PRTGAPI(this.url, this.username, this.password, this.useCache, this.cacheTimeoutMintues);
        }
        
        /**
         * Test the datasource
         */
        PRTGAPIDataSource.prototype.testDatasource = function() {
            var self = this;
            return this.prtgAPI.getVersion().then(function (apiVersion) {
                return self.prtgAPI.performPRTGAPILogin().then(function (auth) {
                    return {
                        status: "success",
                        title: "Success",
                        message: "PRTG API version: " + apiVersion
                        };
                });
            }, function(error) {
                console.log(JSON.stringify(error,null,4));
                return {
                    status: "error",
                    title: error.status + ": " + error.statusText,
                    message: error.config.url
                };
            });
        };
    
        
        /**
         * Data Source Query
         * returns timeseries array of values
         * 
         * @param {object} options; Dataset Options including targets, etc.
         * @return [array]
         */
        PRTGAPIDataSource.prototype.query = function(options) {
            var from = Math.ceil(dateMath.parse(options.range.from) / 1000);
            var to = Math.ceil(dateMath.parse(options.range.to) / 1000);

            var self = this;
            var promises = _.map(options.targets, function(target) {
                if (target.hide || !target.group || !target.device || !target.channel || !target.sensor) {
                    return [];
                }
                
                //in the first release which didn't have template support, I chose numeric id's. this caused problems for templateSrv.replace.  
                try {
                    var group = templateSrv.replace(target.group.name);
                    var device   = templateSrv.replace(target.device.name);
                    var sensor   = templateSrv.replace(target.sensor.name);
                    var channel  = templateSrv.replace(target.channel.name);
                } catch (e) {
                    var d = $q.defer();
                    var err = "<p style=\"font-size: 150%; font-weight: bold;\">One or more target's name is not a string!</p><p>All target names should be strings. This should never happen. Your targets were:<br><b>Group:</b> " + target.group.name + "<br><b>Device:</b> " + target.device.name + "<br><b>Sensor:</b> " + target.sensor.name + "<br><b>Channel:</b> " + target.channel.name + "</p>";
                    d.reject({message: err});
                    return d.promise;
                }
                
                return self.prtgAPI.getValues(device, sensor, channel, from, to).then(function (values) {                
                    var timeseries = {target:target.channel.visible_name, datapoints: values};
                    return timeseries;
                });
                
            
            }, this);
            
            return $q.all(_.flatten(promises)).then(function (results) {
                return {data: results};
            });
        }
        
        PRTGAPIDataSource.prototype.annotationQuery = function(options) {
            var from = Math.ceil(dateMath.parse(options.range.from) / 1000);
            var to = Math.ceil(dateMath.parse(options.range.to) / 1000);
            return this.prtgAPI.getMessages(from, to, options.annotation.sensorId).then(function (messages)
            {
                _.each(messages, function (message)
                {
                    message.annotation = options.annotation; //inject the annotation into the object
                }, this);
                return messages;
            });
        }

        /* Find Metrics from templated variables
         *
         * channel templates are limited to lookup by sensor's numeric ID.
         *
         * @param query Query string:
         * channel:sensor=####
         * sensor:device=$device or * or numeric ID
         * device:group=$group or * or numeric ID
         * group:* or name
         */
        PRTGAPIDataSource.prototype.metricFindQuery = function(query)
        {
            if (!query.match(/(channel|sensor|device|group):(\*)|(tags|sensor|device|group)=([\$\sa-zA-Z0-9-_]+)/i)) {
                var d = $q.defer();
                d.reject("Syntax Error: Expected pattern matching /(sensors|devices|groups):(\*)|(tags|device|group)=([a-zA-Z0-9]+)/i")
                return d.promise;
            }
            var a = query.split(':');
            if (a[0] == "channel") {
                var b = a[1].split('=');
                var params = "&content=channels&columns=name&id=" + b[1];
                a[0]="name";
            } else {
                var params="&content=" + a[0] + "s";
                if (a[1] !== '*') {
                    var params = params + "&filter_" + templateSrv.replace(a[1]);
                }
            }
            return this.prtgAPI.performPRTGAPIRequest('table.json', params).then(function (results) {
                return _.map(results, function(res) {
                    return {text: res[a[0]], expandable:0}
                }, this);
            });
            
        }
        
        return PRTGAPIDataSource;
    });
});


