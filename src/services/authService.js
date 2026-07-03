import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { query } from '../config/db.js';
import { env } from '../config/env.js';
import { AppError } from '../utils/errors.js';
import { cleanString, isEmail } from '../utils/sanitize.js';

export async function signup({ email, password }) {
  const normalizedEmail = cleanString(email, 254).toLowerCase();
  if (!isEmail(normalizedEmail)) {
    throw new AppError('Enter a valid email address');
  }
  if (typeof password !== 'string' || password.length < 8 || password.length > 128) {
    throw new AppError('Password must be between 8 and 128 characters');
  }
  const existing = await query('SELECT id FROM users WHERE email = $1', [normalizedEmail]);
  if (existing.rowCount) {
    throw new AppError('Email is already registered', 409);
  }
  const passwordHash = await bcrypt.hash(password, 12);
  const result = await query(
    'INSERT INTO users (email, password_hash) VALUES ($1, $2) RETURNING id, email, created_at',
    [normalizedEmail, passwordHash]
  );
  return createSession(result.rows[0]);
}

export async function login({ email, password }) {
  const normalizedEmail = cleanString(email, 254).toLowerCase();
  const result = await query('SELECT id, email, password_hash, created_at FROM users WHERE email = $1', [normalizedEmail]);
  if (!result.rowCount) {
    throw new AppError('Invalid email or password', 401);
  }
  const user = result.rows[0];
  const matches = await bcrypt.compare(String(password || ''), user.password_hash);
  if (!matches) {
    throw new AppError('Invalid email or password', 401);
  }
  return createSession({ id: user.id, email: user.email, created_at: user.created_at });
}

export async function getUser(id) {
  const result = await query('SELECT id, email, created_at FROM users WHERE id = $1', [id]);
  if (!result.rowCount) {
    throw new AppError('User not found', 404);
  }
  return result.rows[0];
}

function createSession(user) {
  const token = jwt.sign({ id: user.id, email: user.email }, env.jwtSecret, { expiresIn: '24h' });
  return { token, user };
}
