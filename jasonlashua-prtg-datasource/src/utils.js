/**
 * Global helper functions
 */

// Pattern for testing regex
export const regexPattern = /^\/(.*)\/([gmi]*)$/m;

export function isRegex(str) {
  return regexPattern.test(str);
}

export function isTemplateVariable(str) {
  if (str.match(/\$\w+/)) {
    return true;
  }
  return false;
}

//STOLEN! From Alex Zobnin, who is evidently a much better programmer than I (he probably does it for a living)
export function buildRegex(str) {
  var matches = str.match(regexPattern);
  var pattern = matches[1];
  var flags = matches[2] !== "" ? matches[2] : undefined;
  return new RegExp(pattern, flags);
}

// Need for template variables replace
// From Grafana's templateSrv.js
export function escapeRegex(value) {
  return value.replace(/[\\^$*+?.()|[\]{}\/]/g, '\\$&');
}
