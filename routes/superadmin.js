// ================================================
//   CÓRDOBA LUX — Rutas del Super Admin
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
    if (!result.rows.length) return res.status(401).json({ error: 'Acceso denegado' });
    const admin = result.rows[0];
    const ok = await bcrypt.compare(password, admin.password_hash);
    if (!ok) return res.status(401).json({ error: 'Acceso denegado' });
    const token = jwt.sign(
      { id: admin.id, email: admin.email, es_superadmin: true },
      process.env.JWT_SECRET, { expiresIn: '7d' }
    );
    res.json({ token, admin: { id: admin.id, nombre: admin.nombre, email: admin.email } });
  } catch (err) { res.status(500).json({ error: 'Error interno' }); }
});

// ── POST /superadmin/login-negocio ───────────────────────────────────
router.post('/login-negocio', async (req, res) => {
  const { email, password } = req.body;
  try {
    const result = await pool.query(`
      SELECT a.*, n.id as neg_id, n.nombre as neg_nombre, n.tipo as neg_tipo
      FROM admins a JOIN negocios n ON n.id = a.negocio_id
      WHERE a.email = $1 AND a.activo = true AND a.es_superadmin = false
    `, [email]);
    if (!result.rows.length) return res.status(401).json({ error: 'Acceso denegado' });
    const admin = result.rows[0];
    const ok = await bcrypt.compare(password, admin.password_hash);
    if (!ok) return res.status(401).json({ error: 'Contraseña incorrecta' });
    const token = jwt.sign(
      { id: admin.id, email: admin.email, negocio_id: admin.negocio_id },
      process.env.JWT_SECRET, { expiresIn: '30d' }
    );
    res.json({
      token,
      admin: { id: admin.id, nombre: admin.nombre, email: admin.email },
      negocio: { id: admin.neg_id, nombre: admin.neg_nombre, tipo: admin.neg_tipo }
    });
  } catch (err) { res.status(500).json({ error: 'Error interno' }); }
});

// ── POST /superadmin/login-negocio-por-id (impersonate) ─────────────
router.post('/login-negocio-por-id', authSuperAdmin, async (req, res) => {
  const { negocio_id } = req.body;
  if (!negocio_id) return res.status(400).json({ error: 'Falta negocio_id' });
  try {
    const result = await pool.query(`
      SELECT a.*, n.id as neg_id, n.nombre as neg_nombre, n.tipo as neg_tipo
      FROM admins a JOIN negocios n ON n.id = a.negocio_id
      WHERE a.negocio_id = $1 AND a.activo = true AND a.es_superadmin = false
      LIMIT 1
    `, [negocio_id]);
    if (!result.rows.length) return res.status(404).json({ error: 'Este negocio no tiene admin creado aún' });
    const admin = result.rows[0];
    const token = jwt.sign(
      { id: admin.id, email: admin.email, negocio_id: admin.negocio_id },
      process.env.JWT_SECRET, { expiresIn: '8h' }
    );
    res.json({
      token,
      admin: { id: admin.id, nombre: admin.nombre, email: admin.email },
      negocio: { id: admin.neg_id, nombre: admin.neg_nombre, tipo: admin.neg_tipo }
    });
  } catch (err) { res.status(500).json({ error: 'Error interno' }); }
});

// ── GET /superadmin/dashboard ────────────────────────────────────────
router.get('/dashboard', authSuperAdmin, async (req, res) => {
  try {
    const [negocios, usuarios, matches, sesionesActivas] = await Promise.all([
      pool.query('SELECT COUNT(*) as total FROM negocios WHERE activo = true'),
      pool.query('SELECT COUNT(*) as total FROM usuarios'),
      pool.query('SELECT COUNT(*) as total FROM matches'),
      pool.query('SELECT COUNT(*) as total FROM sesiones_noche WHERE activa = true')
    ]);
    res.json({
      negocios:         parseInt(negocios.rows[0].total),
      usuarios:         parseInt(usuarios.rows[0].total),
      matches:          parseInt(matches.rows[0].total),
      sesiones_activas: parseInt(sesionesActivas.rows[0].total)
    });
  } catch (err) { res.status(500).json({ error: 'Error interno' }); }
});

// ── GET /superadmin/negocios ─────────────────────────────────────────
router.get('/negocios', authSuperAdmin, async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT n.*,
        sn.id as sesion_id, sn.nombre as sesion_nombre, sn.codigo_qr,
        sn.activa as sesion_activa, sn.total_usuarios, sn.total_matches, sn.abierta_en
      FROM negocios n
      LEFT JOIN sesiones_noche sn ON sn.negocio_id = n.id AND sn.activa = true
      ORDER BY n.creado_en DESC
    `);
    res.json(result.rows);
  } catch (err) { res.status(500).json({ error: 'Error interno' }); }
});

// ── GET /superadmin/sesiones ─────────────────────────────────────────
router.get('/sesiones', authSuperAdmin, async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT sn.*, n.nombre as negocio_nombre, n.tipo as negocio_tipo
      FROM sesiones_noche sn JOIN negocios n ON n.id = sn.negocio_id
      ORDER BY sn.activa DESC, sn.abierta_en DESC
      LIMIT 100
    `);
    res.json(result.rows);
  } catch (err) { res.status(500).json({ error: 'Error interno' }); }
});

// ── POST /superadmin/negocios ────────────────────────────────────────
router.post('/negocios', authSuperAdmin, async (req, res) => {
  const { nombre, tipo, slug, plan, dueno_nombre, dueno_email, dueno_tel } = req.body;
  if (!nombre || !slug) return res.status(400).json({ error: 'Nombre y slug son requeridos' });
  try {
    // Calcular fecha de vencimiento: 1 mes desde hoy (mes de prueba)
    const vencimiento = new Date();
    vencimiento.setMonth(vencimiento.getMonth() + 1);
    const result = await pool.query(`
      INSERT INTO negocios (nombre, tipo, slug, plan, dueno_nombre, dueno_email, dueno_tel, vencimiento_plan, estado_pago)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'prueba')
      RETURNING *
    `, [nombre, tipo||'disco', slug, plan||'basico', dueno_nombre||'', dueno_email||'', dueno_tel||'', vencimiento.toISOString().split('T')[0]]);
    res.status(201).json(result.rows[0]);
  } catch (err) {
    if (err.code === '23505') return res.status(400).json({ error: 'El slug ya existe' });
    res.status(500).json({ error: 'Error interno' });
  }
});

// ── PUT /superadmin/negocios/:id ─────────────────────────────────────
router.put('/negocios/:id', authSuperAdmin, async (req, res) => {
  const { nombre, tipo, slug, plan, dueno_nombre, dueno_email, dueno_tel, activo, vencimiento_plan, estado_pago, zona } = req.body;
  try {
    const result = await pool.query(`
      UPDATE negocios SET
        nombre           = COALESCE($1, nombre),
        tipo             = COALESCE($2, tipo),
        slug             = COALESCE($3, slug),
        plan             = COALESCE($4, plan),
        dueno_nombre     = COALESCE($5, dueno_nombre),
        dueno_email      = COALESCE($6, dueno_email),
        dueno_tel        = COALESCE($7, dueno_tel),
        activo           = COALESCE($8, activo),
        vencimiento_plan = COALESCE($9, vencimiento_plan),
        estado_pago      = COALESCE($10, estado_pago),
        zona             = COALESCE($11, zona)
      WHERE id = $12
      RETURNING *
    `, [nombre, tipo, slug, plan, dueno_nombre, dueno_email, dueno_tel, activo, vencimiento_plan||null, estado_pago||null, zona||null, req.params.id]);
    res.json(result.rows[0]);
  } catch (err) { res.status(500).json({ error: 'Error interno' }); }
});

// ── POST /superadmin/admin-negocio ───────────────────────────────────
router.post('/admin-negocio', authSuperAdmin, async (req, res) => {
  const { negocio_id, nombre, email, password } = req.body;
  if (!negocio_id || !nombre || !email || !password) return res.status(400).json({ error: 'Faltan datos' });
  try {
    const password_hash = await bcrypt.hash(password, 10);
    await pool.query(`
      INSERT INTO admins (negocio_id, nombre, email, password_hash, es_superadmin)
      VALUES ($1, $2, $3, $4, false)
      ON CONFLICT (email) DO UPDATE SET
        nombre = $2, password_hash = $4, negocio_id = $1, activo = true
    `, [negocio_id, nombre, email, password_hash]);
    res.json({ ok: true });
  } catch (err) { res.status(500).json({ error: 'Error interno' }); }
});

// ── GET /superadmin/negocio-stats/:id ────────────────────────────────
router.get('/negocio-stats/:id', async (req, res) => {
  const { id } = req.params;
  try {
    const [usuarios, matches, sesiones, telefono] = await Promise.all([
      pool.query('SELECT COUNT(DISTINCT usuario_id) as total FROM presencias WHERE negocio_id = $1', [id]),
      pool.query('SELECT COUNT(*) as total FROM matches WHERE negocio_id = $1', [id]),
      pool.query('SELECT COUNT(*) as total FROM sesiones_noche WHERE negocio_id = $1', [id]),
      pool.query(`SELECT COUNT(*) as total FROM usuarios u JOIN presencias p ON p.usuario_id = u.id WHERE p.negocio_id = $1 AND u.telefono IS NOT NULL AND u.telefono != ''`, [id])
    ]);
    res.json({
      total_usuarios: parseInt(usuarios.rows[0].total),
      total_matches:  parseInt(matches.rows[0].total),
      total_sesiones: parseInt(sesiones.rows[0].total),
      con_telefono:   parseInt(telefono.rows[0].total)
    });
  } catch (err) { res.status(500).json({ error: 'Error interno' }); }
});

// ── GET /superadmin/mi-negocio ────────────────────────────────────────
router.get('/mi-negocio', async (req, res) => {
  const token = req.headers['authorization']?.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'Token requerido' });
  try {
    const decoded = require('jsonwebtoken').verify(token, process.env.JWT_SECRET);
    if (!decoded.negocio_id) return res.status(403).json({ error: 'Acceso denegado' });
    const result = await pool.query(`
      SELECT n.*, sn.id as sesion_id, sn.nombre as sesion_nombre, sn.codigo_qr,
        sn.activa as sesion_activa, sn.total_usuarios, sn.total_matches, sn.abierta_en
      FROM negocios n
      LEFT JOIN sesiones_noche sn ON sn.negocio_id = n.id AND sn.activa = true
      WHERE n.id = $1
    `, [decoded.negocio_id]);
    res.json(result.rows[0]);
  } catch (err) { res.status(401).json({ error: 'Token inválido' }); }
});

// ── GET /superadmin/sesiones-negocio/:id ─────────────────────────────
router.get('/sesiones-negocio/:id', async (req, res) => {
  const token = req.headers['authorization']?.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'Token requerido' });
  try {
    const decoded = require('jsonwebtoken').verify(token, process.env.JWT_SECRET);
    if (decoded.negocio_id !== req.params.id && !decoded.es_superadmin)
      return res.status(403).json({ error: 'Acceso denegado' });
    const result = await pool.query(`
      SELECT * FROM sesiones_noche WHERE negocio_id = $1
      ORDER BY activa DESC, abierta_en DESC LIMIT 10
    `, [req.params.id]);
    res.json(result.rows);
  } catch (err) { res.status(401).json({ error: 'Token inválido' }); }
});

// ── GET /superadmin/usuarios ─────────────────────────────────────────
router.get('/usuarios', authSuperAdmin, async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT id, nombre, apellido, email, foto_url, vibe, edad, telefono, app_origen, creado_en, ultimo_login, activo
      FROM usuarios ORDER BY creado_en DESC LIMIT 100
    `);
    res.json(result.rows);
  } catch (err) { res.status(500).json({ error: 'Error interno' }); }
});

// ── GET /superadmin/reportes ─────────────────────────────────────────
router.get('/reportes', authSuperAdmin, async (req, res) => {
  const { desde, hasta, negocio_id } = req.query;
  if (!desde || !hasta) return res.status(400).json({ error: 'Fechas requeridas' });
  try {
    const params = [desde, hasta];
    let whereNegocio = '';
    if (negocio_id) { params.push(negocio_id); whereNegocio = `AND p.negocio_id = $${params.length}`; }
    const usuarios = await pool.query(`
      SELECT u.id, u.nombre, u.email, u.telefono, u.foto_url, u.vibe, u.edad,
        n.nombre as negocio_nombre, COUNT(p.id) as visitas, MAX(p.entro_en) as ultimo_ingreso
      FROM presencias p
      JOIN usuarios u ON u.id = p.usuario_id
      JOIN negocios n ON n.id = p.negocio_id
      WHERE p.entro_en BETWEEN $1 AND $2::date + interval '1 day' ${whereNegocio}
      GROUP BY u.id, u.nombre, u.email, u.telefono, u.foto_url, u.vibe, u.edad, n.nombre
      ORDER BY MAX(p.entro_en) DESC
    `, params);
    const sesiones = await pool.query(`
      SELECT COUNT(*) as total FROM sesiones_noche
      WHERE abierta_en BETWEEN $1 AND $2::date + interval '1 day'
      ${negocio_id ? 'AND negocio_id = $3' : ''}
    `, negocio_id ? [desde, hasta, negocio_id] : [desde, hasta]);
    const matches = await pool.query(`
      SELECT COUNT(*) as total FROM matches
      WHERE creado_en BETWEEN $1 AND $2::date + interval '1 day'
      ${negocio_id ? 'AND negocio_id = $3' : ''}
    `, negocio_id ? [desde, hasta, negocio_id] : [desde, hasta]);
    res.json({
      usuarios: usuarios.rows,
      total_sesiones: parseInt(sesiones.rows[0].total),
      total_matches:  parseInt(matches.rows[0].total)
    });
  } catch (err) { console.error('Error reportes:', err); res.status(500).json({ error: 'Error interno' }); }
});

// ── DELETE /superadmin/sesiones/negocio/:id/inactivas ────────────────
router.delete('/sesiones/negocio/:id/inactivas', authSuperAdmin, async (req, res) => {
  try {
    await pool.query('DELETE FROM sesiones_noche WHERE negocio_id = $1 AND activa = false', [req.params.id]);
    res.json({ ok: true });
  } catch (err) { res.status(500).json({ error: 'Error interno' }); }
});

// ── DELETE /superadmin/sesiones/:id ─────────────────────────────────
router.delete('/sesiones/:id', authSuperAdmin, async (req, res) => {
  try {
    await pool.query('DELETE FROM sesiones_noche WHERE id = $1 AND activa = false', [req.params.id]);
    res.json({ ok: true });
  } catch (err) { res.status(500).json({ error: 'Error interno' }); }
});

// ── POST /superadmin/registrar-telefono ──────────────────────────────
router.post('/registrar-telefono', authSuperAdmin, async (req, res) => {
  const { codigo_usuario, telefono } = req.body;
  if (!codigo_usuario || !telefono) return res.status(400).json({ error: 'Faltan datos' });
  try {
    const result = await pool.query(`
      UPDATE usuarios SET telefono = $1 WHERE id::text LIKE $2 || '%' RETURNING nombre, email
    `, [telefono, codigo_usuario]);
    if (!result.rows.length) return res.status(404).json({ error: 'Usuario no encontrado' });
    res.json({ ok: true, nombre: result.rows[0].nombre });
  } catch (err) { res.status(500).json({ error: 'Error interno' }); }
});

// ── POST /superadmin/crear-superadmin ────────────────────────────────
router.post('/crear-superadmin', async (req, res) => {
  const { nombre, email, password, clave_maestra } = req.body;
  if (clave_maestra !== process.env.CLAVE_MAESTRA) return res.status(403).json({ error: 'Clave maestra incorrecta' });
  try {
    const existe = await pool.query('SELECT id FROM admins WHERE es_superadmin = true');
    if (existe.rows.length > 0) return res.status(400).json({ error: 'Ya existe un superadmin' });
    const password_hash = await bcrypt.hash(password, 10);
    const result = await pool.query(`
      INSERT INTO admins (nombre, email, password_hash, es_superadmin, negocio_id)
      VALUES ($1, $2, $3, true, NULL) RETURNING id, nombre, email
    `, [nombre, email, password_hash]);
    res.status(201).json({ ok: true, admin: result.rows[0] });
  } catch (err) { res.status(500).json({ error: 'Error interno' }); }
});

// ── POST /superadmin/admin-negocio-password ──────────────────────────
router.post('/admin-negocio-password', authSuperAdmin, async (req, res) => {
  const { negocio_id, password } = req.body;
  if (!negocio_id || !password) return res.status(400).json({ error: 'Faltan datos' });
  if (password.length < 6) return res.status(400).json({ error: 'Mínimo 6 caracteres' });
  try {
    const password_hash = await bcrypt.hash(password, 10);
    const result = await pool.query(
      'UPDATE admins SET password_hash = $1 WHERE negocio_id = $2 AND es_superadmin = false RETURNING email, nombre',
      [password_hash, negocio_id]
    );
    if (!result.rows.length) return res.status(404).json({ error: 'Admin no encontrado para este negocio' });
    res.json({ ok: true, email: result.rows[0].email, nombre: result.rows[0].nombre });
  } catch (err) {
    console.error('POST /superadmin/admin-negocio-password:', err.message);
    res.status(500).json({ error: 'Error interno' });
  }
});


// ── GET /superadmin/reportes-negocio ─────────────────────────────────
// Versión para admins de negocio (no requiere superadmin)
router.get('/reportes-negocio', async (req, res) => {
  const token = req.headers['authorization']?.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'Token requerido' });
  let negocio_id_token;
  try {
    const decoded = require('jsonwebtoken').verify(token, process.env.JWT_SECRET);
    if (!decoded.negocio_id) return res.status(403).json({ error: 'Acceso denegado' });
    negocio_id_token = decoded.negocio_id;
  } catch (err) {
    return res.status(401).json({ error: 'Token inválido' });
  }

  const { desde, hasta } = req.query;
  if (!desde || !hasta) return res.status(400).json({ error: 'Fechas requeridas' });

  try {
    const usuarios = await pool.query(`
      SELECT u.id, u.nombre, u.email, u.telefono, u.foto_url, u.vibe, u.edad,
        COUNT(p.id) as visitas, MAX(p.entro_en) as ultimo_ingreso
      FROM presencias p
      JOIN usuarios u ON u.id = p.usuario_id
      WHERE p.entro_en BETWEEN $1 AND $2::date + interval '1 day'
        AND p.negocio_id = $3
      GROUP BY u.id, u.nombre, u.email, u.telefono, u.foto_url, u.vibe, u.edad
      ORDER BY MAX(p.entro_en) DESC
    `, [desde, hasta, negocio_id_token]);

    res.json({ usuarios: usuarios.rows });
  } catch (err) {
    console.error('GET /superadmin/reportes-negocio:', err);
    res.status(500).json({ error: 'Error interno' });
  }
});

module.exports = router;
