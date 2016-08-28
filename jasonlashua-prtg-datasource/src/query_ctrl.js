/**
 * Grafana Datasource Plugin for PRTG API Interface (ALPHA)
 * Query Control Interface
 * 20151206 03:10 Jason Lashua
 * Proof of Concept. Based on publicly available plugins.
 *
 * DOES: Gets data by channel by device. Groups, Devices, Sensors and Channels available.
 * DOES NOT (yet): Trending, Histoic Data, Templating, Annotations
 */

import {QueryCtrl} from 'app/plugins/sdk';
import _ from 'lodash';

export class PRTGQueryController extends QueryCtrl {

  // ZabbixQueryCtrl constructor
  constructor($scope, $injector, $sce, $q, templateSrv) {

  
    // Call superclass constructor
    super($scope, $injector);
    this.init = function() {
      var target = this.target;
      this.templateSrv = templateSrv;
      this.targetLetters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
      var scopeDefaults = {
        metric: {},
        oldTarget: _.cloneDeep(this.target)
      };
      _.defaults(this, scopeDefaults);

      this.metric = {
        groupList: ["Loading..."],
        deviceList: ["Loading..."],
        sensorList: ["Loading..."],
        channelList: ["Loading..."]
      };
      
      //update the picklists
      this.updateGroupList();
      this.updateDeviceList();
      this.updateSensorList();
      this.updateChannelList();
      this.setChannelAlias();
      this.target.errors = this.validateTarget(target);
    };
    this.init();
  }
  /**
  * Take alias from channel name by default
  */
  setChannelAlias() {
    if (!this.target.alias && this.target.channel) {
      this.target.alias = this.target.channel.name;
    }
  }
  
  targetBlur() {
    this.setChannelAlias();
    this.target.errors = validateTarget(this.target);
    if (!_.isEqual(this.oldTarget, this.target) && _.isEmpty(this.target.errors)) {
      this.oldTarget = angular.copy(this.target);
      this.panelCtrl.refresh();
    }
  }

  //
  // the next series of functions performs queries that first populate the list of
  // groups, then populating subsequent lists once the lower item is selected
  
  selectGroup() {
    this.updateDeviceList();
    this.target.errors = this.validateTarget(this.target);
    if (!_.isEqual(this.oldTarget, this.target) && _.isEmpty(this.target.errors)) {
      this.oldTarget = angular.copy(this.target);
      this.panelCtrl.refresh();
    }
  }
  
  selectDevice() {
    this.updateSensorList();
    
    this.target.errors = this.validateTarget(this.target);
    if (!_.isEqual(this.oldTarget, this.target) && _.isEmpty(this.target.errors)) {
      this.oldTarget = angular.copy(this.target);
      this.panelCtrl.refresh();
    }
  }
  
  selectSensor() {
    this.updateChannelList();
    this.setChannelAlias();
    this.target.errors = this.validateTarget(this.target);
    if (!_.isEqual(this.oldTarget, this.target) && _.isEmpty(this.target.errors)) {
      this.oldTarget = angular.copy(this.target);
      this.panelCtrl.refresh();
    }
  }
  
  selectChannel() {
    this.target.errors = this.validateTarget(this.target);
    if (!_.isEqual(this.oldTarget, this.target) && _.isEmpty(this.target.errors)) {
      this.oldTarget = angular.copy(this.target);
      this.panelCtrl.refresh();
    }
  }
  
  updateChannel() {
    this.target.errors = this.validateTarget(this.target);
    if (!_.isEqual(this.oldTarget, this.target) && _.isEmpty(this.target.errors)) {
      this.target.channel.name = number(this.oldTarget.channel.name) + this.target.channelFilter;
      this.oldTarget = angular.copy(this.target);
      this.panelCtrl.refresh();
    }
  }


  duplicate() {
    var clone = angular.copy(this.target);
    this.panel.targets.push(clone);
  }

  moveMetricQuery(fromIndex, toIndex) {
    _.move(this.panel.targets, fromIndex, toIndex);
  }

  //
  // this section incorporates the logic to query the API to get list items
  //
  
  updateGroupList() {
    var self = this;
    self.metric.groupList = [{name: '*', visible_name: 'All'}];
    this.addTemplatedVariables(self.metric.groupList);
    this.datasource.prtgAPI.performGroupSuggestQuery().then(function (groups) {
      _.map(groups, function(group) {
        self.metric.groupList.push({name: group.group, visible_name: group.group});
      });
    });
  }
  
  updateDeviceList() {
    var self = this;
    var groups;
    self.metric.deviceList = [{name: '*', visible_name: 'All'}];
    this.addTemplatedVariables(self.metric.deviceList);
    if (this.target.group) {
      groups = this.target.group.name || undefined;
    }
    if (typeof groups == "string") {
      groups = this.templateSrv.replace(groups);
    }
    this.datasource.prtgAPI.performDeviceSuggestQuery(groups).then(function (devices) {
      _.map(devices, function(device) {
        self.metric.deviceList.push({name: device.device, visible_name: device.device});
      });
    });
  }

  updateSensorList() {
    var self = this;
    var device;
    self.metric.sensorList = [{name: '*', visible_name: 'All'}];
    this.addTemplatedVariables(self.metric.sensorList);
    if (this.target.device) {
      device = this.target.device.name || undefined;
    }
    if (typeof device == "string") {
      device = this.templateSrv.replace(device);
    }
    this.datasource.prtgAPI.performSensorSuggestQuery(device).then(function (sensors) {
      _.map(sensors, function(sensor) {
        self.metric.sensorList.push({name: sensor.sensor, visible_name: sensor.sensor});
      });
    });
  }

  updateChannelList() {
    var self = this;
    var sensor, device;
    self.metric.channelList = [{name: '*', visible_name: 'All'},{name: '!', visible_name: 'Last Message'}];
    this.addTemplatedVariables(self.metric.channelList);
    if (this.target.sensor) {
      sensor = this.target.sensor.name || undefined;
      if (typeof sensor == "string") {
        sensor = this.templateSrv.replace(sensor);
        device = this.templateSrv.replace(self.target.device.name);
      }
      this.datasource.prtgAPI.performChannelSuggestQuery(sensor, device).then(function (channels) {
        _.map(channels, function(channel) {
          self.metric.channelList.push({name: channel.name, visible_name: self.target.sensor.visible_name + ": " + channel.name});
        });
      });
    }
  }

  /**
  * Add templated variables to list of available metrics
  *
  * @param {Array} metricList List of metrics which variables add to
  */
  addTemplatedVariables(metricList) {
    _.each(this.templateSrv.variables, function(variable) {
      metricList.push({
        name: '$' + variable.name,
        templated: true
      });
    });
  }

  // just validate the target exists for now.
  validateTarget(target) {
    var errs = {};
    if (!target) {
      errs = 'Not defined';
    }
    return errs;
  }
}

// Set templateUrl as static property
PRTGQueryController.templateUrl = './partials/query.editor.html';

