// Firebase, con registro de servidor y .env

const admin = require("firebase-admin");
const dotenv = require("dotenv");
const fs = require("fs");
const path = require("path");

dotenv.config();

console.log("FIREBASE_CREDENTIALS =", process.env.FIREBASE_CREDENTIALS);
console.log("FIREBASE_DATABASE_URL =", process.env.FIREBASE_DATABASE_URL);

let rtdb = null;

try {
  const credPath = path.resolve(__dirname, "..", process.env.FIREBASE_CREDENTIALS);
  if (!fs.existsSync(credPath)) throw new Error(`No se encontró credencial: ${credPath}`);

  const serviceAccount = require(credPath);

  if (!admin.apps.length) {
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
      databaseURL: process.env.FIREBASE_DATABASE_URL,
    });
  }

  rtdb = admin.database();

  // Marcar estado de servidor como online
  rtdb.ref("servidor/estado").set({ online: true, hora: new Date().toISOString() })
    .then(() => console.log("RTDB OK: servidor/estado online"))
    .catch(err => console.error("RTDB estado:", err.message));

  // Apagar estado de servidor a offline
  const markOffline = () =>
    rtdb && rtdb.ref("servidor/estado").update({ online: false, hora: new Date().toISOString() }).catch(()=>{});
  process.on("SIGINT", () => { markOffline(); process.exit(0); });
  process.on("SIGTERM", () => { markOffline(); process.exit(0); });

} catch (error) {
  console.warn("Firebase no configurado. Modo sin RTDB.");
  console.error("Detalles:", error.message);
}

module.exports = { admin, rtdb };
