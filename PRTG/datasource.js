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
        
        PRTGAPIDataSource.prototype.testDatasource = function() {
            var self = this;
            return this.prtgAPI.getVersion().then(function (apiVersion) {
                return self.prtgAPI.performPRTGAPILogin().then(function (auth) {
                    if (auth) {
                        return {
                            status: "success",
                            title: "Success",
                            message: "PRTG API version: " + apiVersion
                            };
                    } else {
                        return {
                            status: "error",
                            title: "Invalid user name or password",
                            message: "PRTG API version: " + apiVersion
                            };
                    }
                });
            }, function(error) {
                return {
                    status: "error",
                    title: "Connection failed",
                    message: "Could not connect to " + error.config.url
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
                // normally, we only need sensor ID and channel ID. However, strings are used when templating.
                try {
                    var group = templateSrv.replace(target.group.name);
                } catch (e) {
                }
                
                try {
                    var device   = templateSrv.replace(target.device.name);
                } catch (e) {
                }
                
                try {
                    var sensor   = templateSrv.replace(target.sensor.name);
                } catch (e) {
                }
                
                try {
                    var channel  = templateSrv.replace(target.channel.name);
                } catch (e) {
                }

                
                return self.prtgAPI.getValues(device, sensor, channel, from, to).then(function (values) {                
                //var alias = channel === 'All' || sensor.length > 1 ? undefined : target.alias;
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
        
        PRTGAPIDataSource.prototype.metricFindQuery = function(query)
        {
            /**
             * sensor:*|(tags|device|group)=query
             * device:*|(tags|device|group)=query
             * group:*|(tags|group) = query
             * channel:sensor=([\d]+)
             */
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


