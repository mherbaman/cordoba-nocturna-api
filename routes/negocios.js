// ================================================
//   CÓRDOBA NOCTURNA — Rutas de negocios
//   Discos, restaurantes, bares
// ================================================

const express = require('express');
const router = express.Router();
const { pool } = require('../database');
const { authAdmin, authSuperAdmin } = require('../middleware/auth');

// ── GET /negocios/sesiones-activas ───────────────────────────────────
// Devuelve sesiones activas filtradas por tipo (query param)
// Sin filtro: todas. ?tipo=padel: solo padel. ?tipo=nocturna: discos/bares/etc
router.get('/sesiones-activas', async (req, res) => {
  const { tipo } = req.query;
  const TIPOS_PADEL = ['padel','cancha','club','torneo'];
  const TIPOS_NOCTURNA = ['disco','bar','pub','restaurante','baile','sunset','playa','terraza','gimnasio','crossfit','yoga','festival','feria','recital','shopping','mall','outlet','casamiento','cumple18','corporativo','privado'];
  try {
    let whereExtra = '';
    if (tipo === 'padel') {
      whereExtra = `AND n.tipo IN (${TIPOS_PADEL.map((t,i)=>`$${i+1}`).join(',')})`;
    } else if (tipo === 'nocturna') {
      whereExtra = `AND n.tipo IN (${TIPOS_NOCTURNA.map((t,i)=>`$${i+1}`).join(',')})`;
    }
    const params = tipo === 'padel' ? TIPOS_PADEL : tipo === 'nocturna' ? TIPOS_NOCTURNA : [];
    const result = await pool.query(`
      SELECT n.nombre, n.tipo, n.slug, n.logo_url,
             s.id as sesion_id, s.nombre as sesion_nombre,
             s.total_usuarios, s.abierta_en
      FROM sesiones_noche s
      JOIN negocios n ON n.id = s.negocio_id
      WHERE s.activa = true AND n.activo = true ${whereExtra}
      ORDER BY s.total_usuarios DESC
    `, params);
    res.json(result.rows);
  } catch (err) {
    console.error('GET /negocios/sesiones-activas:', err.message);
    res.status(500).json({ error: 'Error interno' });
  }
});

// ── GET /negocios/clubes-padel ──────────────────────────────────────
router.get('/clubes-padel', async (req, res) => {
  try {
    const { zona } = req.query;
    let query = `SELECT nombre, direccion, dueno_tel as telefono, instagram, zona, whatsapp, foto_url
                 FROM negocios WHERE tipo = 'padel' AND activo = true`;
    const params = [];
    if (zona) { query += ` AND zona = $1`; params.push(zona); }
    query += ` ORDER BY zona NULLS LAST, nombre ASC`;
    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: 'Error interno' });
  }
});
// ── GET /negocios/:slug ──────────────────────────────────────────────
// Info pública de un negocio (para mostrar en la app del usuario)
router.get('/:slug', async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT id, nombre, tipo, slug, descripcion, logo_url, color_primario, color_secundario FROM negocios WHERE slug = $1 AND activo = true',
      [req.params.slug]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Local no encontrado' });
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Error interno' });
  }
});

// ── GET /negocios/:slug/sesion-activa ────────────────────────────────
// La sesión de esta noche — si está activa, devuelve el código QR y los usuarios
router.get('/:slug/sesion-activa', async (req, res) => {
  try {
    // Buscar el negocio
    const negocio = await pool.query(
      'SELECT id FROM negocios WHERE slug = $1 AND activo = true',
      [req.params.slug]
    );
    if (negocio.rows.length === 0) return res.status(404).json({ error: 'Local no encontrado' });

    // Buscar sesión activa
    const sesion = await pool.query(
      'SELECT * FROM sesiones_noche WHERE negocio_id = $1 AND activa = true ORDER BY abierta_en DESC LIMIT 1',
      [negocio.rows[0].id]
    );

    if (sesion.rows.length === 0) {
      return res.json({ activa: false, mensaje: 'No hay sesión activa esta noche' });
    }

    res.json({ activa: true, sesion: sesion.rows[0] });
  } catch (err) {
    res.status(500).json({ error: 'Error interno' });
  }
});

// ── POST /negocios (solo superadmin) ─────────────────────────────────
// Crear un nuevo negocio cliente
router.post('/', authSuperAdmin, async (req, res) => {
  const { nombre, tipo, slug, descripcion, logo_url, color_primario, color_secundario, dueno_nombre, dueno_email, dueno_tel, whatsapp, zona, direccion, instagram } = req.body;

  if (!nombre || !tipo || !slug) {
    return res.status(400).json({ error: 'Nombre, tipo y slug son requeridos' });
  }

  try {
    const result = await pool.query(`
      INSERT INTO negocios (nombre, tipo, slug, descripcion, logo_url, color_primario, color_secundario, dueno_nombre, dueno_email, dueno_tel, whatsapp, zona, direccion, instagram)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14)
      RETURNING *
    `, [nombre, tipo, slug, descripcion, logo_url, color_primario || '#ff2d78', color_secundario || '#7c3aed', dueno_nombre, dueno_email, dueno_tel, whatsapp, zona, direccion, instagram]);

    res.status(201).json(result.rows[0]);
  } catch (err) {
    if (err.code === '23505') return res.status(400).json({ error: 'El slug ya existe' });
    res.status(500).json({ error: 'Error interno' });
  }
});

// ── PUT /negocios/:id (superadmin) ───────────────────────────────────
// Actualizar datos de un negocio
router.put('/:id', authSuperAdmin, async (req, res) => {
  const { nombre, descripcion, logo_url, color_primario, color_secundario, activo, plan, dueno_nombre, dueno_email, dueno_tel, whatsapp, zona, direccion, instagram } = req.body;
  try {
    const result = await pool.query(`
      UPDATE negocios SET
        nombre = COALESCE($1, nombre),
        descripcion = COALESCE($2, descripcion),
        logo_url = COALESCE($3, logo_url),
        color_primario = COALESCE($4, color_primario),
        color_secundario = COALESCE($5, color_secundario),
        activo = COALESCE($6, activo),
        plan = COALESCE($7, plan)
      WHERE id = $8 RETURNING *
    `, [nombre, descripcion, logo_url, color_primario, color_secundario, activo, plan, req.params.id]);
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Error interno' });
  }
});



module.exports = router;
