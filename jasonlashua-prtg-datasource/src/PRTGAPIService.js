import angular from 'angular';
import _ from 'lodash';
import * as utils from './utils';
import { XMLXform } from './xmlparser';
/**
 * PRTG API Service
 * Implements the high level functions that process data from PRTG
 */

/** @ngInject */
function PRTGAPIService(alertSrv, backendSrv) {
    
    class PRTGAPI {
        constructor (api_url, username, passhash, cacheTimeoutMinutes) {
          this.url              = api_url;
          this.username         = username;
          this.passhash         = passhash;
          this.lastId           = false;
          this.cache            = {};
          this.cacheTimeoutMinutes = cacheTimeoutMinutes;
          this.alertSrv         = alertSrv;
          this.backendSrv       = backendSrv;
          
        }
        
        /**
         * Tests whether a url has been stored in the cache.
         * Returns boolean true | false
         */
        inCache(url) {
            if ((Date.now() - this.cache[this.hashValue(url)]) > (this.cacheTimeoutMinutes * 60 * 1000)) {
                return false;
            }
            if (this.cache[this.hashValue(url)]) {
                return true;
            }
            return false;
        }
        
        /**
        * retrieves a cached data result from the cache
        *
        * @param  url the URL of the request
        * @return promise
        */
        getCache(url)    {
            return Promise.resolve(this.cache[this.hashValue(url)]);
        }
        
        /**
        * stores a data result in the cache
        *
        * @param  url the URL of the request
        * @param  data the response.data object of the request
        * @return promise
        */
        setCache(url, data)    {
            this.cache[this.hashValue(url)] = data;
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
            var hash = 0;
            if (str.length === 0) return hash;
            for (var i = 0; i < str.length; i++) {
                var char = str.charCodeAt(i);
                hash = ((hash<<5)-hash)+char;
                hash = hash & hash; // Convert to 32bit integer
            }
            return hash;
        }
        
        /**
         * pad date parts and optionally add one
         */
        pad(i,a)	{
            if (a) return ("0" + (i + 1)).slice(-2);
            return ("0" + i).slice(-2);
        }
        
        /**
        * convert a UNIX timestamp into a PRTG date string for queries
        * YYYY-MM-DD-HH-MM-SS
        */
        getPRTGDate(unixtime) 	{
            var d = new Date(unixtime * 1000);
            var s = [d.getFullYear(), this.pad(d.getMonth(),true), this.pad(d.getDate()), this.pad(d.getHours()), this.pad(d.getMinutes()), this.pad(d.getSeconds())];
            return s.join("-");
        }
	
        /**
         * Request data from PRTG API
         *
         * @param  method the API method (e.g., table.json)
         * @param  params HTTP query string query parameters
         * @return promise
         */
        performPRTGAPIRequest(method, params) {
            var queryString = 'username=' + this.username + '&passhash=' + this.passhash + '&' + params;
            var options = {
                method: 'GET',
                url: this.url + '/' + method + '?' + queryString
            };
            
            if (this.inCache(options.url)) {
              return this.getCache(options.url);
            } else {
              return this.setCache(options.url, this.backendSrv.datasourceRequest(options)
                .then(response => {
                    if (!response.data) {
                        return Promise.reject({message: "Response contained no data"});
                    } 
                    
                    if (response.data.groups) {
                      return response.data.groups;
                    }
                    else if (response.data.devices) {
                      return response.data.devices;
                    }
                    else if (response.data.sensors) {
                      return response.data.sensors;
                    }
                    else if (response.data.channels) {
                      return response.data.channels;
                    }
                    else if (response.data.values) {
                      return response.data.values;
                    }
                    else if (response.data.sensordata) {
                      return response.data.sensordata;
                    }
                    else if (response.data.messages) {
                      return response.data.messages;
                    }
                    else if (response.data.Version) { //status request
                      return response.data;
                    } else {  //All else is XML from table.xml so throw it into the transformer and get JSON back.
                      if (response.data == "Not enough monitoring data") {
                        //Fixes Issue #5 - reject the promise with a message. The message is displayed instead of an uncaught exception.
                        return Promise.reject({message: "Not enough monitoring data.\n\nRequest:\n" + params + "\n"});
                      }
                      return new XMLXform(method, response.data);
                    }
              }, err => {
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
    
        getVersion() {
            return this.performPRTGAPIRequest('status.json').then(function (response) {
                if (!response)
                {
                  return "ERROR. No response.";
                } else {
                  return response.Version;
                }
            });
        }
    
        /**
         * Authenticate to the PRTG interface
         * not implemented yet (pass username/pass as query string/POST data)
         */
        performPRTGAPILogin() {
            var username = this.username;
            var passhash = this.passhash;
            var options = {
                method: 'GET',
                url: this.url + "/getstatus.htm?id=0&username=" + username + "&passhash=" + passhash
            };
            return this.backendSrv.datasourceRequest(options).then(response => {
                this.passhash = response;
                return response;
            });
        }
    
        /**
         * Query API for list of groups
         *
         * @return promise - JSON result set
         */
        performGroupSuggestQuery() {
            var params = 'content=groups&columns=objid,group';
            return this.performPRTGAPIRequest('table.json', params);
        }
    
        /**
         * Query API for list of devices
         *
         * @return promise - JSON result set
         */
        performDeviceSuggestQuery(groupFilter) {
            var params = 'content=devices&columns=objid,device';
            if (groupFilter) {
                params += ',group' + groupFilter;
            }
            return this.performPRTGAPIRequest('table.json', params);
        }
    
        /**
         * Query API for list of sensors bound to a given device
         *
         * @return promise - JSON result set
         */
        performSensorSuggestQuery(deviceFilter) {
            var params = 'content=sensors&columns=objid,sensor,device,group' + deviceFilter;
            return this.performPRTGAPIRequest('table.json', params);
        }
    
        /**
         * Query API for list of channels bound to a given sensor
         * the sensor Id is unique to each device
         *
         * @return promise - JSON result set
         */
        performChannelSuggestQuery(sensorId, device) {
            var arr = [{"device": device}, {"sensor":sensorId}];
            var p = [];
            p = _.map(arr, a => {
                if (a.device && typeof a.device == "string") {
                     return this.getDeviceByName(a.device);
                }
                
                if (a.sensor && typeof a.sensor == "string") {
                    return this.getSensorByName(a.sensor,arr[0].device);
                }
                
            });
            
            return Promise.all(p).then(a => {
                var sensor = a[1][0].objid;
                var params = 'content=channels&columns=objid,channel,sensor,name&id=' + sensor;
                return this.performPRTGAPIRequest('table.json', params);
            });
        }
    
        /**
         *  For Templating: Retrieve device ObjId by it's name.
         */
        getDeviceByName(name)    {
            var params = 'content=devices&columns=objid,device&filter_device=' + name;
            return this.performPRTGAPIRequest('table.json', params);
        }

        /**
         *  For Templating: Retrieve Sensor ObjId by it's name and parent device ObjId
         */
        getSensorByName(name, device)    {
            var params = 'content=sensors&columns=objid,device,sensor&id=' + device;
            if (name !== '*') {
                params += '&filter_sensor=' + name;
            }   
            return this.performPRTGAPIRequest('table.json', params);
        }
    
        /**
         * For templating: Retrieve Channel id from its given name.
         * Sensor ID (number) required.
         */
        getChannelByName(name, sensor) {
            var params = 'content=channels&columns=objid,channel,channelid&id='+ sensor;
            if (name !== "*") {
                params = params.concat('&filter_channel=' + name);
            }
            return this.performPRTGAPIRequest('table.json', params);
        }
        
        filterMatch(item, filterStr) {
            if(utils.isRegex(filterStr)) {
                var rex = utils.buildRegex(filterStr);
                return rex.test(item);
            } else {
                return (item === filterStr);
            }
        }
        
        getHosts(groupFilter, hostFilter) {
            return this.performGroupSuggestQuery().then(groups => {
                var filteredGroups = _.filter(groups, group => {
                    return this.filterMatch(group.group, groupFilter);
                });
                //console.log('3: getHosts: filteredGroups: ' + JSON.stringify(filteredGroups,'',4));
                var filters = []; 
                _.each(filteredGroups, group => {
                    filters.push('filter_group=' + group.group);
                });
               
                return this.performDeviceSuggestQuery("''&" + filters.join('&')).then(devices => {
                    return _.filter(devices, device => {
                        return this.filterMatch(device.device, hostFilter);
                    });
                });
            });
        }
        
        getSensors (groupFilter, hostFilter, sensorFilter) {
            return this.getHosts(groupFilter, hostFilter).then(hosts => {
                var filters = [];
                _.each(hosts, host => {
                    filters.push('filter_device=' + host.device);
                });
                return this.performSensorSuggestQuery("''&" + filters.join('&')).then(sensors => {
                    return _.filter(sensors, sensor => {
                        return this.filterMatch(sensor.sensor, sensorFilter);
                    });
                });
            });
        }

        getAllItems(groupFilter, hostFilter, sensorFilter) {
            return this.getSensors(groupFilter, hostFilter, sensorFilter).then(sensors => {
                
                /**
                 * In this context, if i simply iterate an array with _.each and then execute performPRTGAPIRequest, even
                 * though the returned object is a promise which can be used in a chain, the execution falls outside of the existing
                 * promise chain and thus executs asynchronously. To keep everything in the same execution context, create a
                 * promise array for each object, then execute them in context.
                 */
                var promises = _.map(sensors, sensor => {
                    var params = 'content=channels&columns=objid,channel,sensor,name&id=' + sensor.objid;
                    return this.performPRTGAPIRequest('table.json', params)
                        .then(channels => {
                            /**
                             * Create an object that contains all of the information necessary to query this metric
                             */
                            return Promise.all(_.map(channels, channel => {
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
    
        getItems(groupFilter, deviceFilter, sensorFilter, channelFilter) {
            return this.getAllItems(groupFilter, deviceFilter, sensorFilter).then(items => {
                return _.filter(items, item => {
                    return this.filterMatch(item.name, channelFilter);
                });
            });
        }
        getItemsFromTarget(target) {
            /*
             * Flow: is group filter present?
             * yes: Get groups(filter)
             * no: get device
             */
            return this.getItems(target.group.name, target.device.name, target.sensor.name, target.channel.name);
                
        }
    
        /*
         * Replaces getValues
         */
        getItemHistory(sensor, channel, dateFrom, dateTo) {
            var hours = ((dateTo-dateFrom) / 3600);
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
                return this.performPRTGAPIRequest('getsensordetails.json', params).then(results => {
                    var statusid = results.statusid;
                    console.log("Status ID: " + statusid);  
                    var dt = Date.now();
                    result.push([statusid, dt]);
                    return result;
                });
            } else {
                return this.performPRTGAPIRequest(method, params).then(results => {
                
                    if (!results.histdata) {
                        return results;
                    }
                    var rCnt = results.histdata.item.length;

                    for (var i=0;i<rCnt;i++)
                    {
                        var v;
                        var prtgDate = results.histdata.item[i].datetime_raw;
                        var dt = new Date((prtgDate - (25569)) * 86400 * 1000);
                        //var dt = Math.round((results.histdata.item[i].datetime_raw - 25568) * 86400,0) * 1000;
                        if (results.histdata.item[i].value_raw && (results.histdata.item[i].value_raw.length > 0))
                        {
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
    
        /**
         * Retrieve messages for a given sensor.
         * 
         * @param from Earliest time in range
         * @param to Latest time in range
         * @sensorId Numeric ID of Sensor 
         */
        getMessages(from, to, sensorId) {
         var method = "table.json";
          var params = "&content=messages&columns=objid,datetime,parent,type,name,status,message&id=" + sensorId;
          return this.performPRTGAPIRequest(method, params).then(function(messages) {
            var events = [];
            var time = 0;
              _.each(messages, function(message) {
                time = Math.round((message.datetime_raw - 25569) * 86400,0);
                if (time > from && time < to) {
                  events.push({
                  time: time * 1000,
                  title: message.status,
                  text: '<p>' + message.parent + '(' + message.type + ') Message:<br>'+ message.message +'</p>'
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
angular.module('grafana.services').factory('PRTGAPIService', PRTGAPIService);
