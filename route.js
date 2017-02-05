var mongodb = require("mongodb");
var crypto = require('crypto');
var multiparty = require('multiparty');
var fs = require("fs");

var util = require("./util.js");

var server = new mongodb.Server("localhost", 27017, { auto_reconnect: true });
var db = new mongodb.Db("sdvote", server, { safe: true });

db.open();

function qerr(msg, prompt) {
	var tmp = { suc: false, msg: msg };

	if (prompt != undefined) {
		tmp.prompt = prompt;
	}

	return JSON.stringify(tmp);
}

function qsuc() {
	return JSON.stringify({ suc: true });
}

function qjson(dat) {
	return JSON.stringify({ suc: true, dat: dat });
}

function getNewCandID(cb) {
	db.collection("config", { safe: true }, function (err, conf) {
		if (err) {
			cb(err);
			return;
		}

		conf.findOneAndUpdate(
			{}, { $inc: { "cand_id": 1 } }, { new: true, upsert: true, returnOriginal: false },
			function (err, obj) {
				if (err) {
					cb(err);
				} else {
					cb(null, obj.value.cand_id);
				}

				return;
			}
		);
	});

	return;
}

function errproc(res, cb) {
	return function (err, res) {
		if (err) {
			res.send(qerr("internal error"));
			util.log("internal error: " + err);
			return;
		}

		cb(res);
		return;
	};
}

// if the IP has polled more than once
function checkValidIP(req, res, action, cb) {
	if (req.ip == "127.0.0.1") {
		// cb(null);
		// return;
	}

	db.collection("votedip", function (err, voted) {
		if (err) {
			cb(err);
			return;
		}

		voted.findOne({ ip: req.ip }, function (err, found) {
			if (err) {
				cb(err);
				return;
			}

			if (found && found[action]) {
				res.send(qerr(
					"duplicated ip attempt on action " + action,
					action == "poll" ? 0 : (action == "reg" ? 1 : undefined)
				));
				util.log("duplicated ip attempt on action " + action);
				return;
			}

			var tmp = {};
			tmp[action] = true;

			voted.findOneAndUpdate({ ip: req.ip }, { $set: tmp },
				{ new: true, upsert: true, returnOriginal: false }, function (err) {
				if (err) {
					cb(err);
					return;
				}

				cb(null);
			});
		});
	});
}

// candidate
// { id: <number, unique>, poll: <number>, name: <string>, descr: <string>, photo: <string, the path> }

function uploadFile(tmp, cb) {
	fs.readFile(tmp, function (err, cont) {
		if (err) {
			cb(err);
			return;
		}

		var md5sum = crypto.createHash("md5");
		md5sum.update(cont);
		var md5 = md5sum.digest("hex").toUpperCase();
	
		fs.rename(tmp, "upload/" + md5, function (err) {
			if (err) {
				cb(err);
				return;
			}

			db.collection("file", { safe: true }, function (err, col) {
				if (err) {
					cb(err);
					return;
				}
			});
		});
	});
}

exports.regCand = function (req, res) {
	util.log(req.ip + ": register attempt");
	checkValidIP(req, res, "reg", errproc(res, function () {
		var form = new multiparty.Form({ maxFilesSize: 1024 * 1024 * 2 });

		form.parse(req, function(err, fields, files) {
			if (err) {
				res.send(qerr("internal error", 2));
				util.log("internal error: " + err);
				return;
			}

			if (!fields.name || !fields.descr || !files.photo) {
				res.send(qerr("incomplete query"));
				return;
			}

			var name = fields.name[0];
			var descr = fields.descr[0];
			var photo = files.photo[0];

			var path = photo.path;

			fs.readFile(path, errproc(res, function (cont) {
				var md5sum = crypto.createHash("md5");
				md5sum.update(cont);
				var md5 = md5sum.digest("hex").toUpperCase();
			
				fs.rename(path, "upload/" + md5, errproc(res, function () {
					getNewCandID(errproc(res, function (id) {
						db.collection("cand", { safe: true }, errproc(res, function (cand) {
							cand.insert({
								id: id,
								poll: 0,
								name: name,
								descr: descr,
								photo: md5
							}, errproc(res, function () {
								res.send(qsuc());
								return;
							}));
						}));
					}));
				}));
			}));
		});
	}));
};

exports.pollCand = function (req, res) {
	util.log(req.ip + ": poll attempt");
	checkValidIP(req, res, "poll", errproc(res, function () {
		db.collection("cand", { safe: true }, errproc(res, function (cand) {
			var candstr = req.query.cand.split("|");
			var i;

			if (candstr.length > 3) {
				res.send(qerr("too many candidates"));
			} else {
				var tmp;

				for (i = 0; i < candstr.length; i++) {
					tmp = parseInt(candstr[i]);
					if (isNaN(tmp)) {
						res.send(qerr("invalid candidate id"));
						return;
					}

					candstr[i] = tmp;
				}

				var finished = 0;

				for (i = 0; i < candstr.length; i++) {
					(function (i) {
						cand.findOne({ id: candstr[i] }, errproc(res, function (ret) {
							if (!ret) {
								res.send(qerr("no such candidate", 3));
								return;
							}

							cand.findOneAndUpdate({ id: candstr[i] }, { $inc: { poll: 1 } }, errproc(res, function () {
								finished++;
								if (finished == candstr.length) {
									res.send(qsuc());
								}
							}));
						}));
					})(i);
				}
			}
		}));
	}));
};

exports.getCand = function (req, res) {
	util.log(req.ip + ": get attempt");
	db.collection("cand", { safe: true }, errproc(res, function (cand) {
		cand.find().toArray(errproc(res, function (allcand) {
			var i, obj;
			var rep = [];

			for (i = 0; i < allcand.length; i++) {
				obj = allcand[i];
				rep.push({
					id: obj.id,
					name: obj.name,
					poll: obj.poll,
					descr: obj.descr,
					photo: obj.photo
				});
			}

			res.send(qjson(rep));
		}));
	}));
};
