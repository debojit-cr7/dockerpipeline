const express = require("express");
const redis = require("redis");

const port = process.env.PORT || 8080;
const redisUrl = process.env.REDIS_URL || "redis://redis:6379";

const app = express();

app.use(express.text());

const client = redis.createClient({
	  url: redisUrl,
});

client.on("error", function (error) {
	  console.error(error);
});

app.get("/", (req, res) => {
	  console.log("request at URL");
	  res.send("hello from port " + port);
});

app.get("/:key", (req, res) => {
	  const key = req.params.key;
	  client.get(key, (error, reply) => {
		      if (error) res.send("Error");
		      else res.send(reply);
		    });
});

app.post("/:key", (req, res) => {
	  const key = req.params.key;
	  const data = req.body;
	  client.set(key, data, (error, reply) => {
		      if (error) res.send("Error");
		      else res.send(reply);
		    });
});

app.listen(port, () => {
	  console.log("app is listening on port " + port);
});
