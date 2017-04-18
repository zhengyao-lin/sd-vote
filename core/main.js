"use strict";

var bodyparser = require("body-parser");
var express = require("express");

var config = require("./config");
var route = require("./route");
var util = require("./util");

util.assureDir("upload");

var app = express();

app.use("/static", express.static("static"));
app.use("/upload", express.static("upload"));
app.use(bodyparser.json());
app.use(bodyparser.urlencoded({ limit: config.lim.max_file_size, extended: false }));

app.get("/vote", function (req, res) {
	res.redirect("/static/vote.html");
});

app.get("/", function (req, res) {
	res.redirect("/static/intro.html");
});

app.get("/intro", function (req, res) {
	res.redirect("/static/intro.html");
});

app.get("/valid", route.validate);

app.post("/vote/reg", route.regCand);
app.get("/vote/poll", route.pollCand);
app.get("/vote/get", route.getCand);

app.get("/vote/incview", route.incView);
app.get("/vote/getview", route.getView);

app.get("/vote/ddl", route.getDeadline);

var server = app.listen(config.port, function () {
	var host = server.address().address;
	var port = server.address().port;

	util.log("listening at http://" + host + ":" + port);
});
