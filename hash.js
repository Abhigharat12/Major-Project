// hash.js
const bcrypt = require('bcrypt');
require("dotenv").config();
async function hashPassword() {
  const password = process.env.ADMINPASS;
  const hashed = await bcrypt.hash(password, 12);
  console.log("Hashed Password:", hashed);
}

hashPassword();
