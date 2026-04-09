// ================================================
//   CÓRDOBA NOCTURNA — Rutas de usuarios
//   Registro, login, perfil
// ================================================

const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { pool } = require('../database');
const { authUsuario } = require('../middleware/auth');

// ── POST /auth/registro ──────────────────────────────────────────────
// El usuario se registra por primera vez
router.post('/registro', async (req, res) => {
  const { nombre, email, telefono, password, foto_url, vibe, edad } = req.body;

  if (!nombre || !password) {
    return res.status(400).json({ error: 'Nombre y contraseña son requeridos' });
  }

  try {
    // Verificar si el email ya existe
    if (email) {
      const existe = await pool.query('SELECT id FROM usuarios WHERE email = $1', [email]);
      if (existe.rows.length > 0) {
        return res.status(400).json({ error: 'El email ya está registrado' });
      }
    }

    const password_hash = await bcrypt.hash(password, 10);

    const result = await pool.query(`
      INSERT INTO usuarios (nombre, email, telefono, password_hash, foto_url, vibe, edad)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING id, nombre, email, foto_url, vibe, edad, creado_en
    `, [nombre, email, telefono, password_hash, foto_url, vibe, edad]);

    const usuario = result.rows[0];
    const token = jwt.sign(
      { id: usuario.id, nombre: usuario.nombre },
      process.env.JWT_SECRET,
      { expiresIn: '30d' }
    );

    res.status(201).json({ usuario, token });

  } catch (err) {
    console.error('Error en registro:', err);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// ── POST /auth/login ─────────────────────────────────────────────────
// El usuario vuelve la semana siguiente — login con email/contraseña
router.post('/login', async (req, res) => {
  const { email, password } = req.body;

  try {
    const result = await pool.query(
      'SELECT * FROM usuarios WHERE email = $1 AND activo = true',
      [email]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({ error: 'Email o contraseña incorrectos' });
    }

    const usuario = result.rows[0];
    const passwordOk = await bcrypt.compare(password, usuario.password_hash);

    if (!passwordOk) {
      return res.status(401).json({ error: 'Email o contraseña incorrectos' });
    }

    // Actualizar último login
    await pool.query('UPDATE usuarios SET ultimo_login = NOW() WHERE id = $1', [usuario.id]);

    const token = jwt.sign(
      { id: usuario.id, nombre: usuario.nombre },
      process.env.JWT_SECRET,
      { expiresIn: '30d' }
    );

    res.json({
      usuario: {
        id: usuario.id,
        nombre: usuario.nombre,
        email: usuario.email,
        foto_url: usuario.foto_url,
        vibe: usuario.vibe,
        edad: usuario.edad
      },
      token
    });

  } catch (err) {
    console.error('Error en login:', err);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// ── GET /auth/perfil ─────────────────────────────────────────────────
// Ver mi propio perfil
router.get('/perfil', authUsuario, async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT id, nombre, email, foto_url, vibe, edad, creado_en FROM usuarios WHERE id = $1',
      [req.usuario.id]
    );
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// ── PUT /auth/perfil ─────────────────────────────────────────────────
// Actualizar mi perfil (nombre, foto, vibe)
router.put('/perfil', authUsuario, async (req, res) => {
  const { nombre, foto_url, vibe, edad } = req.body;
  try {
    const result = await pool.query(`
      UPDATE usuarios 
      SET nombre = COALESCE($1, nombre),
          foto_url = COALESCE($2, foto_url),
          vibe = COALESCE($3, vibe),
          edad = COALESCE($4, edad)
      WHERE id = $5
      RETURNING id, nombre, email, foto_url, vibe, edad
    `, [nombre, foto_url, vibe, edad, req.usuario.id]);
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// ── POST /auth/cambiar-password ──────────────────────────────────────
router.post('/cambiar-password', authUsuario, async (req, res) => {
  const { password_actual, password_nueva } = req.body;
  if (!password_actual || !password_nueva) return res.status(400).json({ error: 'Faltan datos' });
  if (password_nueva.length < 6) return res.status(400).json({ error: 'La nueva contraseña debe tener al menos 6 caracteres' });
  try {
    const result = await pool.query('SELECT password_hash FROM usuarios WHERE id = $1', [req.usuario.id]);
    if (!result.rows.length) return res.status(404).json({ error: 'Usuario no encontrado' });
    const ok = await bcrypt.compare(password_actual, result.rows[0].password_hash);
    if (!ok) return res.status(401).json({ error: 'La contraseña actual es incorrecta' });
    const nuevo_hash = await bcrypt.hash(password_nueva, 10);
    await pool.query('UPDATE usuarios SET password_hash = $1 WHERE id = $2', [nuevo_hash, req.usuario.id]);
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: 'Error interno' });
  }
});

module.exports = router;
