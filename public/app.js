const IAM = {
  id: "",
  room: "",
  token: "",
  socketId: "",
  isEnter : false,
  isConnected : false,
  isMoving : false
}

const MAX_MSG_LENGTH = 2000;

var utilIsOpen = true;
var curScale = 1;

var socket = io.connect({ 
  query : {
    reconnect: false
  }
});


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
  toggleForm();
  IAM.isEnter = true;
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
  appendMsg("入室しました", data.color);
  appendAvatar(data.id, data.color);
  drawCurrentDist(data.id, data.dist);
  $(`#${data.id}`).css("transform",`translateX(${data.x}px) translateY(${data.y}px)`);
});

socket.on("s2c_move", function (data) {
  moveAvatar(data.id, data.x, data.y);
});

socket.on("s2c_talking", function(data){
  drawMsgRange(data.id, data.dist);
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

socket.on('auth_err',function(err){
  $("#passForm").addClass("is-invalid");
  $("#pass-err").text(err.text);
});

window.onload = function(){
  console.log("loaded");
  var url = location.pathname;
  var roomName = url.replace("/chat/", "");
  $("#passLabel").text(`"${roomName}"のパスワード`);

  $("form").submit(function (e) {
    if (IAM.isEnter) {
      // メッセージを送る
      var message = $("#msgForm").val();
      var dist = $("#dist").val();
      socket.emit("c2s_msg", { token: IAM.token, dist: dist, msg: message });
      $("#msgForm").val("");
    } else {
      if(!socket.connected) socket.connect();
      var pass = $("#passForm").val();
      IAM.room = roomName;
      socket.emit("c2s_join", {token: IAM.token, room:roomName, color: genRandColor(), password: pass });
    }
    e.preventDefault();
  });

  $("#field").click(function(e){
    if(IAM.isMoving) return;
    var offset = $(this).offset();
    console.log(offset);
    console.log(e.pageX, e.pageY);
    var x = e.pageX/curScale;
    var y = e.pageY/curScale;
    socket.emit("c2s_move", { token: IAM.token, x: x, y: y });
  });

  $("#dist").change(onDistChange);
  document.getElementById("msgForm").addEventListener("input", validateMsgLength);

  $("#disconnect").click(function(){
    socket.emit("c2s_leave", { token: IAM.token });
    toggleForm();
    removeAvatar();
    $("#chatLogs").empty();
    IAM.isConnected = false;
    IAM.isEnter = false;
  });

  $("#zoomIn").click(function(){
    const field = document.getElementById("field");
    anime({
      targets: field,
      zoom: `${100*curScale*1.2}%`,
      easing: "linear"
    });
    curScale*=1.2;
  });

  $("#zoomOut").click(function(){
    const field = document.getElementById("field");
    anime({
      targets: field,
      zoom: `${100*curScale/1.2}%`,
      easing: "linear"
    });
    curScale/=1.2;
  });
}

window.onbeforeunload = function(){
  socket.emit("c2s_leave", { token: IAM.token });
};


function appendAvatar(id, color) {
  $("#field").append(`<div id=${id} class="avatar">${id}<div id=${id}-effect class="avatar-effect"></div></div>`);
  $(`#${id}`).css("background-color", color);
  $(`#${id}-effect`).css("border", "1px solid " + color);
}

function removeAvatar() {
  $(".avatar").remove();
}

function appendMsg(text, color) {
  $("#chatLogs").append(`<div style="color: ${color};">${text}</div>`);
  var log = document.getElementById("chatLogs");
  log.scrollTop = log.scrollHeight;
}

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
    $("#disconnect").prop('disabled', true);
  }else{
    $("#chatForm").css("display", "inline");
    $("#enterForm").css("display", "none");
    $("#disconnect").prop('disabled', false);
  }
}

function onDistChange(){
  var dist = $("#dist").val();
  socket.emit("c2s_dist",{ token: IAM.token, dist: dist });
}

function validateMsgLength(){
  if($("#msgForm").val().length > MAX_MSG_LENGTH) $("#msgError").text("メッセージが長すぎます");
  else $("#msgError").empty();
}

function moveAvatar(id, x, y) {
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

function genRandColor(){
  var hue = Math.floor(Math.random()*10)*36;
  var sat = Math.floor(Math.random()*40)+25;
  var color = `hsla(${hue}, 50%, ${sat}%, 1)`;

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
      backgroundColor: color.replace("rgb", "rgba").replace(")",", .1)") ,
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
