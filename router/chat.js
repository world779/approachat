app.get("/chat/*", async (req, res) => {
  const roomName = req.url.slice(6);
  if (await checkExistence(DB_ROOM_TABLE, DB_ROOM_NAME_COLUMN, roomName))
    res.sendFile(DOCUMENT_ROOT + "/chat.html");
  else res.send(`"${roomName}"という名前の部屋は登録されていません`);
});

app.get("/new", checkNotAutheticated, (req, res) => {
  res.render("new");
});

app.post("/new", checkNotAutheticated, async (req, res) => {
  const { room_name, room_password, room_password2 } = req.body;

  console.log({
    room_name,
    room_password,
    room_password2,
  });

  const errors = [];

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
    const room_hashedPassword = await bcrypt.hash(room_password, 10);
    console.log(room_hashedPassword);
    console.log(req.user.id);

    if (await checkExistence(DB_ROOM_TABLE, DB_ROOM_NAME_COLUMN, room_name)) {
      errors.push({ message: "この部屋名は既に登録されています" });
      res.render("new", { errors });
    } else {
      pool.query(
        `INSERT INTO chats (room_name, room_password, user_id)
            VALUES ($1, $2, $3)
            RETURNING room_name room_password`,
        [room_name, room_hashedPassword, req.user.id],
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
});
