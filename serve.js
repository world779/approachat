const express = require("express");
const app = express();
const { pool } = require("./dbConfig");
const bcrypt = require("bcrypt");
const session = require("express-session");
const flash = require("express-flash");
const passport = require("passport");
const xss = require("xss");
var path = require("path");
var mime = {
  ".html": "text/html",
  ".css": "text/css"
};

const initializePassport = require("./passportConfig");

initializePassport(passport);

const http = require("http").Server(app);
const io = require("socket.io")(http);
const crypto = require("crypto");
const { report } = require("process");
const DOCUMENT_ROOT = __dirname + "/public";

require("dotenv").config();

const { SECRET_TOKEN } = process.env;

const DB_ROOM_TABLE = "chats";
const DB_ROOM_NAME_COLUMN = "room_name";
const DB_USER_TABLE = "users";
const DB_USER_EMAIL_COLUMN = "email";

const MEMBER = {};
const TOKENS = {};
var room_lists = {};
const MEMBER_COUNT = 1;

app.set("view engine", "ejs");
app.use(express.urlencoded({ extended: false }));

app.use(session({
    secret: "secret",

    resave: false,

    saveUninitialized: false
  }));

app.use(passport.initialize());
app.use(passport.session());

app.use(flash());


app.use(express.static(__dirname + "/public"));
app.use("/animejs", express.static(__dirname + "/node_modules/animejs/lib/"));


app.get("/", (req, res)=>{
  res.sendFile(DOCUMENT_ROOT + "/index.html");
});


http.listen(3000, function () {
  console.log("listening on *:3000");
});
