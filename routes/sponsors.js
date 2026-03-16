// ================================================
//   CÓRDOBA NOCTURNA — Rutas de Sponsors
// ================================================

const express = require('express');
const router = express.Router();
const { pool } = require('../database');
const { authAdmin } = require('../middleware/auth');

router.get('/', async (req, res) => {
  try {
    const { pantalla } = req.query;
    let query = `SELECT * FROM sponsors WHERE activo = true`;
    const params = [];
    if (pantalla) {
      query += ` AND (pantalla = $1 OR pantalla = 'todas')`;
      params.push(pantalla);
    }
    query += ` ORDER BY orden ASC, creado_en DESC`;
    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: 'Error interno' });
  }
});

router.post('/', authAdmin, async (req, res) => {
  const { nombre, promo, emoji, tag, whatsapp, instagram, imagen_url, imagen_promo, pantalla, orden } = req.body;
  if (!nombre || !promo) return res.status(400).json({ error: 'Nombre y promo son requeridos' });
  try {
    const result = await pool.query(`
      INSERT INTO sponsors (nombre, promo, emoji, tag, whatsapp, instagram, imagen_url, imagen_promo, pantalla, orden)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      RETURNING *
    `, [nombre, promo, emoji||'🎯', tag||'PROMO', whatsapp||'', instagram||'', imagen_url||'', imagen_promo||'', pantalla||'todas', orden||0]);
    res.status(201).json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Error interno' });
  }
});

router.put('/:id', authAdmin, async (req, res) => {
  const { nombre, promo, emoji, tag, whatsapp, instagram, imagen_url, imagen_promo, pantalla, orden, activo } = req.body;
  try {
    const result = await pool.query(`
      UPDATE sponsors SET
        nombre = COALESCE($1, nombre),
        promo = COALESCE($2, promo),
        emoji = COALESCE($3, emoji),
        tag = COALESCE($4, tag),
        whatsapp = COALESCE($5, whatsapp),
        instagram = COALESCE($6, instagram),
        imagen_url = COALESCE($7, imagen_url),
        imagen_promo = COALESCE($8, imagen_promo),
        pantalla = COALESCE($9, pantalla),
        orden = COALESCE($10, orden),
        activo = COALESCE($11, activo)
      WHERE id = $12
      RETURNING *
    `, [nombre, promo, emoji, tag, whatsapp, instagram, imagen_url, imagen_promo, pantalla, orden, activo, req.params.id]);
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Error interno' });
  }
});

router.delete('/:id', authAdmin, async (req, res) => {
  try {
    await pool.query('DELETE FROM sponsors WHERE id = $1', [req.params.id]);
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: 'Error interno' });
  }
});

module.exports = router;
