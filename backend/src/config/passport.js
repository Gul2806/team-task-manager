const passport = require('passport');
const LocalStrategy = require('passport-local').Strategy;
const bcrypt = require('bcrypt');
const pool = require('../db');

passport.use(
  new LocalStrategy({ usernameField: 'email' }, async (email, password, done) => {
    try {
      const { rows } = await pool.query('SELECT * FROM users WHERE email = $1', [email.toLowerCase()]);
      const user = rows[0];
      if (!user) return done(null, false);
      const ok = await bcrypt.compare(password, user.password_hash);
      return done(null, ok ? user : false);
    } catch (e) {
      done(e);
    }
  })
);

passport.serializeUser((user, done) => done(null, user.id));

passport.deserializeUser(async (id, done) => {
  try {
    const { rows } = await pool.query('SELECT id, name, email FROM users WHERE id = $1', [id]);
    done(null, rows[0] || false);
  } catch (e) {
    done(e);
  }
});

module.exports = passport;