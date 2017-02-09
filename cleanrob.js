// var from_date = new Date("Tue Feb 07 2017 12:30:00 GMT+0800 (CST)");
// var to_date = new Date("Tue Feb 08 2017 6:30:00 GMT+0800 (CST)");
var from_date = new Date("Tue Feb 08 2017 6:30:00 GMT+0800 (CST)");
var to_date = new Date("Tue Feb 08 2017 8:30:00 GMT+0800 (CST)");
var all_vote = db.votedip.find().toArray();
var res = {};

all_vote.forEach(function (log) {
	var pv = db.pview.find({ ip: log.ip }).toArray();
	var i, j, prec, date, query;
	var cand, id, ret = null;
	
	for (i = 0; i < pv.length; i++) {
		prec = pv[i].prec;
		print(prec);
		if (prec) {
			date = new Date(prec);
			if (from_date < date && date < to_date) {
				query = log.poll_query;
				if (query && query.cand) {
					cand = query.cand.split("|");
					ret = [];
					for (j = 0; j < cand.length; j++) {
						id = parseInt(cand[j]);
						if (!isNaN(id)) {
							if (!res[id]) res[id] = 1;
							else res[id]++;
						}
					}
				}
			}
		}
	}

	return;
});


{
	"1" : 850,
	"2" : 42,
	"3" : 51,
	"4" : 48,
	"5" : 64,
	"6" : 60,
	"7" : 50,
	"8" : 62,
	"9" : 52,
	"10" : 51,
	"11" : 50,
	"12" : 56,
	"13" : 53,
	"14" : 47,
	"15" : 63,
	"16" : 56,
	"17" : 53,
	"18" : 4,
	"19" : 50,
	"20" : 45,
	"21" : 438,
	"22" : 441
};

db.cand.find().toArray().forEach(function (cand) {
	if (res[cand.id] && res[cand.id] < cand.poll) {
		// sprint(res[cand.id] + ", " + cand.id + ": " + cand.poll);
		db.cand.update({ id: cand.id }, { $inc: { poll: -res[cand.id] } });
	}
});

var ret = [];
db.votedip.find().toArray().forEach(function (e) {
	var found = db.pview.find({ ip: e.ip }).toArray();

	found.forEach(function (found) {
		if (found && found.prec && (new Date(found.prec)) > (new Date("Thursday Feb 09 2017 0:00:00 GMT+0800 (CST)"))) {
			found.query = e.poll_query; ret.push(found);
		}
	});
});

ret = ret.sort(function (a, b) { return (new Date(a.prec)) - (new Date(b.prec)); });
