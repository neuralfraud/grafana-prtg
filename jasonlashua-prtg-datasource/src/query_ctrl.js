/**
 * Grafana Datasource Plugin for PRTG API Interface (ALPHA)
 * Query Control Interface
 * 20170715 Jason Lashua
 *
 * Updated for es6
 */

import {QueryCtrl} from 'app/plugins/sdk';
import _ from 'lodash';
import * as utils from './utils';
import './css/query-editor.css!';

//zabbix style function editor, create angular directives to provide flyout menu to select functions
//import './add-metric-function.directive';
//import './metric-function-editor.directive';

export class PRTGQueryController extends QueryCtrl {

  constructor($scope, $injector, $rootScope, $sce, templateSrv) {
    super($scope, $injector);
    $scope.$on('typeahead-updated', () => {
      this.targetChange();
    });
    
    $rootScope.$on('template-variable-value-updated', () => this.variableChanged());
    
    this.init = function() {
      var target = this.target;
      this.templateSrv = templateSrv;
      this.targetLetters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
      var scopeDefaults = {
        metric: {},
        oldTarget: _.cloneDeep(this.target)
      };
      _.defaults(this, scopeDefaults);
      
      // Load default values
      var targetDefaults = {
        group: { name: "" },
        device: { name: "" },
        sensor: { name: "" },
        channel: { name: "" },
        functions: [],
        options: {}
      };
      _.defaults(target, targetDefaults);

      
      this.updateGroupList();
      this.updateDeviceList();
      this.updateSensorList();
      this.updateChannelList();

      this.target.errors = this.validateTarget(target);
    
      //the zabbix-grafana guys are way more smarter than i am, brilliant idea.      
      this.getGroupNames = _.partial(getMetricNames, this, 'groupList');
      this.getDeviceNames = _.partial(getMetricNames, this, 'deviceList');
      this.getSensorNames = _.partial(getMetricNames, this, 'sensorList');
      this.getChannelNames = _.partial(getMetricNames, this, 'channelList');
    };
    
    this.init();
  }
  
 
  // take action on target update and refresh the model? whatever the hell angular actually does is beyond me... 
  targetChange() {
    var newTarget = _.cloneDeep(this.target);
    if (!_.isEqual(this.oldTarget, this.target)) {
      this.oldTarget = newTarget;
      this.panelCtrl.refresh();
    }
  }
  
  variableChanged() {
    
    _.some(['group','device','sensor'], item => {
        if(this.target[item].name.indexOf('$') > 0) {
            this.targetChange();
          } 
      });
  }

  /*
   * Select functions: when a object is selected or typed into the input,
   * refresh the next list based on the data entered in the previous input.
   * This is all necessary because the only way to get values from PRTG is by knowing a sensor ID
   * So we basically perform a single object search, one peice at a time, then we know the sensor ID, and the channel name can be picked.
   */
  selectGroup() {
    this.targetChange();
    this.updateDeviceList();
  }
  
  selectDevice() {
    this.targetChange();
    this.updateSensorList();
  }
  
  selectSensor() {
    this.targetChange();
    this.updateChannelList();
  }
  
  selectChannel() {
    this.targetChange();
  }
  
  /*
   * Update the content of each list
  */   
  updateGroupList() {
    this.metric.groupList = [{name: '*', visible_name: 'All'}];
    this.addTemplatedVariables(this.metric.groupList);
    this.datasource.prtgAPI.performGroupSuggestQuery().then(groups => {
      _.map(groups, group => { 
        this.metric.groupList.push({name: group.group, visible_name: group.group});
      });
    });
  }
  
  updateDeviceList() {
    var groupFilter = this.templateSrv.replace(this.target.group.name);
   //console.log("groupFilter: " + groupFilter);
    this.metric.deviceList = [{name: '*', visible_name: 'All'}];
    this.addTemplatedVariables(this.metric.deviceList);
    
    this.datasource.prtgAPI.getHosts(groupFilter, '/.*/').then(devices => {
      _.map(devices, device => {
        this.metric.deviceList.push({name: device.device, visible_name: device.device});
      });
    });
  }

  updateSensorList() {
    var groupFilter = this.templateSrv.replace(this.target.group.name);
    var deviceFilter = this.templateSrv.replace(this.target.device.name);
   //console.log("deviceFilter: " + deviceFilter);
    this.metric.sensorList = [{name: '*', visible_name: 'All'}];
    this.addTemplatedVariables(this.metric.sensorList);
    //I know this is grossly inefficient.
    //console.log('updateSensorList: getSensors(' + this.targetItems.group + ', ' + this.targetItems.device + ', ' + this.targetItems.sensor +')');
   //console.log("updateSensorList: getSensors(" + groupFilter + ", " + deviceFilter + ", /.*/");
    this.datasource.prtgAPI.getSensors(groupFilter, deviceFilter, '/.*/').then(sensors => {
      //console.log("updateSensorList: devices : " + JSON.stringify(devices,'',4));
      _.map(sensors, sensor => {
        this.metric.sensorList.push({name: sensor.sensor, visible_name: sensor.sensor});
      });
    });
  }

  updateChannelList() {
    var groupFilter = this.templateSrv.replace(this.target.group.name);
    var deviceFilter = this.templateSrv.replace(this.target.device.name);
    var sensorFilter = this.templateSrv.replace(this.target.sensor.name);
    this.metric.channelList = [{name: 'status', visible_name: 'Last Message'},{name: 'messages', visible_name: 'Messages'}];
    this.addTemplatedVariables(this.metric.channelList);
    if (this.target.sensor) {
      //this.datasource.prtgAPI.performChannelSuggestQuery(sensor, device).then(channels => {
      this.datasource.prtgAPI.getAllItems(groupFilter, deviceFilter, sensorFilter).then(channels => {
        _.map(channels, channel => {
          this.metric.channelList.push({name: channel.name, visible_name: channel.name});
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
  
  isRegex(str) {
    return utils.isRegex(str);
  }

  isVariable(str) {
    return utils.isTemplateVariable(str);
  }  
}

// Set templateUrl as static property
PRTGQueryController.templateUrl = './partials/query.editor.html';

// I stole this from grafana-zabbix, err, I mean, I was inspired by grafana-zabbix ;) 
function getMetricNames(scope, metricList) {  
  return _.uniq(_.map(scope.metric[metricList], 'name'));
}
