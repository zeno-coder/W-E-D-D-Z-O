import { signup, login, getUser } from '../services/authService.js';

export async function signupController(req, res) {
  const session = await signup(req.body);
  res.status(201).json(session);
}

export async function loginController(req, res) {
  const session = await login(req.body);
  res.json(session);
}

export async function meController(req, res) {
  const user = await getUser(req.user.id);
  res.json({ user });
}

export async function logoutController(req, res) {
  res.json({ ok: true });
}
