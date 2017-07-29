import {PRTGDataSource} from './datasource';
import {PRTGQueryController} from './query_ctrl';

class PRTGConfigController {}
PRTGConfigController.templateUrl = './partials/config.html';

//class PRTGQueryOptionsController {}
//PRTGQueryOptionsController.templateUrl = './partials/query.options.html';

class PRTGAnnotationsQueryController {}
PRTGAnnotationsQueryController.templateUrl = './partials/annotations.editor.html';

export {
  PRTGDataSource as Datasource,
  PRTGQueryController as QueryCtrl,
  PRTGConfigController as ConfigCtrl,
  //PRTGQueryOptionsController as QueryOptionsCtrl,
  PRTGAnnotationsQueryController as AnnotationsQueryCtrl
};
