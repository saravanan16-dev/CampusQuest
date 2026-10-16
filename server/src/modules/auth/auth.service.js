const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const config = require('../../config');
const { query } = require('../../db');
const { HttpError } = require('../../utils');

const publicUser = (u) => ({ id: u.id, name: u.name, email: u.email, role: u.role });

const sign = (u) =>
  jwt.sign({ id: u.id, role: u.role, name: u.name }, config.jwtSecret, { expiresIn: config.jwtExpiresIn });

// Public self-registration always creates a student. Teachers and admins are created by an admin.
async function register({ name, email, password }) {
  const existing = await query('SELECT id FROM users WHERE email=?', [email.toLowerCase()]);
  if (existing.length) throw new HttpError(409, 'An account with this email already exists', 'duplicate');
  const hash = await bcrypt.hash(password, 10);
  const result = await query('INSERT INTO users (name,email,password_hash,role) VALUES (?,?,?,?)', [
    name.trim(),
    email.toLowerCase(),
    hash,
    'student',
  ]);
  const user = { id: result.insertId, name: name.trim(), email: email.toLowerCase(), role: 'student' };
  return { token: sign(user), user: publicUser(user) };
}

async function login({ email, password }) {
  const rows = await query('SELECT * FROM users WHERE email=?', [email.toLowerCase()]);
  const user = rows[0];
  // Same message for unknown email and wrong password to avoid account enumeration.
  const ok = user && (await bcrypt.compare(password, user.password_hash));
  if (!ok) throw new HttpError(401, 'Incorrect email or password', 'bad_credentials');
  return { token: sign(user), user: publicUser(user) };
}

async function me(userId) {
  const rows = await query('SELECT id,name,email,role FROM users WHERE id=?', [userId]);
  if (!rows[0]) throw new HttpError(404, 'User not found');
  return rows[0];
}

module.exports = { register, login, me };
