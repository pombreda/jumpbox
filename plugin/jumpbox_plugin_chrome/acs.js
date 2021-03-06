/*jslint browser: true, devel: true, sloppy: true*/

var ACS;

ACS = {
bkg:		null,
msg_prev:	"",
url_setup:	"",
url_progress:	"",

set_status: function (st, msg) {
	var s, col, l;

	/* Don't log duplicates */
	if (msg == ACS.msg_prev) {
		return;
	}

	s = document.querySelector("#status");

	switch (st) {
	case "ok":
		col = "#eeeeee";
		break;
	case "error":
		col = "#ffa500";
		ACS.show("intro");
		break;
	case "done":
		col = "#00cc00";
		ACS.show("launch");
		break;
	default:
		col = "#ff0000";
		break;
	}

	s.style.backgroundColor = col;

	s.innerHTML = msg;
	console.log("STATUS: " + msg);
	ACS.msg_prev = msg;

	d = new Date();
	document.querySelector('#log').textContent += d + " " + st + ": " + msg + "\n";
},

set_status_json: function(json) {
	try {
		r = JSON.parse(json);

		if (r && typeof r === "object" && typeof r.status === "string") {
			ACS.set_status(r.status, r.message);

			/* ok = continue, done/error = stop */
			return r.status === "ok";
		} else {
			ACS.set_status("error", "JSON okay, but missing fields: " + json);
			return false;
		}

	} catch(e) {
		ACS.set_status("error", "JSON error: " + json);
	}

	return false;
},

empty_status: function () {
	/* Empty the log */
	document.querySelector("#log").textContent = "";

	ACS.set_status("ok", "(Status log reset)");
},

show: function (id) {
	document.querySelector("#" + id).style.display = "block";
},

hide: function (id) {
	document.querySelector("#" + id).style.display = "none";
},

init: function () {
	var djb;

	/* Watch out for when they want to dance */
	document.querySelector("#dancenet").addEventListener("click", ACS.but_danceNET);
	document.querySelector("#dancerdv").addEventListener("click", ACS.but_danceRDV);
	document.querySelector("#launchtools").addEventListener("click", ACS.but_launchtools);
	document.querySelector("#restart").addEventListener("click", ACS.but_restart);

	/* Where is our djb? */
	ACS.bkg = chrome.extension.getBackgroundPage();
	djb = ACS.bkg.JumpBox.jb_host;

	ACS.url_setup    = djb + '/acs/setup/';
	ACS.url_progress = djb + '/acs/progress/';

	/* Ensure we have a circuit up and running */
	ACS.bkg.JumpBox.circuits_ensure();

	ACS.set_status("ok", "Initialized");
},

but_danceNET: function () {
	var net, obj;

	ACS.hide("intro");
	ACS.empty_status();

	/* Get the NET from the textfield */
	net = document.querySelector("#acsnet").value;
	if (net.length == 0) {
		ACS.set_status("ok", "To dance with a manually provided NET you need to provide one");
		return;
	}

	/* Use the manually supplied one, validate it */
	try {
		obj = JSON.parse(net);

		if (!obj || typeof obj !== 'object') {
			ACS.set_status("error", "Manual NET was not parsed into a object");
		} else if (typeof obj.initial !== 'string') {
			ACS.set_status("error", "Manual NET misses initial");
		} else if (typeof obj.redirect !== 'string') {
			ACS.set_status("error", "Manual NET misses redirect");
		} else if (typeof obj.wait !== 'number') {
			ACS.set_status("error", "Manual NET misses wait");
		} else if (typeof obj.window !== 'number') {
			ACS.set_status("error", "Manual NET misses window");
		} else if (typeof obj.passphrase !== 'string') {
			ACS.set_status("error", "Manual NET misses passphrase");
		} else {
			ACS.set_status("ok", "Manually provided NET looks valid " +
				             "(initial: " + obj.initial + ", " +
					      "redirect: " + obj.redirect + ")");
		}
	} catch(e) {
		ACS.set_status("ok", "Manually provided NET is invalid: " + e);
	}

	/* Setup the NET, which will trigger progress if that completes */
	ACS.setup(net);
},

but_danceRDV: function () {
	ACS.hide("intro");
	ACS.empty_status();

	ACS.set_status("ok", "Using Rendezvous provided NET");

	/* Start checking for progress */
	ACS.progress();
},

but_launchtools: function () {
	ACS.bkg.JumpBox.launch_just_one_tab("launchtools.html");
},

but_restart: function () {
	ACS.hide("launch");
	ACS.show("intro");
	ACS.empty_status();
},

setup: function (net) {
	var req;

	req = new XMLHttpRequest();
	req.onreadystatechange = function () { ACS.process_response(req); };
	req.open("POST", ACS.url_setup);
	req.setRequestHeader("Content-Type", "application/json");
	req.send(net);
},

progress: function () {
	var req;

	req = new XMLHttpRequest();
	req.onreadystatechange = function () { ACS.process_response(req); };
	req.open("GET", ACS.url_progress);
	req.send(null);
},

process_response: function (req) {
	if (req.readyState === 4) {
		if (req.status === 200) {
			if (ACS.set_status_json(req.responseText)) {
				/* Successful requests cause */
				ACS.progress();
			}
		} else if (req.status === 0) {
			ACS.set_status("error", "ACS Setup failed: request not made");
		} else {
			ACS.set_status("error", "ACS Setup failed: HTTP Error " + req.status + " : " + req.statusText );
		}
	}
},

}; /* ACS */

document.addEventListener('DOMContentLoaded', function () { ACS.init(); });

