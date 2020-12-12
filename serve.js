const express  = require("express");
const app  = express();
const http = require("http").Server(app);
const io = require("socket.io")(http);
const crypto = require("crypto");
const DOCUMENT_ROOT = __dirname + "/public";
//デプロイ時は変更の上環境変数にして削除
const SECRET_TOKEN = "abcdefghijklmn12345";

const MEMBER = {};
const TOKENS = {};
let MEMBER_COUNT = 1;

app.get("/", (req, res)=>{
  res.sendFile(DOCUMENT_ROOT + "/index.html");
});

app.use(express.static(__dirname + "/public"));
app.use("/animejs", express.static(__dirname + "/node_modules/animejs/lib/"));

// S04. connectionイベントを受信する
io.on("connection", function (socket) {

    (()=>{
    // トークンを作成
        const data=socket.handshake.query;
        console.log(data);
        if(data.reconnect=="true"){
            if(TOKENS[data.socketId] == data.token){
                console.log(MEMBER);
                console.log(MEMBER[socket.id]);
                console.log(MEMBER[data.socketId]);
                MEMBER[socket.id] = MEMBER[data.socketId];
                TOKENS[socket.id] = data.token;
                delete MEMBER[data.socketId];
                delete TOKENS[data.socketId];
                console.log("-------");
            }
        }else{
            const token = crypto.createHash("sha1").update(SECRET_TOKEN + socket.id).digest('hex');
            // ユーザーリストに追加
            MEMBER[socket.id] = {name:null, room:null, count:MEMBER_COUNT, x: 0, y: 0};
            TOKENS[socket.id] = token;
            MEMBER_COUNT++;

            // 本人にトークンを送付
            io.to(socket.id).emit("token", { token: token, id:MEMBER[socket.id].count });
        }
    })();


  // ルームに入室されたらsocketをroomにjoinさせてメンバーリストにもそれを反映
  socket.on("c2s_join", function (data) {
    if(data.token == TOKENS[socket.id]){
      io.to(socket.id).emit("initial_data", { data: MEMBER });
      MEMBER[socket.id].name = data.name;
      MEMBER[socket.id].room = data.room;
      socket.join(data.room);
      var msg = MEMBER[socket.id].name + "さんが入室しました。";
      io.to(MEMBER[socket.id].room).emit("s2c_join", { id: MEMBER[socket.id].count, name: MEMBER[socket.id].name, msg: msg });
    }
  });
  // メッセージがきたら名前とメッセージをくっつけて送り返す
  socket.on("c2s_msg", function (data) {
    // S06. server_to_clientイベント・データを送信する
    var minDist = data.dist;
    if(TOKENS[socket.id] == data.token){
      var sender = MEMBER[socket.id];
      io.to(sender.room).emit("s2c_dist", { id: sender.count, dist: minDist });
      var msg = sender.name + ": " + data.msg;
      Object.keys(MEMBER).forEach(function(key) {
        var member = MEMBER[key];
        var dist = calcDist(member.x, member.y, sender.x, sender.y);
        if(dist<minDist && member.room==sender.room)io.to(key).emit("s2c_msg", { msg: msg });
      }, MEMBER);
    }
  });

  socket.on("c2s_move", function(data){
      if(TOKENS[socket.id] == data.token){
          MEMBER[socket.id].x = data.x;
          MEMBER[socket.id].y = data.y;
          io.to(MEMBER[socket.id].room).emit("s2c_move", { id: MEMBER[socket.id].count, x:MEMBER[socket.id].x, y:MEMBER[socket.id].y });
          console.log(data);
      }
  });

  // S09. dicconnectイベントを受信し、退出メッセージを送信する
  socket.on("disconnect", function () {
    // if (MEMBER[socket.id].name == null) {
    //   console.log("未入室のまま、どこかへ去っていきました。");
    // } else {
      // var msg = MEMBER[socket.id].name + "さんが退出しました。";
      // io.to(MEMBER[socket.id].room).emit("s2c_leave", { id:MEMBER[socket.id].count, msg: msg });
    // }
    // delete MEMBER[socket.id];
  });
});

function calcDist(x1, y1, x2, y2){
  return Math.sqrt((x1-x2) * (x1-x2) + (y1-y2) * (y1-y2));
}

http.listen(3000, function(){
    console.log("listening on *:3000");
});
