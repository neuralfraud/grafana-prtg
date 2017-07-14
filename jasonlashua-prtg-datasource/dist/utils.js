"use strict";

System.register([], function (_export, _context) {
  "use strict";

  var regexPattern;
  function isRegex(str) {
    return regexPattern.test(str);
  }

  _export("isRegex", isRegex);

  function isTemplateVariable(str) {
    if (str.match(/\$\w+/)) {
      return true;
    }
    return false;
  }

  //STOLEN! From Alex Zobnin, who is evidently a much better programmer than I (he probably does it for a living)

  _export("isTemplateVariable", isTemplateVariable);

  function buildRegex(str) {
    var matches = str.match(regexPattern);
    var pattern = matches[1];
    var flags = matches[2] !== "" ? matches[2] : undefined;
    return new RegExp(pattern, flags);
  }

  // Need for template variables replace
  // From Grafana's templateSrv.js

  _export("buildRegex", buildRegex);

  function escapeRegex(value) {
    return value.replace(/[\\^$*+?.()|[\]{}\/]/g, '\\$&');
  }

  _export("escapeRegex", escapeRegex);

  return {
    setters: [],
    execute: function () {
      _export("regexPattern", regexPattern = /^\/(.*)\/([gmi]*)$/m);

      _export("regexPattern", regexPattern);
    }
  };
});
//# sourceMappingURL=utils.js.map
