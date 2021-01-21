const express = require("express");
const app = express();
const session = require("express-session");
const flash = require("express-flash");
const passport = require("passport");
const initializePassport = require("./passportConfig");

var mime = {
  ".html": "text/html",
  ".css": "text/css"
};

initializePassport(passport);

const http = require("http").Server(app);
const io = require("socket.io")(http);
const { report } = require("process");
const DOCUMENT_ROOT = __dirname + "/public";

require("./socket.js")(io);

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

module.exports = { io, DOCUMENT_ROOT, passport }

app.use(express.static(DOCUMENT_ROOT));
app.use("/animejs", express.static(__dirname + "/node_modules/animejs/lib/"));


app.use("/users",require("./router/users.js"));
app.use("/chat",require("./router/chat.js"));

app.get("/", (req, res)=>{
  res.sendFile(DOCUMENT_ROOT + "/index.html");
});

http.listen(3000, function () {
  console.log("listening on *:3000");
});
