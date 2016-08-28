import angular from 'angular';
import _ from 'lodash';
import { XMLXform } from './xmlparser';
/**
 * PRTG API Service
 * Implements the high level functions that process data from PRTG
 */

/** @ngInject */
function PRTGAPIService($q, alertSrv, backendSrv) {
    
    class PRTGAPI {
        constructor (api_url, username, password, useCache, cacheTimeoutMinutes) {
          this.url              = api_url;
          this.username         = username;
          this.password         = password;
          this.passhash         = null;
          this.lastId           = false;
          this.cache            = {};
          this.useCache = 		useCache;
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
            if (this.useCache && this.cache[this.hashValue(url)]) {
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
            var d = $q.defer();
            d.resolve(this.cache[this.hashValue(url)]);
            return d.promise;
        }
        
        /**
        * stores a data result in the cache
        *
        * @param  url the URL of the request
        * @param  data the response.data object of the request
        * @return promise
        */
        setCache(url, data)    {
            var d = $q.defer();
            this.cache[this.hashValue(url)] = data;
            d.resolve(this.cache[this.hashValue(url)]);
            return d.promise;
        }
        
        /**
        * simple clone of a java hash value
        * Kevin "Pancake" (http://werxltd.com/wp/2010/05/13/javascript-implementation-of-javas-string-hashcode-method/)
        *
        * @param  e string to hash
        * @return int32
        */
        hashValue(e)    {for(var r=0,i=0;i<e.length;i++)r=(r<<5)-r+e.charCodeAt(i),r&=r;return r}
        
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
            //console.log("date string: " + s.join("-"));
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
            var queryString = 'username=' + this.username + '&password=' + this.password + '&' + params;
            var options = {
                method: 'GET',
                url: this.url + '/' + method + '?' + queryString
            };
      
            var d = $q.defer(); //required to keep execution within the originating promise's context
            if (this.inCache(options.url)) {
              return this.getCache(options.url);
            } else {
              return this.setCache(options.url, this.backendSrv.datasourceRequest(options).then(function (response) {
                if (!response.data) {
                  d.reject({message: "Response contained no data"});
                  return d.promise;
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
                    d.reject({message: "<p style=\"font-size: 150%; font-weight: bold\">Not enough monitoring data.</p><p>Request:<br> &quot;" + params + "&quot;</p>"});
                    return d.promise;
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
                d.reject(err);
                return d.promise;
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
            var password = this.password;
            var options = {
                method: 'GET',
                url: this.url + "/getpasshash.htm?username=" + username + "&password=" + password
            };
            var self = this; //fix for es6? 
            return this.backendSrv.datasourceRequest(options).then(function (response) {
                self.passhash = response;
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
        performDeviceSuggestQuery(groupName) {
            var params = 'content=devices&columns=objid,device';
            if (groupName) {
                params += ',group&filter_group=' + groupName;
            }
            return this.performPRTGAPIRequest('table.json', params);
        }
    
        /**
         * Query API for list of sensors bound to a given device
         *
         * @return promise - JSON result set
         */
        performSensorSuggestQuery(deviceId) {
            var params = 'content=sensors&columns=objid,sensor,device,group&filter_device=' + deviceId;
            return this.performPRTGAPIRequest('table.json', params);
        }
    
        /**
         * Query API for list of channels bound to a given sensor
         * the sensor Id is unique to each device
         *
         * @return promise - JSON result set
         */
        performChannelSuggestQuery(sensorId, device) {
            var self = this;
            var arr = [{"device": device}, {"sensor":sensorId}];
            var p = [];
            p = _.map(arr, function(a) {
                if (a.device && typeof a.device == "string") {
                     return self.getDeviceByName(a.device);
                }
                
                if (a.sensor && typeof a.sensor == "string") {
                    return self.getSensorByName(a.sensor,arr[0].device);
                }
                
            });
            
            return $q.all(p).then(function(a) {
                var sensor = a[1][0].objid;
                var params = 'content=channels&columns=objid,channel,sensor,name&id=' + sensor;
                return self.performPRTGAPIRequest('table.json', params);
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
            var params = 'content=sensors&columns=objid,device,sensor&id=' + device + '&filter_sensor=' + name;
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
    
        /**
         * Query API for data of a given sensorId and then return the
         * matching channel data
         * @param deviceId Name of Device
         * @param  sensorId Name of Sensor
         * @param  channelId Name of Channel
         * @param dateFrom  Earliest time in range
         * @param dateTo Latest time in range
         * @return array
         */
        getValues(deviceId, sensorId, channelId, dateFrom, dateTo) {
            var self = this;
            return this.getDeviceByName(deviceId).then(function (deviceObj) {
                try {
                    var device = deviceObj[0].objid;
                } catch (e) {
                    return [];
                }
                return self.getSensorByName(sensorId, device).then(function(sensorObj) {
                    var sensor = sensorObj[0].objid;
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
                    var params = "id=" + sensor + "&sdate=" + self.getPRTGDate(dateFrom) + "&edate=" + self.getPRTGDate(dateTo) + "&avg=" + avg + "&pctshow=false&pctmode=false";
            
                    if (channelId == '!') {
                        var params = "&id=" + sensor;
                        return self.performPRTGAPIRequest('getsensordetails.json', params).then(function (results) {
                            var message = results.lastmessage;
                            var timestamp = results.lastcheck.replace(/(\s\[[\d\smsago\]]+)/g,'');
                            var dt = Math.round((timestamp - 25569) * 86400,0) * 1000;
                            return [message, dt];
                        });
                    } else {
                        return self.performPRTGAPIRequest(method, params).then(function(results) {
                            var result = [];
                            if (!results.histdata) {
                                return results;
                            }
                            var rCnt = results.histdata.item.length;
        
                            for (var i=0;i<rCnt;i++)
                            {
                                
                                var dt = Math.round((results.histdata.item[i].datetime_raw - 25569) * 86400,0) * 1000;
                                if (results.histdata.item[i].value_raw && (results.histdata.item[i].value_raw.length > 0))
                                {
                                    for (var j = 0; j < results.histdata.item[i].value_raw.length; j++) {
                                      //workaround for SNMP Bandwidth Issue #3. Check for presence of (speed) suffix, and use that.
                                      if (results.histdata.item[i].value_raw[j].channel.match(channelId + " (speed)") || results.histdata.item[i].value_raw[j].channel == channelId) {
                                        var v = Number(results.histdata.item[i].value_raw[j].text);
                                      }
                                    }
                                } else if (results.histdata.item[i].value_raw) {
                                    var v = Number(results.histdata.item[i].value_raw.text);
                                }
                                result.push([v, dt]);
                            }
                            return result;
                        });
                    }
                });
            });
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
