const admin = require("firebase-admin");
const dotenv = require("dotenv");

dotenv.config();

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.applicationDefault(),
    databaseURL: process.env.DATABASE_URL,
  });
}

const rtdb = admin.database();

module.exports = { rtdb };
