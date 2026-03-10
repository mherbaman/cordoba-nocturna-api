// ================================================
//   CÓRDOBA NOCTURNA — Rutas de mensajes
//   Chat privado entre matches
//   - Tiempo real via Socket.io
//   - Solo texto y emojis (sin fotos)
//   - Se borran automáticamente a los 8 días
// ================================================

const express = require('express');
const router = express.Router();
const { pool } = require('../database');
const { authUsuario } = require('../middleware/auth');

// ── POST /mensajes/:match_id ─────────────────────────────────────────
// Enviar un mensaje
router.post('/:match_id', authUsuario, async (req, res) => {
  const { texto } = req.body;
  const { match_id } = req.params;

  if (!texto || texto.trim() === '') {
    return res.status(400).json({ error: 'El mensaje no puede estar vacío' });
  }

  if (texto.length > 500) {
    return res.status(400).json({ error: 'El mensaje no puede superar los 500 caracteres' });
  }

  try {
    // Verificar que el match existe y el usuario es parte de él
    const match = await pool.query(`
      SELECT * FROM matches 
      WHERE id = $1 AND (usuario_1 = $2 OR usuario_2 = $2)
    `, [match_id, req.usuario.id]);

    if (match.rows.length === 0) {
      return res.status(403).json({ error: 'No tenés acceso a este chat' });
    }

    // Guardar el mensaje — expira en 8 días
    const result = await pool.query(`
      INSERT INTO mensajes (match_id, de_usuario, texto, expira_en)
      VALUES ($1, $2, $3, NOW() + INTERVAL '8 days')
      RETURNING *
    `, [match_id, req.usuario.id, texto.trim()]);

    const mensaje = result.rows[0];

    // Emitir al otro usuario en tiempo real via Socket.io
    const otroUsuario = match.rows[0].usuario_1 === req.usuario.id
      ? match.rows[0].usuario_2
      : match.rows[0].usuario_1;

    const io = req.app.get('io');
    if (io) {
      io.to(`usuario_${otroUsuario}`).emit('mensaje_nuevo', {
        match_id,
        mensaje: {
          id: mensaje.id,
          de_usuario: req.usuario.id,
          de_nombre: req.usuario.nombre,
          texto: mensaje.texto,
          creado_en: mensaje.creado_en,
          expira_en: mensaje.expira_en
        }
      });
    }

    res.status(201).json(mensaje);

  } catch (err) {
    console.error('Error enviando mensaje:', err);
    res.status(500).json({ error: 'Error interno' });
  }
});

// ── GET /mensajes/:match_id ──────────────────────────────────────────
// Ver toda la conversación
router.get('/:match_id', authUsuario, async (req, res) => {
  const { match_id } = req.params;

  try {
    // Verificar acceso
    const match = await pool.query(`
      SELECT * FROM matches 
      WHERE id = $1 AND (usuario_1 = $2 OR usuario_2 = $2)
    `, [match_id, req.usuario.id]);

    if (match.rows.length === 0) {
      return res.status(403).json({ error: 'No tenés acceso a este chat' });
    }

    // Traer mensajes no expirados
    const mensajes = await pool.query(`
      SELECT 
        m.id,
        m.de_usuario,
        m.texto,
        m.leido,
        m.creado_en,
        m.expira_en,
        u.nombre as de_nombre,
        u.foto_url as de_foto
      FROM mensajes m
      JOIN usuarios u ON u.id = m.de_usuario
      WHERE m.match_id = $1
        AND m.expira_en > NOW()
      ORDER BY m.creado_en ASC
    `, [match_id]);

    // Marcar como leídos los mensajes del otro
    await pool.query(`
      UPDATE mensajes 
      SET leido = true 
      WHERE match_id = $1 
        AND de_usuario != $2
        AND leido = false
    `, [match_id, req.usuario.id]);

    res.json(mensajes.rows);

  } catch (err) {
    console.error('Error trayendo mensajes:', err);
    res.status(500).json({ error: 'Error interno' });
  }
});

// ── GET /mensajes/no-leidos/total ────────────────────────────────────
// Badge de mensajes no leídos
router.get('/no-leidos/total', authUsuario, async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT COUNT(*) as total
      FROM mensajes m
      JOIN matches mt ON mt.id = m.match_id
      WHERE (mt.usuario_1 = $1 OR mt.usuario_2 = $1)
        AND m.de_usuario != $1
        AND m.leido = false
        AND m.expira_en > NOW()
    `, [req.usuario.id]);

    res.json({ no_leidos: parseInt(result.rows[0].total) });
  } catch (err) {
    res.status(500).json({ error: 'Error interno' });
  }
});

module.exports = router;
