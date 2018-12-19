const express = require("express");
const path = require("path");
const app = express();

const Discord = require("discord.js");
const client = new Discord.Client();

const fs = require("fs");

var JSDOM = require('jsdom').JSDOM;
var jsdom = new JSDOM('<body><div id="container"></div></body>', {runScripts: 'dangerously'});
var window = jsdom.window;

const https = require("https");
const bodyParser = require("body-parser");
const moment = require("moment");

const anychart = require("anychart")(window);
const anychartExport = require("anychart-nodejs")(anychart);



if (process.env.NODE_ENV === "production") {
	app.use(express.static("client"));
	app.use(bodyParser.urlencoded({extended: true}))
	app.use(bodyParser.json());

	const path = require("path");
	app.get('*', (req, res) => {
		res.sendFile(path.resolve(__dirname, "client", "index.html"));
	});
}

app.listen(process.env.PORT || 8080);

client.on("ready", () => {
  console.log(`Logged in as ${client.user.tag}!`);
});

function day_before(a, b) {
	var a_ = new Date(a.getFullYear(), a.getMonth(), a.getDate());
    var b_ = new Date(b.getFullYear(), b.getMonth(), b.getDate());

    return (a_.getTime() < b_.getTime());
}

function get_messages(collector, channel, start_date, limit, before=null) {	
	options = {limit: limit};
	if (before) {
		options.before = before.id;
	}

	channel.fetchMessages(options)
		.then(messages => {
			var finished = false;
			var earliest_message = before;

			messages.forEach(message => {
				if (day_before(message.createdAt, start_date)) {
					finished = true;
				} else {
					if (!message.author.bot) {
						earliest_message = message;
						collector.push(message);
					}
				}
			});

			if (!finished && earliest_message) {
				get_messages(collector, channel, start_date, limit, earliest_message);
			} else {
				message_stats(collector, channel, start_date);
			}
		})
		.catch(console.error);
}

function tokenize(text) {
	return text.replace(/[.,\/#!$%\^&\*;:{}=\-_`~()]/g, "");
}

function get_words(message) {
	if (message.content) {
		//console.log(message.content);
		return tokenize(message.content).split(' ');
	}
	return [];
}

function init_frequency_compare(frequencies) {
	return function frequency_compare(a, b) {
		if (frequencies[a] < frequencies[b]) {
			return 1;
		}
		if (frequencies[a] > frequencies[b]) {
			return -1;
		}
		return 0;
	}
}

function get_word_frequencies(messages, k=10) {

	//console.log(messages.length);

	var words = [];
	for (var i = 0; i < messages.length; i++) {
		var msg = messages[i];
		words.push.apply(words, get_words(msg));
	}

	//console.log(words.length);

	var frequencies = {};

	try {
		var stopwords = fs.readFileSync("./utils/stopwords.txt", "utf8").toString().split("\n");
	} catch(e) {
    	console.log(e);
	}

	var unique_words = new Set(words);
	//console.log("unique:");
	//console.log(unique_words.size);

	unique_words.forEach(word => {
		frequencies[word] = 0;
	});

	for (var i = 0; i < words.length; i++) {
		var word = words[i];
		frequencies[word]++;
	}

	var words_by_freq = (Array.from(unique_words)).sort(init_frequency_compare(frequencies));
	//console.log(words_by_freq.length);

	var data = [];
	for (var i = 0; i < k; i++) {
		if (i < words_by_freq.length) {
			var word = words_by_freq[i];
			if (stopwords.indexOf(word) == -1) {
				data.push([word, frequencies[word]]);
			}
		}
		else {
			break;
		}
	}

	return data;
}

function send_chart(channel, text, data) {
	/*
	var chart = new Chartjs(600, 600);

	chart.drawChart(chart_options).then(() => {
	    return chartNode.getImageBuffer("image/png");
	})
	.then(buffer => {
		channel.sendFile(buffer, content=text);
	});
	*/

	console.log(data.length);

	var chart = anychart.bar();
	var series = chart.bar(data);

	chart.bounds(0, 0, 800, 600);
	chart.title(text);
	chart.container("container");
	console.log("about to create chart");
	chart.draw();

	console.log("created chart!");

	anychartExport.exportTo(chart, "png")
	.then(function(buffer) {
		console.log("got buffer...");
		if (buffer) {
			channel.sendFile(buffer, name="chart.png");
		}
	}, function (error) {
    	console.log(error);
	});
}

function message_stats(messages, channel, start_date) {
	if (messages.length) {
		// channel.send(`DEBUG: There are ${messages.length} messages in this channel since ${moment(start_date).format("MM-DD-YYYY")}.`);

		var word_frequencies = get_word_frequencies(messages, k=10);

		send_chart(channel, "Top Words by Frequency:", word_frequencies);

	} else {
		channel.send(`There are no messages in this channel since ${moment(start_date).format("MM-DD-YYYY")} to analyze.`);
	}
}

client.on("message", msg => {

	if (msg.content === "coazy.stats.words") {

		var channel = client.channels.get(msg.channel.id);
  		var server = channel.guild;

  		var todays_date = new Date();
  		var todays_messages = [];

		get_messages(todays_messages, channel, todays_date, 100);

	}

});

client.login(process.env.BOT_TOKEN);