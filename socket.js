const xss = require("xss");
const { pool } = require("./dbConfig");
const bcrypt = require("bcrypt");
const crypto = require("crypto");
require("dotenv").config();

const MIN_DIST = 50;
const MAX_DIST = 500;
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
                    MEMBER[socket.id].room = data.room;
                    MEMBER[socket.id].color = data.color;
                    MEMBER[socket.id].input_name = data.input_name;
                    socket.join(data.room);
                    var x = Math.floor(Math.random() * 100) * 5 + 2000;
                    var y = Math.floor(Math.random() * 100) * 5 + 2000;
                    MEMBER[socket.id].x = x;
                    MEMBER[socket.id].y = y;
                    io.to(MEMBER[socket.id].room).emit("s2c_join", {
                      id: MEMBER[socket.id].count,
                      color: data.color,
                      name: data.input_name,
                      x: x,
                      y: y,
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
      var { msg } = data;
      if (MEMBER[socket.id] == null) return;
      if (msg.length > MAX_MSG_LENGTH) return;
      if (TOKENS[socket.id] != data.token) return;
      msg = xss(msg);
      var minDist = MEMBER[socket.id].dist;
      var sender = MEMBER[socket.id];
      io.to(sender.room).emit("s2c_talking", {
        id: sender.count,
        dist: minDist,
      });
      Object.keys(MEMBER).forEach(function (key) {
        var member = MEMBER[key];
        var dist = calcDist(member.x, member.y, sender.x, sender.y);
        if (dist < minDist && member.room == sender.room)
          io.to(key).emit("s2c_msg", {
            msg: msg,
            name: sender.input_name,
            color: sender.color,
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
