const express = require("express");
const app = express();
const { pool } = require("./dbConfig");
const bcrypt = require("bcrypt");
const session = require("express-session");
const flash = require("express-flash");
const passport = require("passport");
const xss = require("xss");
var fs = require("fs");
var path = require("path");
var mime = {
  ".html": "text/html",
  ".css": "text/css",
};

const initializePassport = require("./passportConfig");

initializePassport(passport);

const http = require("http").Server(app);
const io = require("socket.io")(http);
const crypto = require("crypto");
const { report } = require("process");
const DOCUMENT_ROOT = __dirname + "/public";

require("dotenv").config();

const SECRET_TOKEN = process.env.SECRET_TOKEN;

const MIN_DIST = 50;
const MAX_DIST = 500;
const MAX_MSG_LENGTH = 2000;

const MEMBER = {};
const TOKENS = {};
let MEMBER_COUNT = 1;

app.set("view engine", "ejs");
app.use(express.urlencoded({ extended: false }));

app.use(
  session({
    secret: "secret",

    resave: false,

    saveUninitialized: false,
  })
);

app.use(passport.initialize());
app.use(passport.session());

app.use(flash());

app.get("/", (req, res) => {
  res.sendFile(DOCUMENT_ROOT + "/index.html");
});

app.get("/chat/*", (req, res) => {
  const room_name = req.url.slice(6);
  pool.query(
    `SELECT * FROM chats
        WHERE name = $1`,
    [room_name],
    (err, results) => {
      if (err) {
        console.log(err);
      }

      if (results.rows.length > 0) {
        res.sendFile(DOCUMENT_ROOT + "/chat.html");
      }else{
        res.send("そのような部屋はありません");
      }
    });
});

app.get("/new", (req, res) => {
  res.render("new");
});

app.post("/new", async (req, res) => {
  let { room_name, room_password, room_password2 } = req.body;

  console.log({
    room_name,
    room_password,
    room_password2,
  });

  let errors = [];

  if (!room_name || !room_password || !room_password2) {
    errors.push({ message: "すべての項目を入力してください" });
  }

  if (room_password.length < 6) {
    errors.push({ message: "パスワードは最低6文字にしてください" });
  }

  if (room_password != room_password2) {
    errors.push({ message: "パスワードが一致しません" });
  }

  if (errors.length > 0) {
    res.render("new", { errors });
  } else {
    let room_hashedPassword = await bcrypt.hash(room_password, 10);
    console.log(room_hashedPassword);

    pool.query(
      `SELECT * FROM chats
        WHERE room_name = $1`,
      [room_name],
      (err, results) => {
        if (err) {
          console.log(err);
        }
        // console.log(results.rows);

        if (results.rows.length > 0) {
          errors.push({ message: "この部屋名は既に登録されています" });
          res.render("new", { errors });
        } else {
          pool.query(
            `INSERT INTO users (room_name, room_password)
            VALUES ($1, $2)
            RETURNING id, room_password`,
            [room_name, room_hashedPassword],
            (err, results) => {
              if (err) {
                throw err;
              }
              console.log(results.rows);
              req.flash("success_msg", "部屋が作成されました。");
              res.redirect("/chat/" + room_name);
            }
          );
        }
      }
    );
  }
});

app.get("/users/register", checkAuthenticated, (req, res) => {
  res.render("register");
});

app.get("/users/login", checkAuthenticated, (req, res) => {
  res.render("login");
});

app.get("/users/dashboard", checkNotAutheticated, (req, res) => {
  res.render("dashboard", { user: req.user.name });
});

app.get("/users/index", checkNotAutheticated, (req, res) => {
  res.render("index", { user: req.user.name });
});

app.get("/users/logout", (req, res) => {
  req.logout();
  req.flash("success_msg", "ログアウトを完了しました");
  res.redirect("/users/login");
});

app.post("/users/register", async (req, res) => {
  let { name, email, password, password2 } = req.body;

  console.log({
    name,
    email,
    password,
    password2,
  });

  let errors = [];

  if (!name || !email || !password || !password2) {
    errors.push({ message: "すべての項目を入力してください" });
  }

  if (password.length < 6) {
    errors.push({ message: "パスワードは最低6文字にしてください" });
  }

  if (password != password2) {
    errors.push({ message: "パスワードが一致しません" });
  }

  if (errors.length > 0) {
    res.render("register", { errors });
  } else {
    let hashedPassword = await bcrypt.hash(password, 10);
    console.log(hashedPassword);

    pool.query(
      `SELECT * FROM users
        WHERE email = $1`,
      [email],
      (err, results) => {
        if (err) {
          console.log(err);
        }
        console.log(results.rows);

        if (results.rows.length > 0) {
          errors.push({ message: "このメールアドレスは既に登録されています" });
          res.render("register", { errors });
        } else {
          pool.query(
            `INSERT INTO users (name, email, password)
            VALUES ($1, $2, $3)
            RETURNING id, password`,
            [name, email, hashedPassword],
            (err, results) => {
              if (err) {
                throw err;
              }
              console.log(results.rows);
              req.flash(
                "success_msg",
                "登録が完了しました。ログインしてください。"
              );
              res.redirect("/users/login");
            }
          );
        }
      }
    );
  }
});

app.post(
  "/users/login",
  passport.authenticate("local", {
    successRedirect: "/users/dashboard",
    failureRedirect: "/users/login",
    failureFlash: true,
  })
);

function checkAuthenticated(req, res, next) {
  if (req.isAuthenticated()) {
    return res.redirect("/users/index");
  }
  next();
}

function checkNotAutheticated(req, res, next) {
  if (req.isAuthenticated()) {
    return next();
  }
  res.redirect("/users/login");
}

app.use(express.static(__dirname + "/public"));
app.use("/animejs", express.static(__dirname + "/node_modules/animejs/lib/"));

// S04. connectionイベントを受信する
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
        dist: 0,
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
      io.to(socket.id).emit("initial_data", { data: MEMBER });
      MEMBER[socket.id].room = data.room;
      MEMBER[socket.id].color = data.color;
      socket.join(data.room);
      var x = Math.floor(Math.random() * 50) * 10 + 250;
      var y = Math.floor(Math.random() * 50) * 10 + 50;
      MEMBER[socket.id].x = x;
      MEMBER[socket.id].y = y;
      io.to(MEMBER[socket.id].room).emit("s2c_join", {
        id: MEMBER[socket.id].count,
        color: data.color,
        x: x,
        y: y,
        dist: MIN_DIST + MAX_DIST / 200,
      });
    }
  });

  socket.on("c2s_msg", function (data) {
    var msg = data.msg;
    if (MEMBER[socket.id] == null) return;
    if (msg.length > MAX_MSG_LENGTH) return;
    if (TOKENS[socket.id] != data.token) return;
    msg = xss(msg);
    var minDist = MEMBER[socket.id].dist;
    var sender = MEMBER[socket.id];
    io.to(sender.room).emit("s2c_talking", { id: sender.count, dist: minDist });
    Object.keys(MEMBER).forEach(function (key) {
      var member = MEMBER[key];
      var dist = calcDist(member.x, member.y, sender.x, sender.y);
      if (dist < minDist && member.room == sender.room)
        io.to(key).emit("s2c_msg", { msg: msg, color: sender.color });
    }, MEMBER);
  });

  socket.on("c2s_dist", function (data) {
    if (TOKENS[socket.id] != data.token) return;
    var dist = data.dist;
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
      var msg = "退出しました";
      io.to(MEMBER[socket.id].room).emit("s2c_leave", {
        id: MEMBER[socket.id].count,
        msg: msg,
        color: MEMBER[socket.id].color,
      });
      delete MEMBER[socket.id];
    } catch {
      console.log("未入室のユーザが退出しました");
    }
  });
});

function calcDist(x1, y1, x2, y2) {
  return Math.sqrt((x1 - x2) * (x1 - x2) + (y1 - y2) * (y1 - y2));
}

http.listen(3000, function () {
  console.log("listening on *:3000");
});
