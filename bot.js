const express = require("express");
const path = require("path");
const app = express();

const Discord = require("discord.js");

const client = new Discord.Client();

const https = require("https");
const bodyParser = require("body-parser");
const moment = require("moment");
const anychart = require("anychart-nodejs");
const fs = require("fs");

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
	var words = [];
	for (var msg in messages) {
		words.push.apply(words, get_words(msg));
	}

	var frequencies = {};

	try {
		var stopwords = fs.readFileSync("./utils/stopwords.txt", "utf8").toString().split("\n");
	} catch(e) {
    	console.log(e);
	}

	var unique_words = new Set(words);
	unique_words.forEach(word => {
		frequencies[word] = 0;
	});

	for (var word in words) {
		frequencies[word]++;
	}

	var words_by_freq = (new Array(unique_words)).sort(init_frequency_compare(frequencies));

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

	var chart = "var chart = anychart.bar(data); chart.bounds(0, 0, 800, 600); chart.container('container'); chart.draw()";

	anychart.exportTo(chart, "png")
	.then(function(buffer) {
		channel.sendFile(buffer, content=text);
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