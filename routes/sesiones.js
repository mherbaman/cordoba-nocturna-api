// ================================================
//   CÓRDOBA NOCTURNA — Rutas de sesiones
//   Manejo de la "noche": quién está, QR, presencia
// ================================================

const express = require('express');
const router = express.Router();
const { v4: uuidv4 } = require('uuid');
const { pool } = require('../database');
const { authUsuario, authAdmin } = require('../middleware/auth');

// ── POST /sesiones/entrar ────────────────────────────────────────────
router.post('/entrar', authUsuario, async (req, res) => {
  const { codigo_qr } = req.body;

  if (!codigo_qr) return res.status(400).json({ error: 'Código QR requerido' });

  try {
    const sesionResult = await pool.query(
      'SELECT * FROM sesiones_noche WHERE codigo_qr = $1 AND activa = true',
      [codigo_qr]
    );

    if (sesionResult.rows.length === 0) {
      return res.status(404).json({ error: 'Sesión no encontrada o ya cerrada' });
    }

    const sesion = sesionResult.rows[0];

    await pool.query(
      'UPDATE presencias SET activa = false WHERE usuario_id = $1 AND activa = true',
      [req.usuario.id]
    );

    await pool.query(`
      INSERT INTO presencias (usuario_id, sesion_id, negocio_id, activa, ultima_actividad)
      VALUES ($1, $2, $3, true, NOW())
      ON CONFLICT (usuario_id, sesion_id)
      DO UPDATE SET activa = true, ultima_actividad = NOW()
    `, [req.usuario.id, sesion.id, sesion.negocio_id]);

    await pool.query(`
      UPDATE sesiones_noche 
      SET total_usuarios = (
        SELECT COUNT(*) FROM presencias 
        WHERE sesion_id = $1 AND activa = true
      )
      WHERE id = $1
    `, [sesion.id]);

    res.json({
      ok: true,
      sesion_id: sesion.id,
      negocio_id: sesion.negocio_id,
      mensaje: `Bienvenido a la sesión de esta noche`
    });

  } catch (err) {
    console.error('Error al entrar a sesión:', err);
    res.status(500).json({ error: 'Error interno' });
  }
});

// ── GET /sesiones/:sesion_id/perfiles ────────────────────────────────
// Con ?todos=true devuelve todos sin filtrar los ya vistos
router.get('/:sesion_id/perfiles', authUsuario, async (req, res) => {
  try {
    const horas = process.env.SESSION_EXPIRY_HOURS || 2;
    await pool.query(`
      UPDATE presencias SET activa = false
      WHERE sesion_id = $1
      AND ultima_actividad < NOW() - INTERVAL '${horas} hours'
      AND activa = true
    `, [req.params.sesion_id]);

    const todos = req.query.todos === 'true';

    let query;
    if (todos) {
      // Traer todos — solo excluir al propio usuario
      query = await pool.query(`
        SELECT 
          u.id, u.nombre, u.foto_url, u.vibe, u.edad,
          p.ultima_actividad
        FROM presencias p
        JOIN usuarios u ON u.id = p.usuario_id
        WHERE p.sesion_id = $1
          AND p.activa = true
          AND p.usuario_id != $2
        ORDER BY RANDOM()
      `, [req.params.sesion_id, req.usuario.id]);
    } else {
      // Normal — excluir ya vistos
      query = await pool.query(`
        SELECT 
          u.id, u.nombre, u.foto_url, u.vibe, u.edad,
          p.ultima_actividad
        FROM presencias p
        JOIN usuarios u ON u.id = p.usuario_id
        WHERE p.sesion_id = $1
          AND p.activa = true
          AND p.usuario_id != $2
          AND p.usuario_id NOT IN (
            SELECT a_usuario FROM likes 
            WHERE de_usuario = $2 AND sesion_id = $1
          )
        ORDER BY p.entro_en DESC
      `, [req.params.sesion_id, req.usuario.id]);
    }

    res.json(query.rows);
  } catch (err) {
    console.error('Error al traer perfiles:', err);
    res.status(500).json({ error: 'Error interno' });
  }
});

// ── POST /sesiones/actividad ─────────────────────────────────────────
router.post('/actividad', authUsuario, async (req, res) => {
  const { sesion_id } = req.body;
  try {
    await pool.query(
      'UPDATE presencias SET ultima_actividad = NOW() WHERE usuario_id = $1 AND sesion_id = $2',
      [req.usuario.id, sesion_id]
    );
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: 'Error interno' });
  }
});

// ── POST /sesiones (admin del local) ────────────────────────────────
router.post('/', authAdmin, async (req, res) => {
  const { negocio_id, nombre } = req.body;
  const codigo_qr = uuidv4().substring(0, 8).toUpperCase();

  try {
    await pool.query(
      'UPDATE sesiones_noche SET activa = false, cerrada_en = NOW() WHERE negocio_id = $1 AND activa = true',
      [negocio_id]
    );

    const result = await pool.query(`
      INSERT INTO sesiones_noche (negocio_id, nombre, codigo_qr)
      VALUES ($1, $2, $3)
      RETURNING *
    `, [negocio_id, nombre || `Noche del ${new Date().toLocaleDateString('es-AR')}`, codigo_qr]);

    res.status(201).json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Error interno' });
  }
});

// ── DELETE /sesiones/:id (admin del local) ────────────────────────────
router.delete('/:id', authAdmin, async (req, res) => {
  try {
    await pool.query(
      'UPDATE sesiones_noche SET activa = false, cerrada_en = NOW() WHERE id = $1',
      [req.params.id]
    );
    await pool.query(
      'UPDATE presencias SET activa = false WHERE sesion_id = $1',
      [req.params.id]
    );
    res.json({ ok: true, mensaje: 'Sesión cerrada. Buenas noches!' });
  } catch (err) {
    res.status(500).json({ error: 'Error interno' });
  }
});

module.exports = router;
