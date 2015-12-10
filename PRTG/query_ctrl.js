/**
 * Grafana Datasource Plugin for PRTG API Interface (ALPHA)
 * Query Control Interface
 * 20151206 03:10 Jason Lashua
 * Proof of Concept. Based on publicly available plugins.
 *
 * DOES: Gets data by channel by device. Groups, Devices, Sensors and Channels available.
 * DOES NOT (yet): Trending, Histoic Data, Templating, Annotations
 */
define([
  'angular',
  'lodash'
],
function (angular, _) {
    'use strict';
    var module = angular.module('grafana.controllers');
    var targetLetters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    module.controller('PRTGQueryCtrl', function($scope, $sce, templateSrv) {
        $scope.init = function() {
            $scope.targetLetters = targetLetters;
            $scope.metric = {
                groupList: ["Loading..."],
                deviceList: ["Loading..."],
                sensorList: ["Loading..."],
                channelList: ["Loading..."]
            };

            //update the picklists
            $scope.updateGroupList();
            $scope.updateDeviceList();
            $scope.updateSensorList();
            $scope.updateChannelList();
            setChannelAlias();
            $scope.target.errors = validateTarget($scope.target);
        };

        /**
        * Take alias from channel name by default
        */
        function setChannelAlias() {
            if (!$scope.target.alias && $scope.target.channel) {
                $scope.target.alias = $scope.target.channel.name;
            }
        };

        $scope.targetBlur = function() {
            setChannelAlias();
            $scope.target.errors = validateTarget($scope.target);
            if (!_.isEqual($scope.oldTarget, $scope.target) && _.isEmpty($scope.target.errors)) {
                $scope.oldTarget = angular.copy($scope.target);
                $scope.get_data();
            }
        };
        
        //
        // the next series of functions performs queries that first populate the list of
        // groups, then populating subsequent lists once the lower item is selected

        $scope.selectGroup = function() {
            $scope.updateDeviceList();
            $scope.target.errors = validateTarget($scope.target);
            if (!_.isEqual($scope.oldTarget, $scope.target) && _.isEmpty($scope.target.errors)) {
                $scope.oldTarget = angular.copy($scope.target);
                $scope.get_data();
            }
        };

        $scope.selectDevice = function() {
            $scope.updateSensorList();
    
            $scope.target.errors = validateTarget($scope.target);
            if (!_.isEqual($scope.oldTarget, $scope.target) && _.isEmpty($scope.target.errors)) {
                $scope.oldTarget = angular.copy($scope.target);
                $scope.get_data();
            }
        };

        $scope.selectSensor = function() {
            $scope.updateChannelList();
            setChannelAlias();
            $scope.target.errors = validateTarget($scope.target);
            if (!_.isEqual($scope.oldTarget, $scope.target) && _.isEmpty($scope.target.errors)) {
                $scope.oldTarget = angular.copy($scope.target);
                $scope.get_data();
            }
        };

        $scope.selectChannel = function() {
            $scope.target.errors = validateTarget($scope.target);
            if (!_.isEqual($scope.oldTarget, $scope.target) && _.isEmpty($scope.target.errors)) {
                $scope.oldTarget = angular.copy($scope.target);
                $scope.get_data();
            }
        };
		
		$scope.updateChannel = function() {
            $scope.target.errors = validateTarget($scope.target);
            if (!_.isEqual($scope.oldTarget, $scope.target) && _.isEmpty($scope.target.errors)) {
				$scope.target.channel.name = number($scope.oldTarget.channel.name) + $scope.target.channelFilter;
				console.log ("channelfilter: old channel " + $scope.oldTarget.channel.name + " + " + $scope.target.channelFilter);
                $scope.oldTarget = angular.copy($scope.target);
                $scope.get_data();
            }
		}
			

        $scope.duplicate = function() {
            var clone = angular.copy($scope.target);
            $scope.panel.targets.push(clone);
        };

        $scope.moveMetricQuery = function(fromIndex, toIndex) {
            _.move($scope.panel.targets, fromIndex, toIndex);
        };

        //
        // this section incorporates the logic to query the API to get list items
        //
        
        $scope.updateGroupList = function() {
            $scope.metric.groupList = [{name: '*', visible_name: 'All'}];
            addTemplatedVariables($scope.metric.groupList);
            $scope.datasource.prtgAPI.performGroupSuggestQuery().then(function (groups) {
                for(var i=0;i<groups.length;i++)
                {
                    $scope.metric.groupList = $scope.metric.groupList.concat({name: groups[i].group, visible_name: groups[i].group})
                }
            });
        };
        
        $scope.updateDeviceList = function() {
            $scope.metric.deviceList = [{name: '*', visible_name: 'All'}];
            addTemplatedVariables($scope.metric.deviceList);
            if ($scope.target.group) {
                var groups = $scope.target.group.name || undefined;
            }
            $scope.datasource.prtgAPI.performDeviceSuggestQuery(groups).then(function (devices) {
                for (var i=0;i<devices.length;i++) {
                    $scope.metric.deviceList = $scope.metric.deviceList.concat({name: devices[i].objid, visible_name: devices[i].device});
                }
            });
        };

        $scope.updateSensorList = function() {
            $scope.metric.sensorList = [{name: '*', visible_name: 'All'}];
            addTemplatedVariables($scope.metric.sensorList);
            if ($scope.target.device) {
                var devices = $scope.target.device.name || undefined;
            }
            $scope.datasource.prtgAPI.performSensorSuggestQuery(devices).then(function (sensors) {
                for (var i=0;i<sensors.length;i++) {
                    //when querying metrics, the unique id is the sensor ID so for this list we use the ID as opposed to the name
                    $scope.metric.sensorList = $scope.metric.sensorList.concat({name: sensors[i].objid, visible_name: sensors[i].sensor })
                }
            });
        };

        $scope.updateChannelList = function() {
            $scope.metric.channelList = [{name: '*', visible_name: 'All'},{name: '!', visible_name: 'Last Message'}];
            addTemplatedVariables($scope.metric.channelList);
            if ($scope.target.sensor) {
                var sensor = $scope.target.sensor.name || undefined;
            }
            $scope.datasource.prtgAPI.performChannelSuggestQuery(sensor).then(function (channels) {
                //PRTG always puts the downtime channel (-4) at the end of the list of values.
                //because it doesn't return values with a channel id, I rely on the array index to identify the proper channel.
                //therefore the channel list must be ordered the same way it would be when returning values. 
                channels.sort(function(a,b)
                {
                   if (a.objid == -4) return 1;
				   if (a.objid == -1) return -1;
                   if (a.objid > b.objid) return 1;
                   if (a.objid < b.objid) return -1;
                   return 0;
                });
                for (var i=0;i<channels.length;i++)
                {
                    $scope.metric.channelList = $scope.metric.channelList.concat({name: i, visible_name: $scope.target.device.visible_name + ': ' + channels[i].name});
                }
            });
        };

        /**
        * Add templated variables to list of available metrics
        *
        * @param {Array} metricList List of metrics which variables add to
        */
        function addTemplatedVariables(metricList) {
            _.each(templateSrv.variables, function(variable) {
                metricList.push({
                    name: '$' + variable.name,
                    templated: true
                });
            });
        };

        // just validate the target exists for now.
        function validateTarget(target) {
            var errs = {};
            if (!target) {
                errs = 'Not defined';
            }
            return errs;
        };
        $scope.init();
    });

});
