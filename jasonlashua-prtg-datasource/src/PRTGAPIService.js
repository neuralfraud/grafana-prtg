import angular from "angular";
import _ from "lodash";
import * as utils from "./utils";

/**
 * PRTG API Service
 * Implements the high level functions that process data from PRTG
 */

/** @ngInject */
function PRTGAPIService(alertSrv, backendSrv) {
  class PRTGAPI {
    constructor(api_url, username, passhash, cacheTimeoutMinutes, tzAutoAdjust) {
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
        this.performPRTGAPIRequest("status.json").then(response => { 
          const jsClock =  response.jsClock; 
          const localTs = Date.now();
          this.tzAutoAdjustValue = Math.round((localTs - jsClock),0) //i'll finish implementing this some day
        })
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
    inCache(url) {
      for(var item in this.cache) {
        if (Date.now() - this.cache[item].timestamp > (this.cacheTimeoutMinutes * 60000)) {
          delete(this.cache[item])
        }
      }
      
      if (this.cache[this.hashValue(url)]) {
        return true
      }
      return false;
    }

    /**
     * retrieves a cached data result from the cache
     *
     * @param  url the URL of the request
     * @return Promise
     */
    getCache(url) {
      return Promise.resolve(this.cache[this.hashValue(url)].data);
    }

    /**
     * stores a data result in the cache
     *
     * @param  url the URL of the request
     * @param  data the response.data object of the request
     * @return promise
     */
    setCache(url, data) {
      this.cache[this.hashValue(url)] = {"timestamp": Date.now(), "data": data};
      return this.getCache(url);
    }

    /**
     * simple clone of a java hash value
     * Kevin "Pancake" (http://werxltd.com/wp/2010/05/13/javascript-implementation-of-javas-string-hashcode-method/)
     *
     * @param  e string to hash
     * @return int32
     */
    hashValue(str) {
      let hash = 0;
      if (str.length === 0) return hash;
      for (let idx = 0; idx < str.length; idx++) {
        const chr = str.charCodeAt(idx);
        hash = (hash << 5) - hash + chr;
        hash = hash & hash; // Convert to 32bit integer
      }
      return hash;
    }

    /**
     * Request data from PRTG API
     *
     * @param  method the API method (e.g., table.json)
     * @param  params HTTP query string query parameters
     * @return promise
     */
    performPRTGAPIRequest(method, params) {
      const queryString =
        "username=" +
        this.username +
        "&passhash=" +
        this.passhash +
        "&" +
        params;
      const options = {
        method: "GET",
        url: this.url + "/" + method + "?" + queryString
      };

      if (this.inCache(options.url)) {
        return this.getCache(options.url);
      } else {
        return this.setCache(
          options.url,
          this.backendSrv.datasourceRequest(options).then(
            response => {
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
                  })
                }
                return response.data.histdata;
              } else {
                return Promise.reject({
                    message:
                      "Not sure how to handle this request.\n\nRequest:\n" +
                      params +
                      "\n"
                  });
              }
            },
            error => {
              return Promise.reject({
                message: error.status + ": " + error.statusText
              });
            }
          )
        );
      }
    }

    /**
     * Only used in connection testing
     * 
     * @return Promise
     */
    getVersion() {
      return this.performPRTGAPIRequest("status.json").then(function(response) {
        if (!response) {
          return "ERROR. No response.";
        } else {
          return response.Version;
        }
      });
    }

    /**
     * Query API for list of groups
     *
     * @return Promise - JSON result set
     */
    performGroupSuggestQuery() {
      const params =
        "content=groups&count=9999&columns=objid,group,probe,tags,active,status,message,priority";
      return this.performPRTGAPIRequest("table.json", params);
    }

    /**
     * Query API for list of devices
     * @param {string} groupFilter - raw string, comma separated strings, or regular expression pattern
     * @return Promise - JSON result set
     */
    performDeviceSuggestQuery(groupFilter) {
      let params =
        "content=devices&count=9999&columns=objid,device,group,probe,tags,active,status,message,priority";
      if (groupFilter) {
        params += ",group" + groupFilter;
      }
      return this.performPRTGAPIRequest("table.json", params);
    }

    /**
     * Query API for list of sensors bound to a given device
     * @param {string} deviceFilter - raw string, comma separated strings, or regular expression pattern
     * @return promise - JSON result set
     */
    performSensorSuggestQuery(deviceFilter) {
      let params =
        "content=sensors&count=9999&columns=objid,sensor,device,group,probe,tags,active,status,message,priority";
      if (deviceFilter) {
        params += deviceFilter;
      }
        
      return this.performPRTGAPIRequest("table.json", params);
    }

    /**
     * Filter a PRTG collection against a filter string 
     * 
     * @param {collection} items - PRTG Data object 
     * @param {string} queryStr - Query filter, raw string, comma separated strings, or regular expression pattern
     * @param {boolean} invert - when set to boolean true, negates the return value. 
     * @return {boolean} result of text expression
     */
    filterQuery(items, queryStr, invert = false) {
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
      let filterItems = [];
      if (queryStr.match(/{[^{}]+}/g)) {
        filterItems = _.trim(queryStr, "{}").split(",");
      } else {
        filterItems.push(queryStr);
      }
      return _.filter(items, item => {
        let findItem;
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
          const rex = utils.buildRegex(queryStr);
          const result = rex.test(findItem);
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

    /**
     * Retrive groups and filter with an optional filter string
     * 
     * @param {string} groupFilter - raw string, comma separated strings, or regular expression pattern
     * @return {collection} - filtered PRTG data object
     */
    getGroups(groupFilter = "/.*/") {
      return this.performGroupSuggestQuery().then(groups => {
        return this.filterQuery(groups, groupFilter);
      });
    }

    /**
     * Retrieve hosts and filter with an optional filter string.
     * 
     * @param {*} groupFilter - raw string, comma separated strings, or regular expression pattern
     * @param {*} hostFilter - raw string, comma separated strings, or regular expression pattern
     * @return {collection} - filtered PRTG data object
     */
    getHosts(groupFilter = "/.*/", hostFilter = "/.*/") {
      //this is kind of silly but no need to include filter_group params if you include all...
      if (groupFilter == "/.*/") {
        return this.performDeviceSuggestQuery().then(devices => {
          return this.filterQuery(devices, hostFilter);
        });
      } else {
        return this.getGroups(groupFilter).then(filteredGroups => {
          const filters = [];
          _.each(filteredGroups, group => {
            filters.push("filter_group=" + group.group);
          });

          return this.performDeviceSuggestQuery(
            "&" + filters.join("&")
          ).then(devices => {
            return this.filterQuery(devices, hostFilter);
          });
        });
      }
    }

    /**
     * Retrieve sensors and filter with an optional filter string.
     * 
     * @param {string} groupFilter - raw string, comma separated strings, or regular expression pattern
     * @param {string} hostFilter - raw string, comma separated strings, or regular expression pattern
     * @param {string} sensorFilter - raw string, comma separated strings, or regular expression pattern
     * @return {collection} - filtered PRTG data object
     */
    getSensors(
      groupFilter = "/.*/",
      hostFilter = "/.*/",
      sensorFilter = "/.*/"
    ) {
      return this.getHosts(groupFilter, hostFilter).then(hosts => {
        const filters = [];
        _.each(hosts, host => {
          filters.push("filter_device=" + host.device);
        });
        if (hostFilter == "/.*/" && groupFilter == "/.*/") {
          return this.performSensorSuggestQuery().then(sensors => {
            return this.filterQuery(sensors, sensorFilter);
          });
        } else {
          return this.performSensorSuggestQuery(
            "&" + filters.join("&")
          ).then(sensors => {
            return this.filterQuery(sensors, sensorFilter);
          });
        }
      });
    }

    /**
     * Retrieve full data object with channel definitions using an optional filter string
     * 
     * @param {*} groupFilter - raw string, comma separated strings, or regular expression pattern 
     * @param {*} hostFilter - raw string, comma separated strings, or regular expression pattern 
     * @param {*} sensorFilter - raw string, comma separated strings, or regular expression pattern 
     * @return {collection} - PRTG data object with channel and sensor properties
     */
    getAllItems(
      groupFilter = "/.*/",
      hostFilter = "/.*/",
      sensorFilter = "/.*/"
    ) {
      return this.getSensors(
        groupFilter,
        hostFilter,
        sensorFilter
      ).then(sensors => {
        /**
         * For each sensor, retrieve one count of "values" from table.json - this will include all of the actual
         * channel names, which are then used to retrieve the data. 
         */
        const promises = _.map(sensors, sensor => {
          const params = "content=values&output=json&columns=value_&noraw=1&count=1&usecaption=true&id="+ sensor.objid 
          //const params = "content=channels&columns=sensor,name&id=" + sensor.objid;
          return this.performPRTGAPIRequest(
            "table.json",
            params
          ).then(channels => {
           let arrTmp = []
            for (var key in Object.keys(channels[0])) {
              let channel = {}
              channel.sensor = sensor.objid;
              channel.sensor_raw = sensor.sensor;
              channel.device = sensor.device;
              channel.group = sensor.group;
              channel.name = Object.keys(channels[0])[key];
              channel.channel = channel.name
              arrTmp.push(channel)
            }
            return Promise.all(arrTmp)
          });
        });
        return Promise.all(promises).then(_.flatten);
      });
    }

    /**
     * Retrieve full data object with channel definitions using an optional filter string.
     * The results are then filtered against a channelFilter expression.
     * 
     * @param {string} groupFilter - raw string, comma separated strings, or regular expression patter 
     * @param {string} deviceFilter - raw string, comma separated strings, or regular expression patter 
     * @param {string} sensorFilter - raw string, comma separated strings, or regular expression pattern
     * @param {string} channelFilter - raw string, comma separated strings, or regular expression pattern
     * @param {boolean} invertChannelFilter - if set to boolean true, negates the result of the channelFilter expression
     */
    getItems(
      groupFilter,
      deviceFilter,
      sensorFilter,
      channelFilter,
      invertChannelFilter = false
    ) {
      return this.getAllItems(
        groupFilter,
        deviceFilter,
        sensorFilter
      ).then(items => {
        return this.filterQuery(items, channelFilter, invertChannelFilter);
      });
    }

    /**
     * This fires off a series of API queries that ends up either confirming or expanding the targets
     * originally selected in the dashboard. For instance, if I use /Processor/ as the channel name in a query, 
     * that actually means "all channels containing 'Processor', so it means we have to fetch a real list of 
     * things from the API and then create necessary target objects before the data can be fetched. 
     * 
     * TODO: Carry out all of this garbage prior to saving the dashboard, it'll make things faster. 
     * @param {*} target 
     */
    getItemsFromTarget(target) {
      let filtermode = (target.options.invertChannelFilter) ? true : false
      return this.getItems(
        target.group.name,
        target.device.name,
        target.sensor.name,
        target.channel.name,
        filtermode
      );
    }

    /**
     * convert a UNIX timestamp into a PRTG date string for queries
     * YYYY-MM-DD-HH-MM-SS
     * 
     * @param unixtime UNIX format timestamp
     */
    getPRTGDate(unixtime) {
      const dt = new Date(unixtime * 1000);
      const str = [
        dt.getFullYear(),
        utils.pad(dt.getMonth(), true),
        utils.pad(dt.getDate()),
        utils.pad(dt.getHours()),
        utils.pad(dt.getMinutes()),
        utils.pad(dt.getSeconds())
      ];
      return str.join("-");
    }    

    /**
     * Retrieve history data from a single sensor.
     * @param {number} sensor - sensor ID
     * @param {string} channel - channel name
     * @param {number} dateFrom - timestamp of start time
     * @param {number} dateTo - timestamp of end time
     */
    getItemHistory(sensor, channel, dateFrom, dateTo) {
      const hours = (dateTo - dateFrom) / 3600;
      let avg = 0;
      if (hours > 12 && hours < 36) {
        avg = "300";
      } else if (hours > 36 && hours < 745) {
        avg = "3600";
      } else if (hours > 745) {
        avg = "86400";
      }

      const method = "historicdata.json";
      const params =
        "id=" +
        sensor +
        "&sdate=" +
        this.getPRTGDate(dateFrom) +
        "&edate=" +
        this.getPRTGDate(dateTo) +
        "&avg=" +
        avg +
        "&pctshow=false&pctmode=false&usecaption=1";
      /*
             * Modified to read the "statusid" value, this can then be mapped via lookup table to a PRTG status type
             * 1=Unknown, 2=Scanning, 3=Up, 4=Warning, 5=Down, 6=No Probe, 7=Paused by User, 8=Paused by Dependency,
             * 9=Paused by Schedule, 10=Unusual, 11=Not Licensed, 12=Paused Until, 13=Down Acknowledged, 14=Down Partial
             */
      const history = [];
      
      return this.performPRTGAPIRequest(method, params).then(results => {
        for (let iter = 0; iter < results.length; iter++)
        {
          history.push({
            sensor: sensor,
            channel: channel,
            datetime: Date.parse(results[iter]["datetime"].substr(0,22)), //moar haxx
            value: results[iter][channel] 
          });
        }
        return history;
      });
    }

    /**
     * Retrieve messages for a given sensor. Used only for annotation queries.
     * 
     * @param {number} from - Earliest time in range
     * @param {number} to - Latest time in range
     * @param {number} sensorId - Numeric ID of Sensor 
     */
    getMessages(from, to, sensorId) {
      const method = "table.json";
      const params =
        "&content=messages&columns=objid,datetime,parent,type,name,status,message&id=" +
        sensorId;
      return this.performPRTGAPIRequest(method, params).then(function(
        messages
      ) {
        const events = [];
        let time = 0;
        _.each(messages, function(message) {
          time = Math.round((message.datetime_raw - 25569) * 86400, 0);
          if (time > from && time < to) {
            events.push({
              time: time * 1000,
              title: message.status,
              text:
                "<p>" +
                message.parent +
                "(" +
                message.type +
                ") Message:<br>" +
                message.message +
                "</p>"
            });
          }
        });
        return events;
      });
    }
  }
  return PRTGAPI;
}

//register a new module
angular.module("grafana.services").factory("PRTGAPIService", PRTGAPIService);
