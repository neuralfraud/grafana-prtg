define(["angular"],function(a) {
    "use strict";
    var b=a.module("grafana.directives");
    b.directive("metricQueryEditorPrtg",function() {
        return {controller:"PRTGQueryCtrl",templateUrl:"app/plugins/datasource/PRTG/partials/query.editor.html"}
    }),
	b.directive("metricQueryOptionsPrtg", function() {
		return {templateUrl:"app/plugins/PRTG/partials/query.options.html"}
	})
});

/* unused at this time
 * ,b.directive("metricQueryOptionsPRTG",function() {
        return{templateUrl:"app/plugins/datasource/graphite/partials/query.options.html"}
    }),b.directive("annotationsQueryEditorGraphite",function() {
        return{templateUrl:"app/plugins/datasource/graphite/partials/annotations.editor.html"}
    })
*/