// ================================================
//   CÓRDOBA NOCTURNA — Rutas de Pádel Connect
//   Matchmaking, reservas, ranking, reseñas
// ================================================

const express = require('express');
const router = express.Router();
const { pool } = require('../database');
const { authAdmin } = require('../middleware/auth');

// ════════════════════════════════════════════════
//   JUGADORES
// ════════════════════════════════════════════════

// ── GET /padel/jugadores/mi-perfil ──────────────────────────────────────
// Verificar si el usuario logueado tiene perfil de jugador
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

// ── GET /padel/jugadores ─────────────────────────────────────────────
// Matchmaking: lista jugadores filtrando por nivel, zona, disponibilidad
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

// ── POST /padel/jugadores ────────────────────────────────────────────
// Crear o actualizar perfil de jugador
router.post('/jugadores', async (req, res) => {
  const {
    usuario_id, nombre, nivel, zona, foto_url, descripcion
  } = req.body;

  if (!usuario_id || !nombre || !nivel || !zona) {
    return res.status(400).json({ error: 'usuario_id, nombre, nivel y zona son requeridos' });
  }

  const nivelesValidos = ['octava', 'septima', 'sexta', 'quinta', 'cuarta', 'tercera', 'segunda', 'primera'];
  if (!nivelesValidos.includes(nivel)) {
    return res.status(400).json({ error: `Nivel inválido. Opciones: ${nivelesValidos.join(', ')}` });
  }

  try {
    const result = await pool.query(`
      INSERT INTO jugadores_padel (usuario_id, nombre, nivel, zona, foto_url, descripcion)
      VALUES ($1, $2, $3, $4, $5, $6)
      ON CONFLICT (usuario_id) DO UPDATE SET
        nombre      = EXCLUDED.nombre,
        nivel       = EXCLUDED.nivel,
        zona        = EXCLUDED.zona,
        foto_url    = COALESCE(EXCLUDED.foto_url, jugadores_padel.foto_url),
        descripcion = COALESCE(EXCLUDED.descripcion, jugadores_padel.descripcion),
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

// ── POST /padel/resenas ──────────────────────────────────────────────
// Dejar reseña a un jugador tras un partido
router.post('/resenas', async (req, res) => {
  const { de_jugador_id, a_jugador_id, puntuacion, comentario } = req.body;

  if (!de_jugador_id || !a_jugador_id || !puntuacion) {
    return res.status(400).json({ error: 'de_jugador_id, a_jugador_id y puntuacion son requeridos' });
  }
  if (puntuacion < 1 || puntuacion > 5) {
    return res.status(400).json({ error: 'La puntuación debe estar entre 1 y 5' });
  }
  if (de_jugador_id === a_jugador_id) {
    return res.status(400).json({ error: 'No podés reseñarte a vos mismo' });
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Insertar reseña
    const resena = await client.query(`
      INSERT INTO resenas_padel (de_jugador_id, a_jugador_id, puntuacion, comentario)
      VALUES ($1, $2, $3, $4)
      ON CONFLICT (de_jugador_id, a_jugador_id) DO UPDATE SET
        puntuacion  = EXCLUDED.puntuacion,
        comentario  = EXCLUDED.comentario,
        creado_en   = NOW()
      RETURNING *
    `, [de_jugador_id, a_jugador_id, puntuacion, comentario]);

    // Recalcular promedio del jugador reseñado
    await client.query(`
      UPDATE jugadores_padel SET
        promedio_resenas = (
          SELECT ROUND(AVG(puntuacion)::numeric, 2)
          FROM resenas_padel
          WHERE a_jugador_id = $1
        ),
        total_resenas = (
          SELECT COUNT(*) FROM resenas_padel WHERE a_jugador_id = $1
        )
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

// ── GET /padel/resenas/:id ───────────────────────────────────────────
// Ver reseñas recibidas por un jugador
router.get('/resenas/:id', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT
        r.id,
        r.puntuacion,
        r.comentario,
        r.creado_en,
        j.nombre AS de_nombre,
        j.nivel  AS de_nivel,
        j.foto_url AS de_foto
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

// ── GET /padel/canchas ───────────────────────────────────────────────
// Clubs con disponibilidad activa (para el jugador que busca cancha)
router.get('/canchas', async (req, res) => {
  const { zona } = req.query;
  try {
    let query = `
      SELECT DISTINCT
        n.id,
        n.nombre,
        n.slug,
        n.logo_url,
        n.descripcion,
        d.precio_por_hora,
        d.zona AS zona_cancha,
        COUNT(d.id) AS turnos_disponibles
      FROM negocios n
      JOIN disponibilidad_padel d ON d.negocio_id = n.id
      WHERE n.activo = true
        AND n.tipo = 'padel'
        AND d.activo = true
    `;
    const params = [];

    if (zona) {
      query += ` AND d.zona ILIKE $1`;
      params.push(`%${zona}%`);
    }

    query += ` GROUP BY n.id, n.nombre, n.slug, n.logo_url, n.descripcion, d.precio_por_hora, d.zona
               ORDER BY n.nombre ASC`;

    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (err) {
    console.error('GET /padel/canchas:', err);
    res.status(500).json({ error: 'Error interno' });
  }
});

// ── GET /padel/disponibilidad/:id ────────────────────────────────────
// Horarios configurados por un club
router.get('/disponibilidad/:id', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT *
      FROM disponibilidad_padel
      WHERE negocio_id = $1 AND activo = true
      ORDER BY dia_semana ASC, hora_inicio ASC
    `, [req.params.id]);

    res.json(result.rows);
  } catch (err) {
    console.error('GET /padel/disponibilidad/:id:', err);
    res.status(500).json({ error: 'Error interno' });
  }
});

// ── POST /padel/disponibilidad ───────────────────────────────────────
// El club carga un horario disponible
router.post('/disponibilidad', authAdmin, async (req, res) => {

  const { negocio_id, dia_semana, hora_inicio, hora_fin, precio_por_hora, cantidad_canchas, zona, numero_cancha } = req.body;
  if (!negocio_id || dia_semana === undefined || !hora_inicio || !hora_fin || !precio_por_hora) {
    return res.status(400).json({ error: 'negocio_id, dia_semana, hora_inicio, hora_fin y precio_por_hora son requeridos' });
  }

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

// ── PUT /padel/disponibilidad/:id ────────────────────────────────────
// El club modifica un horario existente
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

// ── GET /padel/turnos-disponibles ────────────────────────────────────
// Turnos libres para una fecha y club específico
router.get('/turnos-disponibles', async (req, res) => {
  const { negocio_id, fecha } = req.query;

  if (!negocio_id || !fecha) {
    return res.status(400).json({ error: 'negocio_id y fecha son requeridos' });
  }

  try {
    const fechaObj = new Date(fecha);
    const diaSemana = fechaObj.getDay(); // 0=domingo, 6=sábado

    // Turnos configurados para ese día
    const disponibles = await pool.query(`
      SELECT d.*
      FROM disponibilidad_padel d
      WHERE d.negocio_id = $1
        AND d.dia_semana = $2
        AND d.activo = true
    `, [negocio_id, diaSemana]);

    // Reservas ya tomadas en esa fecha
    const reservadas = await pool.query(`
      SELECT disponibilidad_id
      FROM reservas_padel
      WHERE negocio_id = $1
        AND fecha = $2
        AND estado != 'rechazado'
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

// ── POST /padel/reservas ─────────────────────────────────────────────
// El jugador reserva una cancha
router.post('/reservas', async (req, res) => {
  const {
    jugador_id, negocio_id, disponibilidad_id,
    fecha, notas, telefono_contacto
  } = req.body;

  if (!jugador_id || !negocio_id || !disponibilidad_id || !fecha) {
    return res.status(400).json({ error: 'jugador_id, negocio_id, disponibilidad_id y fecha son requeridos' });
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Verificar que el turno sigue disponible
    const turno = await client.query(
      'SELECT * FROM disponibilidad_padel WHERE id = $1 AND activo = true FOR UPDATE',
      [disponibilidad_id]
    );
    if (turno.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Turno no encontrado o inactivo' });
    }

    const reservasExistentes = await client.query(`
      SELECT COUNT(*) FROM reservas_padel
      WHERE disponibilidad_id = $1 AND fecha = $2 AND estado != 'rechazado'
    `, [disponibilidad_id, fecha]);

    if (parseInt(reservasExistentes.rows[0].count) >= turno.rows[0].cantidad_canchas) {
      await client.query('ROLLBACK');
      return res.status(409).json({ error: 'No hay canchas disponibles para ese turno' });
    }

    // Calcular comisión (10%)
    const precioTotal = turno.rows[0].precio_por_hora;
    const comision = Math.round(precioTotal * 0.10);

    const result = await client.query(`
      INSERT INTO reservas_padel
        (jugador_id, negocio_id, disponibilidad_id, fecha, precio_total, comision_plataforma, notas, telefono_contacto, estado, numero_cancha)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'confirmado', $9)
      RETURNING *
    `, [jugador_id, negocio_id, disponibilidad_id, fecha, precioTotal, comision, notas, telefono_contacto, turno.rows[0].numero_cancha || 1]);

    // Datos del negocio para WhatsApp
    const negocio = await client.query('SELECT nombre, dueno_tel FROM negocios WHERE id = $1', [negocio_id]);
    const jugador = await client.query('SELECT nombre FROM jugadores_padel WHERE id = $1', [jugador_id]);

    await client.query('COMMIT');

    // Generar link WhatsApp para el club
    let whatsapp_club = null;
    if (negocio.rows[0]?.dueno_tel) {
      const tel = negocio.rows[0].dueno_tel.replace(/\D/g, '');
      const msg = encodeURIComponent(
        `🎾 *Nueva reserva confirmada*\n\n` +
        `👤 Jugador: ${jugador.rows[0]?.nombre || 'N/A'}\n` +
        `📅 Fecha: ${fecha}\n` +
        `🕐 Horario: ${turno.rows[0].hora_inicio.substring(0,5)} - ${turno.rows[0].hora_fin.substring(0,5)}\n` +
        `🏟️ Cancha N°${turno.rows[0].numero_cancha || 1}\n` +
        `💰 $${precioTotal}\n\n` +
        `Ver en panel: https://cordobalux.com/negocio.html`
      );
      whatsapp_club = `https://wa.me/${tel}?text=${msg}`;
    }

    res.status(201).json({ ...result.rows[0], whatsapp_club });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('POST /padel/reservas:', err);
    res.status(500).json({ error: 'Error interno' });
  } finally {
    client.release();
  }
});

// ── GET /padel/reservas/mis-reservas ─────────────────────────────────
// Reservas del jugador
router.get('/reservas/mis-reservas', async (req, res) => {
  const { jugador_id } = req.query;
  if (!jugador_id) return res.status(400).json({ error: 'jugador_id es requerido' });

  try {
    const result = await pool.query(`
      SELECT
        r.*,
        n.nombre AS club_nombre,
        n.logo_url AS club_logo,
        d.hora_inicio,
        d.hora_fin,
        d.zona AS zona_cancha
      FROM reservas_padel r
      JOIN negocios n ON n.id = r.negocio_id
      JOIN disponibilidad_padel d ON d.id = r.disponibilidad_id
      WHERE r.jugador_id = $1
      ORDER BY r.fecha DESC, d.hora_inicio ASC
    `, [jugador_id]);

    res.json(result.rows);
  } catch (err) {
    console.error('GET /padel/reservas/mis-reservas:', err);
    res.status(500).json({ error: 'Error interno' });
  }
});

// ── GET /padel/reservas/del-club ─────────────────────────────────────
// Reservas del club (panel negocio)
router.get('/reservas/del-club', authAdmin, async (req, res) => {
  const { negocio_id, fecha } = req.query;
  if (!negocio_id) return res.status(400).json({ error: 'negocio_id es requerido' });

  try {
    let query = `
      SELECT
        r.*,
        j.nombre AS jugador_nombre,
        j.nivel  AS jugador_nivel,
        j.foto_url AS jugador_foto,
        d.hora_inicio,
        d.hora_fin,
        d.zona AS zona_cancha
      FROM reservas_padel r
      JOIN jugadores_padel j ON j.id = r.jugador_id
      JOIN disponibilidad_padel d ON d.id = r.disponibilidad_id
      WHERE r.negocio_id = $1
    `;
    const params = [negocio_id];

    if (fecha) {
      query += ` AND r.fecha = $2`;
      params.push(fecha);
    }

    query += ` ORDER BY r.fecha DESC, d.hora_inicio ASC`;

    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (err) {
    console.error('GET /padel/reservas/del-club:', err);
    res.status(500).json({ error: 'Error interno' });
  }
});

// ── PUT /padel/reservas/:id ──────────────────────────────────────────
// El club confirma o rechaza una reserva
router.put('/reservas/:id', authAdmin, async (req, res) => {
  const { estado, motivo_rechazo } = req.body;

  if (!estado || !['confirmado', 'rechazado'].includes(estado)) {
    return res.status(400).json({ error: 'estado debe ser "confirmado" o "rechazado"' });
  }

  try {
    const result = await pool.query(`
      UPDATE reservas_padel SET
        estado           = $1,
        motivo_rechazo   = CASE WHEN $1 = 'rechazado' THEN $2 ELSE NULL END,
        respondido_en    = NOW()
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

// ── GET /padel/ranking ───────────────────────────────────────────────
// Ranking de jugadores por ciudad/nivel
router.get('/ranking', async (req, res) => {
  const { nivel, zona, limite } = req.query;
  try {
    let conditions = ['j.activo = true'];
    let params = [];
    let idx = 1;

    if (nivel) {
      conditions.push(`j.nivel = $${idx++}`);
      params.push(nivel);
    }
    if (zona) {
      conditions.push(`j.zona ILIKE $${idx++}`);
      params.push(`%${zona}%`);
    }

    const where = 'WHERE ' + conditions.join(' AND ');
    const limit = parseInt(limite) || 50;
    params.push(limit);

    const result = await pool.query(`
      SELECT
        ROW_NUMBER() OVER (ORDER BY j.ranking_puntos DESC) AS posicion,
        j.id,
        j.nombre,
        j.nivel,
        j.zona,
        j.foto_url,
        j.ranking_puntos,
        j.partidos_jugados,
        j.victorias,
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
