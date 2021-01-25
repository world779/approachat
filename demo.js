const io = require("socket.io-client");

const NPC = [];
var sockets = [];

const roomName = "demo";
const password = "demodemo";

for (let i = 0; i < 20; i++) {
  NPC.push({
    id: "",
    room: "",
    token: "",
    socketId: "",
    isEnter: false,
    isConnected: false,
  });
  sockets.push(
    io("http://localhost:3000", {transports: ['websocket']}).connect({
      query: {
        reconnect: false,
      },
    })
  );
  sockets[i].on("connect", function (data) {
    NPC[i].socketId = sockets[i].id;
    console.log("connected");
  });

  sockets[i].on("token", function (data) {
    NPC[i].token = data.token;
    NPC[i].id = data.id;
    NPC[i].isConnected = true;
    sockets[i].emit("c2s_join", {
      token: NPC[i].token,
      room: roomName,
      color: genRandColor(),
      input_name: "test",
      password: password,
    });
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

  sockets[i].on("connect_error",function(error){
    console.log(error);
  });
}

// var message = genMessage();
// var dist = genDistChange();
// socket.emit("c2s_msg", { token: NPC[i].token, dist: dist, msg: message });
//
// if (!socket.connected) socket.connect();
// var pass = $("#passForm").val();
// NPC[i].room = roomName;
// e.preventDefault();
//
// socket.emit("c2s_move", { token: NPC[i].token, x: x, y: y });
//
function genRandColor() {
  var hue = Math.floor(Math.random() * 10) * 36;
  var sat = Math.floor(Math.random() * 40) + 25;
  var color = `hsla(${hue}, 50%, ${sat}%, 1)`;

  return color;
}
