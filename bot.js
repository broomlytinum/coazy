const express = require("express");
const path = require("path");
const app = express();

var https = require("https");

const Discord = require("discord.js");
const client = new Discord.Client();

const bodyParser = require("body-parser");

const moment = require("moment");

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

function message_stats(messages, channel, start_date) {
	if (messages.length) {
		channel.send(`DEBUG: There are ${messages.length} messages in this channel since ${moment(start_date).format("MM-DD-YYYY")}.`);
	} else {
		channel.send(`There are no messages in this channel since ${moment(start_date).format("MM-DD-YYYY")} to analyze.`);
	}
}

function get_messages(collector, channel, start_date, limit, before=null) {
	channel.fetchMessages({limit: limit})
		.then(messages => {
			var finished = false;
			var earliest_message = before;

			messages.forEach(message => {
				if (message.createdAt.getTime() < start_date.getTime()) {
					finished = true;
				} else {
					earliest_message = message;
					collector.push(message);
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

client.on("message", msg => {

	if (msg.content === "coazy.stats") {

		var channel = client.channels.get(msg.channel.id);
  		var server = channel.guild;

  		var todays_date = new Date();
  		var todays_messages = [];


		get_messages(todays_messages, channel, todays_date, 100);
	}
});

client.login(process.env.BOT_TOKEN);
