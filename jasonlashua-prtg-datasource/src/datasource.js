import _ from 'lodash';
import * as dateMath from 'app/core/utils/datemath';
import './PRTGAPIService';

export class PRTGDataSource {
    
    /** @ngInject */
    constructor(instanceSettings, $q, templateSrv, alertSrv, PRTGAPIService) {
        /**
        * PRTG Datasource
        * 
        * @param {object} Grafana Datasource Object
        */
        
        this.name =     instanceSettings.name;
        this.url =      instanceSettings.url;
        this.username = instanceSettings.jsonData.prtgApiUser;
        this.password = instanceSettings.jsonData.prtgApiPassword;
        this.useCache = instanceSettings.jsonData.useCache || false;
        this.cacheTimeoutMintues = instanceSettings.jsonData.cacheTimeoutMinutes || 5;
        this.limitmetrics = instanceSettings.meta.limitmetrics || 100;
        this.prtgAPI = new PRTGAPIService(this.url, this.username, this.password, this.useCache, this.cacheTimeoutMintues);
        this.q = $q;
        this.templateSrv = templateSrv;
        this.alertServ = alertSrv;
        console.log("hello");
    }

            /**
         * Test the datasource
         */
        testDatasource() {
            var self = this;
            return this.prtgAPI.getVersion().then(function (apiVersion) {
                return self.prtgAPI.performPRTGAPILogin().then(function () {
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
                    message: ""//error.config.url
                };
            });
        }
    
        
        /**
         * Data Source Query
         * returns timeseries array of values
         * 
         * @param {object} options; Dataset Options including targets, etc.
         * @return [array]
         */
        query(options) {
            var from = Math.ceil(dateMath.parse(options.range.from) / 1000);
            var to = Math.ceil(dateMath.parse(options.range.to) / 1000);

            var self = this;
            var promises = _.map(options.targets, function(target) {
                if (target.hide || !target.group || !target.device || !target.channel || !target.sensor) {
                    return [];
                }
                
                var device, group, sensor, channel = "";
                //in the first release which didn't have template support, I chose numeric id's. this caused problems for templateSrv.replace.  
                try {
                    group = this.templateSrv.replace(target.group.name);
                    device   = this.templateSrv.replace(target.device.name);
                    sensor   = this.templateSrv.replace(target.sensor.name);
                    channel  = this.templateSrv.replace(target.channel.name);
                } catch (e) {
                    var d = this.q.defer();
                    var err = "<p style=\"font-size: 150%; font-weight: bold;\">One or more target's name is not a string!</p><p>All target names should be strings. This should never happen. Your targets were:<br><b>Group:</b> " + target.group.name + "<br><b>Device:</b> " + target.device.name + "<br><b>Sensor:</b> " + target.sensor.name + "<br><b>Channel:</b> " + target.channel.name + "</p>";
                    d.reject({message: err});
                    return d.promise;
                }
                
                return self.prtgAPI.getValues(device, sensor, channel, from, to).then(function (values) {                
                    var timeseries = {target:target.channel.visible_name, datapoints: values};
                    return timeseries;
                });
                
            
            }, this);
            
            return this.q.all(_.flatten(promises)).then(function (results) {
                return {data: results};
            });
        }
        
       annotationQuery (options) {
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
        metricFindQuery (query) {
            if (!query.match(/(channel|sensor|device|group):(\*)|(tags|sensor|device|group)=([\$\sa-zA-Z0-9-_]+)/i)) {
                var d = this.q.defer();
                d.reject("Syntax Error: Expected pattern matching /(sensors|devices|groups):(\*)|(tags|device|group)=([a-zA-Z0-9]+)/i");
                return d.promise;
            }
            var params = "";
            var a = query.split(':');
            if (a[0] == "channel") {
                var b = a[1].split('=');
                params = "&content=channels&columns=name&id=" + b[1];
                a[0]="name";
            } else {
                params="&content=" + a[0] + "s";
                if (a[1] !== '*') {
                    params = params + "&filter_" + templateSrv.replace(a[1]);
                }
            }
            return this.prtgAPI.performPRTGAPIRequest('table.json', params).then(function (results) {
                return _.map(results, function(res) {
                    return {text: res[a[0]], expandable:0};
                }, this);
            });
            
        }
  
}