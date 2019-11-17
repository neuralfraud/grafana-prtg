"use strict";

System.register(["angular", "lodash", "./utils"], function (_export, _context) {
  "use strict";

  var angular, _, utils, _createClass;

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
      function PRTGAPI(api_url, username, passhash, cacheTimeoutMinutes, tzAutoAdjust) {
        var _this = this;

        _classCallCheck(this, PRTGAPI);

        this.url = api_url;
        this.username = username;
        this.passhash = passhash;
        this.lastId = false;
        this.cache = {};
        this.cacheTimeoutMinutes = cacheTimeoutMinutes;
        this.alertSrv = alertSrv;
        this.backendSrv = backendSrv;
        this.tzAutoAdjust = tzAutoAdjust;
        this.tzAutoAdjustValue = 0;
        if (tzAutoAdjust) {
          this.performPRTGAPIRequest("status.json").then(function (response) {
            var jsClock = response.jsClock;
            var localTs = Date.now();
            _this.tzAutoAdjustValue = Math.round(localTs - jsClock, 0); //i'll finish implementing this some day
          });
        }
      }

      /**
       * Tests whether a url has been stored in the cache.
       * Returns boolean true | false
       * 
       * Also actually implements deletion. TODO: Test Browser Cache API
       * 
       * @param url 
       * @return boolean
       */


      _createClass(PRTGAPI, [{
        key: "inCache",
        value: function inCache(url) {
          for (var item in this.cache) {
            if (Date.now() - this.cache[item].timestamp > this.cacheTimeoutMinutes * 60000) {
              delete this.cache[item];
            }
          }

          if (this.cache[this.hashValue(url)]) {
            return true;
          }
          return false;
        }
      }, {
        key: "getCache",
        value: function getCache(url) {
          return Promise.resolve(this.cache[this.hashValue(url)].data);
        }
      }, {
        key: "setCache",
        value: function setCache(url, data) {
          this.cache[this.hashValue(url)] = { "timestamp": Date.now(), "data": data };
          return this.getCache(url);
        }
      }, {
        key: "hashValue",
        value: function hashValue(str) {
          var hash = 0;
          if (str.length === 0) return hash;
          for (var idx = 0; idx < str.length; idx++) {
            var chr = str.charCodeAt(idx);
            hash = (hash << 5) - hash + chr;
            hash = hash & hash; // Convert to 32bit integer
          }
          return hash;
        }
      }, {
        key: "performPRTGAPIRequest",
        value: function performPRTGAPIRequest(method, params) {
          var queryString = "username=" + this.username + "&passhash=" + this.passhash + "&" + params;
          var options = {
            method: "GET",
            url: this.url + "/" + method + "?" + queryString
          };

          if (this.inCache(options.url)) {
            return this.getCache(options.url);
          } else {
            return this.setCache(options.url, this.backendSrv.datasourceRequest(options).then(function (response) {
              if (!response.data) {
                return Promise.reject({
                  message: "Response contained no data"
                });
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
                return response.data;
              } else if (response.data.histdata) {
                if (response.data.treesize == 0) {
                  return Promise.reject({
                    message: "No objects returned by query (treesize = 0). Try expanding your time range or something.\n\n: Request:\n" + params
                  });
                }
                return response.data.histdata;
              } else {
                return Promise.reject({
                  message: "Not sure how to handle this request.\n\nRequest:\n" + params + "\n"
                });
              }
            }, function (error) {
              return Promise.reject({
                message: error.status + ": " + error.statusText
              });
            }));
          }
        }
      }, {
        key: "getVersion",
        value: function getVersion() {
          return this.performPRTGAPIRequest("status.json").then(function (response) {
            if (!response) {
              return "ERROR. No response.";
            } else {
              return response.Version;
            }
          });
        }
      }, {
        key: "performGroupSuggestQuery",
        value: function performGroupSuggestQuery() {
          var params = "content=groups&count=9999&columns=objid,group,probe,tags,active,status,message,priority";
          return this.performPRTGAPIRequest("table.json", params);
        }
      }, {
        key: "performDeviceSuggestQuery",
        value: function performDeviceSuggestQuery(groupFilter) {
          var params = "content=devices&count=9999&columns=objid,device,group,probe,tags,active,status,message,priority";
          if (groupFilter) {
            params += ",group" + groupFilter;
          }
          return this.performPRTGAPIRequest("table.json", params);
        }
      }, {
        key: "performSensorSuggestQuery",
        value: function performSensorSuggestQuery(deviceFilter) {
          var params = "content=sensors&count=9999&columns=objid,sensor,device,group,probe,tags,active,status,message,priority";
          if (deviceFilter) {
            params += deviceFilter;
          }

          return this.performPRTGAPIRequest("table.json", params);
        }
      }, {
        key: "filterQuery",
        value: function filterQuery(items, queryStr) {
          var invert = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : false;

          /**
           * group device sensor includes properties:
           * objid: num
           * sensor: Name
           * device: Device name
           * group: Group name
           * tags: comma separated
           * active: true|false
           * active_raw: -1 for true? wtf
           * status: Status text
           * status_raw: number
           * message: html message
           * message_raw: text message
           * priority: number 1-5
           */
          var filterItems = [];
          if (queryStr.match(/{[^{}]+}/g)) {
            filterItems = _.trim(queryStr, "{}").split(",");
          } else {
            filterItems.push(queryStr);
          }
          return _.filter(items, function (item) {
            var findItem = void 0;
            if (item.group && !item.device) {
              findItem = item.group;
            } else if (item.device && !item.sensor) {
              findItem = item.device;
            } else if (item.sensor && !item.name) {
              findItem = item.sensor;
            } else if (item.name) {
              findItem = item.name;
            } else {
              return false;
            }
            if (utils.isRegex(queryStr)) {
              var rex = utils.buildRegex(queryStr);
              var result = rex.test(findItem);
              if (invert) {
                return !result;
              }
              return result;
            }
            if (filterItems.length === 0) {
              return true;
            }
            if (invert) {
              return !filterItems.includes(findItem);
            }
            return filterItems.includes(findItem);
          });
        }
      }, {
        key: "getGroups",
        value: function getGroups() {
          var _this2 = this;

          var groupFilter = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : "/.*/";

          return this.performGroupSuggestQuery().then(function (groups) {
            return _this2.filterQuery(groups, groupFilter);
          });
        }
      }, {
        key: "getHosts",
        value: function getHosts() {
          var _this3 = this;

          var groupFilter = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : "/.*/";
          var hostFilter = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : "/.*/";

          //this is kind of silly but no need to include filter_group params if you include all...
          if (groupFilter == "/.*/") {
            return this.performDeviceSuggestQuery().then(function (devices) {
              return _this3.filterQuery(devices, hostFilter);
            });
          } else {
            return this.getGroups(groupFilter).then(function (filteredGroups) {
              var filters = [];
              _.each(filteredGroups, function (group) {
                filters.push("filter_group=" + group.group);
              });

              return _this3.performDeviceSuggestQuery("&" + filters.join("&")).then(function (devices) {
                return _this3.filterQuery(devices, hostFilter);
              });
            });
          }
        }
      }, {
        key: "getSensors",
        value: function getSensors() {
          var groupFilter = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : "/.*/";

          var _this4 = this;

          var hostFilter = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : "/.*/";
          var sensorFilter = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : "/.*/";

          return this.getHosts(groupFilter, hostFilter).then(function (hosts) {
            var filters = [];
            _.each(hosts, function (host) {
              filters.push("filter_device=" + host.device);
            });
            if (hostFilter == "/.*/" && groupFilter == "/.*/") {
              return _this4.performSensorSuggestQuery().then(function (sensors) {
                return _this4.filterQuery(sensors, sensorFilter);
              });
            } else {
              return _this4.performSensorSuggestQuery("&" + filters.join("&")).then(function (sensors) {
                return _this4.filterQuery(sensors, sensorFilter);
              });
            }
          });
        }
      }, {
        key: "getAllItems",
        value: function getAllItems() {
          var groupFilter = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : "/.*/";

          var _this5 = this;

          var hostFilter = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : "/.*/";
          var sensorFilter = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : "/.*/";

          return this.getSensors(groupFilter, hostFilter, sensorFilter).then(function (sensors) {
            /**
             * For each sensor, retrieve one count of "values" from table.json - this will include all of the actual
             * channel names, which are then used to retrieve the data. 
             */
            var promises = _.map(sensors, function (sensor) {
              var params = "content=values&output=json&columns=value_&noraw=1&count=1&usecaption=true&id=" + sensor.objid;
              //const params = "content=channels&columns=sensor,name&id=" + sensor.objid;
              return _this5.performPRTGAPIRequest("table.json", params).then(function (channels) {
                var arrTmp = [];
                for (var key in Object.keys(channels[0])) {
                  var channel = {};
                  channel.sensor = sensor.objid;
                  channel.sensor_raw = sensor.sensor;
                  channel.device = sensor.device;
                  channel.group = sensor.group;
                  channel.name = Object.keys(channels[0])[key];
                  channel.channel = channel.name;
                  arrTmp.push(channel);
                }
                return Promise.all(arrTmp);
              });
            });
            return Promise.all(promises).then(_.flatten);
          });
        }
      }, {
        key: "getItems",
        value: function getItems(groupFilter, deviceFilter, sensorFilter, channelFilter) {
          var _this6 = this;

          var invertChannelFilter = arguments.length > 4 && arguments[4] !== undefined ? arguments[4] : false;

          return this.getAllItems(groupFilter, deviceFilter, sensorFilter).then(function (items) {
            return _this6.filterQuery(items, channelFilter, invertChannelFilter);
          });
        }
      }, {
        key: "getItemsFromTarget",
        value: function getItemsFromTarget(target) {
          var filtermode = target.options.invertChannelFilter ? true : false;
          return this.getItems(target.group.name, target.device.name, target.sensor.name, target.channel.name, filtermode);
        }
      }, {
        key: "getPRTGDate",
        value: function getPRTGDate(unixtime) {
          var dt = new Date(unixtime * 1000);
          var str = [dt.getFullYear(), utils.pad(dt.getMonth(), true), utils.pad(dt.getDate()), utils.pad(dt.getHours()), utils.pad(dt.getMinutes()), utils.pad(dt.getSeconds())];
          return str.join("-");
        }
      }, {
        key: "getItemHistory",
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

          var method = "historicdata.json";
          var params = "id=" + sensor + "&sdate=" + this.getPRTGDate(dateFrom) + "&edate=" + this.getPRTGDate(dateTo) + "&avg=" + avg + "&pctshow=false&pctmode=false&usecaption=1";
          /*
                 * Modified to read the "statusid" value, this can then be mapped via lookup table to a PRTG status type
                 * 1=Unknown, 2=Scanning, 3=Up, 4=Warning, 5=Down, 6=No Probe, 7=Paused by User, 8=Paused by Dependency,
                 * 9=Paused by Schedule, 10=Unusual, 11=Not Licensed, 12=Paused Until, 13=Down Acknowledged, 14=Down Partial
                 */
          var history = [];

          return this.performPRTGAPIRequest(method, params).then(function (results) {
            for (var iter = 0; iter < results.length; iter++) {
              history.push({
                sensor: sensor,
                channel: channel,
                datetime: Date.parse(results[iter]["datetime"].match(/(\d+\/\d+\/\d+\s\d+:\d+:\d+\s\w+)\s?/)[1]), //Let's pray there are no Chinese timestamps
                value: results[iter][channel]
              });
            }
            return history;
          });
        }
      }, {
        key: "getMessages",
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
                  text: "<p>" + message.parent + "(" + message.type + ") Message:<br>" + message.message + "</p>"
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

      angular.module("grafana.services").factory("PRTGAPIService", PRTGAPIService);
    }
  };
});
//# sourceMappingURL=PRTGAPIService.js.map
