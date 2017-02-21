'use strict';

System.register(['angular', 'lodash', './xmlparser'], function (_export, _context) {
    "use strict";

    var angular, _, XMLXform, _createClass;

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
                        var char = str.charCodeAt(i);
                        hash = (hash << 5) - hash + char;
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
                    //console.log("date string: " + s.join("-"));
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
                            if (response.data.histdata) {
                                return response.data.histdata;
                            } else if (response.data.groups) {
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
                                    return Promise.reject({ message: "<p style=\"font-size: 150%; font-weight: bold\">Not enough monitoring data.</p><p>Request:<br> &quot;" + params + "&quot;</p>" });
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
                value: function performDeviceSuggestQuery(groupName) {
                    var params = 'content=devices&columns=objid,device';
                    if (groupName) {
                        params += ',group&filter_group=' + groupName;
                    }
                    return this.performPRTGAPIRequest('table.json', params);
                }
            }, {
                key: 'performSensorSuggestQuery',
                value: function performSensorSuggestQuery(deviceId) {
                    var params = 'content=sensors&columns=objid,sensor,device,group&filter_device=' + deviceId;
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
                    var params = 'content=sensors&columns=objid,device,sensor&id=' + device + '&filter_sensor=' + name;
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
                key: 'getValues',
                value: function getValues(deviceId, sensorId, channelId, dateFrom, dateTo) {
                    var _this3 = this;

                    return this.getDeviceByName(deviceId).then(function (deviceObj) {
                        var device;
                        try {
                            device = deviceObj[0].objid;
                        } catch (e) {
                            return [];
                        }
                        return _this3.getSensorByName(sensorId, device).then(function (sensorObj) {
                            var sensor = sensorObj[0].objid;
                            var hours = (dateTo - dateFrom) / 3600;
                            var avg = 0;
                            if (hours > 12 && hours < 36) {
                                avg = "300";
                            } else if (hours > 36 && hours < 745) {
                                avg = "3600";
                            } else if (hours > 745) {
                                avg = "86400";
                            }

                            var method = "historicdata.json";
                            var params = "usecaption=true&id=" + sensor + "&sdate=" + _this3.getPRTGDate(dateFrom) + "&edate=" + _this3.getPRTGDate(dateTo) + "&avg=" + avg + "&pctshow=false&pctmode=false";

                            if (channelId == '!') {
                                params = "&id=" + sensor;
                                return _this3.performPRTGAPIRequest('getsensordetails.json', params).then(function (results) {
                                    var message = results.lastmessage;
                                    var timestamp = results.lastcheck.replace(/(\s\[[\d\smsago\]]+)/g, '');
                                    var dt = Math.round((timestamp - 25569) * 86400, 0) * 1000;
                                    return [message, dt];
                                });
                            } else {
                                return _this3.performPRTGAPIRequest(method, params).then(function (results) {
                                    var result = [];
                                    if (!results.histdata) {
                                        return results;
                                    }
                                    var rCnt = results.histdata.item.length;

                                    for (var i = 0; i < rCnt; i++) {
                                        var v;
                                        var dt = Math.round((results.histdata.item[i].datetime_raw - 25569) * 86400, 0) * 1000;
                                        if (results.histdata.item[i].value_raw && results.histdata.item[i].value_raw.length > 0) {
                                            //FIXME: better way of dealing with multiple channels of same name
                                            //IE you select "Traffic In" but PRTG provides Volume AND Speed channels.
                                            for (var j = 0; j < results.histdata.item[i].value_raw.length; j++) {
                                                //workaround for SNMP Bandwidth Issue #3. Check for presence of (speed) suffix, and use that.
                                                if (results.histdata.item[i].value_raw[j].channel.match(channelId + ' [(]speed[)]') || results.histdata.item[i].value_raw[j].channel == channelId) {
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
                        });
                    });
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
