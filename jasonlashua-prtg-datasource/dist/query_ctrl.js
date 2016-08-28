'use strict';

System.register(['app/plugins/sdk', 'lodash'], function (_export, _context) {
  "use strict";

  var QueryCtrl, _, _createClass, PRTGQueryController;

  function _classCallCheck(instance, Constructor) {
    if (!(instance instanceof Constructor)) {
      throw new TypeError("Cannot call a class as a function");
    }
  }

  function _possibleConstructorReturn(self, call) {
    if (!self) {
      throw new ReferenceError("this hasn't been initialised - super() hasn't been called");
    }

    return call && (typeof call === "object" || typeof call === "function") ? call : self;
  }

  function _inherits(subClass, superClass) {
    if (typeof superClass !== "function" && superClass !== null) {
      throw new TypeError("Super expression must either be null or a function, not " + typeof superClass);
    }

    subClass.prototype = Object.create(superClass && superClass.prototype, {
      constructor: {
        value: subClass,
        enumerable: false,
        writable: true,
        configurable: true
      }
    });
    if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass;
  }

  return {
    setters: [function (_appPluginsSdk) {
      QueryCtrl = _appPluginsSdk.QueryCtrl;
    }, function (_lodash) {
      _ = _lodash.default;
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

      _export('PRTGQueryController', PRTGQueryController = function (_QueryCtrl) {
        _inherits(PRTGQueryController, _QueryCtrl);

        // ZabbixQueryCtrl constructor
        function PRTGQueryController($scope, $injector, $sce, $q, templateSrv) {
          _classCallCheck(this, PRTGQueryController);

          var _this = _possibleConstructorReturn(this, (PRTGQueryController.__proto__ || Object.getPrototypeOf(PRTGQueryController)).call(this, $scope, $injector));

          _this.init = function () {
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
          _this.init();
          return _this;
        }
        /**
        * Take alias from channel name by default
        */


        _createClass(PRTGQueryController, [{
          key: 'setChannelAlias',
          value: function setChannelAlias() {
            if (!this.target.alias && this.target.channel) {
              this.target.alias = this.target.channel.name;
            }
          }
        }, {
          key: 'targetBlur',
          value: function targetBlur() {
            this.setChannelAlias();
            this.target.errors = validateTarget(this.target);
            if (!_.isEqual(this.oldTarget, this.target) && _.isEmpty(this.target.errors)) {
              this.oldTarget = angular.copy(this.target);
              this.panelCtrl.refresh();
            }
          }
        }, {
          key: 'selectGroup',
          value: function selectGroup() {
            this.updateDeviceList();
            this.target.errors = this.validateTarget(this.target);
            if (!_.isEqual(this.oldTarget, this.target) && _.isEmpty(this.target.errors)) {
              this.oldTarget = angular.copy(this.target);
              this.panelCtrl.refresh();
            }
          }
        }, {
          key: 'selectDevice',
          value: function selectDevice() {
            this.updateSensorList();

            this.target.errors = this.validateTarget(this.target);
            if (!_.isEqual(this.oldTarget, this.target) && _.isEmpty(this.target.errors)) {
              this.oldTarget = angular.copy(this.target);
              this.panelCtrl.refresh();
            }
          }
        }, {
          key: 'selectSensor',
          value: function selectSensor() {
            this.updateChannelList();
            this.setChannelAlias();
            this.target.errors = this.validateTarget(this.target);
            if (!_.isEqual(this.oldTarget, this.target) && _.isEmpty(this.target.errors)) {
              this.oldTarget = angular.copy(this.target);
              this.panelCtrl.refresh();
            }
          }
        }, {
          key: 'selectChannel',
          value: function selectChannel() {
            this.target.errors = this.validateTarget(this.target);
            if (!_.isEqual(this.oldTarget, this.target) && _.isEmpty(this.target.errors)) {
              this.oldTarget = angular.copy(this.target);
              this.panelCtrl.refresh();
            }
          }
        }, {
          key: 'updateChannel',
          value: function updateChannel() {
            this.target.errors = this.validateTarget(this.target);
            if (!_.isEqual(this.oldTarget, this.target) && _.isEmpty(this.target.errors)) {
              this.target.channel.name = number(this.oldTarget.channel.name) + this.target.channelFilter;
              this.oldTarget = angular.copy(this.target);
              this.panelCtrl.refresh();
            }
          }
        }, {
          key: 'duplicate',
          value: function duplicate() {
            var clone = angular.copy(this.target);
            this.panel.targets.push(clone);
          }
        }, {
          key: 'moveMetricQuery',
          value: function moveMetricQuery(fromIndex, toIndex) {
            _.move(this.panel.targets, fromIndex, toIndex);
          }
        }, {
          key: 'updateGroupList',
          value: function updateGroupList() {
            var self = this;
            self.metric.groupList = [{ name: '*', visible_name: 'All' }];
            this.addTemplatedVariables(self.metric.groupList);
            this.datasource.prtgAPI.performGroupSuggestQuery().then(function (groups) {
              _.map(groups, function (group) {
                self.metric.groupList.push({ name: group.group, visible_name: group.group });
              });
            });
          }
        }, {
          key: 'updateDeviceList',
          value: function updateDeviceList() {
            var self = this;
            var groups;
            self.metric.deviceList = [{ name: '*', visible_name: 'All' }];
            this.addTemplatedVariables(self.metric.deviceList);
            if (this.target.group) {
              groups = this.target.group.name || undefined;
            }
            if (typeof groups == "string") {
              groups = this.templateSrv.replace(groups);
            }
            this.datasource.prtgAPI.performDeviceSuggestQuery(groups).then(function (devices) {
              _.map(devices, function (device) {
                self.metric.deviceList.push({ name: device.device, visible_name: device.device });
              });
            });
          }
        }, {
          key: 'updateSensorList',
          value: function updateSensorList() {
            var self = this;
            var device;
            self.metric.sensorList = [{ name: '*', visible_name: 'All' }];
            this.addTemplatedVariables(self.metric.sensorList);
            if (this.target.device) {
              device = this.target.device.name || undefined;
            }
            if (typeof device == "string") {
              device = this.templateSrv.replace(device);
            }
            this.datasource.prtgAPI.performSensorSuggestQuery(device).then(function (sensors) {
              _.map(sensors, function (sensor) {
                self.metric.sensorList.push({ name: sensor.sensor, visible_name: sensor.sensor });
              });
            });
          }
        }, {
          key: 'updateChannelList',
          value: function updateChannelList() {
            var self = this;
            var sensor, device;
            self.metric.channelList = [{ name: '*', visible_name: 'All' }, { name: '!', visible_name: 'Last Message' }];
            this.addTemplatedVariables(self.metric.channelList);
            if (this.target.sensor) {
              sensor = this.target.sensor.name || undefined;
              if (typeof sensor == "string") {
                sensor = this.templateSrv.replace(sensor);
                device = this.templateSrv.replace(self.target.device.name);
              }
              this.datasource.prtgAPI.performChannelSuggestQuery(sensor, device).then(function (channels) {
                _.map(channels, function (channel) {
                  self.metric.channelList.push({ name: channel.name, visible_name: self.target.sensor.visible_name + ": " + channel.name });
                });
              });
            }
          }
        }, {
          key: 'addTemplatedVariables',
          value: function addTemplatedVariables(metricList) {
            _.each(this.templateSrv.variables, function (variable) {
              metricList.push({
                name: '$' + variable.name,
                templated: true
              });
            });
          }
        }, {
          key: 'validateTarget',
          value: function validateTarget(target) {
            var errs = {};
            if (!target) {
              errs = 'Not defined';
            }
            return errs;
          }
        }]);

        return PRTGQueryController;
      }(QueryCtrl));

      _export('PRTGQueryController', PRTGQueryController);

      // Set templateUrl as static property
      PRTGQueryController.templateUrl = './partials/query.editor.html';
    }
  };
});
//# sourceMappingURL=query_ctrl.js.map
