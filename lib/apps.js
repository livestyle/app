'use strict';

const resolve = data => data[process.platform];
const stDownload = 'https://github.com/livestyle/sublime-text/archive/master.zip';
const stCommitUrl = 'https://api.github.com/repos/livestyle/sublime-text/commits/master';

module.exports = {
	"st3": {
		"id": "st3",
		"title": "Sublime Text 3",
		"downloadUrl": stDownload,
		"commitUrl": stCommitUrl,
		"install": resolve({
			"win32":  "~\\AppData\\Roaming\\Sublime Text 3\\Packages",
			"darwin": "~/Library/Application Support/Sublime Text 3/Packages"
		}),
		"lookup": resolve({
			"win32": [
				"%PROGRAMFILES%\\Sublime Text 3\\sublime.exe",
				"~\\AppData\\Roaming\\Sublime Text 3"
			],
			"darwin": [
				"~/Library/Application Support/Sublime Text 3",
				"/Applications/Sublime Text.app/Contents/MacOS/plugin_host",
				"/Applications/Sublime Text 3.app/Contents/MacOS/plugin_host"
			]
		}),
		"extensionId": ["LiveStyle", "LiveStyle.sublime-package"]
	},
	"st2": {
		"id": "st2",
		"title": "Sublime Text 2",
		"downloadUrl": stDownload,
		"commitUrl": stCommitUrl,
		"install": resolve({
			"win32":  "~\\AppData\\Roaming\\Sublime Text 2\\Packages",
			"darwin": "~/Library/Application Support/Sublime Text 2/Packages"
		}),
		"lookup": resolve({
			"win32": [
				"%PROGRAMFILES%\\Sublime Text 2\\sublime.exe",
				"~\\AppData\\Roaming\\Sublime Text 2"
			],
			"darwin": [
				"~/Library/Application Support/Sublime Text 2",
				"/Applications/Sublime Text 2.app/Contents/MacOS/Sublime Text 2",
				"/Applications/Sublime Text.app/Contents/MacOS/Sublime Text 2"
			]
		}),
		"extensionId": ["LiveStyle"]
	},
	"chrome": {
		"id": "chrome",
		"title": "Google Chrome",
		"install": "https://chrome.google.com/webstore/detail/emmet-livestyle/diebikgmpmeppiilkaijjbdgciafajmg",
		"lookup": resolve({
			"win32": [
				"~\\AppData\\Local\\Google\\Chrome\\User Data\\Default\\Extensions",
				"~\\AppData\\Local\\Chromium\\User Data\\Default\\Extensions"
			],
			"darwin": [
				"~/Library/Application Support/Google/Chrome/Default/Extensions",
				"~/Library/Application Support/Chromium/Default/Extensions"
			]
		}),
		"extensionId": [
			"obipchajaiohjoohongibhgbfgchblei", 
			"diebikgmpmeppiilkaijjbdgciafajmg"
		]
	}
};