const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
 username: {
    type: String,
    required: true,
    unique: true,
    minlength: 3
  },
  email: {
    type: String,
    required: true,
    unique: true,
  },

  phone: {
    type: String,
    unique: true,
    sparse: true, // ✅ fixes the issue with null/"" duplicate errors
  },
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
