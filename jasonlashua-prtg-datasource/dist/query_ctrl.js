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

  // I stole this from grafana-zabbix, err, I mean, I was inspired by grafana-zabbix ;) 
  function getMetricNames(scope, metricList) {
    return _.uniq(_.map(scope.metric[metricList], 'name'));
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
          _this.init();
          return _this;
        }

        /**
        * Alias is comprised of the device name, sensor and channel, e.g., FILESERV1: DNS Response Time.
        */


        _createClass(PRTGQueryController, [{
          key: 'setTargetAlias',
          value: function setTargetAlias() {
            this.target.alias = this.target.device.name + ": " + this.target.sensor.name + " " + this.target.channel.name;
          }
        }, {
          key: 'targetChange',
          value: function targetChange() {
            var newTarget = _.cloneDeep(this.target);
            if (!_.isEqual(this.oldTarget, this.target)) {
              this.oldTarget = newTarget;
              this.panelCtrl.refresh();
            }
          }
        }, {
          key: 'selectGroup',
          value: function selectGroup() {
            this.updateDeviceList();
            this.targetChange();
          }
        }, {
          key: 'selectDevice',
          value: function selectDevice() {
            this.updateSensorList();
            this.targetChange();
          }
        }, {
          key: 'selectSensor',
          value: function selectSensor() {
            this.updateChannelList();
            this.targetChange();
          }
        }, {
          key: 'selectChannel',
          value: function selectChannel() {
            this.setTargetAlias();
            this.targetChange();
          }
        }, {
          key: 'updateGroupList',
          value: function updateGroupList() {
            var _this2 = this;

            this.metric.groupList = [{ name: '*', visible_name: 'All' }];
            this.addTemplatedVariables(this.metric.groupList);
            this.datasource.prtgAPI.performGroupSuggestQuery().then(function (groups) {
              _.map(groups, function (group) {
                _this2.metric.groupList.push({ name: group.group, visible_name: group.group });
              });
            });
          }
        }, {
          key: 'updateDeviceList',
          value: function updateDeviceList() {
            var _this3 = this;

            var group;
            this.metric.deviceList = [{ name: '*', visible_name: 'All' }];
            this.addTemplatedVariables(this.metric.deviceList);
            if (this.target.group) {
              group = this.target.group.name || undefined;
              group = this.templateSrv.replace(group);
            }
            this.datasource.prtgAPI.performDeviceSuggestQuery(group).then(function (devices) {
              _.map(devices, function (device) {
                _this3.metric.deviceList.push({ name: device.device, visible_name: device.device });
              });
            });
          }
        }, {
          key: 'updateSensorList',
          value: function updateSensorList() {
            var _this4 = this;

            var device;
            this.metric.sensorList = [{ name: '*', visible_name: 'All' }];
            this.addTemplatedVariables(this.metric.sensorList);
            if (this.target.device) {
              device = this.target.device.name || undefined;
              device = this.templateSrv.replace(device);
            }
            this.datasource.prtgAPI.performSensorSuggestQuery(device).then(function (sensors) {
              _.map(sensors, function (sensor) {
                _this4.metric.sensorList.push({ name: sensor.sensor, visible_name: sensor.sensor });
              });
            });
          }
        }, {
          key: 'updateChannelList',
          value: function updateChannelList() {
            var _this5 = this;

            var sensor, device;
            this.metric.channelList = [{ name: '*', visible_name: 'All' }, { name: '!', visible_name: 'Last Message' }];
            this.addTemplatedVariables(this.metric.channelList);
            if (this.target.sensor) {
              sensor = this.target.sensor.name;
              sensor = this.templateSrv.replace(sensor);
              device = this.templateSrv.replace(this.target.device.name);
              this.datasource.prtgAPI.performChannelSuggestQuery(sensor, device).then(function (channels) {
                _.map(channels, function (channel) {
                  _this5.metric.channelList.push({ name: channel.name, visible_name: channel.name });
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
