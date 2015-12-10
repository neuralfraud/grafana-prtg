define(["angular"],function(a) {
    "use strict";
    var b=a.module("grafana.directives");
    b.directive("metricQueryEditorPrtg",function() {
        return {controller:"PRTGQueryCtrl",templateUrl:"app/plugins/datasource/PRTG/partials/query.editor.html"}
    }),
	b.directive("metricQueryOptionsPrtg", function() {
		return {templateUrl:"app/plugins/datasource/PRTG/partials/query.options.html"}
	}),
    b.directive("annotationsQueryEditorPrtg", function() {
        return {templateUrl:"app/plugins/datasource/PRTG/partials/annotations.editor.html"}
    })
});
