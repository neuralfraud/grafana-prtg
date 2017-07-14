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
                    this.alertServ = alertSrv;

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
                            console.log(JSON.stringify(error, null, 4));
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

                            var device,
                                group,
                                sensor,
                                channel = "";
                            group = _this2.templateSrv.replace(target.group.name, options.scopedVars);
                            device = _this2.templateSrv.replace(target.device.name, options.scopedVars);
                            sensor = _this2.templateSrv.replace(target.sensor.name, options.scopedVars);
                            channel = _this2.templateSrv.replace(target.channel.name, options.scopedVars);
                            if (group === '*') {
                                group = "/.*/";
                            }
                            if (device === '*') {
                                device = "/.*/";
                            }
                            if (sensor === '*') {
                                sensor = "/.*/";
                            }
                            if (channel === '*') {
                                channel = "/.*/";
                            }
                            //oh isn't that just crappy? works for now!

                            return _this2.prtgAPI.getItemsFromTarget(target).then(function (items) {
                                console.log('query: Got all items\n' + JSON.stringify(items, '', 4));
                                var promises = _.map(items, function (item) {
                                    return _this2.prtgAPI.getItemHistory(item.sensor, item.name, from, to).then(function (values) {
                                        var alias = item.name;
                                        var timeseries = { target: alias, datapoints: values };
                                        return timeseries;
                                    });
                                });
                                return Promise.all(promises).then(_.flatten);
                            });
                            /*                        return this.prtgAPI.getValues(items, from, to)
                                                        .then(values => {                
                                                            var timeseries = {target:target.alias, datapoints: values};
                                                            return timeseries;
                                                        });
                                                });*/
                        });

                        return Promise.all(_.flatten(promises)).then(function (results) {
                            // console.log("data: " + JSON.stringify(_.flatten(results),'',4));
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
                        console.log("Metricfindquery: " + query);
                        var params = "";
                        var a = query.split(':');
                        var b;
                        if (a[1] !== '*') {
                            b = a[1].split('=');
                        }
                        if (a[0] == "channel") {
                            params = "&content=channels&columns=name&id=" + this.templateSrv.replace(b[1]);
                            //a[0]="name";
                        } else {
                            params = "&content=" + a[0] + "s&count=9999";
                            if (a[1] !== '*') {
                                params = params + "&filter_" + this.templateSrv.replace(a[1]);
                            }
                        }
                        return this.prtgAPI.performPRTGAPIRequest('table.json', params).then(function (results) {

                            return _.map(results, function (res) {
                                return { text: res[a[0]], expandable: 0 };
                            }, _this4);
                        });
                    }
                }]);

                return PRTGDataSource;
            }());

            _export('PRTGDataSource', PRTGDataSource);
        }
    };
});
//# sourceMappingURL=datasource.js.map
