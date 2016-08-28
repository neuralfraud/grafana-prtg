'use strict';

System.register(['angular'], function (_export, _context) {
    "use strict";

    var angular, _createClass, PRTGAPICore;

    function _classCallCheck(instance, Constructor) {
        if (!(instance instanceof Constructor)) {
            throw new TypeError("Cannot call a class as a function");
        }
    }

    return {
        setters: [function (_angular) {
            angular = _angular.default;
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

            PRTGAPICore = function () {
                function PRTGAPICore($q, backendSrv) {
                    _classCallCheck(this, PRTGAPICore);

                    this.$q = $q;
                    this.backendSrv = backendSrv;
                    this.passhash = '';
                }

                _createClass(PRTGAPICore, [{
                    key: 'login',
                    value: function login(username, password, url_path) {
                        var options = {
                            method: 'GET',
                            url: url_path + "/getpasshash.htm?username=" + username + "&password=" + password
                        };

                        return backendSrv.datasourceRequest(options).then(function (response) {
                            this.passhash = response;
                            return response;
                        });
                    }
                }, {
                    key: 'request',
                    value: function request() {}
                }, {
                    key: 'getVersion',
                    value: function getVersion() {}
                }]);

                return PRTGAPICore;
            }();
        }
    };
});
//# sourceMappingURL=PRTAPICore.js.map
