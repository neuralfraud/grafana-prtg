'use strict';

System.register(['angular', 'lodash', './utils', './xmlparser'], function (_export, _context) {
    "use strict";

    var angular, _, utils, XMLXform, _createClass;

    function _classCallCheck(instance, Constructor) {
        if (!(instance instanceof Constructor)) {
            throw new TypeError("Cannot call a class as a function");
        }
    }

    /**
     * PRTG API Service
     * Implements the high level functions that process data from PRTG
     */

    /** @ngInject */
    function PRTGAPIService(alertSrv, backendSrv) {
        var PRTGAPI = function () {
            function PRTGAPI(api_url, username, passhash, cacheTimeoutMinutes) {
                _classCallCheck(this, PRTGAPI);

                this.url = api_url;
                this.username = username;
                this.passhash = passhash;
                this.lastId = false;
                this.cache = {};
                this.cacheTimeoutMinutes = cacheTimeoutMinutes;
                this.alertSrv = alertSrv;
                this.backendSrv = backendSrv;
            }

            /**
             * Tests whether a url has been stored in the cache.
             * Returns boolean true | false
             */


            _createClass(PRTGAPI, [{
                key: 'inCache',
                value: function inCache(url) {
                    if (Date.now() - this.cache[this.hashValue(url)] > this.cacheTimeoutMinutes * 60 * 1000) {
                        return false;
                    }
                    if (this.cache[this.hashValue(url)]) {
                        return true;
                    }
                    return false;
                }
            }, {
                key: 'getCache',
                value: function getCache(url) {
                    return Promise.resolve(this.cache[this.hashValue(url)]);
                }
            }, {
                key: 'setCache',
                value: function setCache(url, data) {
                    this.cache[this.hashValue(url)] = data;
                    return this.getCache(url);
                }
            }, {
                key: 'hashValue',
                value: function hashValue(str) {
                    var hash = 0;
                    if (str.length === 0) return hash;
                    for (var i = 0; i < str.length; i++) {
                        var chr = str.charCodeAt(i);
                        hash = (hash << 5) - hash + chr;
                        hash = hash & hash; // Convert to 32bit integer
                    }
                    return hash;
                }
            }, {
                key: 'pad',
                value: function pad(i, a) {
                    if (a) return ("0" + (i + 1)).slice(-2);
                    return ("0" + i).slice(-2);
                }
            }, {
                key: 'getPRTGDate',
                value: function getPRTGDate(unixtime) {
                    var d = new Date(unixtime * 1000);
                    var s = [d.getFullYear(), this.pad(d.getMonth(), true), this.pad(d.getDate()), this.pad(d.getHours()), this.pad(d.getMinutes()), this.pad(d.getSeconds())];
                    return s.join("-");
                }
            }, {
                key: 'performPRTGAPIRequest',
                value: function performPRTGAPIRequest(method, params) {
                    var queryString = 'username=' + this.username + '&passhash=' + this.passhash + '&' + params;
                    var options = {
                        method: 'GET',
                        url: this.url + '/' + method + '?' + queryString
                    };

                    if (this.inCache(options.url)) {
                        return this.getCache(options.url);
                    } else {
                        return this.setCache(options.url, this.backendSrv.datasourceRequest(options).then(function (response) {
                            if (!response.data) {
                                return Promise.reject({ message: "Response contained no data" });
                            }

                            if (response.data.groups) {
                                return response.data.groups;
                            } else if (response.data.devices) {
                                return response.data.devices;
                            } else if (response.data.sensors) {
                                return response.data.sensors;
                            } else if (response.data.channels) {
                                return response.data.channels;
                            } else if (response.data.values) {
                                return response.data.values;
                            } else if (response.data.sensordata) {
                                return response.data.sensordata;
                            } else if (response.data.messages) {
                                return response.data.messages;
                            } else if (response.data.Version) {
                                //status request
                                return response.data;
                            } else {
                                //All else is XML from table.xml so throw it into the transformer and get JSON back.
                                if (response.data == "Not enough monitoring data") {
                                    //Fixes Issue #5 - reject the promise with a message. The message is displayed instead of an uncaught exception.
                                    return Promise.reject({ message: "Not enough monitoring data.\n\nRequest:\n" + params + "\n" });
                                }
                                return new XMLXform(method, response.data);
                            }
                        }, function (err) {
                            if (err.data.match(/<error>/g)) {
                                var regex = /<error>(.*)<\/error>/g;
                                var res = regex.exec(err.data);
                                err.message = res[1];
                            } else {
                                err.message = "Unknown error: " + err.data;
                            }
                            return Promise.reject(err);
                        }));
                    }
                }
            }, {
                key: 'getVersion',
                value: function getVersion() {
                    return this.performPRTGAPIRequest('status.json').then(function (response) {
                        if (!response) {
                            return "ERROR. No response.";
                        } else {
                            return response.Version;
                        }
                    });
                }
            }, {
                key: 'performPRTGAPILogin',
                value: function performPRTGAPILogin() {
                    var _this = this;

                    var username = this.username;
                    var passhash = this.passhash;
                    var options = {
                        method: 'GET',
                        url: this.url + "/getstatus.htm?id=0&username=" + username + "&passhash=" + passhash
                    };
                    return this.backendSrv.datasourceRequest(options).then(function (response) {
                        _this.passhash = response;
                        return response;
                    });
                }
            }, {
                key: 'performGroupSuggestQuery',
                value: function performGroupSuggestQuery() {
                    var params = 'content=groups&columns=objid,group';
                    return this.performPRTGAPIRequest('table.json', params);
                }
            }, {
                key: 'performDeviceSuggestQuery',
                value: function performDeviceSuggestQuery(groupFilter) {
                    var params = 'content=devices&columns=objid,device';
                    if (groupFilter) {
                        params += ',group' + groupFilter;
                    }
                    return this.performPRTGAPIRequest('table.json', params);
                }
            }, {
                key: 'performSensorSuggestQuery',
                value: function performSensorSuggestQuery(deviceFilter) {
                    var params = 'content=sensors&columns=objid,sensor,device,group' + deviceFilter;
                    return this.performPRTGAPIRequest('table.json', params);
                }
            }, {
                key: 'performChannelSuggestQuery',
                value: function performChannelSuggestQuery(sensorId, device) {
                    var _this2 = this;

                    var arr = [{ "device": device }, { "sensor": sensorId }];
                    var p = [];
                    p = _.map(arr, function (a) {
                        if (a.device && typeof a.device == "string") {
                            return _this2.getDeviceByName(a.device);
                        }

                        if (a.sensor && typeof a.sensor == "string") {
                            return _this2.getSensorByName(a.sensor, arr[0].device);
                        }
                    });

                    return Promise.all(p).then(function (a) {
                        var sensor = a[1][0].objid;
                        var params = 'content=channels&columns=objid,channel,sensor,name&id=' + sensor;
                        return _this2.performPRTGAPIRequest('table.json', params);
                    });
                }
            }, {
                key: 'getDeviceByName',
                value: function getDeviceByName(name) {
                    var params = 'content=devices&columns=objid,device&filter_device=' + name;
                    return this.performPRTGAPIRequest('table.json', params);
                }
            }, {
                key: 'getSensorByName',
                value: function getSensorByName(name, device) {
                    var params = 'content=sensors&columns=objid,device,sensor&filter_device=' + device;
                    if (name !== '*') {
                        params += '&filter_sensor=' + name;
                    }
                    return this.performPRTGAPIRequest('table.json', params);
                }
            }, {
                key: 'getChannelByName',
                value: function getChannelByName(name, sensor) {
                    var params = 'content=channels&columns=objid,channel,channelid&id=' + sensor;
                    if (name !== "*") {
                        params = params.concat('&filter_channel=' + name);
                    }
                    return this.performPRTGAPIRequest('table.json', params);
                }
            }, {
                key: 'filterQuery',
                value: function filterQuery(items, queryStr) {
                    var filterItems = [];
                    if (queryStr.match(/{[^{}]+}/g)) {
                        filterItems = _.trim(queryStr, '{}').split(',');
                    } else {
                        filterItems.push(queryStr);
                    }
                    //console.log("filterQuery: Find item\n" + JSON.stringify(items,'',4) + "\n\nfilterQuery: Find in array: " + JSON.stringify(filterItems,'',4));
                    return _.filter(items, function (item) {

                        var findItem;
                        if (item.group && !item.device) {
                            //console.log("find in obj.group");
                            findItem = item.group;
                        } else if (item.device && !item.sensor) {
                            //console.log("find in obj.device");
                            findItem = item.device;
                        } else if (item.sensor) {
                            //console.log("find in obj.sensor");
                            findItem = item.sensor;
                        } else if (item.channel) {
                            findItem = item.name;
                        } else {
                            //console.log("find ? no usable keys! " + JSON.stringify(item,'',4));
                            return false;
                        }
                        if (utils.isRegex(queryStr)) {
                            var rex = utils.buildRegex(queryStr);
                            return rex.test(findItem);
                        }
                        if (filterItems.length === 0) {
                            return true;
                        }
                        return filterItems.includes(findItem);
                    });
                }
            }, {
                key: 'filterMatch',
                value: function filterMatch(findItem, filterStr) {
                    //console.log('filterMatch: ' + JSON.stringify(findItem,'',4) + ', ' + filterStr);

                    if (utils.isRegex(filterStr)) {
                        var rex = utils.buildRegex(filterStr);
                        return rex.test(findItem);
                    } else {
                        return findItem === filterStr;
                    }
                }
            }, {
                key: 'getHosts',
                value: function getHosts(groupFilter, hostFilter) {
                    var _this3 = this;

                    ////console.log('PRTGAPIService: 328: getHosts(' + groupFilter + ', ' + hostFilter +')');
                    return this.performGroupSuggestQuery().then(function (groups) {
                        var filteredGroups = _this3.filterQuery(groups, groupFilter);
                        //console.log('3: getHosts: filteredGroups: ' + JSON.stringify(filteredGroups,'',4));
                        var filters = [];
                        _.each(filteredGroups, function (group) {
                            filters.push('filter_group=' + group.group);
                        });

                        return _this3.performDeviceSuggestQuery("&" + filters.join('&')).then(function (devices) {
                            // //console.log("filterquery(devices, " + hostFilter + ")");

                            return _this3.filterQuery(devices, hostFilter);
                        });
                    });
                }
            }, {
                key: 'getSensors',
                value: function getSensors(groupFilter, hostFilter, sensorFilter) {
                    var _this4 = this;

                    return this.getHosts(groupFilter, hostFilter).then(function (hosts) {
                        //console.log("Got hosts: " + JSON.stringify(hosts, '', 4));
                        var filters = [];
                        _.each(hosts, function (host) {
                            //console.log("getSensors: add filter element: " + host.device);
                            filters.push('filter_device=' + host.device);
                        });
                        return _this4.performSensorSuggestQuery("&" + filters.join('&')).then(function (sensors) {
                            return _this4.filterQuery(sensors, sensorFilter);
                        });
                    });
                }
            }, {
                key: 'getAllItems',
                value: function getAllItems(groupFilter, hostFilter, sensorFilter) {
                    var _this5 = this;

                    return this.getSensors(groupFilter, hostFilter, sensorFilter).then(function (sensors) {

                        /**
                         * In this context, if i simply iterate an array with _.each and then execute performPRTGAPIRequest, even
                         * though the returned object is a promise which can be used in a chain, the execution falls outside of the existing
                         * promise chain and thus executs asynchronously. To keep everything in the same execution context, create a
                         * promise array for each object, then execute them in context.
                         */
                        var promises = _.map(sensors, function (sensor) {
                            var params = 'content=channels&columns=objid,channel,sensor,name&id=' + sensor.objid;
                            return _this5.performPRTGAPIRequest('table.json', params).then(function (channels) {
                                /**
                                 * Create an object that contains all of the information necessary to query this metric
                                 */
                                return Promise.all(_.map(channels, function (channel) {
                                    channel.sensor = sensor.objid;
                                    channel.sensor_raw = sensor.sensor;
                                    channel.device = sensor.device;
                                    channel.group = sensor.group;
                                    return channel;
                                }));
                            });
                        });
                        return Promise.all(promises).then(_.flatten);
                    });
                }
            }, {
                key: 'getItems',
                value: function getItems(groupFilter, deviceFilter, sensorFilter, channelFilter) {
                    var _this6 = this;

                    return this.getAllItems(groupFilter, deviceFilter, sensorFilter).then(function (items) {
                        //return this.filterQuery(items, channelFilter);
                        return _.filter(items, function (item) {
                            return _this6.filterMatch(item.name, channelFilter);
                        });
                    });
                }
            }, {
                key: 'getItemsFromTarget',
                value: function getItemsFromTarget(target) {
                    /*
                     * Flow: is group filter present?
                     * yes: Get groups(filter)
                     * no: get device
                     */
                    return this.getItems(target.group.name, target.device.name, target.sensor.name, target.channel.name);
                }
            }, {
                key: 'getItemHistory',
                value: function getItemHistory(sensor, channel, dateFrom, dateTo) {
                    var hours = (dateTo - dateFrom) / 3600;
                    var avg = 0;
                    if (hours > 12 && hours < 36) {
                        avg = "300";
                    } else if (hours > 36 && hours < 745) {
                        avg = "3600";
                    } else if (hours > 745) {
                        avg = "86400";
                    }

                    var method = "historicdata.xml";
                    var params = "id=" + sensor + "&sdate=" + this.getPRTGDate(dateFrom) + "&edate=" + this.getPRTGDate(dateTo) + "&avg=" + avg + "&pctshow=false&pctmode=false";
                    /*
                     * Modified to read the "statusid" value, this can then be mapped via lookup table to a PRTG status type
                     * 1=Unknown, 2=Scanning, 3=Up, 4=Warning, 5=Down, 6=No Probe, 7=Paused by User, 8=Paused by Dependency,
                     * 9=Paused by Schedule, 10=Unusual, 11=Not Licensed, 12=Paused Until, 13=Down Acknowledged, 14=Down Partial
                     */
                    var result = [];
                    if (channel == 'Status') {
                        params = "&id=" + sensor;
                        return this.performPRTGAPIRequest('getsensordetails.json', params).then(function (results) {
                            var statusid = results.statusid;
                            filter("Status ID: " + statusid);
                            var dt = Date.now();
                            result.push([statusid, dt]);
                            return result;
                        });
                    } else {
                        return this.performPRTGAPIRequest(method, params).then(function (results) {

                            if (!results.histdata) {
                                return results;
                            }
                            var rCnt = results.histdata.item.length;

                            for (var i = 0; i < rCnt; i++) {
                                var v;
                                var prtgDate = results.histdata.item[i].datetime_raw;
                                var dt = new Date((prtgDate - 25569) * 86400 * 1000);
                                //var dt = Math.round((results.histdata.item[i].datetime_raw - 25568) * 86400,0) * 1000;
                                if (results.histdata.item[i].value_raw && results.histdata.item[i].value_raw.length > 0) {
                                    //FIXME: better way of dealing with multiple channels of same name
                                    //IE you select "Traffic In" but PRTG provides Volume AND Speed channels.
                                    for (var j = 0; j < results.histdata.item[i].value_raw.length; j++) {
                                        //workaround for SNMP Bandwidth Issue #3. Check for presence of (speed) suffix, and use that.
                                        if (results.histdata.item[i].value_raw[j].channel.match(channel + ' [(]speed[)]') || results.histdata.item[i].value_raw[j].channel == channel) {
                                            v = Number(results.histdata.item[i].value_raw[j].text);
                                        }
                                    }
                                } else if (results.histdata.item[i].value_raw) {
                                    v = Number(results.histdata.item[i].value_raw.text);
                                }
                                result.push([v, dt]);
                            }
                            return result;
                        });
                    }
                }
            }, {
                key: 'getMessages',
                value: function getMessages(from, to, sensorId) {
                    var method = "table.json";
                    var params = "&content=messages&columns=objid,datetime,parent,type,name,status,message&id=" + sensorId;
                    return this.performPRTGAPIRequest(method, params).then(function (messages) {
                        var events = [];
                        var time = 0;
                        _.each(messages, function (message) {
                            time = Math.round((message.datetime_raw - 25569) * 86400, 0);
                            if (time > from && time < to) {
                                events.push({
                                    time: time * 1000,
                                    title: message.status,
                                    text: '<p>' + message.parent + '(' + message.type + ') Message:<br>' + message.message + '</p>'
                                });
                            }
                        });
                        return events;
                    });
                }
            }]);

            return PRTGAPI;
        }();

        return PRTGAPI;
    }

    //register a new module
    return {
        setters: [function (_angular) {
            angular = _angular.default;
        }, function (_lodash) {
            _ = _lodash.default;
        }, function (_utils) {
            utils = _utils;
        }, function (_xmlparser) {
            XMLXform = _xmlparser.XMLXform;
        }],
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

            angular.module('grafana.services').factory('PRTGAPIService', PRTGAPIService);
        }
    };
});
//# sourceMappingURL=PRTGAPIService.js.map
