const passport = require("passport");
const GoogleStrategy = require("passport-google-oauth20").Strategy;
const User = require("../models/user"); // your Mongoose model

passport.use(
  new GoogleStrategy(
    {
      clientID: "1000735449375-s3gq5focn0fhguslj532fd0vlj2td25k.apps.googleusercontent.com",
      clientSecret: "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",
      callbackURL: "/auth/google/callback",
    },
    async (accessToken, refreshToken, profile, done) => {
      const existingUser = await User.findOne({ googleId: profile.id });

      if (existingUser) {
        return done(null, existingUser);
      }

      const newUser = new User({
        email: profile.emails[0].value,
        googleId: profile.id,
      });

      await newUser.save();
      return done(null, newUser);
    }
  )
);

passport.serializeUser((user, done) => {
  done(null, user.id);
});

passport.deserializeUser(async (id, done) => {
  const user = await User.findById(id);
  done(null, user);
});

