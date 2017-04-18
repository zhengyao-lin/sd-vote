var bodyparser = require("body-parser");
var http = require("http");

exports.getIPInfo = function(ip, cb) {
	var sina = "http://int.dpool.sina.com.cn/iplookup/iplookup.php?format=json&ip=";
	var url = sina + ip;
	
	http.get(url, function(res) {
		var code = res.statusCode;
		if (code == 200) {
			res.on('data', function(data) {
				try {
					cb(null, JSON.parse(data));
				} catch (err) {
					cb(err);
				}
			});
		} else {
			cb({ code: code });
		}
	}).on('error', function(e) { cb(e); });

	return;
};
