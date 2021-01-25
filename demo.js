const io = require("socket.io-client");

const NPC = [];
var sockets = [];
var count = 0;

const roomName = "demo";
const password = "demodemo";
const interval = 500;
const ratio = 0.2;
const numOfPeople = 20;
const kana = [
  "あいうえおかきくけこさしすせそたちつてとなにぬねのはひふへほまみむめもやゆよらりるれろわぱぴぷぺぽ",
  "アイウエオカキクケコサシスセソタチツテトナニヌネノハヒフヘホマミムメモヤユヨラリルレロワパピプペポ",
];

const messages = [
  "こんにちは",
  "はじめまして",
  "大変ですね",
  "そうなの？",
  "何話しましょうか",
  "猫は最高ですね",
  "おすすめしたいものってあります？",
  "意外です",
  "キャンプに行きたい",
  "<script>alert();</script>",
  "これってどうすればいいんですか？",
  "私もです",
  "ステキです！",
  "絵のあるところで話しましょうか",
  "はい",
  "やっほー",
  "聞こえますか？",
  "いい季節ですよね",
  "お腹すいたな",
  "どこへ行こうかな",
  "おーーーい",
  "難しいな",
  "音楽聴きますか？",
  "なるほど",
  "かわいい",
  "了解",
  "テスト",
  "見えてる？",
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
          input_name: genName(),
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

function genName() {
  let name = "";
  const num = Math.floor(Math.random() * 3) + 2;
  const type = Math.random() < 0.5 ? 1 : 0;
  for (i = 0; i < num; i++) name += randKana(type);

  return name;
}

let randKana = (type) =>
  kana[type][Math.floor(Math.random() * kana[type].length)];
