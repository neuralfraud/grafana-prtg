'use strict';

System.register(['./datasource', './query_ctrl'], function (_export, _context) {
  "use strict";

  var PRTGDataSource, PRTGQueryController, PRTGConfigController, PRTGAnnotationsQueryController;

  function _classCallCheck(instance, Constructor) {
    if (!(instance instanceof Constructor)) {
      throw new TypeError("Cannot call a class as a function");
    }
  }

  return {
    setters: [function (_datasource) {
      PRTGDataSource = _datasource.PRTGDataSource;
    }, function (_query_ctrl) {
      PRTGQueryController = _query_ctrl.PRTGQueryController;
    }],
    execute: function () {
      _export('ConfigCtrl', PRTGConfigController = function PRTGConfigController() {
        _classCallCheck(this, PRTGConfigController);
      });

      PRTGConfigController.templateUrl = './partials/config.html';

      //class PRTGQueryOptionsController {}
      //PRTGQueryOptionsController.templateUrl = './partials/query.options.html';

      _export('AnnotationsQueryCtrl', PRTGAnnotationsQueryController = function PRTGAnnotationsQueryController() {
        _classCallCheck(this, PRTGAnnotationsQueryController);
      });

      PRTGAnnotationsQueryController.templateUrl = './partials/annotations.editor.html';

      _export('Datasource', PRTGDataSource);

      _export('QueryCtrl', PRTGQueryController);

      _export('ConfigCtrl', PRTGConfigController);

      _export('AnnotationsQueryCtrl', PRTGAnnotationsQueryController);
    }
  };
});
//# sourceMappingURL=module.js.map
