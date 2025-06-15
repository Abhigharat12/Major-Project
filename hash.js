// hash.js
const bcrypt = require('bcrypt');

async function hashPassword() {
  const password = "admin@123";
  const hashed = await bcrypt.hash(password, 12);
  console.log("Hashed Password:", hashed);
}

hashPassword();
