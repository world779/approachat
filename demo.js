const io = require("socket.io-client");

const NPC = [];
var sockets = [];
var count = 0;

const roomName = "demo";
const password = "demodemo";
const interval = 500;
const ratio = 0.2;
const numOfPeople = 20;

const messages = [
  "こんにちは",
  "はじめまして",
  "大変ですね",
  "そうなの？",
  "これってどうすればいいんですか？",
  "私もです",
];

for (let i = 0; i < numOfPeople; i++) {
  NPC.push({
    id: "",
    room: "",
    token: "",
    socketId: "",
    x: 2000,
    y: 2000,
    isEnter: false,
    isConnected: false,
  });
  sockets.push(
    io("http://localhost:3000", { transports: ["websocket"] }).connect({
      query: {
        reconnect: false,
      },
    })
  );
  sockets[i].on("connect", function (data) {
    NPC[i].socketId = sockets[i].id;
  });

  sockets[i].on("token", function (data) {
    NPC[i].token = data.token;
    NPC[i].id = data.id;
    NPC[i].isConnected = true;
    count++;
    if (count >= numOfPeople) {
      console.log("start");
      randomAct();
    }
  });

  sockets[i].on("initial_data", function (data) {
    NPC[i].isEnter = true;
  });

  sockets[i].on("disconnect", function () {
    sockets[i].io.opts.query = {
      reconnect: NPC[i].isConnected ? "true" : "false",
      socketId: NPC[i].socketId,
      token: NPC[i].token,
    };
    console.log("disconnected");
  });

  sockets[i].on("connect_error", function (error) {
    console.log(error);
  });

  sockets[i].on("s2c_move", function (data) {
    if (data.id != NPC[i].id) return;
    NPC[i].x = data.x;
    NPC[i].y = data.y;
  });
}

process.on("SIGINT", function () {
  for (i in sockets)
    sockets[i].emit("c2s_leave", { token: NPC[i].token, id: NPC[i].id });
  process.exit(0);
});

function randomAct() {
  for (i in sockets) {
    if (judgeAct()) {
      if (NPC[i].isEnter) {
        switch (decideMovement()) {
          case 0:
            sockets[i].emit("c2s_dist", {
              token: NPC[i].token,
              dist: genDistChange(),
            });
            break;
          case 1:
            sockets[i].emit("c2s_move", {
              token: NPC[i].token,
              x: NPC[i].x + genMove(),
              y: NPC[i].y + genMove(),
            });
            break;
          default:
            sockets[i].emit("c2s_msg", {
              token: NPC[i].token,
              msg: genMessage(),
            });
            break;
        }
      } else {
        sockets[i].emit("c2s_join", {
          token: NPC[i].token,
          room: roomName,
          color: genRandColor(),
          input_name: "test",
          password: password,
        });
      }
    }
  }
  setTimeout(randomAct, interval);
}

function genRandColor() {
  var hue = Math.floor(Math.random() * 10) * 36;
  var sat = Math.floor(Math.random() * 40) + 25;
  var color = `hsla(${hue}, 50%, ${sat}%, 1)`;

  return color;
}

let decideMovement = () => Math.floor(Math.random() * 10);

let judgeAct = () => Math.random() < ratio;

let genDistChange = () => Math.floor(Math.random() * 100);

let genMove = () => Math.floor(Math.random() * 1000) - 500;

let genMessage = () => messages[Math.floor(Math.random() * messages.length)];
