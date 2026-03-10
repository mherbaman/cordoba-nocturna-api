// ================================================
//   CÓRDOBA NOCTURNA — Rutas de likes y matches
// ================================================

const express = require('express');
const router = express.Router();
const { pool } = require('../database');
const { authUsuario } = require('../middleware/auth');

// ── POST /matches/like ───────────────────────────────────────────────
// Usuario le da like a otro
// Si el otro ya le había dado like → MATCH automático
router.post('/like', authUsuario, async (req, res) => {
  const { a_usuario_id, sesion_id, es_super } = req.body;

  if (!a_usuario_id || !sesion_id) {
    return res.status(400).json({ error: 'Faltan datos' });
  }

  try {
    // Guardar el like
    await pool.query(`
      INSERT INTO likes (de_usuario, a_usuario, sesion_id, es_super)
      VALUES ($1, $2, $3, $4)
      ON CONFLICT DO NOTHING
    `, [req.usuario.id, a_usuario_id, sesion_id, es_super || false]);

    // ¿El otro ya me había dado like? → MATCH!
    const likeRecipro = await pool.query(`
      SELECT id FROM likes 
      WHERE de_usuario = $1 AND a_usuario = $2 AND sesion_id = $3
    `, [a_usuario_id, req.usuario.id, sesion_id]);

    if (likeRecipro.rows.length > 0) {
      // Obtener el negocio_id de la sesión
      const sesion = await pool.query(
        'SELECT negocio_id FROM sesiones_noche WHERE id = $1',
        [sesion_id]
      );

      // Crear el match (evitar duplicados)
      const matchExiste = await pool.query(`
        SELECT id FROM matches 
        WHERE sesion_id = $1
        AND ((usuario_1 = $2 AND usuario_2 = $3) OR (usuario_1 = $3 AND usuario_2 = $2))
      `, [sesion_id, req.usuario.id, a_usuario_id]);

      if (matchExiste.rows.length === 0) {
        await pool.query(`
          INSERT INTO matches (usuario_1, usuario_2, sesion_id, negocio_id)
          VALUES ($1, $2, $3, $4)
        `, [req.usuario.id, a_usuario_id, sesion_id, sesion.rows[0].negocio_id]);

        // Actualizar contador de matches en la sesión
        await pool.query(`
          UPDATE sesiones_noche 
          SET total_matches = total_matches + 1
          WHERE id = $1
        `, [sesion_id]);
      }

      // Traer datos del match para mostrárselos al usuario
      const matchData = await pool.query(`
        SELECT id, nombre, foto_url, vibe, edad
        FROM usuarios WHERE id = $1
      `, [a_usuario_id]);

      return res.json({
        es_match: true,
        match_con: matchData.rows[0]
      });
    }

    res.json({ es_match: false });

  } catch (err) {
    console.error('Error en like:', err);
    res.status(500).json({ error: 'Error interno' });
  }
});

// ── GET /matches/mis-matches ─────────────────────────────────────────
// Ver todos mis matches (histórico de todas las noches)
router.get('/mis-matches', authUsuario, async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT 
        m.id,
        m.creado_en,
        n.nombre as negocio_nombre,
        n.tipo as negocio_tipo,
        s.nombre as sesion_nombre,
        -- Datos del otro usuario
        CASE WHEN m.usuario_1 = $1 THEN u2.id ELSE u1.id END as otro_id,
        CASE WHEN m.usuario_1 = $1 THEN u2.nombre ELSE u1.nombre END as otro_nombre,
        CASE WHEN m.usuario_1 = $1 THEN u2.foto_url ELSE u1.foto_url END as otro_foto,
        CASE WHEN m.usuario_1 = $1 THEN u2.vibe ELSE u1.vibe END as otro_vibe
      FROM matches m
      JOIN usuarios u1 ON u1.id = m.usuario_1
      JOIN usuarios u2 ON u2.id = m.usuario_2
      JOIN sesiones_noche s ON s.id = m.sesion_id
      JOIN negocios n ON n.id = m.negocio_id
      WHERE m.usuario_1 = $1 OR m.usuario_2 = $1
      ORDER BY m.creado_en DESC
    `, [req.usuario.id]);

    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: 'Error interno' });
  }
});

module.exports = router;
