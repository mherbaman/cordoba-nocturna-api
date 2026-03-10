// ================================================
//   CÓRDOBA NOCTURNA — Rutas del Super Admin
//   Solo vos podés acceder a estas rutas
// ================================================

const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { pool } = require('../database');
const { authSuperAdmin } = require('../middleware/auth');

// ── POST /superadmin/login ───────────────────────────────────────────
router.post('/login', async (req, res) => {
  const { email, password } = req.body;
  try {
    const result = await pool.query(
      'SELECT * FROM admins WHERE email = $1 AND es_superadmin = true AND activo = true',
      [email]
    );
    if (result.rows.length === 0) return res.status(401).json({ error: 'Acceso denegado' });

    const admin = result.rows[0];
    const ok = await bcrypt.compare(password, admin.password_hash);
    if (!ok) return res.status(401).json({ error: 'Acceso denegado' });

    const token = jwt.sign(
      { id: admin.id, email: admin.email, es_superadmin: true },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );
    res.json({ token, nombre: admin.nombre });
  } catch (err) {
    res.status(500).json({ error: 'Error interno' });
  }
});

// ── GET /superadmin/dashboard ────────────────────────────────────────
// Vista general de toda la plataforma
router.get('/dashboard', authSuperAdmin, async (req, res) => {
  try {
    const [negocios, usuarios, matches, sesionesActivas] = await Promise.all([
      pool.query('SELECT COUNT(*) as total, COUNT(*) FILTER (WHERE activo) as activos FROM negocios'),
      pool.query('SELECT COUNT(*) as total FROM usuarios'),
      pool.query('SELECT COUNT(*) as total FROM matches'),
      pool.query(`
        SELECT sn.*, n.nombre as negocio_nombre, n.tipo
        FROM sesiones_noche sn
        JOIN negocios n ON n.id = sn.negocio_id
        WHERE sn.activa = true
        ORDER BY sn.abierta_en DESC
      `)
    ]);

    res.json({
      negocios: negocios.rows[0],
      usuarios: usuarios.rows[0],
      matches: matches.rows[0],
      sesiones_activas_ahora: sesionesActivas.rows
    });
  } catch (err) {
    res.status(500).json({ error: 'Error interno' });
  }
});

// ── GET /superadmin/negocios ─────────────────────────────────────────
// Lista de todos los clientes
router.get('/negocios', authSuperAdmin, async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT 
        n.*,
        COUNT(DISTINCT u_sesiones.usuario_id) as total_usuarios_historico,
        COUNT(DISTINCT sn.id) as total_sesiones,
        COUNT(DISTINCT m.id) as total_matches
      FROM negocios n
      LEFT JOIN sesiones_noche sn ON sn.negocio_id = n.id
      LEFT JOIN presencias u_sesiones ON u_sesiones.negocio_id = n.id
      LEFT JOIN matches m ON m.negocio_id = n.id
      GROUP BY n.id
      ORDER BY n.creado_en DESC
    `);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: 'Error interno' });
  }
});

// ── GET /superadmin/usuarios ─────────────────────────────────────────
// Lista de todos los usuarios registrados
router.get('/usuarios', authSuperAdmin, async (req, res) => {
  const { pagina = 1, por_pagina = 50, buscar } = req.query;
  const offset = (pagina - 1) * por_pagina;

  try {
    let query = `
      SELECT id, nombre, email, foto_url, vibe, edad, creado_en, ultimo_login, activo
      FROM usuarios
    `;
    const params = [];

    if (buscar) {
      params.push(`%${buscar}%`);
      query += ` WHERE nombre ILIKE $1 OR email ILIKE $1`;
    }

    query += ` ORDER BY creado_en DESC LIMIT ${por_pagina} OFFSET ${offset}`;

    const result = await pool.query(query, params);
    const total = await pool.query('SELECT COUNT(*) FROM usuarios');

    res.json({
      usuarios: result.rows,
      total: parseInt(total.rows[0].count),
      pagina: parseInt(pagina)
    });
  } catch (err) {
    res.status(500).json({ error: 'Error interno' });
  }
});

// ── POST /superadmin/crear-superadmin ────────────────────────────────
// Solo se usa UNA VEZ para crear tu usuario inicial
// Después de usarlo, desactivalo o borralo del código
router.post('/crear-superadmin', async (req, res) => {
  const { nombre, email, password, clave_maestra } = req.body;

  // Clave maestra para proteger este endpoint
  if (clave_maestra !== process.env.CLAVE_MAESTRA) {
    return res.status(403).json({ error: 'Clave maestra incorrecta' });
  }

  try {
    const existe = await pool.query('SELECT id FROM admins WHERE es_superadmin = true');
    if (existe.rows.length > 0) {
      return res.status(400).json({ error: 'Ya existe un superadmin' });
    }

    const password_hash = await bcrypt.hash(password, 10);
    const result = await pool.query(`
      INSERT INTO admins (nombre, email, password_hash, es_superadmin, negocio_id)
      VALUES ($1, $2, $3, true, NULL)
      RETURNING id, nombre, email
    `, [nombre, email, password_hash]);

    res.status(201).json({ ok: true, admin: result.rows[0] });
  } catch (err) {
    res.status(500).json({ error: 'Error interno' });
  }
});

module.exports = router;
