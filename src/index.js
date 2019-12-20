const express = require("express");
const app = require("express")();
var http = require("http").createServer(app);
const io = require("socket.io")(http);
const stringSimilarity = require("string-similarity");

let wordBank = ["APPLE", "VEHICLE", "SCISSORS"]; // may use an external file later

let currentUsers = [];
let currentArtist;
let wordToGuess = "";
let difference;
// gameState: 0-3
// 0 - waiting for players - can only start with two people
// 1 - guessing stage
// 2 - everyone guesses right / time runs out - display the word
// 3 - game over
let gameState = 0;

// gameMode: 0-1
// 0 - guess and draw
// 1 - free draw
let gameMode = 0;
let currentRoundNumber = 1;
let maxRounds = 1;
let newRoundStarted = false;
let timerItvl;

let nameGenerator = () => {
  let adj = [
    "Acceptable",
    "Believable",
    "Chosen",
    "Deaf",
    "Edgy",
    "Flying",
    "Hopeful",
    "Intentional",
    "Lost",
    "Modern",
    "Narrow",
    "Owned",
    "Performing",
    "Quick",
    "Red",
    "Speedy",
    "White",
    "Yellow",
    "Zealous"
  ];
  let noun = [
    "Animal",
    "Buffoon",
    "Candle",
    "Dream",
    "Eggplant",
    "Fish",
    "Greece",
    "Helmet",
    "Insect",
    "Juice",
    "Kitchen",
    "Lighter",
    "Lunch",
    "Machine",
    "Parrot",
    "Quill",
    "Rainbow",
    "Sandwich",
    "Telephone",
    "Uganda",
    "Vase",
    "Wall",
    "Yacht",
    "Zoo"
  ];
  return (
    adj[Math.floor(Math.random() * adj.length)] +
    noun[Math.floor(Math.random() * noun.length)] +
    "" +
    Math.floor(Math.random() * 98)
  );
};

let checkIfAllGuessedCorrectly = ()=>{
  let numGuessedCorrectly = 0;
  for(let user of currentUsers){
    if(user.guessedCorrectly && currentArtist.id !== user.id){
      numGuessedCorrectly++   
    }
  }
  if(numGuessedCorrectly === currentUsers.length-1){
    for(let user of currentUsers){
      user.guessedCorrectly = false;
    }
    return true;
  }
  return false;
}

app.use(express.static(__dirname));

app.get("/", (req, res) => {
  res.sendFile(__dirname + "/index.html");
});

io.on("connection", socket => {
  /*
    TODO:
    - drawing history - maybe use an array or something to store all the points that were drawn
    - draw point - receive points and draw lines based on those points
  */

  let newUser = {
    id: socket.id,
    name: nameGenerator(),
    hasCompletedTurn: false,
    score: 0,
    guessedCorrectly: false,
    isArtist: false
  };
  currentUsers.push(newUser);
  console.log("user connected");

  //socket.emit("add user to user list", newUser);

  io.emit("update users list", currentUsers);

  socket.on("disconnect", () => {
    console.log("user disconnected");
    currentUsers.splice(
      currentUsers.indexOf(
        currentUsers.find(user => {
          return user.id === socket.id;
        })
      ),
      1
    );
    io.emit("update users list", currentUsers);
  });

  socket.on("send point", point => {
    // emits the point for all clients except the sender to render, client-side
    if(gameMode === 0){
      if(newUser.isArtist){
        socket.broadcast.emit("draw line", point);
      }
    }else{
      socket.broadcast.emit("draw line", point);
    }
    
    
  });

  socket.on("stop drawing line", () => {
    if(gameMode === 0){
      if(newUser.isArtist){
        socket.broadcast.emit("stop drawing line");
      }
    }else{
      socket.broadcast.emit("stop drawing line");
    }
    
    
  });

  socket.on("colour change", colour => {
    socket.broadcast.emit("colour change", colour);
  });

  socket.on("draw dot", dot => {
    socket.broadcast.emit("draw dot", dot);
  });

  socket.on("clear canvas", () => {
    io.emit("clear canvas");
  });

  socket.on("chat message", msg => {
    let similarity = stringSimilarity.compareTwoStrings(
      msg.toUpperCase(),
      wordToGuess.toUpperCase()
    );
    console.log(similarity);

    if (Math.round(similarity) === 1) {
      let currentUser = currentUsers.find(user => {
        return user.id === socket.id;
      });
      if (!currentUser.guessedCorrectly) {
        // calculate score here
        let score = (difference * wordToGuess.length) / 100;
        currentUser.score += score;
        currentUser.guessedCorrectly = true;

        // does the same as in "start game"
        if(checkIfAllGuessedCorrectly()){
          gameState = 2;
          newRoundStarted = false; // stops multiple intervals from being created
          io.emit("end round");
          io.emit("clear canvas");
          clearInterval(timerItvl);
        }
        io.emit("player guessed correctly", newUser);
        io.emit("update users list", currentUsers);
      }
    } else if (Math.round(similarity) >= 0.7) {
      io.to(`${socket.id}`).emit("similar match", msg);
    } else {
      io.emit("chat message", msg, newUser);
    }
    console.log(msg);
  });

  // this is going to be treated as the main game loop
  socket.on("start game", () => {
    //console.log(currentUsers);
    io.emit("reset all elements");
    if(!newRoundStarted){
      if (gameState <= 1) {
        if (currentUsers.length >= 2 && currentRoundNumber<=maxRounds) {
          newRoundStarted = true;
          gameState = 1;
          // notify client that game has started
          //io.to(`${socket.id}`).emit("handle info message", "Game has been started.");
          // need to add a randomizer here to find someone who hasnt went yet
          // currentArtist = currentUsers[Math.floor(Math.random()*currentUsers.length)];
          currentArtist = currentUsers.find(user => !user.hasCompletedTurn);
          io.emit("update round numbers", maxRounds, currentRoundNumber);
          if (currentArtist !== undefined) {
            currentUsers.find(user=>!user.hasCompletedTurn).isArtist = true;
            currentArtist.hasCompletedTurn = true;
          }else if (currentArtist === undefined) {
            // this means that all people have went
            /*
              reset all hasCompletedTurn
              emit signal to all clients that the next round has begun
              keep track of round numbers... implement later
              on the client side call "start game" again
            */
            for (let user of currentUsers) {
              user.hasCompletedTurn = false;
            }
            currentRoundNumber++;
            io.emit("update round numbers", maxRounds, currentRoundNumber);
            
            currentArtist = currentUsers.find(user => !user.hasCompletedTurn);
            currentUsers.find(user=>!user.hasCompletedTurn).isArtist = true;
            currentArtist.hasCompletedTurn = true;
          }
          wordToGuess = wordBank[Math.floor(Math.random() * wordBank.length)];
          console.log(currentArtist);
          io.emit("announce current artist", currentArtist);

          for (let user of currentUsers) {
            if (user !== currentArtist) {
              io.to(`${user.id}`).emit("handle artist status", false, wordToGuess);
            } else {
              io.to(`${user.id}`).emit("handle artist status", true, wordToGuess);
            }
          }
          //io.emit("start timer", 60000); // time per turn in milliseconds
          let time = 60000;
          let today = new Date();
          let finalTime = today.getTime() + time;
          timerItvl = setInterval(() => {
            let today = new Date();
            difference = finalTime - today.getTime();
            console.log(difference);
            if (difference > 0) {
              io.emit("handle timer", difference);
            } else {
              // either every one has guessed right and the timer ends early
              // or the timer runs out b/c not everyone has guessed right
              gameState = 2;
              newRoundStarted = false; // stops multiple intervals from being created
              io.emit("end round");
              io.emit("clear canvas");
              clearInterval(timerItvl);
            }
            //clearInterval(itvl);
            //document.getElementById("time-left-to-guess").innerHTML = difference;
          }, 1000);
        } else if(currentUsers.length <2 && currentRoundNumber<=maxRounds){
          // notify client that game cannot start
          console.log("test");
          io.to(`${socket.id}`).emit(
            "handle info message",
            "Error: Game cannot be started with less than 2 people."
          );
        } else {
          // currentRoundNumber exceeds max rounds
          gameState = 3;
        }
      } else if (gameState === 2) {
        // display the word for a few seconds
        let intervals = 0;
        newRoundStarted = true;
        io.emit("reveal word", wordToGuess);

        let itvl = setInterval(() => {
          if (intervals >= 5) {
            
            // either go back to guessing stage or game over screen if round number is met
            gameState = 0; // defaults to starting another round.
            //currentRoundNumber++; // do a check with this / maxRounds
            // reset variables????
            io.emit("end round");
            clearInterval(itvl);
            newRoundStarted = false;
          }
          intervals++;
          console.log(intervals);
        }, 1000);
      } else {
        io.to(`${socket.id}`).emit(
          "handle info message",
          "Error: Game has already started."
        );
      }
      if(gameState === 3){
        // game over
        // check all users, find person with most score and display as the winner.
        // reset all variables.
        let winner;
        let bestScore = 0;
        for(let user of currentUsers){
          if(user.score > bestScore){
            bestScore = user.score;
            winner = user;
          }
        }
        io.emit("display winner", winner);
        return;
      }
    }
  });

  socket.on("change gamemode", (gameModeNum)=>{
    console.log("changed gamemode");
    gameMode = gameModeNum;
  });
});

// make sure to sub in process.env.PORT for the port number later
http.listen(8080, () => {
  console.log("now listening on port 8080.");
});
