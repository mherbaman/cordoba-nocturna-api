// routes/galeria.js — Galería de fotos y torneos externos
const express = require('express');
const router = express.Router();
const { pool } = require('../database');
const { authAdmin } = require('../middleware/auth');
const cloudinary = require('../cloudinary');
const multer = require('multer');
const upload = multer({ storage: multer.memoryStorage() });

// ── GET /galeria/fotos — fotos activas públicas
router.get('/fotos', async (req, res) => {
  try {
    const { rows } = await pool.query('SELECT * FROM galeria_fotos WHERE activo=true ORDER BY orden ASC, creado_en DESC');
    res.json(rows);
  } catch(e) { res.status(500).json({ error: e.message }); }
});

// ── POST /galeria/fotos — subir foto (admin)
router.post('/fotos', authAdmin, upload.single('foto'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'No se recibió imagen' });
    const b64 = Buffer.from(req.file.buffer).toString('base64');
    const dataURI = `data:${req.file.mimetype};base64,${b64}`;
    const result = await cloudinary.uploader.upload(dataURI, { folder: 'galeria' });
    const { rows } = await pool.query(
      'INSERT INTO galeria_fotos (url, public_id, descripcion) VALUES ($1,$2,$3) RETURNING *',
      [result.secure_url, result.public_id, req.body.descripcion||null]
    );
    res.json(rows[0]);
  } catch(e) { res.status(500).json({ error: e.message }); }
});

// ── DELETE /galeria/fotos/:id — eliminar foto (admin)
router.delete('/fotos/:id', authAdmin, async (req, res) => {
  try {
    const { rows } = await pool.query('SELECT public_id FROM galeria_fotos WHERE id=$1', [req.params.id]);
    if (rows[0]?.public_id) await cloudinary.uploader.destroy(rows[0].public_id);
    await pool.query('DELETE FROM galeria_fotos WHERE id=$1', [req.params.id]);
    res.json({ ok: true });
  } catch(e) { res.status(500).json({ error: e.message }); }
});

// ── GET /galeria/torneos — torneos externos publicados
router.get('/torneos', async (req, res) => {
  try {
    const { rows } = await pool.query("SELECT * FROM torneos_externos WHERE estado='publicado' ORDER BY creado_en DESC");
    res.json(rows);
  } catch(e) { res.status(500).json({ error: e.message }); }
});

// ── GET /galeria/torneos/admin — todos los torneos (admin)
router.get('/torneos/admin', authAdmin, async (req, res) => {
  try {
    const { rows } = await pool.query('SELECT * FROM torneos_externos ORDER BY creado_en DESC');
    res.json(rows);
  } catch(e) { res.status(500).json({ error: e.message }); }
});

// ── POST /galeria/torneos — publicar torneo externo (público)
router.post('/torneos', upload.single('flyer'), async (req, res) => {
  try {
    const { titulo, tipo, organizador, contacto, fecha, zona, descripcion } = req.body;
    if (!titulo) return res.status(400).json({ error: 'El título es obligatorio' });
    let flyer_url = null, flyer_public_id = null;
    if (req.file) {
      const b64 = Buffer.from(req.file.buffer).toString('base64');
      const dataURI = `data:${req.file.mimetype};base64,${b64}`;
      const result = await cloudinary.uploader.upload(dataURI, { folder: 'torneos_externos' });
      flyer_url = result.secure_url;
      flyer_public_id = result.public_id;
    }
    const { rows } = await pool.query(
      'INSERT INTO torneos_externos (titulo, tipo, flyer_url, flyer_public_id, organizador, contacto, fecha, zona, descripcion) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING *',
      [titulo, tipo||'torneo', flyer_url, flyer_public_id, organizador||null, contacto||null, fecha||null, zona||null, descripcion||null]
    );
    res.json({ ok: true, torneo: rows[0] });
  } catch(e) { res.status(500).json({ error: e.message }); }
});

// ── PUT /galeria/torneos/:id/estado — aprobar/rechazar (admin)
router.put('/torneos/:id/estado', authAdmin, async (req, res) => {
  try {
    const { estado } = req.body;
    const { rows } = await pool.query('UPDATE torneos_externos SET estado=$1 WHERE id=$2 RETURNING *', [estado, req.params.id]);
    res.json(rows[0]);
  } catch(e) { res.status(500).json({ error: e.message }); }
});

// ── DELETE /galeria/torneos/:id — eliminar (admin)
router.delete('/torneos/:id', authAdmin, async (req, res) => {
  try {
    const { rows } = await pool.query('SELECT flyer_public_id FROM torneos_externos WHERE id=$1', [req.params.id]);
    if (rows[0]?.flyer_public_id) await cloudinary.uploader.destroy(rows[0].flyer_public_id);
    await pool.query('DELETE FROM torneos_externos WHERE id=$1', [req.params.id]);
    res.json({ ok: true });
  } catch(e) { res.status(500).json({ error: e.message }); }
});

module.exports = router;
