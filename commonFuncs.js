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

async function checkExistence(table, column, val) {
  return pool
    .query(`SELECT * FROM ${table} WHERE ${column} = $1`, [val])
    .then((res) => res.rows.length > 0)
    .catch((err) => console.log(err));
}
