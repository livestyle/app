'use strict';

module.exports.removeFromArray = function(arr, item) {
	for (var i = arr.length - 1; i >= 0; i--) {
		if (arr[i] === item) {
			arr.splice(i, 1);
		}
	}
	return arr;
}