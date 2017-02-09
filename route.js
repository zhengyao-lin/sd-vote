var mongodb = require("mongodb");
var crypto = require('crypto');
var multiparty = require('multiparty');
var fs = require("fs");

var util = require("./util.js");
var captcha = require("./captcha.js");

var server = new mongodb.Server("localhost", 27017, { auto_reconnect: true });
var db = new mongodb.Db("sdvote", server, { safe: true });

db.open();

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

// if the IP has polled more than once
function checkValidIP(req, res, action, cb) { // cb(res, use_cap)
	if (req.ip == "127.0.0.1") {
		// cb(null);
		// return;
	}

	var cur_date = new Date();

	db.collection("config", { safe: true }, util.errproc(res, function (conf) {
		conf.findOne({}, util.errproc(res, function (ret) {
			var use_cap = ret.last ? ((cur_date - new Date(ret.last)) < 1200000 /* 10 min */) : false;

			conf.update({}, { $set: { last: cur_date.toString() } },
				util.errproc(res, function () {
					db.collection("pview", { safe: true }, util.errproc(res, function (col) {
						var tmp = { ip: req.ip };
						col.findOne(tmp, util.errproc(res, function (ret) {
							if (!ret || (ret.prec && (new Date()) - (new Date(ret.prec))) < 8000) {
								res.send(util.qerr("illegal attempt"));
								util.log("illegal attempt");
								return;
							}

							db.collection("votedip", util.errproc(res, function (voted) {
								voted.findOne({ ip: req.ip }, util.errproc(res, function (found) {
									if (found && found[action]) {
										res.send(util.qerr(
											"duplicated ip attempt on action " + action,
											action == "poll" ? 0 : (action == "reg" ? 1 : undefined)
										));
										util.log("duplicated ip attempt on action " + action);
										return;
									}

									var tmp = function (res, use_cap) {
										var tmp = {};
										tmp[action] = true;
										tmp[action + "_query"] = req.query;
										tmp[action + "_date"] = cur_date;

										voted.findOneAndUpdate({ ip: req.ip }, { $set: tmp },
											{ new: true, upsert: true, returnOriginal: false }, util.errproc(res, function () {
											cb(res, use_cap);
										}));
									};

									if (use_cap) {
										captcha.challenge(req, res, db, tmp);
									} else {
										tmp(res, false);
									}
								}));
							}));
						}));
					}));
				}));
		}));
	}));
}

exports.validate = function (req, res) {
	captcha.validate(req, res, db);
	return;
};

// candidate
// { id: <number, unique>, poll: <number>, name: <string>, descr: <string>, photo: <string, the path> }

exports.regCand = function (req, res) {
	util.log(req.ip + ": register attempt");
	var form = new multiparty.Form({ maxFilesSize: 1024 * 1024 * 2 });

	form.parse(req, function(err, fields, files) {
		if (err) {
			res.send(util.qerr("internal error", 2));
			util.log("internal error: " + err);
			return;
		}

		if (!fields.name || !fields.descr || !files.photo) {
			res.send(util.qerr("incomplete query"));
			return;
		}

		checkValidIP(req, res, "reg", function (res, use_cap) {
			var name = fields.name[0];
			var descr = fields.descr[0];
			var photo = files.photo[0];

			var path = photo.path;

			fs.readFile(path, util.errproc(res, function (cont) {
				var md5sum = crypto.createHash("md5");
				md5sum.update(cont);
				var md5 = md5sum.digest("hex").toUpperCase();
			
				fs.rename(path, "upload/" + md5, util.errproc(res, function () {
					getNewCandID(util.errproc(res, function (id) {
						db.collection("cand", { safe: true }, util.errproc(res, function (cand) {
							cand.insert({
								id: id,
								poll: 0,
								name: name,
								descr: descr,
								photo: md5
							}, util.errproc(res, function () {
								res.send(util.qjson(use_cap));
								return;
							}));
						}));
					}));
				}));
			}));
		});
	});
};

exports.pollCand = function (req, res) {
	util.log(req.ip + ": poll attempt");
	checkValidIP(req, res, "poll", function (res, use_cap) {
		db.collection("cand", { safe: true }, util.errproc(res, function (cand) {
			var candstr = req.query.cand.split("|");
			var i;

			if (candstr.length > 3) {
				res.send(util.qerr("too many candidates"));
			} else {
				var tmp;

				for (i = 0; i < candstr.length; i++) {
					tmp = parseInt(candstr[i]);
					if (isNaN(tmp)) {
						res.send(util.qerr("invalid candidate id"));
						return;
					}

					if (candstr.indexOf(tmp) != -1) {
						res.send(util.qerr("duplicated candidate id"));
						return;
					}

					candstr[i] = tmp;
				}

				var finished = 0;

				for (i = 0; i < candstr.length; i++) {
					(function (i) {
						cand.findOne({ id: candstr[i] }, util.errproc(res, function (ret) {
							if (!ret) {
								res.send(util.qerr("no such candidate", 3));
								return;
							}

							cand.findOneAndUpdate({ id: candstr[i] }, { $inc: { poll: 1 } }, util.errproc(res, function () {
								finished++;
								if (finished == candstr.length) {
									res.send(util.qjson(use_cap));
								}
							}));
						}));
					})(i);
				}
			}
		}));
	});
};

exports.getCand = function (req, res) {
	util.log(req.ip + ": get attempt");
	db.collection("cand", { safe: true }, util.errproc(res, function (cand) {
		cand.find().toArray(util.errproc(res, function (allcand) {
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

			res.send(util.qjson(rep));
		}));
	}));
};

exports.incView = function (req, res) {
	util.log(req.ip + ": inc view");

	var pdate = new Date();
	var date = pdate.getMonth() + "-" + pdate.getDate();

	db.collection("pview", { safe: true }, util.errproc(res, function (col) {
		var tmp = { ip: req.ip, date: date };
		if (req.query.from) {
			tmp.from = req.query.from;
		}

		col.findOne(tmp, util.errproc(res, function (ret) {
			if (ret) {
				res.send(util.qerr("viewed already"));
				return;
			}

			tmp.prec = pdate.toString();

			col.insert(tmp, util.errproc(res, function () {
				res.send(util.qsuc());
				return;
			}));
		}));
	}));
};

exports.getView = function (req, res) {
	util.log(req.ip + ": get view");

	var tmp = {};

	if (req.query.date) {
		if (req.query.date.match(/^\d+-\d+$/g)) {
			tmp.date = req.query.date;
		} else {
			res.send(util.qerr("wrong date format"));
			util.log(req.ip + ": wrong date format " + req.query.date);
			return;
		}
	}

	db.collection("pview", { safe: true }, util.errproc(res, function (col) {
		col.count(tmp, util.errproc(res, function (count) {
			res.send(util.qjson(count));
			return;
		}));
	}));
};
