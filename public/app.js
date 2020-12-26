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
});


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
});

socket.on("token", function(data){
  if(!IAM.isConnected){
    IAM.token = data.token;
    IAM.id = data.id;
    IAM.isConnected = true;
  }
});

socket.on("initial_data", function (data) {
  Object.keys(data.data).forEach(function (key) {
    var member = this[key];
    if(member.room == IAM.room){
      appendAvatar(member.count, member.color);
      $(`#${member.count}`).css("transform",`translateX(${member.x}px) translateY(${member.y}px)`);
      drawCurrentDist(member.count, member.dist);
    }
  }, data.data);
});

socket.on("s2c_join", function(data){
  appendMsg(data.msg, data.color);
  appendAvatar(data.id, data.color);
  drawCurrentDist(data.id, data.dist);
  $(`#${data.id}`).css("transform",`translateX(${data.x}px) translateY(${data.y}px)`);
});

socket.on("s2c_move", function (data) {
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
});

socket.on("reconnect",function(){
});

function appendAvatar(id, color) {
  $("#field").append(`<div id=${id} class="avatar">${id}<div id=${id}-effect class="avatar-effect"></div></div>`);
  $(`#${id}`).css("background-color", color);
  $(`#${id}-effect`).css("border", "1px solid" + color);
  console.log($(`#${id}-effect`).css("border"));
}

function removeAvatar() {
  $(".avatar").remove();
}

function appendMsg(text, color) {
  $("#chatLogs").append(`<div style="color: ${color};">${text}</div>`);
  var log = document.getElementById("chatLogs");
  log.scrollTop = log.scrollHeight;
}

$("form").submit(function (e) {
  if (IAM.isEnter) {
    // メッセージを送る
    var message = $("#msgForm").val();
    var dist = $("#dist").val();
    socket.emit("c2s_msg", { token: IAM.token, dist: dist, msg: message });
    $("#msgForm").val("");
  } else {
    var room = $("#roomForm").val();
    IAM.room = room;
    socket.emit("c2s_join", {token: IAM.token, room:room, color: genRandColor()});
    toggleForm();
    IAM.isEnter = true;
  }
  e.preventDefault();
});

$("#field").click(function(e){
  if(IAM.isMoving) return;
  var offset = $(this).offset();
  var x = e.pageX - offset.left;
  var y = e.pageY - offset.top;
  socket.emit("c2s_move", { token: IAM.token, x: x, y: y });
});

$("#dist").change(onDistChange);
$("#disconnect").click(function(){
  socket.emit("c2s_leave");
  socket.disconnect();
  toggleForm();
  removeAvatar();
});


window.onresize = function(e){
  fetchField(window.innerWidth, window.innerHeight);
};

window.onbeforeunload = function(){
  socket.emit("c2s_leave");
};

function toggleUtil(){
  const util = document.getElementById("container-util");
  anime({
    targets: util,
    height: (utilIsOpen?"15vh":"50vh")
  });
  utilIsOpen = !utilIsOpen;
}


function toggleForm(){
    if(IAM.isEnter){
        $("#chatForm").css("display", "none");
        $("#enterForm").css("display", "inline");
    }else{
        $("#chatForm").css("display", "inline");
        $("#enterForm").css("display", "none");
    }
}

function onDistChange(){
  var dist = $("#dist").val();
  console.log(dist);
  socket.emit("c2s_dist",{ token: IAM.token, dist: dist });
}

function moveAvatar(id, x, y) {
  const avatar = document.getElementById(id);
  fetchField(x, y);
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

function fetchField(width, height){
  var fieldSize = $("#field").css(["min-width", "min-height"]);
  var fieldWidth = parseInt(fieldSize["min-width"], 10);
  var fieldHeight = parseInt(fieldSize["min-height"], 10);
  $("#field").css({"min-width": Math.max(fieldWidth, width), "min-height": Math.max(fieldHeight, height)});

}

function genRandColor(){
  var hue = Math.floor(Math.random()*10)*36;
  var sat = Math.floor(Math.random()*40)+25;
  var color = `hsl(${hue}, 50%, ${sat}%)`;

  return color;
}

function drawMsgRange(id, dist){
  const effect = document.getElementById(`${id}-effect`);
  const color = $(`#${id}`).css("background-color");
  var tl = anime.timeline({
    duration: 500,
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
    borderRadius: dist / 2,
    translateX: "+=fix",
    translateY: "+=fix",
    easing: "linear",
  });
}
