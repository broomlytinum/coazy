console.log("bot.js running...");

const express = require("express");
const path = require("path");
const app = express();

var https = require("https");

const Discord = require("discord.js");
const client = new Discord.Client();

const bodyParser = require("body-parser");

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

client.on("message", msg => {
});

client.login(process.env.BOT_TOKEN);
