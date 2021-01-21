var router = require("express").Router();

const { passport } = require("../serve.js");
const { pool, DB_USER_TABLE, DB_USER_EMAIL_COLUMN } = require("../dbConfig");
const bcrypt = require("bcrypt");
const commonFuncs = require("../commonFuncs.js");

router.get("/register", commonFuncs.checkAuthenticated, (req, res) => {
  res.render("register");
});

router.get("/login", commonFuncs.checkAuthenticated, (req, res) => {
  res.render("login");
});

router.get("/dashboard", commonFuncs.checkNotAutheticated, (req, res) => {
  getRoomList(req, res, (req, res, roomList) => {
    res.render("dashboard", { user: req.user.name, roomList: roomList });
  });
});

router.get("/index", commonFuncs.checkNotAutheticated, (req, res) => {
  res.render("index", { user: req.user.name });
});

router.get("/logout", (req, res) => {
  req.logout();
  req.flash("success_msg", "ログアウトを完了しました");
  res.redirect("/users/login");
});

router.post("/register", async (req, res) => {
  const { name, email, password, password2 } = req.body;

  console.log({
    name,
    email,
    password,
    password2,
  });

  const errors = [];

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
    const hashedPassword = await bcrypt.hash(password, 10);
    console.log(hashedPassword);
    if (
      await commonFuncs.checkExistence(
        DB_USER_TABLE,
        DB_USER_EMAIL_COLUMN,
        email
      )
    ) {
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
});

router.post(
  "/login",
  passport.authenticate("local", {
    successRedirect: "/users/dashboard",
    failureRedirect: "/users/login",
    failureFlash: true,
  })
);

function getRoomList(req, res, loadDashboard) {
  pool.query(
    `SELECT * FROM chats WHERE user_id = $1`,
    [req.user.id],
    (err, results) => {
      if (err) {
        throw err;
      }
      const roomList = results.rows;
      console.log(roomList);
      loadDashboard(req, res, roomList);
    }
  );
}

module.exports = router;
