const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  email: {
    type: String,
    required: true,
    unique: true,
  },
  phone: String,
  password: {
    type: String,
    required: function () {
      return !this.googleId; // password is required only if googleId is not set
    },
  },
  isAdmin: {
    type: Boolean,
    default: false,
  },
  googleId: {
    type: String,
  },
});

const User = mongoose.model('User', userSchema);
module.exports = User;
