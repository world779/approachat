const express  = require("express");
const app  = express();
const http = require("http").Server(app);
const io = require("socket.io")(http);
const crypto = require("crypto");
const DOCUMENT_ROOT = __dirname + "/public";
//デプロイ時は変更の上環境変数にして削除
const SECRET_TOKEN = "abcdefghijklmn12345";

const MEMBER = {};
let MEMBER_COUNT = 1;

app.get("/", (req, res)=>{
  res.sendFile(DOCUMENT_ROOT + "/index.html");
});

app.use(express.static(__dirname + "/public"));
app.use("/animejs", express.static(__dirname + "/node_modules/animejs/lib/"));

// S04. connectionイベントを受信する
io.on("connection", function (socket) {

  var room = "";
  var name = "";

    (()=>{
    // トークンを作成
    const token = crypto.createHash("sha1").update(SECRET_TOKEN + socket.id).digest('hex');

    // ユーザーリストに追加
    MEMBER[socket.id] = {token: token, name:null, count:MEMBER_COUNT};
    MEMBER_COUNT++;

    // 本人にトークンを送付
    io.to(socket.id).emit("token", {token:token});
  })();

  // roomへの入室は、「socket.join(room名)」
  socket.on("join", function (data) {
    room = data.value;
    socket.join(room);
  });
  // S05. client_to_serverイベント・データを受信する
  socket.on("msg", function (data) {
    // S06. server_to_clientイベント・データを送信する
    io.to(room).emit("server_to_client", { value: data.value });
  });
  // S07. client_to_server_broadcastイベント・データを受信し、送信元以外に送信する
  socket.on("client_to_server_broadcast", function (data) {
    socket.broadcast.to(room).emit("server_to_client", { value: data.value });
  });
  // S08. client_to_server_personalイベント・データを受信し、送信元のみに送信する
  socket.on("client_to_server_personal", function (data) {
    var id = socket.id;
    name = data.value;
    var personalMessage = "あなたは、" + name + "さんとして入室しました。";
    io.to(id).emit("server_to_client", { value: personalMessage });
  });
  // S09. dicconnectイベントを受信し、退出メッセージを送信する
  socket.on("disconnect", function () {
    if (name == "") {
      console.log("未入室のまま、どこかへ去っていきました。");
    } else {
      var endMessage = name + "さんが退出しました。";
      io.to(room).emit("server_to_client", { value: endMessage });
    }
  });
});

http.listen(3000, function(){
    console.log("listening on *:3000");
})
