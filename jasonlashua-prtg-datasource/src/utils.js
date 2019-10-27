/**
 * Global helper functions
 * 
 * mostly copied from alexanderzobnin-zabbix-app - thanks!
 */

// Pattern for testing regex
export const regexPattern = /^\/(.*)\/([gmi]*)$/m;

export function isRegex(str) {
  return regexPattern.test(str);
}

//Thanks StackOverflow 
export function isNumeric(strValue) {
  return !isNaN(parseFloat(strValue)) && isFinite(strValue);
}

export function isTemplateVariable(str) {
  if (str && str.match(/\$\w+/)) {
    return true;
  }
  return false;
}

/**
 * pad date parts and optionally add one
 */
export function pad(idx, val) {
  if (val) return ("0" + (idx + 1)).slice(-2);
  return ("0" + idx).slice(-2);
}

export function buildRegex(str) {
  const matches = str.match(regexPattern);
  const pattern = matches[1];
  const flags = matches[2] !== "" ? matches[2] : undefined;
  return new RegExp(pattern, flags);
}

// Need for template variables replace
// From Grafana's templateSrv.js
export function escapeRegex(value) {
  return value.replace(/[\\^$*+?.()|[\]{}\/]/g, "\\$&");
}

export function filterMatch(findItem, filterStr, invert = false) {
  let result;
  if (isRegex(filterStr)) {
    const rex = buildRegex(filterStr);
    result = rex.test(findItem);
  } else {
    result = findItem === filterStr;
  }
  if (invert) {
    return !result;
  }
  return result;
}
