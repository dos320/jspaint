var http = require("http");
const express = require("express");
const app = express();

app.get("/", (req, res) => {
  res.sendFile(__dirname + "/index.html");
});

app.listen(8080, () => {
  console.log("now listening on port 8080.");
});
