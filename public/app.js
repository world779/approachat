var socket = io.connect(); // C02. ソケットへの接続
var MEMBER = "";
const IAM = {
  name: "",
  id: "",
  room: "",
  token: "",
  isEnter: false,
};

var express = require("express");
var router = express.Router();
var pg = require("pg");

var pool = new pg.Pool({
  database: "chatdb",
  user: "postgres", //ユーザー名はデフォルト以外を利用している人は適宜変更してください。
  password: "Arai25", //PASSWORDにはPostgreSQLをインストールした際に設定したパスワードを記述。
  host: "localhost",
  port: 5432,
});

/*ログイン画面 */
router.post("/", function (req, res, next) {
  /*入力した内容をDBから探して一致したらログインさせたい*/
  pool.connect(function (err, client) {
    if (err) {
      console.log(err);
    } else {
      var compare =
        "SELECT * FROM Web_user WHERE mail = '" +
        req.body.mail +
        "' AND pass = '" +
        req.body.pass +
        "'";
      client.query(compare, function (err, result) {
        if (err || result.rowCount == 0) {
          console.log(err);
          res.render("error-login");
        } else {
          res.render("index");
          console.log(result);
        }
      });
    }
  });
});

// C04. server_to_clientイベント・データを受信する
socket.on("s2c_msg", function (data) {
  appendMsg(data.msg);
});

socket.on("s2c_leave", function (data) {
  appendMsg(data.msg);
  $(`#${data.id}`).remove();
});

socket.on("connect", function (data) {
  console.log(data);
});

socket.on("token", function (data) {
  IAM.token = data.token;
  IAM.id = data.id;
});

socket.on("initial_data", function (data) {
  Object.keys(data.data).forEach(function (key) {
    var member = this[key];
    console.log(member.count);
    if (member.room == IAM.room) {
      appendAvatar(member.count, member.name);
      moveAvatar(member.count, member.x, member.y);
    }
  }, data.data);
});

socket.on("s2c_join", function (data) {
  appendMsg(data.msg);
  appendAvatar(data.id, data.name);
});

socket.on("s2c_move", function (data) {
  moveAvatar(data.id, data.x, data.y);
});

socket.on("s2c_dist", function (data) {
  drawMsgRange(data.id, data.dist);
});

socket.on("reconnect", function () {
  console.log("you have been reconnected");
  socket.emit("c2s_recconect", {});
});

function appendAvatar(id, name) {
  $("#field").append(
    `<div id=${id} class="avatar">${name}<div id=${id}-effect class="avatar-effect"></div></div>`
  );
}

function appendMsg(text) {
  $("#chatLogs").append("<div>" + text + "</div>");
}

$("form").submit(function (e) {
  var message = $("#msgForm").val();
  var selectRoom = $("#rooms").val();
  $("#msgForm").val("");
  if (IAM.isEnter) {
    // メッセージを送る
    var dist = $("#dist").val();
    socket.emit("c2s_msg", { token: IAM.token, dist: dist, msg: message });
  } else {
    IAM.name = message;
    IAM.room = $("#rooms").val();
    socket.emit("c2s_join", {
      token: IAM.token,
      name: IAM.name,
      room: selectRoom,
    });
    changeLabel();
  }
  e.preventDefault();
});

$("#field").click(function (e) {
  var offset = $(this).offset();
  var x = e.pageX - offset.left;
  var y = e.pageY - offset.top;
  socket.emit("c2s_move", { token: IAM.token, x: x, y: y });
});

function changeLabel() {
  IAM.isEnter = true;
  $(".nameLabel").text("メッセージ：");
  $(".passLabel").remove();
  $(".form-pass").remove();
  $("#rooms").prop("disabled", true);
  $("button").text("送信");
  $(".form-group").append(
    '<label class="nameLabel" for="dist">伝わる距離</label>\n<input type="range" id="dist" min="0" max="1500" value="80" step="5">'
  );
  $("#dist").change(drawCurrentDist);
}

function moveAvatar(id, x, y) {
  const avatar = document.getElementById(id);
  anime({
    targets: avatar,
    translateX: x,
    translateY: y,
    easing: "linear",
  });
}

function drawMsgRange(id, dist) {
  const avatar = document.getElementById(id);
  const effect = $(`${IAM.id}-effect`);
  var scale = dist / $(`#${id}`).height();
  var tl = anime.timeline({
    duration: 500,
  });
  tl.add({
    targets: avatar,
    scale: scale,
    opacity: 0.3,
    easing: "linear",
  }).add({
    targets: avatar,
    scale: 1,
    opacity: 1,
    easing: "easeInElastic(1, .6)",
  });
}

function drawCurrentDist() {
  var height = $(`#${IAM.id}`).height();
  var dist = $("#dist").val();
  console.log($("#dist").val());
  var fix = height / 2;
  const effect = document.getElementById(`${IAM.id}-effect`);
  anime({
    backgroundColor: "rgba(255, 0, 0, .2)",
    targets: effect,
    height: dist,
    width: dist,
    borderRadius: dist / 2,
    translateX: "+=fix",
    translateY: "+=fix",
    easing: "linear",
  });
}
