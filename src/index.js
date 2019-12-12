const express = require("express");
const app = require('express')();
var http = require("http").createServer(app);
const io = require('socket.io')(http);


app.use(express.static(__dirname));

app.get("/", (req, res) => {
  res.sendFile(__dirname + "/index.html");
});

io.on("connection", (socket)=>{
  /*
    TODO:
    - drawing history - maybe use an array or something to store all the points that were drawn
    - draw point - receive points and draw lines based on those points
  */
  console.log("test");
  socket.on("send point", (point)=>{
    // emits the point for all clients except the sender to render, client-side
    socket.broadcast.emit("draw line", point);
  });

  socket.on("stop drawing line", ()=>{
    socket.broadcast.emit("stop drawing line");
  });

  socket.on("colour change", (colour)=>{
    socket.broadcast.emit("colour change", colour);
  });
  
});

http.listen(8080, () => {
  console.log("now listening on port 8080.");
});
