var fs = require("fs");

// Object.prototype.owns = Object.prototype.hasOwnProperty;

function walk(path, depth, cb) {
	depth++;
	var files = fs.readdirSync(path);

	files.forEach(function(item) {
		var tmp = path + '/' + item;
		stats = fs.statSync(tmp);
		
		if (stats.isDirectory()) {
			walk(tmp, depth, cb);
		} else {
			cb(tmp, depth);
		}
	});
}

function isdir(path) {
	return fs.existsSync(path) && fs.statSync(path).isDirectory();
}

exports.walk = function (init, cb) {
	return walk(init, 0, cb);
};

exports.isdir = isdir;

exports.log = function (msg) {
	console.log((new Date()) + ": " + msg);
	return;
};

exports.assureDir = function (dir) {
	if (!isdir(dir)) {
		fs.mkdirSync(dir);
		return;
	}
};
