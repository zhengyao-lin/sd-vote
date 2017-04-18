"use strict";

var gee = require("geetest");

var config = require("./config");
var util = require("./util");

var cap = new gee({
    geetest_id: config.captcha.id,
    geetest_key: config.captcha.key
});

var cbs = {};

exports.challenge = function (req, res, db, cb) {
	cap.register(function (err, data) {
		if (err || !data.success) {
			res.send(util.qerr("failed to get captcha, please retry"));
			return;
		}

		res.send(util.qjson({
			gt: cap.geetest_id,
			challenge: data.challenge
		}));

		db.collection("pending", function (err, pend) {
			if (err) {
				util.log("failed to add pending queue: " + err);
				return;
			}

			if (cbs[data.challenge]) {
				util.log("duplicated challenge");
				return;
			}

			cbs[data.challenge] = cb;

			pend.insert({ challenge: data.challenge }, function (err, suc) {
				if (err) {
					util.log("failed to add pending queue: " + err);
					return;
				}
			});
		});

		return;
	});
};

exports.validate = function (req, res, db) {
	if (!(req.query && req.query.ochallenge && req.query.challenge && req.query.validate && req.query.seccode)) {
		res.send(util.qerr("invalid arguments"));
		util.log(req.ip + ": invalid arguments");
		return;
	}

	cap.validate({
		challenge: req.query.challenge,
		validate: req.query.validate,
		seccode: req.query.seccode
	}, function (err, success) {
		if (err || !success) {
			res.send(util.qerr("failed to validate"));
			util.log(req.ip + ": failed to validate");
			return;
		}

		db.collection("pending", util.errproc(res, function (pend) {
			pend.findOne({ challenge: req.query.ochallenge }, util.errproc(res, function (ret) {
				if (!ret) {
					res.send(util.qerr("no such task"));
					util.log(req.ip + ": no such task");
					return;
				}

				pend.remove({ challenge: req.query.ochallenge }, util.errproc(res, function () {
					var cb = cbs[req.query.ochallenge];
					delete cbs[req.query.ochallenge];
					cb(res, true);
				}));
			}));
		}));
	});
};
