const xss = require("xss");
const { pool } = require("./dbConfig");
const bcrypt = require("bcrypt");
const crypto = require("crypto");
require("dotenv").config();

const MIN_DIST = 50;
const MAX_DIST = 300;
const MAX_MSG_LENGTH = 2000;

const { SECRET_TOKEN } = process.env;

const MEMBER = {};
const TOKENS = {};
var MEMBER_COUNT = 1;

module.exports = function (io) {
  io.on("connection", function (socket) {
    (() => {
      // トークンを作成
      const data = socket.handshake.query;
      if (data.reconnect == "true") {
        if (TOKENS[data.socketId] == data.token) {
          MEMBER[socket.id] = MEMBER[data.socketId];
          TOKENS[socket.id] = data.token;
          socket.join(MEMBER[socket.id].room);
          delete MEMBER[data.socketId];
          delete TOKENS[data.socketId];
        }
      } else {
        const token = crypto
          .createHash("sha1")
          .update(SECRET_TOKEN + socket.id)
          .digest("hex");
        // ユーザーリストに追加
        MEMBER[socket.id] = {
          room: null,
          count: MEMBER_COUNT,
          x: 0,
          y: 0,
          color: null,
          dist: MIN_DIST + MAX_DIST / 2,
        };
        TOKENS[socket.id] = token;
        MEMBER_COUNT++;

        // 本人にトークンを送付
        io.to(socket.id).emit("token", {
          token: token,
          id: MEMBER[socket.id].count,
        });
      }
    })();

    // ルームに入室されたらsocketをroomにjoinさせてメンバーリストにもそれを反映
    socket.on("c2s_join", function (data) {
      if (data.token == TOKENS[socket.id]) {
        pool.query(
          `SELECT * FROM chats WHERE room_name = $1`,
          [data.room],
          (err, results) => {
            if (err) {
              throw err;
            }

            if (results.rows.length > 0) {
              const room = results.rows[0];

              bcrypt.compare(
                data.password,
                room.room_password,
                (err, isMatch) => {
                  if (err) {
                    console.log(err);
                  }
                  if (isMatch) {
                    io.to(socket.id).emit("initial_data", { data: MEMBER });
                    const sender = MEMBER[socket.id];
                    sender.room = data.room;
                    sender.input_name = xss(data.input_name);
                    sender.color = genRandColor();
                    socket.join(data.room);
                    sender.x = Math.floor(Math.random() * 1000) + 2000;
                    sender.y = Math.floor(Math.random() * 1000) + 2000;
                    io.to(sender.room).emit("s2c_join", {
                      id: sender.count,
                      color: sender.color,
                      name: sender.input_name,
                      x: sender.x,
                      y: sender.y,
                      dist: MIN_DIST + MAX_DIST / 2,
                    });
                  } else {
                    io.to(socket.id).emit("auth_err", {
                      text: "パスワードが正しくありません",
                    });
                  }
                }
              );
            } else {
              io.to(socket.id).emit("auth_err", {
                text: `"${data.room}"という部屋はありません`,
              });
            }
          }
        );
      }
    });

    socket.on("c2s_msg", function (data) {
      let { msg } = data;
      if (MEMBER[socket.id] == null) return;
      if (msg.length > MAX_MSG_LENGTH) return;
      if (TOKENS[socket.id] != data.token) return;
      msg = xss(msg);
      const noisedMsg = addNoise(msg);
      const sender = MEMBER[socket.id];
      const minDist = sender.dist;
      io.to(sender.room).emit("s2c_talking", {
        id: sender.count,
        dist: minDist,
      });
      Object.keys(MEMBER).forEach(function (key) {
        const member = MEMBER[key];
        const dist = calcDist(member.x, member.y, sender.x, sender.y);
        if (dist < minDist * 1.5 && member.room == sender.room)
          io.to(key).emit("s2c_msg", {
            id: sender.count,
            msg: dist < minDist ? msg : noisedMsg,
            name: sender.input_name,
            color: dist < minDist ? sender.color : "#BBB",
          });
      }, MEMBER);
    });

    socket.on("c2s_dist", function (data) {
      if (TOKENS[socket.id] != data.token) return;
      var { dist } = data;
      if (dist > 100) dist = 100;
      dist = (dist * MAX_DIST) / 100 + MIN_DIST;
      MEMBER[socket.id].dist = dist;
      io.to(MEMBER[socket.id].room).emit("s2c_dist", {
        id: MEMBER[socket.id].count,
        dist: dist,
      });
    });

    socket.on("c2s_move", function (data) {
      if (TOKENS[socket.id] != data.token) return;
      MEMBER[socket.id].x = data.x;
      MEMBER[socket.id].y = data.y;
      io.to(MEMBER[socket.id].room).emit("s2c_move", {
        id: MEMBER[socket.id].count,
        x: MEMBER[socket.id].x,
        y: MEMBER[socket.id].y,
      });
    });

    socket.on("c2s_leave", function (data) {
      if (TOKENS[socket.id] != data.token) return;
      try {
        io.to(MEMBER[socket.id].room).emit("s2c_leave", {
          id: MEMBER[socket.id].count,
          name: MEMBER[socket.id].input_name,
          color: MEMBER[socket.id].color,
        });
        delete MEMBER[socket.id];
        delete TOKENS[socket.id];
      } catch {
        console.log("未入室のユーザが退出しました");
      }
    });
  });
};

function calcDist(x1, y1, x2, y2) {
  return Math.sqrt((x1 - x2) * (x1 - x2) + (y1 - y2) * (y1 - y2));
}

function genRandColor() {
  var hue = Math.floor(Math.random() * 10) * 36;
  var sat = Math.floor(Math.random() * 40) + 25;
  var color = `hsla(${hue}, 50%, ${sat}%, 1)`;

  return color;
}

function addNoise(msg) {
  if (msg.length < 3) return "......";
  const pos = randint(msg.length - 2, 1);
  const len = randint(msg.length - pos, pos + 1);
  console.log(pos, len);

  return "......" + msg.slice(pos, len) + "......";
}

function randint(max, min = 0) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}
