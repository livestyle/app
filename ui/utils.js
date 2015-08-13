/**
 * Utils for app’s UI part
 */
'use strict';

module.exports.qs = function(sel, context) {
	return (context || document).querySelector(sel);
};

module.exports.closest = function(elem, sel) {
	while (elem && elem !== document) {
		if (elem.matches(sel)) {
			return elem;
		}

		elem = elem.parentNode;
	}
};
