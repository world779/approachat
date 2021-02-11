const IAM = {
  id: "",
  room: "",
  token: "",
  socketId: "",
  isEnter: false,
  isConnected: false,
  isMoving: false,
};

const MAX_MSG_LENGTH = 2000;

var utilIsOpen = true;
var curScale = 1;

var socket = io.connect({
  query: {
    reconnect: false,
  },
});

socket.on("s2c_msg", function (data) {
  appendMsg(data.id, data.msg, data.name, data.color);
});

socket.on("s2c_leave", function (data) {
  appendMsg(data.id, `退出しました`, data.name, data.color);
  $(`#${data.id}`).remove();
  removeList(data.id);
});

socket.on("connect", function (data) {
  IAM.socketId = socket.id;
  console.log("connected");
});

socket.on("token", function (data) {
  if (!IAM.isConnected) {
    IAM.token = data.token;
    IAM.id = data.id;
    IAM.isConnected = true;
  }
});

socket.on("initial_data", function (data) {
  toggleForm();
  $("#invitation").val(`Approachatの部屋「${IAM.room}」で一緒に話しませんか？
URL: ${location.href}
パスワード: ${$("#passForm").val()}`);
  $("#invitation-dropdown").removeClass("d-none");
  IAM.isEnter = true;
  Object.keys(data.data).forEach(function (key) {
    var member = this[key];
    if (member.room == IAM.room) {
      appendAvatar(member.count, member.color, member.input_name);
      $(`#${member.count}`).css(
        "transform",
        `translateX(${member.x}px) translateY(${member.y}px)`
      );
      drawCurrentDist(member.count, member.dist);
    }
  }, data.data);
  tutorial(tutorials);
});

socket.on("s2c_join", function (data) {
  appendMsg(data.id, "入室しました", data.name, data.color);
  appendAvatar(data.id, data.color, data.name);
  drawCurrentDist(data.id, data.dist);
  $(`.${data.id}`).css(
    "transform",
    `translateX(${data.x}px) translateY(${data.y}px)`
  );
  if (data.id == IAM.id) adjustViewPoint();
});

socket.on("s2c_move", function (data) {
  moveAvatar(data.id, data.x, data.y);
});

socket.on("s2c_talking", function (data) {
  drawMsgRange(data.id, data.dist);
});

socket.on("s2c_dist", function (data) {
  drawCurrentDist(data.id, data.dist);
});

socket.on("disconnect", function () {
  socket.io.opts.query = {
    reconnect: IAM.isConnected ? "true" : "false",
    socketId: IAM.socketId,
    token: IAM.token,
  };
});

socket.on("auth_err", function (err) {
  $("#passForm").addClass("is-invalid");
  $("#pass-err").text(err.text);
});

window.onload = function () {
  console.log("loaded");
  var url = location.pathname;
  var roomName = decodeURI(url.replace("/chat/room/", ""));
  $("#passLabel").text(`"${roomName}"のパスワード`);

  $("form").submit(function (e) {
    if (IAM.isEnter) {
      // メッセージを送る
      var message = $("#msgForm").val();
      var dist = $("#dist").val();
      socket.emit("c2s_msg", { token: IAM.token, dist: dist, msg: message });
      $("#msgForm").val("");
      $("#msgForm").trigger("send");
    } else {
      if (!socket.connected) socket.connect();
      var pass = $("#passForm").val();
      var input_name = $("#nameForm").val();
      IAM.room = roomName;
      socket.emit("c2s_join", {
        token: IAM.token,
        room: roomName,
        input_name: input_name,
        password: pass,
      });
    }
    e.preventDefault();
  });

  $("#field").click(function (e) {
    if (IAM.isMoving) return;
    var offset = $(this).offset();
    var x = e.pageX / curScale;
    var y = e.pageY / curScale;
    socket.emit("c2s_move", { token: IAM.token, x: x, y: y });
    $(`#field`).trigger("move");
  });

  $("#dist").change(onDistChange);
  document
    .getElementById("msgForm")
    .addEventListener("input", validateMsgLength);

  // $("#disconnect").click(function(){
  //   socket.emit("c2s_leave", { token: IAM.token });
  //   toggleForm();
  //   removeAvatar();
  //   $("#chatLogs").empty();
  //   IAM.isConnected = false;
  //   IAM.isEnter = false;
  // });

  $("#resetView").click(function () {
    adjustViewPoint(IAM.id);
  });

  $("#zoomIn").click(function () {
    const field = document.getElementById("field");
    anime({
      targets: field,
      zoom: `${100 * curScale * 1.2}%`,
      easing: "linear",
    });
    curScale *= 1.2;
  });

  $("#zoomOut").click(function () {
    const field = document.getElementById("field");
    anime({
      targets: field,
      zoom: `${(100 * curScale) / 1.2}%`,
      easing: "linear",
    });
    curScale /= 1.2;
  });
};

window.onbeforeunload = function () {
  socket.emit("c2s_leave", { token: IAM.token });
};

function appendAvatar(id, color, input_name) {
  $("#field").append(
    `<div id=${id} class="avatar ${id}">${input_name}<div id=${id}-effect class="avatar-effect"></div><div id=${id}-speechBubble class="avatar-speechBubble"></div></div>`
  );
  // $("#field").append(` <div id="chatLogs" class="avatar>こんにちは</div>`);
  $(`#${id}`).css("background-color", color);
  $(`#${id}-effect`).css("border", "1px solid " + color);
  $(`#${id}-speechBubble`).css("background-color", color);
  // $(`#${id}-speechBubble:before`).css("background-color", color);
  $("#name-list").append(
    `<li id="${id}-name" class="name" onclick="adjustViewPoint(${id})" style="color: ${color};">${input_name}</li>`
  );
}

function removeAvatar() {
  $(".avatar").remove();
}

function removeList(id) {
  $(`#name-list > #${id}-name`).remove();
}

function appendMsg(id, text, name, color) {
  $("#chatLogs").append(`<div style="color: ${color};">${name}: ${text}</div>`);
  $(`#${id}-speechBubble`).text(text);
  var log = document.getElementById("chatLogs");
  log.scrollTop = log.scrollHeight;
}

function toggleUtil() {
  const util = document.getElementById("container-util");
  anime({
    targets: util,
    height: utilIsOpen ? "15vh" : "50vh",
  });
  utilIsOpen = !utilIsOpen;
}

function toggleForm() {
  if (IAM.isEnter) {
    $("#chatForm").css("display", "none");
    $("#enterForm").css("display", "inline");
    // $("#disconnect").prop('disabled', true);
  } else {
    $("#chatForm").css("display", "inline");
    $("#enterForm").css("display", "none");
    // $("#disconnect").prop('disabled', false);
  }
}

function onDistChange() {
  var dist = $("#dist").val();
  socket.emit("c2s_dist", { token: IAM.token, dist: dist });
}

function validateMsgLength() {
  if ($("#msgForm").val().length > MAX_MSG_LENGTH)
    $("#msgError").text("メッセージが長すぎます");
  else $("#msgError").empty();
}

function moveAvatar(id, x, y) {
  const avatar = document.getElementById(id);
  if (id == IAM.id) IAM.isMoving = true;
  anime({
    targets: avatar,
    translateX: x,
    translateY: y,
    easing: "linear",
    complete: function (anim) {
      if (id == IAM.id) IAM.isMoving = false;
    },
  });
}

function adjustViewPoint(id = IAM.id) {
  const y = $(`#${id}`).position().top * curScale - window.innerHeight / 2;
  const x = $(`#${id}`).position().left * curScale - window.innerWidth / 2;
  $("html,body").animate({
    scrollTop: y,
    scrollLeft: x,
  });
}

function drawMsgRange(id, dist) {
  const effect = document.getElementById(`${id}-effect`);
  const color = $(`#${id}`).css("background-color");
  var tl = anime.timeline({
    duration: 500,
  });
  tl.add({
    targets: effect,
    backgroundColor: color.replace("rgb", "rgba").replace(")", ", .1)"),
    easing: "linear",
  }).add({
    targets: effect,
    backgroundColor: "rgba(0, 0, 0, .02)",
    easing: "linear",
  });
}

function drawCurrentDist(id, dist) {
  var height = $(`#${id}`).height();
  var fix = height / 2;
  const effect = document.getElementById(`${id}-effect`);
  anime({
    backgroundColor: "rgba(0, 0, 0, .02)",
    targets: effect,
    height: dist * 2,
    width: dist * 2,
    borderRadius: dist,
    easing: "linear",
  });
}

function copyInvitation() {
  var invitation = document.getElementById("invitation");
  invitation.select();
  document.execCommand("copy");
}
