// ================================================
//   CÓRDOBA NOCTURNA — Rutas de Pádel Connect
//   Matchmaking, reservas, ranking, reseñas
// ================================================

const express = require('express');
const router = express.Router();
const { pool } = require('../database');
const { authAdmin, authUsuario } = require('../middleware/auth');
const webpush = require('web-push');

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
        AND (fecha_especifica IS NULL OR fecha_especifica::date >= CURRENT_DATE)
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

    // Turnos para ese día: con fecha exacta O recurrentes del mismo día
    const disponibles = await pool.query(`
      SELECT d.*
      FROM disponibilidad_padel d
      WHERE d.negocio_id = $1
        AND d.activo = true
        AND (
          (d.fecha_especifica::date = $3::date)
          OR
          (d.fecha_especifica IS NULL AND d.dia_semana = $2)
        )
        AND (d.fecha_especifica IS NULL OR d.fecha_especifica::date = $3::date)
    `, [negocio_id, diaSemana, fecha]);

    // Reservas ya tomadas en esa fecha
    const reservadas = await pool.query(`
      SELECT disponibilidad_id
      FROM reservas_padel
      WHERE negocio_id = $1
        AND fecha = $2
        AND estado != 'rechazado'
    `, [negocio_id, fecha]);

    const idsReservados = reservadas.rows.map(r => String(r.disponibilidad_id));

    const libres = disponibles.rows.filter(turno => {
      const tomados = idsReservados.filter(id => id === String(turno.id)).length;
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
// El jugador reserva una cancha — Fase 1: confirmación automática
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

    let jugadorPerfil = await client.query(
      'SELECT id, usuario_id, nombre FROM jugadores_padel WHERE id = $1',
      [jugador_id]
    );
    if (jugadorPerfil.rows.length === 0) {
      jugadorPerfil = await client.query(
        'SELECT id, usuario_id, nombre FROM jugadores_padel WHERE usuario_id = $1',
        [jugador_id]
      );
    }
    if (jugadorPerfil.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Jugador no encontrado' });
    }
    const jugadorIdReal = jugadorPerfil.rows[0].id;
    const usuarioIdReal = jugadorPerfil.rows[0].usuario_id;
    const nombreJugador = jugadorPerfil.rows[0].nombre || 'NA';

    const negocioData = await client.query(
      'SELECT nombre, whatsapp, dueno_tel FROM negocios WHERE id = $1',
      [negocio_id]
    );
    const n = negocioData.rows[0] || {};
    const telClub = (n.whatsapp || n.dueno_tel || '').replace(/\D/g, '');
    const precioTotal = parseFloat(t.precio_por_hora);
    const comision = Math.round(precioTotal * 0.10);
    const horaInicio = String(t.hora_inicio).substring(0, 5);
    const horaFin = String(t.hora_fin).substring(0, 5);

    let whatsapp_club = null;
    if (telClub) {
      const msg = '🎾 Nueva reserva confirmada'
        + ' - Jugador: ' + nombreJugador
        + ' - Fecha: ' + fecha
        + ' - Horario: ' + horaInicio + ' a ' + horaFin
        + ' - Cancha: ' + (t.numero_cancha || 1)
        + ' - Precio: $' + precioTotal
        + ' - Ver: https://cordobalux.com/negocio.html';
      whatsapp_club = 'https://wa.me/' + telClub + '?text=' + encodeURIComponent(msg);
    }

    const result = await client.query(
      'INSERT INTO reservas_padel (negocio_id, usuario_id, jugador_id, disponibilidad_id, fecha, hora_inicio, hora_fin, precio_cobrado, estado, numero_cancha, whatsapp_club, notas) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12) RETURNING *',
      [negocio_id, usuarioIdReal, jugadorIdReal, disponibilidad_id, fecha, t.hora_inicio, t.hora_fin, precioTotal, 'confirmado', parseInt(t.numero_cancha) || 1, whatsapp_club, notas || null]
    );

    await client.query('COMMIT');
    res.status(201).json({ ...result.rows[0], comision_plataforma: comision, whatsapp_club });

  } catch (err) {
    await client.query('ROLLBACK');
    console.error('POST /padel/reservas:', err.message, err.detail);
    res.status(500).json({ error: 'Error interno', detalle: err.message });
  } finally {
    client.release();
  }
});

// ── GET /padel/reservas/mis-reservas ─────────────────────────────────
// Reservas del jugador
router.get('/reservas/mis-reservas', async (req, res) => {
  const { jugador_id, usuario_id } = req.query;
  const id = jugador_id || usuario_id;
  if (!id) return res.status(400).json({ error: 'jugador_id o usuario_id es requerido' });

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
      LEFT JOIN jugadores_padel j ON j.id = r.jugador_id
      WHERE r.usuario_id = $1 OR j.usuario_id = $1
      ORDER BY r.fecha DESC, d.hora_inicio ASC
    `, [id]);

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
        COALESCE(j.nombre, u.nombre) AS jugador_nombre,
        j.nivel  AS jugador_nivel,
        COALESCE(j.foto_url, u.foto_url) AS jugador_foto,
        u.telefono AS jugador_tel,
        d.hora_inicio,
        d.hora_fin,
        d.zona AS zona_cancha
      FROM reservas_padel r
      LEFT JOIN jugadores_padel j ON j.id = r.jugador_id
      LEFT JOIN usuarios u ON u.id = r.usuario_id
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

// DELETE /padel/disponibilidad/:id
router.delete('/disponibilidad/:id', authAdmin, async (req, res) => {
  try {
    const result = await pool.query(
      'UPDATE disponibilidad_padel SET activo = false WHERE id = $1 RETURNING id',
      [req.params.id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Turno no encontrado' });
    res.json({ ok: true });
  } catch (err) {
    console.error('DELETE /padel/disponibilidad/:id:', err.message);
    res.status(500).json({ error: 'Error interno' });
  }
});

// ── POST /padel/resenas-club ─────────────────────────────────────────
// El club deja reseña a un jugador (por cancelación u otro motivo)
router.post('/resenas-club', authAdmin, async (req, res) => {
  let { negocio_id, jugador_id, reserva_id, puntuacion, comentario } = req.body;
  if (!negocio_id || !jugador_id || !puntuacion)
    return res.status(400).json({ error: 'negocio_id, jugador_id y puntuacion son requeridos' });
  if (puntuacion < 1 || puntuacion > 5)
    return res.status(400).json({ error: 'Puntuacion debe ser entre 1 y 5' });
  try {
    const ck = await pool.query('SELECT id FROM jugadores_padel WHERE id = $1',[jugador_id]);
    if(!ck.rows.length){
      const bu = await pool.query('SELECT id FROM jugadores_padel WHERE usuario_id = $1',[jugador_id]);
      if(bu.rows.length) jugador_id = bu.rows[0].id;
      else return res.status(404).json({ error: 'Jugador no encontrado' });
    }
  } catch(e){ return res.status(500).json({ error: 'Error buscando jugador' }); }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const resena = await client.query(`
      INSERT INTO resenas_club_jugador (negocio_id, jugador_id, reserva_id, puntuacion, comentario)
      VALUES ($1, $2, $3, $4, $5)
      ON CONFLICT (negocio_id, reserva_id) WHERE reserva_id IS NOT NULL DO UPDATE SET
        puntuacion  = EXCLUDED.puntuacion,
        comentario  = EXCLUDED.comentario
      RETURNING *
    `, [negocio_id, jugador_id, reserva_id || null, puntuacion, comentario || null]);

    // Recalcular promedio del jugador incluyendo reseñas de clubes
    await client.query(`
      UPDATE jugadores_padel SET
        promedio_resenas = (
          SELECT ROUND(AVG(p)::numeric, 2) FROM (
            SELECT estrellas AS p FROM resenas_padel WHERE a_usuario = $1
            UNION ALL
            SELECT puntuacion AS p FROM resenas_club_jugador WHERE jugador_id = $1
          ) t
        ),
        total_resenas = (
          SELECT COUNT(*) FROM resenas_club_jugador WHERE jugador_id = $1
        ) + (
          SELECT COUNT(*) FROM resenas_padel WHERE a_usuario = $1
        )
      WHERE id = $1
    `, [jugador_id]);

    await client.query('COMMIT');
    res.status(201).json(resena.rows[0]);
  } catch(err) {
    await client.query('ROLLBACK');
    console.error('POST /padel/resenas-club:', err.message);
    res.status(500).json({ error: 'Error interno' });
  } finally {
    client.release();
  }
});

// ── GET /padel/resenas-club/:jugador_id ──────────────────────────────
// Ver reseñas de clubes recibidas por un jugador
router.get('/resenas-club/:jugador_id', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT
        r.id, r.puntuacion, r.comentario, r.creado_en,
        n.nombre AS club_nombre, n.logo_url AS club_logo
      FROM resenas_club_jugador r
      JOIN negocios n ON n.id = r.negocio_id
      WHERE r.jugador_id = $1
      ORDER BY r.creado_en DESC
    `, [req.params.jugador_id]);
    res.json(result.rows);
  } catch(err) {
    console.error('GET /padel/resenas-club:', err.message);
    res.status(500).json({ error: 'Error interno' });
  }
});


// ── GET /padel/resenas-club-negocio ──────────────────────────────────
// Ver reseñas dejadas por el negocio a jugadores
router.get('/resenas-club-negocio', authAdmin, async (req, res) => {
  const negocio_id = req.admin.negocio_id;
  try {
    const result = await pool.query(`
      SELECT
        r.id, r.puntuacion, r.comentario, r.creado_en,
        jp.nombre AS jugador_nombre, jp.foto_url AS jugador_foto,
        r.reserva_id
      FROM resenas_club_jugador r
      JOIN jugadores_padel jp ON jp.id = r.jugador_id
      WHERE r.negocio_id = $1
      ORDER BY r.creado_en DESC
    `, [negocio_id]);
    res.json(result.rows);
  } catch(err) {
    console.error('GET /padel/resenas-club-negocio:', err.message);
    res.status(500).json({ error: 'Error interno' });
  }
});


// ── POST /padel/chat-directo ─────────────────────────────────────────
// Busca o crea un match directo entre dos jugadores para chatear
router.post('/chat-directo', authUsuario, async (req, res) => {
  const { otro_usuario_id } = req.body;
  const yo = req.usuario.id;
  try {
    const existe = await pool.query(`
      SELECT id FROM matches
      WHERE sesion_id IS NULL
      AND ((usuario_1 = $1 AND usuario_2 = $2) OR (usuario_1 = $2 AND usuario_2 = $1))
    `, [yo, otro_usuario_id]);
    if (existe.rows.length) return res.json({ match_id: existe.rows[0].id });
    const nuevo = await pool.query(`
      INSERT INTO matches (usuario_1, usuario_2) VALUES ($1, $2) RETURNING id
    `, [yo, otro_usuario_id]);
    res.json({ match_id: nuevo.rows[0].id });
  } catch(err) {
    console.error('POST /padel/chat-directo:', err.message);
    res.status(500).json({ error: 'Error interno' });
  }
});


// GET reseñas de jugadores recibidas por un jugador
router.get('/resenas-jugador/:jugador_id', async (req, res) => {
  const { jugador_id } = req.params;
  try {
    const result = await pool.query(`
      SELECT rp.estrellas, rp.comentario
      FROM resenas_padel rp
      JOIN jugadores_padel jp ON jp.usuario_id = rp.a_usuario
      WHERE jp.id = $1
      ORDER BY rp.id DESC
    `, [jugador_id]);
    res.json(result.rows);
  } catch (err) {
    console.error('Error resenas-jugador:', err);
    res.status(500).json({ error: 'Error al obtener reseñas' });
  }
});


// ── PARTIDOS PADEL ────────────────────────────────────────────────────────

// POST /padel/partidos — crear partido e invitar jugadores
router.post('/partidos', authUsuario, async (req, res) => {
  const creador_id = req.usuario.id;
  const { fecha, hora, lugar, equipo1_j2, equipo2_j1, equipo2_j2 } = req.body;
  try {
    const { reserva_id } = req.body;
    const partido = await pool.query(`
      INSERT INTO partidos_padel (creador_id, equipo1_j1, equipo1_j2, equipo2_j1, equipo2_j2, fecha, hora, lugar, reserva_id)
      VALUES ($1, $1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING id
    `, [creador_id, equipo1_j2 || null, equipo2_j1 || null, equipo2_j2 || null, fecha, hora, lugar || null, reserva_id || null]);

    const partido_id = partido.rows[0].id;

    const invitados = [
      { jugador_id: equipo1_j2, equipo: 1 },
      { jugador_id: equipo2_j1, equipo: 2 },
      { jugador_id: equipo2_j2, equipo: 2 },
    ].filter(i => i.jugador_id);

    for (const inv of invitados) {
      await pool.query(`
        INSERT INTO invitaciones_partido (partido_id, jugador_id, equipo)
        VALUES ($1, $2, $3)
        ON CONFLICT DO NOTHING
      `, [partido_id, inv.jugador_id, inv.equipo]);
    }

    res.json({ ok: true, partido_id });
  } catch (err) {
    console.error('POST /padel/partidos:', err.message);
    res.status(500).json({ error: 'Error al crear partido' });
  }
});

// GET /padel/partidos — mis partidos
router.get('/partidos', authUsuario, async (req, res) => {
  const usuario_id = req.usuario.id;
  try {
    const result = await pool.query(`
      SELECT p.*,
        u1.nombre AS eq1j1_nombre, u1.foto_url AS eq1j1_foto,
        u2.nombre AS eq1j2_nombre, u2.foto_url AS eq1j2_foto,
        u3.nombre AS eq2j1_nombre, u3.foto_url AS eq2j1_foto,
        u4.nombre AS eq2j2_nombre, u4.foto_url AS eq2j2_foto,
        inv.estado AS mi_invitacion
      FROM partidos_padel p
      LEFT JOIN usuarios u1 ON u1.id = p.equipo1_j1
      LEFT JOIN usuarios u2 ON u2.id = p.equipo1_j2
      LEFT JOIN usuarios u3 ON u3.id = p.equipo2_j1
      LEFT JOIN usuarios u4 ON u4.id = p.equipo2_j2
      LEFT JOIN invitaciones_partido inv ON inv.partido_id = p.id AND inv.jugador_id = $1
      WHERE p.creador_id = $1
         OR p.equipo1_j1 = $1 OR p.equipo1_j2 = $1
         OR p.equipo2_j1 = $1 OR p.equipo2_j2 = $1
      ORDER BY p.creado_en DESC
    `, [usuario_id]);
    res.json(result.rows);
  } catch (err) {
    console.error('GET /padel/partidos:', err.message);
    res.status(500).json({ error: 'Error al obtener partidos' });
  }
});

// PUT /padel/partidos/:id/responder — aceptar o rechazar invitacion
router.put('/partidos/:id/responder', authUsuario, async (req, res) => {
  const { id } = req.params;
  const { estado } = req.body;
  const jugador_id = req.usuario.id;
  try {
    await pool.query(`
      UPDATE invitaciones_partido SET estado = $1
      WHERE partido_id = $2 AND jugador_id = $3
    `, [estado, id, jugador_id]);

    const inv = await pool.query(`
      SELECT COUNT(*) FILTER (WHERE estado = 'aceptado') AS aceptados,
             COUNT(*) AS total
      FROM invitaciones_partido WHERE partido_id = $1
    `, [id]);

    const { aceptados, total } = inv.rows[0];
    if (parseInt(aceptados) === parseInt(total)) {
      await pool.query(`UPDATE partidos_padel SET estado = 'confirmado' WHERE id = $1`, [id]);
    }

    res.json({ ok: true });
  } catch (err) {
    console.error('PUT /padel/partidos/responder:', err.message);
    res.status(500).json({ error: 'Error al responder invitacion' });
  }
});

// PUT /padel/partidos/:id/resultado — cargar resultado y ELO
router.put('/partidos/:id/resultado', authUsuario, async (req, res) => {
  const { id } = req.params;
  const { resultado_eq1, resultado_eq2, faltaron } = req.body;
  const ganador_equipo = resultado_eq1 > resultado_eq2 ? 1 : 2;
  try {
    await pool.query(`
      UPDATE partidos_padel
      SET estado = $1, resultado_eq1 = $2, resultado_eq2 = $3,
          ganador_equipo = $4, faltaron = $5
      WHERE id = $6
    `, [
      faltaron && faltaron.length ? 'suspendido' : 'jugado',
      resultado_eq1, resultado_eq2, ganador_equipo,
      faltaron && faltaron.length ? faltaron : null,
      id
    ]);

    if (!faltaron || !faltaron.length) {
      const p = await pool.query(`SELECT * FROM partidos_padel WHERE id = $1`, [id]);
      const partido = p.rows[0];
      const ganadores = ganador_equipo === 1
        ? [partido.equipo1_j1, partido.equipo1_j2]
        : [partido.equipo2_j1, partido.equipo2_j2];
      const perdedores = ganador_equipo === 1
        ? [partido.equipo2_j1, partido.equipo2_j2]
        : [partido.equipo1_j1, partido.equipo1_j2];

      for (const uid of ganadores.filter(Boolean)) {
        await pool.query(`
          UPDATE jugadores_padel
          SET ranking_puntos = COALESCE(ranking_puntos, 1000) + 20,
              partidos_jugados = COALESCE(partidos_jugados, 0) + 1,
              victorias = COALESCE(victorias, 0) + 1
          WHERE usuario_id = $1
        `, [uid]);
      }
      for (const uid of perdedores.filter(Boolean)) {
        await pool.query(`
          UPDATE jugadores_padel
          SET ranking_puntos = GREATEST(COALESCE(ranking_puntos, 1000) - 20, 0),
              partidos_jugados = COALESCE(partidos_jugados, 0) + 1
          WHERE usuario_id = $1
        `, [uid]);
      }
    }

    res.json({ ok: true });
  } catch (err) {
    console.error('PUT /padel/partidos/resultado:', err.message);
    res.status(500).json({ error: 'Error al cargar resultado' });
  }
});

// GET /padel/ranking — ranking ELO
router.get('/ranking', async (req, res) => {
  const { nivel } = req.query;
  try {
    const result = await pool.query(`
      SELECT u.id, u.nombre, u.foto_url,
             jp.nivel, jp.ranking_puntos AS ranking,
             ROW_NUMBER() OVER (ORDER BY jp.ranking_puntos DESC NULLS LAST) AS posicion
      FROM jugadores_padel jp
      JOIN usuarios u ON u.id = jp.usuario_id
      WHERE ($1::text IS NULL OR jp.nivel = $1)
      ORDER BY jp.ranking_puntos DESC NULLS LAST
      LIMIT 50
    `, [nivel || null]);
    res.json(result.rows);
  } catch (err) {
    console.error('GET /padel/ranking:', err.message);
    res.status(500).json({ error: 'Error al obtener ranking' });
  }
});



// PUT /padel/partidos/:id/cancelar
router.put('/partidos/:id/cancelar', authUsuario, async (req, res) => {
  const { id } = req.params;
  const usuario_id = req.usuario.id;
  try {
    const p = await pool.query('SELECT creador_id, estado FROM partidos_padel WHERE id = $1', [id]);
    if (!p.rows.length) return res.status(404).json({ error: 'Partido no encontrado' });
    if (p.rows[0].creador_id !== usuario_id) return res.status(403).json({ error: 'Solo el creador puede cancelar' });
    if (p.rows[0].estado === 'jugado') return res.status(400).json({ error: 'No se puede cancelar un partido jugado' });
    await pool.query('UPDATE partidos_padel SET estado = $1 WHERE id = $2', ['cancelado', id]);
    res.json({ ok: true });
  } catch (err) {
    console.error('PUT /padel/partidos/cancelar:', err.message);
    res.status(500).json({ error: 'Error al cancelar partido' });
  }
});

// PUT /padel/partidos/:id/editar
router.put('/partidos/:id/editar', authUsuario, async (req, res) => {
  const { id } = req.params;
  const usuario_id = req.usuario.id;
  const { fecha, hora, lugar } = req.body;
  try {
    const p = await pool.query('SELECT creador_id, estado FROM partidos_padel WHERE id = $1', [id]);
    if (!p.rows.length) return res.status(404).json({ error: 'Partido no encontrado' });
    if (p.rows[0].creador_id !== usuario_id) return res.status(403).json({ error: 'Solo el creador puede editar' });
    if (p.rows[0].estado === 'jugado') return res.status(400).json({ error: 'No se puede editar un partido jugado' });
    const { equipo1_j2, equipo2_j1, equipo2_j2 } = req.body;
    await pool.query(
      'UPDATE partidos_padel SET fecha = $1, hora = $2, lugar = $3, estado = $4, equipo1_j2 = $5, equipo2_j1 = $6, equipo2_j2 = $7 WHERE id = $8',
      [fecha, hora, lugar, 'pendiente', equipo1_j2||null, equipo2_j1||null, equipo2_j2||null, id]
    );
    // Borrar invitaciones viejas y crear nuevas
    await pool.query('DELETE FROM invitaciones_partido WHERE partido_id = $1', [id]);
    const invitados = [
      { jugador_id: equipo1_j2, equipo: 1 },
      { jugador_id: equipo2_j1, equipo: 2 },
      { jugador_id: equipo2_j2, equipo: 2 },
    ].filter(i => i.jugador_id);
    for (const inv of invitados) {
      await pool.query('INSERT INTO invitaciones_partido (partido_id, jugador_id, equipo) VALUES ($1, $2, $3) ON CONFLICT DO NOTHING',
        [id, inv.jugador_id, inv.equipo]);
    }
    res.json({ ok: true });
  } catch (err) {
    console.error('PUT /padel/partidos/editar:', err.message);
    res.status(500).json({ error: 'Error al editar partido' });
  }
});


// GET /padel/mis-turnos-disponibles — turnos confirmados sin partido creado
router.get('/mis-turnos-disponibles', authUsuario, async (req, res) => {
  const usuario_id = req.usuario.id;
  try {
    const result = await pool.query(`
      SELECT r.id, r.fecha, r.hora_inicio, r.hora_fin, n.nombre AS cancha, n.zona AS lugar
      FROM reservas_padel r
      JOIN negocios n ON n.id = r.negocio_id
      WHERE r.usuario_id = $1
        AND r.estado = 'confirmado'
        AND r.fecha >= CURRENT_DATE
        AND NOT EXISTS (
          SELECT 1 FROM partidos_padel p WHERE p.reserva_id = r.id
        )
      ORDER BY r.fecha ASC, r.hora_inicio ASC
    `, [usuario_id]);
    res.json(result.rows);
  } catch (err) {
    console.error('GET /padel/mis-turnos-disponibles:', err.message);
    res.status(500).json({ error: 'Error al obtener turnos' });
  }
});


// POST /padel/resenas-partido — dejar reseña anónima a jugador del partido
router.post('/resenas-partido', authUsuario, async (req, res) => {
  const de_usuario = req.usuario.id;
  const { partido_id, a_usuario, estrellas, comentario } = req.body;
  try {
    // Verificar que el partido existe y ambos están en él
    const p = await pool.query(`
      SELECT id, estado, faltaron FROM partidos_padel
      WHERE id = $1 AND estado IN ('jugado', 'suspendido')
      AND (equipo1_j1 = $2 OR equipo1_j2 = $2 OR equipo2_j1 = $2 OR equipo2_j2 = $2)
      AND (equipo1_j1 = $3 OR equipo1_j2 = $3 OR equipo2_j1 = $3 OR equipo2_j2 = $3)
    `, [partido_id, de_usuario, a_usuario]);
    if (!p.rows.length) return res.status(403).json({ error: 'No jugaste ese partido con ese jugador' });

    const partido = p.rows[0];
    // Si el partido fue suspendido, solo los que fueron pueden reseñar al que faltó
    if (partido.estado === 'suspendido') {
      const faltaron = partido.faltaron || [];
      if (faltaron.includes(de_usuario)) return res.status(403).json({ error: 'No podés reseñar si fuiste vos quien faltó' });
      if (!faltaron.includes(a_usuario)) return res.status(403).json({ error: 'Solo podés reseñar al jugador que faltó' });
    }

    await pool.query(`
      INSERT INTO resenas_padel (partido_id, de_usuario, a_usuario, estrellas, comentario)
      VALUES ($1, $2, $3, $4, $5)
      ON CONFLICT (partido_id, de_usuario, a_usuario) DO NOTHING
    `, [partido_id, de_usuario, a_usuario, estrellas, comentario || null]);

    // Actualizar promedio en jugadores_padel
    await pool.query(`
      UPDATE jugadores_padel SET
        promedio_resenas = (SELECT AVG(estrellas) FROM resenas_padel WHERE a_usuario = $1),
        total_resenas = (SELECT COUNT(*) FROM resenas_padel WHERE a_usuario = $1)
      WHERE usuario_id = $1
    `, [a_usuario]);

    res.json({ ok: true });
  } catch (err) {
    console.error('POST /padel/resenas-partido:', err.message);
    res.status(500).json({ error: 'Error al dejar reseña' });
  }
});

// GET /padel/resenas-partido/:partido_id/mias — reseñas que YO dejé en ese partido
router.get('/resenas-partido/:partido_id/mias', authUsuario, async (req, res) => {
  const de_usuario = req.usuario.id;
  const { partido_id } = req.params;
  try {
    const result = await pool.query(`
      SELECT a_usuario FROM resenas_padel
      WHERE partido_id = $1 AND de_usuario = $2
    `, [partido_id, de_usuario]);
    res.json(result.rows.map(r => r.a_usuario));
  } catch (err) {
    res.status(500).json({ error: 'Error' });
  }
});



// ─── PARTIDOS PÚBLICOS ───────────────────────────────────────────────────────

// GET /padel/partidos-publicos  — lista con filtros opcionales zona/categoria
router.get('/partidos-publicos', async (req, res) => {
  try {
    const { zona, categoria } = req.query;
    let conditions = ["pp.estado = 'abierto'", 'pp.fecha >= CURRENT_DATE'];
    const params = [];
    if (zona) { params.push(zona); conditions.push(`pp.zona ILIKE $${params.length}`); }
    if (categoria) { params.push(categoria); conditions.push(`pp.categoria = $${params.length}`); }

    const where = conditions.length ? 'WHERE ' + conditions.join(' AND ') : '';

    const query = `
      SELECT
        pp.*,
        COUNT(pi2.id)::int AS inscriptos,
        json_agg(
          json_build_object(
            'usuario_id', pi2.usuario_id,
            'nombre', pi2.nombre,
            'nivel', pi2.nivel,
            'foto_url', pi2.foto_url,
            'inscripto_en', pi2.inscripto_en
          ) ORDER BY pi2.inscripto_en
        ) FILTER (WHERE pi2.id IS NOT NULL) AS jugadores
      FROM partidos_publicos pp
      LEFT JOIN partidos_publicos_inscriptos pi2 ON pi2.partido_id = pp.id
      ${where}
      GROUP BY pp.id
      ORDER BY pp.fecha ASC, pp.hora ASC
    `;

    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (err) {
    console.error('Error partidos-publicos GET:', err);
    res.status(500).json({ error: err.message });
  }
});

// POST /padel/partidos-publicos  — crear partido público (requiere auth admin)
router.post('/partidos-publicos', authAdmin, async (req, res) => {
  try {
    const { zona, categoria, fecha, hora, lugar, costo, descripcion, cupos } = req.body;
    if (!zona || !categoria || !fecha || !hora) {
      return res.status(400).json({ error: 'zona, categoria, fecha y hora son obligatorios' });
    }
    const result = await pool.query(
      `INSERT INTO partidos_publicos (zona, categoria, fecha, hora, lugar, costo, descripcion, cupos)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *`,
      [zona, categoria, fecha, hora, lugar || null, costo || null, descripcion || null, cupos || 4]
    );

    try {
      const subs = await pool.query('SELECT * FROM push_suscripciones', []);
      const payload = JSON.stringify({ title: '⚡ Nuevo Partido de Pádel', body: categoria + ' en ' + (lugar || 'lugar a confirmar') + ' — ' + fecha + ' ' + hora, url: 'https://cordobalux.com/public/padel-connect.html' });
      console.log('Suscriptores encontrados:', subs.rows.length);
      for (const sub of subs.rows) {
        console.log('Enviando a:', sub.endpoint.substring(0,50), 'p256dh:', sub.p256dh?.substring(0,10), 'auth:', sub.auth?.substring(0,5));
        try {
          await webpush.sendNotification({
            endpoint: sub.endpoint,
            keys: { p256dh: sub.p256dh, auth: sub.auth }
          }, payload, {
            vapidDetails: {
              subject: 'mailto:admin@cordobalux.com',
              publicKey: 'BBC-BM0lWegmCr3e5ROgYJne9T_OtJDmUFPReuJkAUR83TOE90VmdVXLFBGZGde6VdFo5Ru53jziQPtQ_hZcd4Q',
              privateKey: '0y0zMBqZdqIdvA7G9FWTENw_2DpOBzAc97uL-oSHFUo'
            }
          });
          console.log('✅ Push enviado a:', sub.endpoint.substring(0, 50));
        } 
        catch (e) { if (e.statusCode === 410) await pool.query('DELETE FROM push_suscripciones WHERE endpoint = $1', [sub.endpoint]); }
      }
    } catch (e) { console.error('Error push:', e.message); }
    // Enviar push a suscriptores
    res.json({ ok: true, partido: result.rows[0] });
  } catch (err) {
    console.error('Error crear partido público:', err);
    res.status(500).json({ error: err.message });
  }
});

// DELETE /padel/partidos-publicos/:id  — eliminar partido público (requiere auth admin)
router.delete('/partidos-publicos/:id', authAdmin, async (req, res) => {
  try {
    await pool.query('DELETE FROM partidos_publicos WHERE id = $1', [req.params.id]);
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /padel/partidos-publicos/:id/inscribirse  — jugador se inscribe
router.post('/partidos-publicos/:id/inscribirse', authUsuario, async (req, res) => {
  try {
    const { id } = req.params;
    const usuario_id = req.usuario.id;

    // Verificar que el partido existe y tiene cupo
    const p = await pool.query('SELECT * FROM partidos_publicos WHERE id = $1', [id]);
    if (!p.rows.length) return res.status(404).json({ error: 'Partido no encontrado' });
    const partido = p.rows[0];

    // No se puede inscribir el día del partido ni después
    const hoy = new Date();
    hoy.setHours(0,0,0,0);
    const fechaPartido = new Date(partido.fecha);
    fechaPartido.setHours(0,0,0,0);
    if (fechaPartido <= hoy) {
      return res.status(400).json({ error: 'Las inscripciones cerraron el día anterior al partido' });
    }

    // Contar inscriptos
    const count = await pool.query(
      'SELECT COUNT(*) FROM partidos_publicos_inscriptos WHERE partido_id = $1', [id]
    );
    if (parseInt(count.rows[0].count) >= partido.cupos) {
      return res.status(400).json({ error: 'El partido ya está completo' });
    }

    // Obtener datos del jugador
    const jugadorQ = await pool.query(
      'SELECT nombre, nivel, foto_url FROM jugadores_padel WHERE usuario_id = $1', [usuario_id]
    );
    const jugador = jugadorQ.rows[0] || {};

    await pool.query(
      `INSERT INTO partidos_publicos_inscriptos (partido_id, usuario_id, nombre, nivel, foto_url)
       VALUES ($1,$2,$3,$4,$5) ON CONFLICT (partido_id, usuario_id) DO NOTHING`,
      [id, usuario_id, jugador.nombre || 'Jugador', jugador.nivel || null, jugador.foto_url || null]
    );

    // Retornar partido actualizado con inscriptos
    const updated = await pool.query(`
      SELECT pp.*, COUNT(pi2.id)::int AS inscriptos,
        json_agg(json_build_object('usuario_id', pi2.usuario_id,'nombre', pi2.nombre,'nivel', pi2.nivel,'foto_url', pi2.foto_url)
          ORDER BY pi2.inscripto_en) FILTER (WHERE pi2.id IS NOT NULL) AS jugadores
      FROM partidos_publicos pp
      LEFT JOIN partidos_publicos_inscriptos pi2 ON pi2.partido_id = pp.id
      WHERE pp.id = $1 GROUP BY pp.id`, [id]);

    res.json({ ok: true, partido: updated.rows[0] });
  } catch (err) {
    console.error('Error inscribirse partido:', err);
    res.status(500).json({ error: err.message });
  }
});

// DELETE /padel/partidos-publicos/:id/desinscribirse  — jugador cancela
router.delete('/partidos-publicos/:id/desinscribirse', authUsuario, async (req, res) => {
  try {
    const { id } = req.params;
    const usuario_id = req.usuario.id;

    // No se puede desinscribir el día del partido ni después
    const p = await pool.query('SELECT fecha FROM partidos_publicos WHERE id = $1', [id]);
    if (!p.rows.length) return res.status(404).json({ error: 'Partido no encontrado' });
    const hoy = new Date(); hoy.setHours(0,0,0,0);
    const fechaPartido = new Date(p.rows[0].fecha); fechaPartido.setHours(0,0,0,0);
    if (fechaPartido <= hoy) {
      return res.status(400).json({ error: 'Ya no podés cancelar la inscripción' });
    }

    await pool.query(
      'DELETE FROM partidos_publicos_inscriptos WHERE partido_id = $1 AND usuario_id = $2',
      [id, usuario_id]
    );
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── FIN PARTIDOS PÚBLICOS ───────────────────────────────────────────────────
// ════════════════════════════════════════════════
//   PROFESORES / CLASES PARTICULARES
// ════════════════════════════════════════════════

// GET /padel/profesores — lista profesores con filtro zona
router.get('/profesores', async (req, res) => {
  const { zona } = req.query;
  try {
    let where = "WHERE p.activo = true AND p.estado = 'aprobado'";
    const params = [];
    if (zona) {
      params.push(`%${zona}%`);
      where += ` AND EXISTS (
        SELECT 1 FROM profesor_zonas pz
        WHERE pz.profesor_id = p.id AND pz.zona ILIKE $1
      )`;
    }
    const result = await pool.query(`
      SELECT
        p.*,
        u.email,
        json_agg(DISTINCT jsonb_build_object('id', pz.id, 'zona', pz.zona, 'lugar', pz.lugar))
          FILTER (WHERE pz.id IS NOT NULL) AS zonas
      FROM profesores_padel p
      JOIN usuarios u ON u.id = p.usuario_id
      LEFT JOIN profesor_zonas pz ON pz.profesor_id = p.id
      ${where}
      GROUP BY p.id, u.email
      ORDER BY p.promedio_resenas DESC, p.creado_en DESC
    `, params);
    res.json(result.rows);
  } catch (err) {
    console.error('GET /padel/profesores:', err.message);
    res.status(500).json({ error: 'Error interno' });
  }
});

// GET /padel/profesores/mi-perfil — perfil del profesor logueado
router.get('/profesores/mi-perfil', authUsuario, async (req, res) => {
  const usuario_id = req.usuario.id;
  try {
    const result = await pool.query(`
      SELECT p.*,
        json_agg(DISTINCT jsonb_build_object('id', pz.id, 'zona', pz.zona, 'lugar', pz.lugar))
          FILTER (WHERE pz.id IS NOT NULL) AS zonas
      FROM profesores_padel p
      LEFT JOIN profesor_zonas pz ON pz.profesor_id = p.id
      WHERE p.usuario_id = $1
      GROUP BY p.id
    `, [usuario_id]);
    if (!result.rows.length) return res.json({ tiene_perfil: false });
    res.json({ tiene_perfil: true, perfil: result.rows[0] });
  } catch (err) {
    console.error('GET /padel/profesores/mi-perfil:', err.message);
    res.status(500).json({ error: 'Error interno' });
  }
});

// POST /padel/profesores — crear o actualizar perfil de profesor
router.post('/profesores', authUsuario, async (req, res) => {
  const usuario_id = req.usuario.id;
  const { nombre, bio, foto_url, precio_hora, modalidad, nivel_minimo, nivel_maximo, whatsapp, whatsapp_grupo, zonas } = req.body;
  if (!nombre) return res.status(400).json({ error: 'nombre es requerido' });
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const result = await client.query(`
      INSERT INTO profesores_padel
        (usuario_id, nombre, bio, foto_url, precio_hora, modalidad, nivel_minimo, nivel_maximo, whatsapp, whatsapp_grupo)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
      ON CONFLICT (usuario_id) DO UPDATE SET
        nombre         = EXCLUDED.nombre,
        bio            = EXCLUDED.bio,
        foto_url       = COALESCE(EXCLUDED.foto_url, profesores_padel.foto_url),
        precio_hora    = EXCLUDED.precio_hora,
        modalidad      = EXCLUDED.modalidad,
        nivel_minimo   = EXCLUDED.nivel_minimo,
        nivel_maximo   = EXCLUDED.nivel_maximo,
        whatsapp       = EXCLUDED.whatsapp,
        whatsapp_grupo = EXCLUDED.whatsapp_grupo,
        actualizado_en = NOW()
      RETURNING *
    `, [usuario_id, nombre, bio||null, foto_url||null, precio_hora||null, modalidad||'presencial', nivel_minimo||null, nivel_maximo||null, whatsapp||null, whatsapp_grupo||null]);

    const profesor_id = result.rows[0].id;

    // Reemplazar zonas si se mandaron
    if (zonas && Array.isArray(zonas)) {
      await client.query('DELETE FROM profesor_zonas WHERE profesor_id = $1', [profesor_id]);
      for (const z of zonas) {
        if (z.zona) {
          await client.query(
            'INSERT INTO profesor_zonas (profesor_id, zona, lugar) VALUES ($1,$2,$3)',
            [profesor_id, z.zona, z.lugar||null]
          );
        }
      }
    }

    await client.query('COMMIT');
    res.status(201).json({ ok: true, perfil: result.rows[0] });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('POST /padel/profesores:', err.message);
    res.status(500).json({ error: 'Error interno' });
  } finally {
    client.release();
  }
});

// GET /padel/profesores/:id/disponibilidad
router.get('/profesores/:id/disponibilidad', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT * FROM disponibilidad_profesor
      WHERE profesor_id = $1 AND activo = true
        AND (fecha_especifica IS NULL OR fecha_especifica >= CURRENT_DATE)
      ORDER BY COALESCE(fecha_especifica, ('2000-01-0' || (dia_semana+1))::date), hora_inicio
    `, [req.params.id]);
    res.json(result.rows);
  } catch (err) {
    console.error('GET /padel/profesores/:id/disponibilidad:', err.message);
    res.status(500).json({ error: 'Error interno' });
  }
});

// POST /padel/profesores/disponibilidad — el profe carga un slot
router.post('/profesores/disponibilidad', authUsuario, async (req, res) => {
  const usuario_id = req.usuario.id;
  const { fecha, dia_semana, hora_inicio, hora_fin, zona, lugar } = req.body;
  if (!hora_inicio || !hora_fin) return res.status(400).json({ error: 'hora_inicio y hora_fin son requeridos' });
  try {
    const p = await pool.query('SELECT id FROM profesores_padel WHERE usuario_id = $1', [usuario_id]);
    if (!p.rows.length) return res.status(404).json({ error: 'Perfil de profesor no encontrado' });
    const profesor_id = p.rows[0].id;
    const result = await pool.query(`
      INSERT INTO disponibilidad_profesor
        (profesor_id, fecha_especifica, dia_semana, hora_inicio, hora_fin, zona, lugar)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING *
    `, [profesor_id, fecha||null, dia_semana !== undefined ? dia_semana : null, hora_inicio, hora_fin, zona||null, lugar||null]);
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error('POST /padel/profesores/disponibilidad:', err.message);
    res.status(500).json({ error: 'Error interno' });
  }
});

// DELETE /padel/profesores/disponibilidad/:id
router.delete('/profesores/disponibilidad/:id', authUsuario, async (req, res) => {
  const usuario_id = req.usuario.id;
  try {
    const p = await pool.query('SELECT id FROM profesores_padel WHERE usuario_id = $1', [usuario_id]);
    if (!p.rows.length) return res.status(403).json({ error: 'No autorizado' });
    await pool.query(
      'UPDATE disponibilidad_profesor SET activo = false WHERE id = $1 AND profesor_id = $2',
      [req.params.id, p.rows[0].id]
    );
    res.json({ ok: true });
  } catch (err) {
    console.error('DELETE /padel/profesores/disponibilidad:', err.message);
    res.status(500).json({ error: 'Error interno' });
  }
});

// POST /padel/clases/reservar — alumno reserva clase
router.post('/clases/reservar', authUsuario, async (req, res) => {
  const alumno_id = req.usuario.id;
  const { profesor_id, disponibilidad_id, fecha, hora_inicio, hora_fin, zona, lugar, notas } = req.body;
  if (!profesor_id || !fecha || !hora_inicio || !hora_fin)
    return res.status(400).json({ error: 'profesor_id, fecha, hora_inicio y hora_fin son requeridos' });
  try {
    // Verificar que el slot no esté ya reservado
    if (disponibilidad_id) {
      const ocupado = await pool.query(
        "SELECT id FROM reservas_clase WHERE disponibilidad_id = $1 AND fecha = $2 AND estado != 'cancelada'",
        [disponibilidad_id, fecha]
      );
      if (ocupado.rows.length) return res.status(409).json({ error: 'Ese horario ya está reservado' });
    }
    const p = await pool.query('SELECT precio_hora, whatsapp FROM profesores_padel WHERE id = $1', [profesor_id]);
    const precio = p.rows[0]?.precio_hora || null;
    const telProfe = (p.rows[0]?.whatsapp || '').replace(/\D/g,'');

    const alumno = await pool.query('SELECT nombre FROM usuarios WHERE id = $1', [alumno_id]);
    const nombreAlumno = alumno.rows[0]?.nombre || 'Alumno';

    const result = await pool.query(`
      INSERT INTO reservas_clase
        (profesor_id, alumno_id, disponibilidad_id, fecha, hora_inicio, hora_fin, zona, lugar, precio_cobrado, notas)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
      RETURNING *
    `, [profesor_id, alumno_id, disponibilidad_id||null, fecha, hora_inicio, hora_fin, zona||null, lugar||null, precio||null, notas||null]);

    let whatsapp_profe = null;
    if (telProfe) {
      const msg = `🎾 Nueva reserva de clase\nAlumno: ${nombreAlumno}\nFecha: ${fecha}\nHorario: ${hora_inicio.substring(0,5)} a ${hora_fin.substring(0,5)}\n${zona ? 'Zona: '+zona : ''}\nCordobaLux`;
      whatsapp_profe = `https://wa.me/${telProfe}?text=${encodeURIComponent(msg)}`;
    }

    res.status(201).json({ ok: true, reserva: result.rows[0], whatsapp_profe });
  } catch (err) {
    console.error('POST /padel/clases/reservar:', err.message);
    res.status(500).json({ error: 'Error interno' });
  }
});

// GET /padel/clases/mis-clases — clases del profesor logueado
router.get('/clases/mis-clases', authUsuario, async (req, res) => {
  const usuario_id = req.usuario.id;
  try {
    const p = await pool.query('SELECT id FROM profesores_padel WHERE usuario_id = $1', [usuario_id]);
    if (!p.rows.length) return res.json([]);
    const result = await pool.query(`
      SELECT r.*, u.nombre AS alumno_nombre, u.foto_url AS alumno_foto, u.telefono AS alumno_tel
      FROM reservas_clase r
      JOIN usuarios u ON u.id = r.alumno_id
      WHERE r.profesor_id = $1
      ORDER BY r.fecha ASC, r.hora_inicio ASC
    `, [p.rows[0].id]);
    res.json(result.rows);
  } catch (err) {
    console.error('GET /padel/clases/mis-clases:', err.message);
    res.status(500).json({ error: 'Error interno' });
  }
});

// GET /padel/clases/mis-reservas-alumno — clases reservadas por el alumno
router.get('/clases/mis-reservas-alumno', authUsuario, async (req, res) => {
  const alumno_id = req.usuario.id;
  try {
    const result = await pool.query(`
      SELECT r.*, p.nombre AS profesor_nombre, p.foto_url AS profesor_foto, p.whatsapp AS profesor_whatsapp
      FROM reservas_clase r
      JOIN profesores_padel p ON p.id = r.profesor_id
      WHERE r.alumno_id = $1
      ORDER BY r.fecha DESC, r.hora_inicio ASC
    `, [alumno_id]);
    res.json(result.rows);
  } catch (err) {
    console.error('GET /padel/clases/mis-reservas-alumno:', err.message);
    res.status(500).json({ error: 'Error interno' });
  }
});

// PUT /padel/clases/:id/responder — profe confirma o cancela
router.put('/clases/:id/responder', authUsuario, async (req, res) => {
  const usuario_id = req.usuario.id;
  const { estado } = req.body;
  if (!['confirmada','cancelada'].includes(estado))
    return res.status(400).json({ error: 'estado debe ser confirmada o cancelada' });
  try {
    const p = await pool.query('SELECT id FROM profesores_padel WHERE usuario_id = $1', [usuario_id]);
    if (!p.rows.length) return res.status(403).json({ error: 'No autorizado' });
    const result = await pool.query(
      'UPDATE reservas_clase SET estado = $1 WHERE id = $2 AND profesor_id = $3 RETURNING *',
      [estado, req.params.id, p.rows[0].id]
    );
    if (!result.rows.length) return res.status(404).json({ error: 'Reserva no encontrada' });
    res.json({ ok: true, reserva: result.rows[0] });
  } catch (err) {
    console.error('PUT /padel/clases/:id/responder:', err.message);
    res.status(500).json({ error: 'Error interno' });
  }
});

// POST /padel/profesores/:id/resena — alumno deja reseña al profe
router.post('/profesores/:id/resena', authUsuario, async (req, res) => {
  const de_usuario_id = req.usuario.id;
  const a_profesor_id = req.params.id;
  const { estrellas, comentario } = req.body;
  if (!estrellas || estrellas < 1 || estrellas > 5)
    return res.status(400).json({ error: 'estrellas debe ser entre 1 y 5' });
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await client.query(`
      INSERT INTO resenas_profesor (de_usuario_id, a_profesor_id, estrellas, comentario)
      VALUES ($1,$2,$3,$4)
      ON CONFLICT (de_usuario_id, a_profesor_id) DO UPDATE SET
        estrellas = EXCLUDED.estrellas, comentario = EXCLUDED.comentario, creado_en = NOW()
    `, [de_usuario_id, a_profesor_id, estrellas, comentario||null]);
    await client.query(`
      UPDATE profesores_padel SET
        promedio_resenas = (SELECT ROUND(AVG(estrellas)::numeric,2) FROM resenas_profesor WHERE a_profesor_id = $1),
        total_resenas    = (SELECT COUNT(*) FROM resenas_profesor WHERE a_profesor_id = $1)
      WHERE id = $1
    `, [a_profesor_id]);
    await client.query('COMMIT');
    res.json({ ok: true });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('POST /padel/profesores/:id/resena:', err.message);
    res.status(500).json({ error: 'Error interno' });
  } finally {
    client.release();
  }
});

// GET /padel/profesores/:id/resenas
router.get('/profesores/:id/resenas', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT r.estrellas, r.comentario, r.creado_en, u.nombre AS de_nombre, u.foto_url AS de_foto
      FROM resenas_profesor r
      JOIN usuarios u ON u.id = r.de_usuario_id
      WHERE r.a_profesor_id = $1
      ORDER BY r.creado_en DESC
    `, [req.params.id]);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: 'Error interno' });
  }
});

// GET /padel/clases/resumen-dia — resumen del día para WhatsApp
router.get('/clases/resumen-dia', authUsuario, async (req, res) => {
  const usuario_id = req.usuario.id;
  const fecha = req.query.fecha || new Date().toISOString().split('T')[0];
  try {
    const p = await pool.query('SELECT id, nombre, whatsapp_grupo FROM profesores_padel WHERE usuario_id = $1', [usuario_id]);
    if (!p.rows.length) return res.status(404).json({ error: 'Perfil no encontrado' });
    const { id: profesor_id, nombre, whatsapp_grupo } = p.rows[0];

    const clases = await pool.query(`
      SELECT r.hora_inicio, r.hora_fin, r.zona, r.lugar, r.estado,
             u.nombre AS alumno_nombre
      FROM reservas_clase r
      JOIN usuarios u ON u.id = r.alumno_id
      WHERE r.profesor_id = $1 AND r.fecha = $2
      ORDER BY r.hora_inicio
    `, [profesor_id, fecha]);

    const fechaLabel = new Date(fecha + 'T12:00:00').toLocaleDateString('es-AR', {
      weekday:'long', day:'numeric', month:'long'
    });

    const confirmadas = clases.rows.filter(c => c.estado === 'confirmada');
    const pendientes  = clases.rows.filter(c => c.estado === 'pendiente');

    let msg = `🎾 *Resumen de clases — ${fechaLabel}*\n`;
    msg += `👨‍🏫 Profe: ${nombre}\n\n`;

    if (!clases.rows.length) {
      msg += `😴 Sin clases programadas para hoy.`;
    } else {
      clases.rows.forEach(c => {
        const hi = String(c.hora_inicio).substring(0,5);
        const hf = String(c.hora_fin).substring(0,5);
        const estado = c.estado === 'confirmada' ? '✅' : c.estado === 'cancelada' ? '❌' : '⏳';
        const lugar = c.zona ? ` · 📍 ${c.zona}${c.lugar ? ' — '+c.lugar : ''}` : '';
        msg += `${estado} ${hi} - ${hf} · ${c.alumno_nombre}${lugar}\n`;
      });
      msg += `\n📊 Total: ${confirmadas.length} confirmada(s)`;
      if (pendientes.length) msg += ` · ${pendientes.length} pendiente(s)`;
    }

    res.json({ ok: true, mensaje: msg, whatsapp_grupo, fecha });
  } catch (err) {
    console.error('GET /padel/clases/resumen-dia:', err.message);
    res.status(500).json({ error: 'Error interno' });
  }
});

// ── GET /padel/profesores/pendientes — para el superadmin
router.get('/profesores/pendientes', authAdmin, async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT p.*, u.email,
        json_agg(DISTINCT jsonb_build_object('zona', pz.zona, 'lugar', pz.lugar))
          FILTER (WHERE pz.id IS NOT NULL) AS zonas
      FROM profesores_padel p
      JOIN usuarios u ON u.id = p.usuario_id
      LEFT JOIN profesor_zonas pz ON pz.profesor_id = p.id
      WHERE p.estado = 'pendiente'
      GROUP BY p.id, u.email
      ORDER BY p.creado_en ASC
    `);
    res.json(result.rows);
  } catch(err) {
    console.error('GET /padel/profesores/pendientes:', err.message);
    res.status(500).json({ error: 'Error interno' });
  }
});

// ── GET /padel/profesores/todos — lista completa para admin
router.get('/profesores/todos', authAdmin, async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT p.*, u.email,
        json_agg(DISTINCT jsonb_build_object('zona', pz.zona, 'lugar', pz.lugar))
          FILTER (WHERE pz.id IS NOT NULL) AS zonas
      FROM profesores_padel p
      JOIN usuarios u ON u.id = p.usuario_id
      LEFT JOIN profesor_zonas pz ON pz.profesor_id = p.id
      GROUP BY p.id, u.email
      ORDER BY p.creado_en DESC
    `);
    res.json(result.rows);
  } catch(err) {
    console.error('GET /padel/profesores/todos:', err.message);
    res.status(500).json({ error: 'Error interno' });
  }
});

// ── PUT /padel/profesores/:id/estado — aprobar o rechazar
router.put('/profesores/:id/estado', authAdmin, async (req, res) => {
  const { estado } = req.body;
  if (!['aprobado','rechazado','pendiente'].includes(estado))
    return res.status(400).json({ error: 'estado inválido' });
  try {
    const result = await pool.query(
      'UPDATE profesores_padel SET estado = $1 WHERE id = $2 RETURNING *',
      [estado, req.params.id]
    );
    if (!result.rows.length) return res.status(404).json({ error: 'Profesor no encontrado' });
    res.json({ ok: true, perfil: result.rows[0] });
  } catch(err) {
    console.error('PUT /padel/profesores/:id/estado:', err.message);
    res.status(500).json({ error: 'Error interno' });
  }
});

// POST /padel/push-suscripcion — guardar suscripción
router.post('/push-suscripcion', authUsuario, async (req, res) => {
  const { endpoint, p256dh, auth, zona } = req.body;
  const usuario_id = req.usuario.id;
  try {
    await pool.query(`
      INSERT INTO push_suscripciones (usuario_id, endpoint, p256dh, auth, zona)
      VALUES ($1, $2, $3, $4, $5)
      ON CONFLICT (usuario_id, endpoint) DO UPDATE SET zona = $5
    `, [usuario_id, endpoint, p256dh, auth, zona]);
    res.json({ ok: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error guardando suscripción' });
  }
});

module.exports = router;

// ── DELETE /padel/reservas/:id ───────────────────────────────────────
// El jugador cancela su reserva + WhatsApp al club
router.delete('/reservas/:id', async (req, res) => {
  const { usuario_id } = req.body;
  if (!usuario_id) return res.status(400).json({ error: 'usuario_id requerido' });

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const reserva = await client.query(
      `SELECT r.*, n.nombre AS club_nombre, n.whatsapp, n.dueno_tel,
              d.hora_inicio, d.hora_fin, j.nombre AS jugador_nombre
       FROM reservas_padel r
       JOIN negocios n ON n.id = r.negocio_id
       JOIN disponibilidad_padel d ON d.id = r.disponibilidad_id
       LEFT JOIN jugadores_padel j ON j.id = r.jugador_id OR j.usuario_id = r.usuario_id
       WHERE r.id = $1`,
      [req.params.id]
    );

    if (reserva.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Reserva no encontrada' });
    }

    const r = reserva.rows[0];

    // Verificar que sea el dueño
    if (r.usuario_id !== usuario_id && r.jugador_id !== usuario_id) {
      await client.query('ROLLBACK');
      return res.status(403).json({ error: 'No autorizado' });
    }

    if (r.estado === 'cancelado') {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: 'La reserva ya está cancelada' });
    }

    await client.query(
      `UPDATE reservas_padel SET estado = 'cancelado', respondido_en = NOW() WHERE id = $1`,
      [req.params.id]
    );

    // WhatsApp al club
    let whatsapp_club = null;
    const telClub = (r.whatsapp || r.dueno_tel || '').replace(/\D/g, '');
    if (telClub) {
      const horaInicio = String(r.hora_inicio).substring(0, 5);
      const horaFin = String(r.hora_fin).substring(0, 5);
      const msg = '⚠️ Reserva cancelada por el jugador'
        + ' - Jugador: ' + (r.jugador_nombre || 'N/A')
        + ' - Fecha: ' + r.fecha
        + ' - Horario: ' + horaInicio + ' a ' + horaFin
        + ' - El turno quedó liberado';
      whatsapp_club = 'https://wa.me/' + telClub + '?text=' + encodeURIComponent(msg);
    }

    await client.query('COMMIT');
    res.json({ ok: true, whatsapp_club });

  } catch (err) {
    await client.query('ROLLBACK');
    console.error('DELETE /padel/reservas/:id:', err.message);
    res.status(500).json({ error: 'Error interno' });
  } finally {
    client.release();
  }
});

// ── POST /padel/disponibilidad/masiva ────────────────────────────────
// El club carga turnos en masa: por rango de fechas o repetición semanal
router.post('/disponibilidad/masiva', authAdmin, async (req, res) => {
  const {
    negocio_id, hora_inicio, hora_fin, precio_por_hora,
    cantidad_canchas, zona, numero_cancha,
    // Modo rango: fecha_desde + fecha_hasta + dias_semana (array [0-6])
    fecha_desde, fecha_hasta, dias_semana,
    // Modo semanal: dia_semana + repetir_semanas
    dia_semana, repetir_semanas
  } = req.body;

  if (!negocio_id || !hora_inicio || !hora_fin || !precio_por_hora) {
    return res.status(400).json({ error: 'negocio_id, hora_inicio, hora_fin y precio_por_hora son requeridos' });
  }

  try {
    const inserted = [];

    if (fecha_desde && fecha_hasta && dias_semana) {
      // Modo rango de fechas
      const desde = new Date(fecha_desde);
      const hasta = new Date(fecha_hasta);
      const dias = Array.isArray(dias_semana) ? dias_semana : [dias_semana];

      for (let d = new Date(desde); d <= hasta; d.setDate(d.getDate() + 1)) {
        if (dias.includes(d.getDay())) {
          const fechaStr = d.toISOString().split('T')[0];
          const r = await pool.query(`
            INSERT INTO disponibilidad_padel
              (negocio_id, dia_semana, hora_inicio, hora_fin, precio_por_hora, cantidad_canchas, zona, numero_cancha, fecha_especifica)
            VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
            ON CONFLICT DO NOTHING
            RETURNING id
          `, [negocio_id, d.getDay(), hora_inicio, hora_fin, precio_por_hora, cantidad_canchas||1, zona, numero_cancha||1, fechaStr]);
          if (r.rows.length) inserted.push(r.rows[0].id);
        }
      }
    } else if (dia_semana !== undefined && repetir_semanas) {
      // Modo repetición semanal
      const semanas = parseInt(repetir_semanas) || 4;
      for (let i = 0; i < semanas; i++) {
        const r = await pool.query(`
          INSERT INTO disponibilidad_padel
            (negocio_id, dia_semana, hora_inicio, hora_fin, precio_por_hora, cantidad_canchas, zona, numero_cancha)
          VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
          ON CONFLICT DO NOTHING
          RETURNING id
        `, [negocio_id, dia_semana, hora_inicio, hora_fin, precio_por_hora, cantidad_canchas||1, zona, numero_cancha||1]);
        if (r.rows.length) inserted.push(r.rows[0].id);
      }
    } else {
      return res.status(400).json({ error: 'Usá modo rango (fecha_desde+fecha_hasta+dias_semana) o semanal (dia_semana+repetir_semanas)' });
    }

    res.status(201).json({ ok: true, creados: inserted.length, ids: inserted });
  } catch (err) {
    console.error('POST /padel/disponibilidad/masiva:', err.message);
    res.status(500).json({ error: 'Error interno' });
  }
});
