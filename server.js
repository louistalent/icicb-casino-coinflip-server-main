var express = require('express');
var app = express();
const axios = require("axios");
require('dotenv').config();
var bodyParser = require('body-parser');
const cookieParser = require('cookie-parser');
var cors = require('cors');
const util = require('util');
const { Socket } = require('dgram');
var server = require('http').createServer(app);
var port = 443;
var io = require('socket.io')(server);
axios.defaults.headers.common["Authorization"] = process.env.SECRETCODE;

gameSocket = null;
app.use(bodyParser.json());
app.use(cookieParser());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(cors());

app.use(express.static(__dirname + "/build"));
app.get("/*", function (req, res) {
  res.sendFile(__dirname + "/build/index.html", function (err) {
    if (err) {
      res.status(500).send(err);
    }
  });
});

server.listen(port, function () {
  console.log("server is running on " + port);
});

let users = [];
var isStarted = false;
// Implement socket functionality
gameSocket = io.on('connection', function (socket) {
  socket.on('disconnect', () => {
    console.log('user disconnected');
  });
  console.log("connected", socket.id);
  socket.on('bet info', async (req) => {
    console.log(req);
    var Amount;
    console.log(req.token);
    Amount = req.totalAmount;
    try {
      try {
        await axios.post(process.env.PLATFORM_SERVER + "api/games/bet", {
          token: req.token,
          amount: req.betAmount
        });
      } catch (err) {
        console.log(err);
        throw new Error("0");
      }
      Amount -= req.betAmount;
      users[req.token] = {
        sideFlag: 0,
        amount: Amount,
        betAmount: req.betAmount,
        gameResult: false,
        earnAmount: 0,
        odd: 0,
        level: 0,
        userToken: req.token
      }
      var user = users[req.token];
      isStarted = true;
      console.log(user.amount);
      betStart = { "amount": user.amount, "isStarted": isStarted }

      socket.emit("game start", betStart);
    } catch (err) {
      socket.emit("error message", { "errMessage": err.message })
    }
  });

  socket.on("card click", (req) => {
    var betResult = [];
    var sideFlag = getRandomInt();
    console.log(sideFlag);
    var user = users[req.token];
    if (sideFlag == req.sideFlag) {
      user.odd = 1.98 * Math.pow(2, user.level);
      user.level++;
      user.earnAmount = user.odd * user.betAmount;
      user.gameResult = true;
      user.userToken = req.token;
      user.amount = req.totalAmount;
      betResult = {
        gameResult: user.gameResult,
        odd: user.odd,
        earnAmount: user.earnAmount,
        level: user.level,
        amount: user.amount,
        sideFlag: sideFlag,
        token: user.userToken
      }
      console.log(betResult);
    }
    else {
      user.userToken = req.token;
      user.amount = req.totalAmount;
      betResult = {
        gameResult: false,
        odd: 0,
        earnAmount: 0,
        level: 0,
        amount: user.amount,
        sideFlag: sideFlag,
        token: user.userToken
      }
    }
    console.log(betResult)
    socket.emit("card result", betResult);
  });

  socket.on("cash out", async (req) => {
    console.log(req);
    var gameResult = [];
    var user = users[req.token];
    user.amount = req.totalAmount;
    user.earnAmount = req.earnAmount;
    user.amount += user.earnAmount;
    try {
      try {
        await axios.post(process.env.PLATFORM_SERVER + "api/games/winlose", {
          token: req.token,
          amount: user.earnAmount,
          winState: true
        });
      } catch (err) {
        console.log(err);
        throw new Error("1");
      }
      gameResult = {
        amount: user.amount,
        earnAmount: user.earnAmount,
        level: 0,
        odd: 0,
        isStarted: false,
      }
      socket.emit('game result', gameResult);
    } catch (err) {
      console.log(err);
      socket.emit("error message", { "errMessage": err.message })
    }
  });
  console.log('socket connected: ' + socket.id);
  socket.emit('connected', {});
});
function getRandomInt() {
  return Math.floor(Math.random() * 2);
}
