var MEMBER = "";
const IAM = {
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
  appendMsg(data.msg, data.color);
});

socket.on("s2c_leave", function(data) {
  appendMsg(data.msg, data.color);
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
      appendAvatar(member.count, member.color);
      moveAvatar(member.count, member.x, member.y);
      drawCurrentDist(member.count, member.dist);
    }
  }, data.data);
});

socket.on("s2c_join", function(data){
  appendMsg(data.msg, data.color);
  appendAvatar(data.id, data.color);
  drawCurrentDist(data.id, data.dist);
});

socket.on("s2c_move", function(data){
  console.log(data);
  moveAvatar(data.id, data.x, data.y);
});

socket.on("s2c_talking", function(data){
  drawMsgRange(data.id, data,dist);
});

socket.on("s2c_dist",function(data){
  drawCurrentDist(data.id, data.dist);
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


function appendAvatar(id, color) {
  $("#field").append(`<div id=${id} class="avatar">${id}<div id=${id}-effect class="avatar-effect"></div></div>`);
  $(`#${id}`).css("background-color", color);
  console.log($("#id"));
}

function appendMsg(text, color) {
  $("#chatLogs").append(`<div style="color: ${color};">${text}</div>`);
}

$("form").submit(function (e) {
  var message = $("#msgForm").val();
  var selectRoom = $("#rooms").val();
  if (IAM.isEnter) {
    // メッセージを送る
    var dist = $("#dist").val();
    socket.emit("c2s_msg", { token: IAM.token, dist:dist, msg: message });
  } else {
    IAM.room = $("#rooms").val();
    socket.emit("c2s_join", {token: IAM.token, room: selectRoom, color: genRandColor()});
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
  $(".roomLabel").remove();
  $(".passLabel").remove();
  $("#rooms").remove();
  $("#pass").remove();
  $("#sendButton").text("送信");
  $(".form-row").append('<input type="text" id="msgForm" class="form-control" autocomplete="off">');
  $(".form-row").append('<label class="nameLabel" for="dist">伝わる距離</label>\n<input type="range" id="dist" class="form-control" min="1" max="1000" value="80" step="5">');
  $("#dist").change(onDistChange);
}

function onDistChange(){
  var dist = $("#dist").val();
  socket.emit("c2s_dist",{ token: IAM.token, dist: dist });
}

function moveAvatar(id, x, y){
  const avatar = document.getElementById(id);
  var fieldSize = $("#field").css(["min-width", "min-height"]);
  var fieldWidth = parseInt(fieldSize["min-width"], 10);
  var fieldHeight = parseInt(fieldSize["min-height"], 10);
  console.log(Math.max(fieldWidth, x));
  $("#field").css({"min-width": Math.max(fieldWidth, x), "min-height": Math.max(fieldHeight, y)});
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

function genRandColor(){
  var hue = Math.floor(Math.random()*10)*36;
  var sat = Math.floor(Math.random()*35)+20;
  console.log(sat);
  var color = `hsl(${hue}, 50%, ${sat}%)`;

  return color;
}

function drawMsgRange(id, dist){
  const effect = document.getElementById(`${id}-effect`);
  const color = $(`#${id}`).css("background-color");
  console.log(color);
  var tl = anime.timeline({
    duration: 500
  });
  tl
    .add({
      targets: effect,
      backgroundColor: 'rgba(255, 0, 0, .1)',
      easing: 'linear'
    })
    .add({
      targets: effect,
      backgroundColor: 'rgba(0, 0, 0, .02)',
      easing: 'linear'
    });
}

function drawCurrentDist(id, dist){
  var height = $(`#${id}`).height();
  var fix = height/2;
  const effect = document.getElementById(`${id}-effect`);
  anime({
    backgroundColor: 'rgba(0, 0, 0, .02)',
    targets: effect,
    height: dist,
    width: dist,
    borderRadius: dist/2,
    translateX: "+=fix",
    translateY: "+=fix",
    easing: 'linear'
  });
}
