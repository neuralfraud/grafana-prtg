import _ from 'lodash';
import * as dateMath from 'app/core/utils/datemath';
import './PRTGAPIService';
import * as utils from './utils';

class PRTGDataSource {
    
    /** @ngInject */
    constructor(instanceSettings, templateSrv, alertSrv, PRTGAPIService) {
        /**
        * PRTG Datasource
        * 
        * @param {object} Grafana Datasource Object
        */
        this.templateSrv = templateSrv;
        this.alertSrv = alertSrv;
        
        this.name =     instanceSettings.name;
        this.url =      instanceSettings.url;
        this.username = instanceSettings.jsonData.prtgApiUser;
        this.passhash = instanceSettings.jsonData.prtgApiPasshash;
        this.cacheTimeoutMintues = instanceSettings.jsonData.cacheTimeoutMinutes || 5;
        this.limitmetrics = instanceSettings.meta.limitmetrics || 100;
        this.prtgAPI = new PRTGAPIService(this.url, this.username, this.passhash, this.cacheTimeoutMintues);
    }

        /**
         * Test the datasource
         */
        testDatasource() {
            return this.prtgAPI.getVersion().then(apiVersion => {
                return this.prtgAPI.performPRTGAPILogin()
                    .then(() => {
                        return {
                            status: "success",
                            title: "Success",
                            message: "PRTG API version: " + apiVersion
                        };
                });
            }, error => {
               //console.log(JSON.stringify(error,null,4));
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
            
            var promises = _.map(options.targets, t => {
                var target = _.cloneDeep(t);    
                if (target.hide || !target.group || !target.device || !target.channel || !target.sensor) {
                    return [];
                }
                //play nice with legacy dashboards, add options property
                if (!target.options) {
                    target.options = {};
                }
                target.group.name    = this.templateSrv.replace(target.group.name, options.scopedVars);
                target.device.name   = this.templateSrv.replace(target.device.name, options.scopedVars);
                target.sensor.name  = this.templateSrv.replace(target.sensor.name, options.scopedVars);
                target.channel.name = this.templateSrv.replace(target.channel.name, options.scopedVars);
                if (target.group.name == '*') { target.group.name = "/.*/";}
                if (target.device.name == '*') { target.device.name = "/.*/";}
                if (target.sensor.name == '*') { target.sensor.name = "/.*/";}
                if (target.channel.name == '*') { target.channel.name = "/.*/";}
                
                if (target.options.mode.name == "Metrics") {
                    return this.queryMetrics(target, from, to);
                } else if (target.options.mode.name == "Text") {
                    console.log("Query TEXT");
                    return this.queryText(target, from, to);
                } else if (target.options.mode.name == "Raw") {
                    return this.queryRaw(target, from, to);
                }
            });
            
            return Promise.all(_.flatten(promises))
                .then(results => {
                    return {data: _.flatten(results)};
                });
        }
        
        queryRaw(target, from, to) {
            return this.prtgAPI.performPRTGAPIRequest(target.raw.uri, target.raw.queryString).then(rawData => {
                return {target: 'blah', datapoints: [rawData], type: 'docs'};
            });
        }
        queryText(target, from, to) {
            /**
             * Get items isn't required
             * case value from: sensor group or device
             * -> perform query, then filter.
             * existing getDevices getSensors getGroups can be used since they include all properties
             */
            var textPromise;
            console.log("text query type: " + target.options.textValueFrom.name);
            
            if (target.options.textValueFrom.name == "group") {
                textPromise = this.prtgAPI.getGroups(target.group.name);
            } else if (target.options.textValueFrom.name == "device") {
                textPromise = this.prtgAPI.getHosts(target.group.name, target.device.name); 
            } else if (target.options.textValueFrom.name == "sensor") {
                textPromise = this.prtgAPI.getSensors(target.group.name, target.device.name, target.sensor.name);
            } else {
                return Promise.resolve([]);
            }

            if (!target.options.textFilter) {
                target.options.textFilter = '/.*/';
            }
            
            return textPromise.then(items => {
                var filtered = _.filter(items, item => {
                    return utils.filterMatch(item[target.options.textProperty.name], target.options.textFilter);
                });
                return _.map(filtered, item => {
                    var alias = item[target.options.textValueFrom.name];
                    var decodeText = document.createElement("textarea");
                    decodeText.innerHTML = item[target.options.textProperty.name];
                    return {target: alias, datapoints: [[decodeText.value, Date.now()]]};
                });
            });
        }
        
        queryMetrics(target, from, to) {
                return this.prtgAPI.getItemsFromTarget(target)
                .then(items => {
                    var devices = _.uniq(_.map(items, 'device'));
                    var historyPromise = _.map(items, item => {
                        return this.prtgAPI.getItemHistory(item.sensor, item.name, from, to)
                        .then(history => {
                            //console.log("Target history data: " + JSON.stringify(history,'',4));
                            var alias = item.name;
                            if (target.options.includeSensorName) {
                                alias = item.sensor_raw + ": " + alias;
                            }
                            if (_.keys(devices).length > 1) {
                                alias = item.device + ': ' + alias;
                            }
                            var datapoints = _.map(history, hist => {
                                return [hist.value, hist.datetime];
                            });
                            var timeseries = {target:alias, datapoints: datapoints};
                            return timeseries;
                        });
                    });
                    return Promise.all(historyPromise);
                });
        }
       annotationQuery (options) {
            var from = Math.ceil(dateMath.parse(options.range.from) / 1000);
            var to = Math.ceil(dateMath.parse(options.range.to) / 1000);
            return this.prtgAPI.getMessages(from, to, options.annotation.sensorId)
                .then(messages => {
                    _.each(messages, message => {
                        message.annotation = options.annotation; //inject the annotation into the object
                    }, this);
                return messages;
            });
        }

        /* Find Metrics from templated letiables
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
            //if (!query.match(/(channel|sensor|device|group):(\*)|(tags|sensor|device|group)=([\$\sa-zA-Z0-9-_]+)/i)) {
            //    return Promise.reject("Syntax Error: Expected pattern matching /(sensors|devices|groups):(\*)|(tags|device|group)=([a-zA-Z0-9]+)/i");
           // }
        
            // sensor:device=$server
            // item   type   value
            
            //group.host.sensor.channel
            //*.$host.
           //console.log("Metricfindquery: " + query);
            var filter = {};
            var queryParts = query.split(':');
            filter.type = queryParts[0];
            filter.filter = queryParts[1];
            if (queryParts[1] !== '*') {
                var queryFilter = queryParts[1].split('=');
                filter.filter = queryFilter[0];
                filter.filterExpression = this.templateSrv.replace(queryFilter[1]);
            }
            console.log("metricFindQuery: filter: " + JSON.stringify(filter));
            var items;
            if (filter.type == 'group') {
                if (filter.filterExpression && filter.filter == 'group') {
                    items = this.prtgAPI.getGroups(filter.filterExpression);
                } else {
                    items = this.prtgAPI.getGroups();
                }
            } else if (filter.type == 'device') {
                if (filter.filterExpression) {
                    if (filter.filter == 'group') {
                        items = this.prtgAPI.getHosts(filter.filterExpression);
                    } else if (filter.filter == 'device') {
                        items = this.prtgAPI.getHosts('/.*/',filter.filterExpression);
                    } else {
                        this.alertError('Device template query is malformed.');
                        return Promise.resolve([]);
                    }
                } else {
                    items = this.prtgAPI.getHosts();
                }
            } else if (filter.type == 'sensor') {
                if (filter.filterExpression) {
                    if (filter.filter == 'group') {
                        items = this.prtgAPI.getSensors(filter.filterExpression);
                    } else if (filter.filter == 'device') {
                        items = this.prtgAPI.getSensors('/.*/',filter.filterExpression);
                    } else if (filter.filter == 'sensor') {
                        items = this.prtgAPI.getSensors('/.*/','/.*/',filter.filterExpression);
                    } else {
                        this.alertError('Sensor template query is malformed.');
                        return Promise.resolve([]);
                    }
                } else {
                    items = this.prtgAPI.getSensors();
                }
            } else if (filter.type == 'channel') {
                if (filter.filter == 'sensor' && typeof(filter.filterExpression) == 'number') {
                    params = "&content=channels&columns=name&id=" + filter.filterExpression;
                    items = this.prtgAPI.performPRTGAPIRequest('table.json', params);
                } else {
                    this.alertError('Channel template query is malformed.');
                    return Promise.resolve([]);
                }
            }
            return items.then(metrics => {
                return _.map(metrics, metric => {
                    return {text: metric[filter.type], expandable:0};
                }, this);
            });

        }

        alertError(message, timeout = 5000) {
            this.alertSrv.set(
                "PRTG API Error",
                message,
                'error',
                timeout
            );
        } 
}

export { PRTGDataSource };

