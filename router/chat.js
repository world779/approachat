var router = require("express").Router();

const { pool, DB_ROOM_TABLE, DB_ROOM_NAME_COLUMN } = require("../dbConfig.js");
const { DOCUMENT_ROOT } = require("../serve.js");
const bcrypt = require("bcrypt");
const commonFuncs = require("../commonFuncs.js");

router.get("/room/*", async (req, res) => {
  const roomName = req.url.slice(6);
  if (
    await commonFuncs.checkExistence(
      DB_ROOM_TABLE,
      DB_ROOM_NAME_COLUMN,
      roomName
    )
  )
    res.sendFile(DOCUMENT_ROOT + "/chat.html");
  else res.send(`"${roomName}"という名前の部屋は登録されていません`);
});

router.get("/new", commonFuncs.checkNotAutheticated, (req, res) => {
  res.render("new");
});

router.post("/new", commonFuncs.checkNotAutheticated, async (req, res) => {
  const { roomName, roomPassword, roomPassword2 } = req.body;

  console.log({
    roomName,
    roomPassword,
    roomPassword2,
  });

  const errors = [];

  if (!roomName || !roomPassword || !roomPassword2) {
    errors.push({ message: "すべての項目を入力してください" });
  }

  if (roomPassword.length < 6) {
    errors.push({ message: "パスワードは最低6文字にしてください" });
  }

  if (roomPassword != roomPassword2) {
    errors.push({ message: "パスワードが一致しません" });
  }

  if (errors.length > 0) {
    res.render("new", { errors });
  } else {
    const hashedPassword = await bcrypt.hash(roomPassword, 10);
    console.log(hashedPassword);
    console.log(req.user.id);

    if (
      await commonFuncs.checkExistence(
        DB_ROOM_TABLE,
        DB_ROOM_NAME_COLUMN,
        roomName
      )
    ) {
      errors.push({ message: "この部屋名は既に登録されています" });
      res.render("new", { errors });
    } else {
      pool.query(
        `INSERT INTO chats (room_name, room_password, user_id)
            VALUES ($1, $2, $3)
            RETURNING room_name room_password`,
        [roomName, hashedPassword, req.user.id],
        (err, results) => {
          if (err) {
            throw err;
          }
          console.log(results.rows);
          req.flash("success_msg", "部屋が作成されました。");
          res.redirect("/chat/" + roomName);
        }
      );
    }
  }
});

module.exports = router;
