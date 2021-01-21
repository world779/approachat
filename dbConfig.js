require("dotenv").config();

const DB_ROOM_TABLE = "chats";
const DB_ROOM_NAME_COLUMN = "room_name";
const DB_USER_TABLE = "users";
const DB_USER_EMAIL_COLUMN = "email";

const { Pool } = require("pg");

const isProduction = process.env.NODE_ENV === "production";

const connectionString = `postgresql://${process.env.DB_USER}:${process.env.DB_PASSWORD}@${process.env.DB_HOST}:${process.env.DB_PORT}/${process.env.DB_DATABASE}`;

const pool = new Pool({
  connectionString: isProduction ? process.env.DATABASE_URL : connectionString
});

module.exports = { pool, DB_ROOM_TABLE, DB_ROOM_NAME_COLUMN,DB_USER_TABLE, DB_USER_EMAIL_COLUMN };
