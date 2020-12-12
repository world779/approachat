var MEMBER = "";
const IAM = {
  name: "",
  id: "",
  room: "",
  token: "",
  socketId: "",
  isEnter : false,
  isConnected : false,
  isMoving : false
}

var utilIsOpen = true;

var socket = io.connect({ 
  query : {
    reconnect: false
  }
}); // C02. ソケットへの接続

// C04. server_to_clientイベント・データを受信する
socket.on("s2c_msg", function (data) {
  appendMsg(data.msg);
});

socket.on("s2c_leave", function(data) {
  appendMsg(data.msg);
  $(`#${data.id}`).remove();
});

socket.on("connect",function(data){
  IAM.socketId = socket.id;
  console.log("connected");
  console.log(socket);
});

socket.on("token", function(data){
  if(!IAM.isConnected){
    IAM.token = data.token;
    IAM.id = data.id;
    console.log(IAM);
    IAM.isConnected = true;
  }
});

socket.on("initial_data", function(data) {
  Object.keys(data.data).forEach(function(key) {
    var member = this[key];
    console.log(member.count);
    if(member.room == IAM.room){
      appendAvatar(member.count, member.name);
      moveAvatar(member.count, member.x, member.y);
    }
  }, data.data);
});

socket.on("s2c_join", function(data){
  appendMsg(data.msg);
  appendAvatar(data.id, data.name);
});

socket.on("s2c_move", function(data){
  console.log(data);
  moveAvatar(data.id, data.x, data.y);
});

socket.on("s2c_dist",function(data){
  drawMsgRange(data.id, data.dist);
});

socket.on('disconnect', function () {
  socket.io.opts.query = {
    reconnect: (IAM.isConnected?"true":"false"),
    socketId: IAM.socketId,
    token: IAM.token
  }
  $(".alert").alert();
})

$(".alert").on("closed.bs.alert", function(){
});

socket.on("reconnect",function(){
  console.log("reconnected");
});

function manualRecconect(){
  console.log("reconnecting");
  socket = io.connect({ 
    reconnection : false,
    query : {
      reconnect: (IAM.isConnected?"true":"false"),
      socketId: IAM.socketId,
      token: IAM.token
      }
  });
  console.log(socket.query);
}


function appendAvatar(id, name) {
  $("#field").append(`<div id=${id} class="avatar">${name}<div id=${id}-effect class="avatar-effect"></div></div>`);
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
    socket.emit("c2s_msg", { token: IAM.token, dist:dist, msg: message });
  } else {
    IAM.name = message;
    IAM.room = $("#rooms").val();
    socket.emit("c2s_join", {token: IAM.token, name: IAM.name, room: selectRoom });
    changeLabel();
    IAM.isEnter = true;
  }
  e.preventDefault();
});

$("#field").click(function(e){
  if(IAM.isMoving) return;
  var offset = $(this).offset();
  var x = e.pageX - offset.left;
  var y = e.pageY - offset.top;
  socket.emit("c2s_move", { token:IAM.token, x:x , y:y });
  console.log("move");
});

function toggleUtil(){
  const util = document.getElementById("container-util");
  anime({
    targets: util,
    height: (utilIsOpen?"15vh":"50vh")
  });
  utilIsOpen = !utilIsOpen;
}

function changeLabel() {
  $(".nameLabel").text("メッセージ：");
  $(".passLabel").remove();
  $(".form-pass").remove();
  $("#rooms").prop("disabled", true);
  $("button").text("送信");
  $(".form-group").append('<label class="nameLabel" for="dist">伝わる距離</label>\n<input type="range" id="dist" min="0" max="1500" value="80" step="5">');
  $("#dist").change(drawCurrentDist);
}

function moveAvatar(id, x, y){
  const avatar = document.getElementById(id);
  if(id = IAM.id) IAM.isMoving = true;
  anime({
    targets: avatar,
    translateX: x,
    translateY: y,
    easing: 'linear',
    complete: function(anim) {
      if(id = IAM.id) IAM.isMoving = false;
    }
  });
}

function drawMsgRange(id, dist){
  const avatar = document.getElementById(id);
  const effect = $(`${IAM.id}-effect`);
  var scale = dist/$(`#${id}`).height();
  var tl = anime.timeline({
    duration: 500
  });
  tl
    .add({
      targets: avatar,
      scale: scale,
      opacity: 0.3,
      easing: 'linear'
    })
    .add({
      targets: avatar,
      scale: 1,
      opacity: 1,
      easing: 'easeInElastic(1, .6)'
    });
}

function drawCurrentDist(){
  var height = $(`#${IAM.id}`).height();
  var dist = $("#dist").val();
  console.log($("#dist").val());
  var fix = height/2;
  const effect = document.getElementById(`${IAM.id}-effect`);
  anime({
    backgroundColor: 'rgba(255, 0, 0, .2)',
    targets: effect,
    height: dist,
    width: dist,
    borderRadius: dist/2,
    translateX: "+=fix",
    translateY: "+=fix",
    easing: 'linear'
  });
}
