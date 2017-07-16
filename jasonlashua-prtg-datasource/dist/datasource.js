'use strict';

System.register(['lodash', 'app/core/utils/datemath', './PRTGAPIService'], function (_export, _context) {
    "use strict";

    var _, dateMath, _createClass, PRTGDataSource;

    function _classCallCheck(instance, Constructor) {
        if (!(instance instanceof Constructor)) {
            throw new TypeError("Cannot call a class as a function");
        }
    }

    return {
        setters: [function (_lodash) {
            _ = _lodash.default;
        }, function (_appCoreUtilsDatemath) {
            dateMath = _appCoreUtilsDatemath;
        }, function (_PRTGAPIService) {}],
        execute: function () {
            _createClass = function () {
                function defineProperties(target, props) {
                    for (var i = 0; i < props.length; i++) {
                        var descriptor = props[i];
                        descriptor.enumerable = descriptor.enumerable || false;
                        descriptor.configurable = true;
                        if ("value" in descriptor) descriptor.writable = true;
                        Object.defineProperty(target, descriptor.key, descriptor);
                    }
                }

                return function (Constructor, protoProps, staticProps) {
                    if (protoProps) defineProperties(Constructor.prototype, protoProps);
                    if (staticProps) defineProperties(Constructor, staticProps);
                    return Constructor;
                };
            }();

            _export('PRTGDataSource', PRTGDataSource = function () {

                /** @ngInject */
                function PRTGDataSource(instanceSettings, templateSrv, alertSrv, PRTGAPIService) {
                    _classCallCheck(this, PRTGDataSource);

                    /**
                    * PRTG Datasource
                    * 
                    * @param {object} Grafana Datasource Object
                    */
                    this.templateSrv = templateSrv;
                    this.alertSrv = alertSrv;

                    this.name = instanceSettings.name;
                    this.url = instanceSettings.url;
                    this.username = instanceSettings.jsonData.prtgApiUser;
                    this.passhash = instanceSettings.jsonData.prtgApiPasshash;
                    this.cacheTimeoutMintues = instanceSettings.jsonData.cacheTimeoutMinutes || 5;
                    this.limitmetrics = instanceSettings.meta.limitmetrics || 100;
                    this.prtgAPI = new PRTGAPIService(this.url, this.username, this.passhash, this.cacheTimeoutMintues);
                }

                /**
                 * Test the datasource
                 */


                _createClass(PRTGDataSource, [{
                    key: 'testDatasource',
                    value: function testDatasource() {
                        var _this = this;

                        return this.prtgAPI.getVersion().then(function (apiVersion) {
                            return _this.prtgAPI.performPRTGAPILogin().then(function () {
                                return {
                                    status: "success",
                                    title: "Success",
                                    message: "PRTG API version: " + apiVersion
                                };
                            });
                        }, function (error) {
                            //console.log(JSON.stringify(error,null,4));
                            return {
                                status: "error",
                                title: error.status + ": " + error.statusText,
                                message: "" //error.config.url
                            };
                        });
                    }
                }, {
                    key: 'query',
                    value: function query(options) {
                        var _this2 = this;

                        var from = Math.ceil(dateMath.parse(options.range.from) / 1000);
                        var to = Math.ceil(dateMath.parse(options.range.to) / 1000);

                        var promises = _.map(options.targets, function (t) {
                            var target = _.cloneDeep(t);
                            if (target.hide || !target.group || !target.device || !target.channel || !target.sensor) {
                                return [];
                            }
                            target.group.name = _this2.templateSrv.replace(target.group.name, options.scopedVars);
                            target.device.name = _this2.templateSrv.replace(target.device.name, options.scopedVars);
                            target.sensor.name = _this2.templateSrv.replace(target.sensor.name, options.scopedVars);
                            target.channel.name = _this2.templateSrv.replace(target.channel.name, options.scopedVars);
                            if (target.group.name == '*') {
                                target.group.name = "/.*/";
                            }
                            if (target.device.name == '*') {
                                target.device.name = "/.*/";
                            }
                            if (target.sensor.name == '*') {
                                target.sensor.name = "/.*/";
                            }
                            if (target.channel.name == '*') {
                                target.channel.name = "/.*/";
                            }
                            return _this2.prtgAPI.getItemsFromTarget(target).then(function (items) {
                                //console.log('query: items: ' + JSON.stringify(items,'',4));
                                var devices = _.uniq(_.map(items, 'device'));
                                //console.log('devices: ' + JSON.stringify(items,'',4));
                                var historyPromise = _.map(items, function (item) {
                                    return _this2.prtgAPI.getItemHistory(item.sensor, item.name, from, to).then(function (history) {
                                        //console.log("Target history data: " + JSON.stringify(history,'',4));
                                        var alias = item.name;
                                        if (_.keys(devices).length > 1) {
                                            alias = item.device + ': ' + alias;
                                        }
                                        var datapoints = _.map(history, function (hist) {
                                            return [hist.value, hist.datetime];
                                        });
                                        var timeseries = { target: alias, datapoints: datapoints };
                                        return timeseries;
                                    });
                                });
                                return Promise.all(historyPromise);
                            });
                        });

                        return Promise.all(_.flatten(promises)).then(function (results) {
                            return { data: _.flatten(results) };
                        });
                    }
                }, {
                    key: 'annotationQuery',
                    value: function annotationQuery(options) {
                        var _this3 = this;

                        var from = Math.ceil(dateMath.parse(options.range.from) / 1000);
                        var to = Math.ceil(dateMath.parse(options.range.to) / 1000);
                        return this.prtgAPI.getMessages(from, to, options.annotation.sensorId).then(function (messages) {
                            _.each(messages, function (message) {
                                message.annotation = options.annotation; //inject the annotation into the object
                            }, _this3);
                            return messages;
                        });
                    }
                }, {
                    key: 'metricFindQuery',
                    value: function metricFindQuery(query) {
                        var _this4 = this;

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
                                    items = this.prtgAPI.getHosts('/.*/', filter.filterExpression);
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
                                    items = this.prtgAPI.getSensors('/.*/', filter.filterExpression);
                                } else if (filter.filter == 'sensor') {
                                    items = this.prtgAPI.getSensors('/.*/', '/.*/', filter.filterExpression);
                                } else {
                                    this.alertError('Sensor template query is malformed.');
                                    return Promise.resolve([]);
                                }
                            } else {
                                items = this.prtgAPI.getSensors();
                            }
                        } else if (filter.type == 'channel') {
                            if (filter.filter == 'sensor' && typeof filter.filterExpression == 'number') {
                                params = "&content=channels&columns=name&id=" + filter.filterExpression;
                                items = this.prtgAPI.performPRTGAPIRequest('table.json', params);
                            } else {
                                this.alertError('Channel template query is malformed.');
                                return Promise.resolve([]);
                            }
                        }
                        return items.then(function (metrics) {
                            return _.map(metrics, function (metric) {
                                return { text: metric[filter.type], expandable: 0 };
                            }, _this4);
                        });
                    }
                }, {
                    key: 'alertError',
                    value: function alertError(message) {
                        var timeout = arguments.length <= 1 || arguments[1] === undefined ? 5000 : arguments[1];

                        this.alertSrv.set("PRTG API Error", message, 'error', timeout);
                    }
                }]);

                return PRTGDataSource;
            }());

            _export('PRTGDataSource', PRTGDataSource);
        }
    };
});
//# sourceMappingURL=datasource.js.map
