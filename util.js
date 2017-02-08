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

function log(msg) {
	console.log((new Date()) + ": " + msg);
	return;
}

exports.log = log;

exports.assureDir = function (dir) {
	if (!isdir(dir)) {
		fs.mkdirSync(dir);
		return;
	}
};

function qerr(msg, prompt) {
	var tmp = { suc: false, msg: msg };

	if (prompt != undefined) {
		tmp.prompt = prompt;
	}

	return JSON.stringify(tmp);
}

exports.qerr = qerr;

exports.qsuc = function () {
	return JSON.stringify({ suc: true });
};

exports.qjson = function (dat) {
	return JSON.stringify({ suc: true, dat: dat });
};

exports.errproc = function (res, cb) {
	return function (err, ret) {
		if (err) {
			res.send(qerr("internal error"));
			log("internal error: " + err);
			return;
		}

		cb(ret);
		return;
	};
};
