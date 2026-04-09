// ================================================
//   CÓRDOBA NOCTURNA — Rutas de Pádel Connect
//   Matchmaking, reservas, ranking, reseñas
//   Sincronizado con BD real - Fase 1
// ================================================

const express = require('express');
const router = express.Router();
const { pool } = require('../database');
const { authAdmin } = require('../middleware/auth');

// ════════════════════════════════════════════════
//   JUGADORES
// ════════════════════════════════════════════════

// GET /padel/jugadores/mi-perfil
router.get('/jugadores/mi-perfil', async (req, res) => {
  const { usuario_id } = req.query;
  if (!usuario_id) return res.status(400).json({ error: 'usuario_id requerido' });
  try {
    const result = await pool.query(
      'SELECT * FROM jugadores_padel WHERE usuario_id = $1',
      [usuario_id]
    );
    if (result.rows.length === 0) return res.json({ tiene_perfil: false });
    res.json({ tiene_perfil: true, perfil: result.rows[0] });
  } catch (err) {
    console.error('GET /padel/jugadores/mi-perfil:', err);
    res.status(500).json({ error: 'Error interno' });
  }
});

// GET /padel/jugadores — matchmaking
router.get('/jugadores', async (req, res) => {
  const { nivel, zona, excluir_id } = req.query;
  const NIVELES = ['octava','septima','sexta','quinta','cuarta','tercera','segunda','primera'];
  try {
    let conditions = ['j.activo = true'];
    let params = [];
    let idx = 1;
    if (zona) {
      conditions.push(`j.zona ILIKE $${idx++}`);
      params.push(`%${zona}%`);
    }
    if (excluir_id) {
      conditions.push(`j.usuario_id != $${idx++}`);
      params.push(excluir_id);
    }
    const where = 'WHERE ' + conditions.join(' AND ');
    const result = await pool.query(`
      SELECT
        j.id, j.usuario_id, j.nombre, j.nivel, j.zona,
        j.foto_url, j.descripcion, j.ranking_puntos,
        j.partidos_jugados, j.victorias,
        ROUND(j.promedio_resenas::numeric, 1) AS promedio_resenas,
        j.total_resenas, u.edad, u.vibe
      FROM jugadores_padel j
      LEFT JOIN usuarios u ON u.id = j.usuario_id
      ${where}
      ORDER BY j.ranking_puntos DESC
    `, params);
    let jugadores = result.rows;
    if (nivel && NIVELES.includes(nivel)) {
      const idxNivel = NIVELES.indexOf(nivel);
      jugadores = jugadores.sort((a, b) => {
        const da = Math.abs(NIVELES.indexOf(a.nivel) - idxNivel);
        const db = Math.abs(NIVELES.indexOf(b.nivel) - idxNivel);
        return da - db;
      });
    }
    res.json(jugadores);
  } catch (err) {
    console.error('GET /padel/jugadores:', err);
    res.status(500).json({ error: 'Error interno' });
  }
});

// POST /padel/jugadores — crear/actualizar perfil
router.post('/jugadores', async (req, res) => {
  const { usuario_id, nombre, nivel, zona, foto_url, descripcion } = req.body;
  if (!usuario_id || !nombre || !nivel || !zona) {
    return res.status(400).json({ error: 'usuario_id, nombre, nivel y zona son requeridos' });
  }
  const nivelesValidos = ['octava','septima','sexta','quinta','cuarta','tercera','segunda','primera'];
  if (!nivelesValidos.includes(nivel)) {
    return res.status(400).json({ error: `Nivel inválido. Opciones: ${nivelesValidos.join(', ')}` });
  }
  try {
    const result = await pool.query(`
      INSERT INTO jugadores_padel (usuario_id, nombre, nivel, zona, foto_url, descripcion)
      VALUES ($1, $2, $3, $4, $5, $6)
      ON CONFLICT (usuario_id) DO UPDATE SET
        nombre         = EXCLUDED.nombre,
        nivel          = EXCLUDED.nivel,
        zona           = EXCLUDED.zona,
        foto_url       = COALESCE(EXCLUDED.foto_url, jugadores_padel.foto_url),
        descripcion    = COALESCE(EXCLUDED.descripcion, jugadores_padel.descripcion),
        actualizado_en = NOW()
      RETURNING *
    `, [usuario_id, nombre, nivel, zona, foto_url, descripcion]);
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error('POST /padel/jugadores:', err);
    res.status(500).json({ error: 'Error interno' });
  }
});

// ════════════════════════════════════════════════
//   RESEÑAS
// ════════════════════════════════════════════════

// POST /padel/resenas
router.post('/resenas', async (req, res) => {
  const { de_jugador_id, a_jugador_id, puntuacion, comentario } = req.body;
  if (!de_jugador_id || !a_jugador_id || !puntuacion)
    return res.status(400).json({ error: 'de_jugador_id, a_jugador_id y puntuacion son requeridos' });
  if (puntuacion < 1 || puntuacion > 5)
    return res.status(400).json({ error: 'La puntuación debe estar entre 1 y 5' });
  if (de_jugador_id === a_jugador_id)
    return res.status(400).json({ error: 'No podés reseñarte a vos mismo' });

  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const resena = await client.query(`
      INSERT INTO resenas_padel (de_jugador_id, a_jugador_id, puntuacion, comentario)
      VALUES ($1, $2, $3, $4)
      ON CONFLICT (de_jugador_id, a_jugador_id) DO UPDATE SET
        puntuacion = EXCLUDED.puntuacion,
        comentario = EXCLUDED.comentario,
        creado_en  = NOW()
      RETURNING *
    `, [de_jugador_id, a_jugador_id, puntuacion, comentario]);

    await client.query(`
      UPDATE jugadores_padel SET
        promedio_resenas = (SELECT ROUND(AVG(puntuacion)::numeric, 2) FROM resenas_padel WHERE a_jugador_id = $1),
        total_resenas    = (SELECT COUNT(*) FROM resenas_padel WHERE a_jugador_id = $1)
      WHERE id = $1
    `, [a_jugador_id]);

    await client.query('COMMIT');
    res.status(201).json(resena.rows[0]);
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('POST /padel/resenas:', err);
    res.status(500).json({ error: 'Error interno' });
  } finally {
    client.release();
  }
});

// GET /padel/resenas/:id
router.get('/resenas/:id', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT
        r.id, r.puntuacion, r.comentario, r.creado_en,
        j.nombre AS de_nombre, j.nivel AS de_nivel, j.foto_url AS de_foto
      FROM resenas_padel r
      JOIN jugadores_padel j ON j.id = r.de_jugador_id
      WHERE r.a_jugador_id = $1
      ORDER BY r.creado_en DESC
    `, [req.params.id]);
    res.json(result.rows);
  } catch (err) {
    console.error('GET /padel/resenas/:id:', err);
    res.status(500).json({ error: 'Error interno' });
  }
});

// ════════════════════════════════════════════════
//   CANCHAS Y DISPONIBILIDAD
// ════════════════════════════════════════════════

// GET /padel/canchas
router.get('/canchas', async (req, res) => {
  const { zona } = req.query;
  try {
    let query = `
      SELECT DISTINCT
        n.id, n.nombre, n.slug, n.logo_url, n.descripcion,
        n.whatsapp, n.dueno_tel,
        MIN(d.precio_por_hora) AS precio_desde,
        d.zona AS zona_cancha,
        COUNT(d.id) AS turnos_configurados
      FROM negocios n
      JOIN disponibilidad_padel d ON d.negocio_id = n.id
      WHERE n.activo = true AND n.tipo = 'padel' AND d.activo = true
    `;
    const params = [];
    if (zona) {
      query += ` AND d.zona ILIKE $1`;
      params.push(`%${zona}%`);
    }
    query += ` GROUP BY n.id, n.nombre, n.slug, n.logo_url, n.descripcion, n.whatsapp, n.dueno_tel, d.zona
               ORDER BY n.nombre ASC`;
    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (err) {
    console.error('GET /padel/canchas:', err);
    res.status(500).json({ error: 'Error interno' });
  }
});

// GET /padel/disponibilidad/:id
router.get('/disponibilidad/:id', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT * FROM disponibilidad_padel
      WHERE negocio_id = $1 AND activo = true
      ORDER BY dia_semana ASC, hora_inicio ASC
    `, [req.params.id]);
    res.json(result.rows);
  } catch (err) {
    console.error('GET /padel/disponibilidad/:id:', err);
    res.status(500).json({ error: 'Error interno' });
  }
});

// POST /padel/disponibilidad
router.post('/disponibilidad', authAdmin, async (req, res) => {
  const { negocio_id, dia_semana, hora_inicio, hora_fin, precio_por_hora, cantidad_canchas, zona, numero_cancha } = req.body;
  if (!negocio_id || dia_semana === undefined || !hora_inicio || !hora_fin || !precio_por_hora)
    return res.status(400).json({ error: 'negocio_id, dia_semana, hora_inicio, hora_fin y precio_por_hora son requeridos' });
  try {
    const result = await pool.query(`
      INSERT INTO disponibilidad_padel
        (negocio_id, dia_semana, hora_inicio, hora_fin, precio_por_hora, cantidad_canchas, zona, numero_cancha)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING *
    `, [negocio_id, dia_semana, hora_inicio, hora_fin, precio_por_hora, cantidad_canchas || 1, zona, numero_cancha || 1]);
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error('POST /padel/disponibilidad:', err);
    res.status(500).json({ error: 'Error interno' });
  }
});

// PUT /padel/disponibilidad/:id
router.put('/disponibilidad/:id', authAdmin, async (req, res) => {
  const { hora_inicio, hora_fin, precio_por_hora, cantidad_canchas, activo } = req.body;
  try {
    const result = await pool.query(`
      UPDATE disponibilidad_padel SET
        hora_inicio      = COALESCE($1, hora_inicio),
        hora_fin         = COALESCE($2, hora_fin),
        precio_por_hora  = COALESCE($3, precio_por_hora),
        cantidad_canchas = COALESCE($4, cantidad_canchas),
        activo           = COALESCE($5, activo)
      WHERE id = $6
      RETURNING *
    `, [hora_inicio, hora_fin, precio_por_hora, cantidad_canchas, activo, req.params.id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Horario no encontrado' });
    res.json(result.rows[0]);
  } catch (err) {
    console.error('PUT /padel/disponibilidad/:id:', err);
    res.status(500).json({ error: 'Error interno' });
  }
});

// GET /padel/turnos-disponibles
router.get('/turnos-disponibles', async (req, res) => {
  const { negocio_id, fecha } = req.query;
  if (!negocio_id || !fecha)
    return res.status(400).json({ error: 'negocio_id y fecha son requeridos' });
  try {
    const fechaObj = new Date(fecha + 'T00:00:00');
    const diaSemana = fechaObj.getDay();

    const disponibles = await pool.query(`
      SELECT * FROM disponibilidad_padel
      WHERE negocio_id = $1 AND dia_semana = $2 AND activo = true
    `, [negocio_id, diaSemana]);

    const reservadas = await pool.query(`
      SELECT disponibilidad_id FROM reservas_padel
      WHERE negocio_id = $1 AND fecha = $2 AND estado != 'rechazado'
    `, [negocio_id, fecha]);

    const idsReservados = reservadas.rows.map(r => r.disponibilidad_id);
    const libres = disponibles.rows.filter(turno => {
      const tomados = idsReservados.filter(id => id === turno.id).length;
      return tomados < turno.cantidad_canchas;
    });

    res.json(libres);
  } catch (err) {
    console.error('GET /padel/turnos-disponibles:', err);
    res.status(500).json({ error: 'Error interno' });
  }
});

// ════════════════════════════════════════════════
//   RESERVAS
// ════════════════════════════════════════════════

// POST /padel/reservas — Fase 1: confirmación automática + notif WhatsApp
router.post('/reservas', async (req, res) => {
  const { jugador_id, negocio_id, disponibilidad_id, fecha, notas } = req.body;

  if (!jugador_id || !negocio_id || !disponibilidad_id || !fecha)
    return res.status(400).json({ error: 'jugador_id, negocio_id, disponibilidad_id y fecha son requeridos' });

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const turno = await client.query(
      'SELECT * FROM disponibilidad_padel WHERE id = $1 AND activo = true FOR UPDATE',
      [disponibilidad_id]
    );
    if (turno.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Turno no encontrado o inactivo' });
    }

    const reservasExistentes = await client.query(
      "SELECT COUNT(*) FROM reservas_padel WHERE disponibilidad_id = $1 AND fecha = $2 AND estado != 'rechazado'",
      [disponibilidad_id, fecha]
    );
    if (parseInt(reservasExistentes.rows[0].count) >= turno.rows[0].cantidad_canchas) {
      await client.query('ROLLBACK');
      return res.status(409).json({ error: 'No hay canchas disponibles para ese turno' });
    }

    const t = turno.rows[0];

    const jugadorPerfil = await client.query(
      'SELECT usuario_id, nombre FROM jugadores_padel WHERE id = $1',
      [jugador_id]
    );
    if (jugadorPerfil.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Jugador no encontrado' });
    }
    const usuarioIdReal = jugadorPerfil.rows[0].usuario_id;
    const nombreJugador = jugadorPerfil.rows[0].nombre || 'N/A';

    const negocioData = await client.query(
      'SELECT nombre, whatsapp, dueno_tel FROM negocios WHERE id = $1',
      [negocio_id]
    );
    const n = negocioData.rows[0] || {};
    const telClub = (n.whatsapp || n.dueno_tel || '').replace(/\D/g, '');
    const horaInicio = (t.hora_inicio || '').substring(0, 5);
    const horaFin    = (t.hora_fin    || '').substring(0, 5);
    const precioTotal = t.precio_por_hora;
    const comision = Math.round(parseFloat(precioTotal) * 0.10);

    let whatsapp_club = null;
    if (telClub) {
      const msgTexto = '🎾 *Nueva reserva confirmada*\n\n'
        + '👤 Jugador: ' + nombreJugador + '\n'
        + '📅 Fecha: ' + fecha + '\n'
        + '🕐 Horario: ' + horaInicio + ' - ' + horaFin + '\n'
        + '🏟️ Cancha N°' + (t.numero_cancha || 1) + '\n'
        + '💰 $' + precioTotal + '\n\n'
        + 'Ver reservas: https://cordobalux.com/negocio.html';
      whatsapp_club = 'https://wa.me/' + telClub + '?text=' + encodeURIComponent(msgTexto);
    }

    const result = await client.query(
      'INSERT INTO reservas_padel (negocio_id, usuario_id, disponibilidad_id, fecha, hora_inicio, hora_fin, precio_cobrado, estado, numero_cancha, whatsapp_club, notas) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11) RETURNING *',
      [negocio_id, usuarioIdReal, disponibilidad_id, fecha, String(t.hora_inicio), String(t.hora_fin), parseFloat(precioTotal), 'confirmado', parseInt(t.numero_cancha) || 1, whatsapp_club, notas || null]
    );

    await client.query('COMMIT');

    res.status(201).json({
      ...result.rows[0],
      comision_plataforma: comision,
      whatsapp_club
    });

  } catch (err) {
    await client.query('ROLLBACK');
    console.error('POST /padel/reservas:', err.message, err.detail);
    res.status(500).json({ error: 'Error interno', detalle: err.message });
  } finally {
    client.release();
  }
});

// GET /padel/reservas/mis-reservas
router.get('/reservas/mis-reservas', async (req, res) => {
  const { jugador_id } = req.query;
  if (!jugador_id) return res.status(400).json({ error: 'jugador_id es requerido' });
  try {
    const result = await pool.query(`
      SELECT
        r.*,
        n.nombre    AS club_nombre,
        n.logo_url  AS club_logo,
        n.whatsapp  AS club_whatsapp,
        d.zona      AS zona_cancha
      FROM reservas_padel r
      JOIN negocios n ON n.id = r.negocio_id
      JOIN disponibilidad_padel d ON d.id = r.disponibilidad_id
      WHERE r.usuario_id = $1
      ORDER BY r.fecha DESC, r.hora_inicio ASC
    `, [jugador_id]);
    res.json(result.rows);
  } catch (err) {
    console.error('GET /padel/reservas/mis-reservas:', err);
    res.status(500).json({ error: 'Error interno' });
  }
});

// GET /padel/reservas/del-club
router.get('/reservas/del-club', authAdmin, async (req, res) => {
  const { negocio_id, fecha } = req.query;
  if (!negocio_id) return res.status(400).json({ error: 'negocio_id es requerido' });
  try {
    let query = `
      SELECT
        r.*,
        j.nombre   AS jugador_nombre,
        j.nivel    AS jugador_nivel,
        j.foto_url AS jugador_foto,
        d.zona     AS zona_cancha
      FROM reservas_padel r
      JOIN jugadores_padel j ON j.id = r.usuario_id
      JOIN disponibilidad_padel d ON d.id = r.disponibilidad_id
      WHERE r.negocio_id = $1
    `;
    const params = [negocio_id];
    if (fecha) {
      query += ` AND r.fecha = $2`;
      params.push(fecha);
    }
    query += ` ORDER BY r.fecha DESC, r.hora_inicio ASC`;
    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (err) {
    console.error('GET /padel/reservas/del-club:', err);
    res.status(500).json({ error: 'Error interno' });
  }
});

// PUT /padel/reservas/:id — Fase 2 (por ahora solo para emergencias)
router.put('/reservas/:id', authAdmin, async (req, res) => {
  const { estado, motivo_rechazo } = req.body;
  if (!estado || !['confirmado','rechazado'].includes(estado))
    return res.status(400).json({ error: 'estado debe ser "confirmado" o "rechazado"' });
  try {
    const result = await pool.query(`
      UPDATE reservas_padel SET
        estado     = $1,
        notas      = CASE WHEN $1 = 'rechazado' THEN $2 ELSE notas END
      WHERE id = $3
      RETURNING *
    `, [estado, motivo_rechazo, req.params.id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Reserva no encontrada' });
    res.json(result.rows[0]);
  } catch (err) {
    console.error('PUT /padel/reservas/:id:', err);
    res.status(500).json({ error: 'Error interno' });
  }
});

// ════════════════════════════════════════════════
//   RANKING
// ════════════════════════════════════════════════

// GET /padel/ranking
router.get('/ranking', async (req, res) => {
  const { nivel, zona, limite } = req.query;
  try {
    let conditions = ['j.activo = true'];
    let params = [];
    let idx = 1;
    if (nivel) { conditions.push(`j.nivel = $${idx++}`); params.push(nivel); }
    if (zona)  { conditions.push(`j.zona ILIKE $${idx++}`); params.push(`%${zona}%`); }
    const where = 'WHERE ' + conditions.join(' AND ');
    const limit = parseInt(limite) || 50;
    params.push(limit);
    const result = await pool.query(`
      SELECT
        ROW_NUMBER() OVER (ORDER BY j.ranking_puntos DESC) AS posicion,
        j.id, j.nombre, j.nivel, j.zona, j.foto_url,
        j.ranking_puntos, j.partidos_jugados, j.victorias,
        ROUND(j.promedio_resenas::numeric, 1) AS promedio_resenas
      FROM jugadores_padel j
      ${where}
      ORDER BY j.ranking_puntos DESC
      LIMIT $${idx}
    `, params);
    res.json(result.rows);
  } catch (err) {
    console.error('GET /padel/ranking:', err);
    res.status(500).json({ error: 'Error interno' });
  }
});

module.exports = router;
