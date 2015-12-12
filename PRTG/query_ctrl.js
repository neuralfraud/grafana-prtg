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
                _.map(groups, function(group) {
                    $scope.metric.groupList.push({name: group.group, visible_name: group.group});
                });
            });
        };
        
        $scope.updateDeviceList = function() {
            $scope.metric.deviceList = [{name: '*', visible_name: 'All'}];
            addTemplatedVariables($scope.metric.deviceList);
            if ($scope.target.group) {
                var groups = $scope.target.group.name || undefined;
            }
            if (typeof groups == "string") {
                groups = templateSrv.replace(groups);
            }
            $scope.datasource.prtgAPI.performDeviceSuggestQuery(groups).then(function (devices) {
                _.map(devices, function(device) {
                    $scope.metric.deviceList.push({name: device.device, visible_name: device.device});
                });
            });
        };

        $scope.updateSensorList = function() {
            $scope.metric.sensorList = [{name: '*', visible_name: 'All'}];
            addTemplatedVariables($scope.metric.sensorList);
            if ($scope.target.device) {
                var device = $scope.target.device.name || undefined;
            }
            if (typeof device == "string") {
                device = templateSrv.replace(device);
            }
            $scope.datasource.prtgAPI.performSensorSuggestQuery(device).then(function (sensors) {
                _.map(sensors, function(sensor) {
                    $scope.metric.sensorList.push({name: sensor.sensor, visible_name: sensor.sensor});
                });
            });
        };

        $scope.updateChannelList = function() {
            $scope.metric.channelList = [{name: '*', visible_name: 'All'},{name: '!', visible_name: 'Last Message'}];
            addTemplatedVariables($scope.metric.channelList);
            if ($scope.target.sensor) {
                var sensor = $scope.target.sensor.name || undefined;
                if (typeof sensor == "string") {
                   sensor = templateSrv.replace(sensor);
                   var device = templateSrv.replace($scope.target.device.name);
                }
                $scope.datasource.prtgAPI.performChannelSuggestQuery(sensor, device).then(function (channels) {
                    _.map(channels, function(channel) {
                        $scope.metric.channelList.push({name: channel.name, visible_name: $scope.target.sensor.visible_name + ": " + channel.name});
                    });
                });
            }
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
