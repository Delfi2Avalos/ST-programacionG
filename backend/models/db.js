const mysql = require("mysql2");
require("dotenv").config();

const db = mysql.createPool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  connectionLimit: 10,
});


db.getConnection((err, connection) => {
  if (err) {
    console.error("Error al conectar con MySQL:", err);
  } else {
    console.log("Conectado a la base de datos MySQL");
    connection.release();
  }
});

module.exports = db;
