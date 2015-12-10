/**
 * Grafana Datasource Plugin for PRTG API Interface (ALPHA)
 * API Wrapper; Queries and processes data from the PRTG API
 * 20151208 23:10 Jason Lashua
 * Almost Beta.
 *
 * DOES: Gets data by channel by device. Groups, Devices, Sensors and Channels available.
 * DOES NOT (yet): Trending, Histoic Data, Templating, Annotations
 */
define([
  'angular',
  'lodash',
  './xmlparser'
],
function (angular, _) {
  'use strict';

  var module = angular.module('grafana.services');

  module.factory('PRTGAPI', function($q, backendSrv) {

    function PRTGAPI(api_url, username, password, useCache, cacheTimeoutMinutes) {
      this.url              = api_url;
      this.username         = username;
      this.password         = password;
      this.passhash         = null;
      this.lastId           = false;
      this.cache            = {};
	  this.useCache = 		useCache;
	  this.cacheTimeoutMinutes = cacheTimeoutMinutes;
    };
    
      
    var p = PRTGAPI.prototype;
    
    /**
     * Check if a given URL has already been retrieved and exists within the cache.
     * if cache is turned off then this will always return false.
     * 
     * @param  url the URL for a given request
     * @return boolean
     */
    p.inCache = function(url)
    {
      if ((Date.now() - this.cache[this.hashValue(url)]) > (this.cacheTimeoutMinutes * 60 * 1000)) {
        //console.log("inCache expired for url " + url);
        return false;
      }
      if (this.useCache && this.cache[this.hashValue(url)]) {
        //console.log("inCache returned TRUE for " + url);
        return true;
      }
      //console.log("inCache returned FALSE for " + url + "; useCache: " + this.useCache);
      return false;
    }
    
    /**
     * retrieves a cached data result from the cache
     *
     * @param  url the URL of the request
     * @return promise
     */
    p.getCache = function(url)
    {
      var d = $q.defer();
      //console.log("getCache: retrieving result for url " + url);
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
    p.setCache = function(url, data)
    {
      var d = $q.defer();
      //console.log("setCache: storing result for url " + this.hashValue(url));
      this.cache[this.hashValue(url)] = data
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
    p.hashValue = function(e){for(var r=0,i=0;i<e.length;i++)r=(r<<5)-r+e.charCodeAt(i),r&=r;return r};
    
    /**
     * pad date parts and optionally add one
     */
	p.pad = function(i,a)
	{
		if (a) return ("0" + (i + 1)).slice(-2);
		return ("0" + i).slice(-2);
	}
    
    /**
     * convert a UNIX timestamp into a PRTG date string for queries
     * YYYY-MM-DD-HH-MM-SS
     */
	p.getPRTGDate = function(unixtime) 
	{
		var d = new Date(unixtime * 1000);
		var s = [d.getFullYear(), p.pad(d.getMonth(),true), p.pad(d.getDate()), p.pad(d.getHours()), p.pad(d.getMinutes()), p.pad(d.getSeconds())];
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
    p.performPRTGAPIRequest = function(method, params) {
      
      
      /*
       *if (this.passhash === null) {
        return this.performPRTGAPILogin().then(function (result) {
          if (result !== null) {
            return result;
          }
          console.log("API LOGIN FAILURE. CHECK CREDENTIALS!");
          return false;
        });
      }
      */
      
      var queryString = 'username=' + this.username + '&password=' + this.password + '&' + params;
      var options = {
        method: 'GET',
        url: this.url + '/' + method + '?' + queryString
      };
      
      var d = $q.defer(); //required to keep execution within the originating promise's context
      if (this.inCache(options.url)) {
        return this.getCache(options.url);
      } else {
        return this.setCache(options.url, backendSrv.datasourceRequest(options).then(function (response) {
          if (!response.data) {
            return[];
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
          } else {
            //All else is XML from table.xml so throw it into the transformer and get JSON back.
            return new xmlXform(method, response.data);
            //return JSON.parse(response.data); // unreliable, incorrect JSON returned from API
          }
        }));
      }   
    }
    
    p.getVersion = function() {
      return this.performPRTGAPIRequest('status.json').then(function (response) {
        if (!response)
        {
          return "ERROR. No response.";
        } else {
          return response.Version;
        }
      });
    };
    
    /**
     * Authenticate to the PRTG interface
     * not implemented yet (pass username/pass as query string/POST data)
     */
    p.performPRTGAPILogin = function() {
        var username = this.username;
        var password = this.password;
        var options = {
          method: 'GET',
          url: this.url + "/getpasshash.htm?username=" + username + "&password=" + password
        }
        var self = this;
        return backendSrv.datasourceRequest(options).then(function (response) {
          if (!response)
          {
            return false;
          }
          self.passhash = response;
          return true;
        });
      };
    
    /**
     * Query API for list of groups
     *
     * @return promise - JSON result set
     */
    p.performGroupSuggestQuery = function() {
      var params = 'content=groups&columns=objid,group';
      return this.performPRTGAPIRequest('table.json', params);
    };
    
    /**
     * Query API for list of devices
     *
     * @return promise - JSON result set
     */
    p.performDeviceSuggestQuery = function(groupName) {
      var params = 'content=devices&columns=objid,device';
      if (groupName) {
          params += ',group&filter_group=' + groupName;
      }
      return this.performPRTGAPIRequest('table.json', params);
    };
    
    /**
     * Query API for list of sensors bound to a given device
     *
     * @return promise - JSON result set
     */
    p.performSensorSuggestQuery = function(deviceId) {
      var params = 'content=sensors&columns=objid,sensor,device,group&id=' + deviceId;
      return this.performPRTGAPIRequest('table.json', params);
    };
    
    /**
     * Query API for list of channels bound to a given sensor
     * the sensor Id is unique to each device
     *
     * @return promise - JSON result set
     */
    p.performChannelSuggestQuery = function(sensorId) {
      var params = 'content=channels&columns=objid,channel,name&id=' + sensorId;
      return this.performPRTGAPIRequest('table.json', params);
    };
      
    /**
     * Query API for data of a given sensorId and then return the
     * matching channel data
     *
     * @param  sensorId
     * @param  channelId
     * @return array
     */
    p.getValues = function(sensorId, channelId, dateFrom, dateTo) {
		var hours = ((dateTo-dateFrom) / 3600)
		//console.log("hours: " + hours);
		var avg = 0;
        if (hours > 12 && hours < 36)
        {
            avg = "300";
        } else if (hours > 36 && hours < 745) {
            avg = "3600";
        } else if (hours > 745) {
            avg = "86400";
        }
    
        var method = "historicdata.xml";
        var params = "id=" + sensorId + "&sdate=" + this.getPRTGDate(dateFrom) + "&edate=" + this.getPRTGDate(dateTo) + "&avg=" + avg + "&pctshow=false&pctmode=false"

        if (channelId == '!') {
			var params = "&id=" + sensorId;
			return this.performPRTGAPIRequest('getsensordetails.json', params).then(function (results) {
				var message = results.lastmessage;
				var timestamp = results.lastcheck.replace(/(\s\[[\d\smsago\]]+)/g,'');
				//i dont care about repeating this once
				var dt = Math.round((timestamp - 25569) * 86400,0) * 1000;
				return [message, dt];
			});
		} else {
			/*var params = "&content=values&sortby=-datetime&columns=datetime,value_&id=" + sensorId;
			params = params.concat("&graphid=0"); */
			console.log("get query sensor: " + sensorId + " channel: " + channelId);
			return this.performPRTGAPIRequest(method, params).then(function(results){
				var result = [];
				var rCnt = results.histdata.item.length;

				for (var i=0;i<rCnt;i++)
				{
					
					var dt = Math.round((results.histdata.item[i].datetime_raw - 25569) * 86400,0) * 1000;
					if (results.histdata.item[i].value_raw && (results.histdata.item[i].value_raw.length > 0))
					{	
						var v = Number(results.histdata.item[i].value_raw[channelId].text);
					} else if (results.histdata.item[i].value_raw) {
						var v = Number(results.histdata.item[i].value_raw.text);
					}
					result.push([v, dt]);
					
				}
				return result;
			});
		}
    }
    
    /**
     * Retrieve messages by sensor
     */
    p.getMessages = function(from, to, sensorId) {
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
    
    return PRTGAPI;
  });
});