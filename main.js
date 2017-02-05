var express = require("express");
var bodyparser = require("body-parser");

var route = require("./route.js");
var util = require("./util.js");

util.assureDir("upload");

var app = express();

app.use("/static", express.static("static"));
app.use("/upload", express.static("upload"));
app.use(bodyparser.json());
app.use(bodyparser.urlencoded({ limit: 1024 * 512, extended: false }));

app.get("/vote", function (req, res) {
	res.redirect("/static/cl.html");
});

app.post("/vote/reg", route.regCand);
app.get("/vote/poll", route.pollCand);
app.get("/vote/get", route.getCand);

var server = app.listen(80, function () {
	var host = server.address().address;
	var port = server.address().port;

	util.log("listening at http://" + host + ":" + port);
});
