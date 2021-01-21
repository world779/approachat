app.get("/users/register", checkAuthenticated, (req, res) => {
  res.render("register");
});

app.get("/users/login", checkAuthenticated, (req, res) => {
  res.render("login");
});

app.get("/users/dashboard", checkNotAutheticated, (req, res) => {
  set_room_lists(req, res, room_lists, (req, res, room_lists) => {
    res.render("dashboard", { user: req.user.name, room_lists: room_lists });
  });
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
    if (await checkExistence(DB_USER_TABLE, DB_USER_EMAIL_COLUMN, email)) {
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

app.post(
  "/users/login",
  passport.authenticate("local", {
    successRedirect: "/users/dashboard",
    failureRedirect: "/users/login",
    failureFlash: true,
  })
);

function set_room_lists(req, res, room_lists, load_dashboard) {
  pool.query(
    `SELECT * FROM chats WHERE user_id = $1`,
    [req.user.id],
    (err, results) => {
      if (err) {
        throw err;
      }
      room_lists = results.rows;
      console.log(room_lists);
      load_dashboard(req, res, room_lists);
    }
  );
}
