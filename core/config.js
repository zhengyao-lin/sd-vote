"use strict";

var conf = module.exports = {
	port: 3139,

	lim: {
		max_file_size: 1024 * 1024 * 2
	},

	db: {
		url: "127.0.0.1",
		port: 3137,
		name: "foci-main",
		opt: { auto_reconnect: true }
	},

	vote: {
		ddl: new Date("Sun Apr 30 2017 00:00:00 GMT+0800 (CST)")
	},

	captcha: {
		id: "9c97bc8bebcf75269fafbfee223728e2",
		key: "eef2bcff227c7178d631d3171de8f016"
	}
};
