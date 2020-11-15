var socket = io.connect(); // C02. ソケットへの接続
var isEnter = false;
var name = "";
var room = "";
var token = "";
var MEMBER = "";

// C04. server_to_clientイベント・データを受信する
socket.on("s2c_msg", function (data) {
  appendMsg(data.msg);
});

socket.on("s2c_leave", function(data) {
  appendMsg(data.msg);
});

socket.on("token", function(data){
  token = data.token;
});

socket.on("initial_data", function(data) {
  Object.keys(data.data).forEach(function(key) {
    member = this[key];
    console.log(key);
    if(member.room == room){
      appendAvatar(member.count);
      moveAvatar(member.id, member.x, member.y);
      console.log("append");
    }
  }, data.data);
});

socket.on("s2c_join", function(data){
  appendMsg(data.msg);
  appendAvatar(data.id);
  console.log("appendjoin");
});

socket.on("s2c_move", function(data){
  moveAvatar(data.id, data.x, data.y);
});

function appendAvatar(id) {
  $("#field").append(`<div id=${id} class="avatar"></div>`);
}

function appendMsg(text) {
  $("#chatLogs").append("<div>" + text + "</div>");
}

$("form").submit(function (e) {
  var message = $("#msgForm").val();
  var selectRoom = $("#rooms").val();
  $("#msgForm").val("");
  if (isEnter) {
    // メッセージを送る
    socket.emit("c2s_msg", { token: token, msg: message });
  } else {
    name = message;
    room = $("#rooms").val();
    socket.emit("c2s_join", {token: token, name: name, room: selectRoom });
    changeLabel();
  }
  e.preventDefault();
});

$("#field").click(function(e){
  console.log(e);
  socket.emit("c2s_move", { token:token, x:e.clientX, y:e.clientY });
});

function changeLabel() {
  $(".nameLabel").text("メッセージ：");
  $(".passLabel").remove();
  $(".form-pass").remove();
  $("#rooms").prop("disabled", true);
  $("button").text("送信");
  isEnter = true;
}

function moveAvatar(id, x, y){
  const avatar = document.getElementById(id);
  anime({
    targets: avatar,
    translateX: x,
    translateY: y,
    easing: 'linear'
  })
}
