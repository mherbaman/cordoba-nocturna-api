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

    // Turnos para ese día: con fecha exacta O recurrentes del mismo día
    const disponibles = await pool.query(`
      SELECT d.*
      FROM disponibilidad_padel d
      WHERE d.negocio_id = $1
        AND d.activo = true
        AND (
          (d.fecha_especifica = $3)
          OR
          (d.fecha_especifica IS NULL AND d.dia_semana = $2)
        )
    `, [negocio_id, diaSemana, fecha]);

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
            SELECT puntuacion AS p FROM resenas_padel WHERE a_jugador_id = $1
            UNION ALL
            SELECT puntuacion AS p FROM resenas_club_jugador WHERE jugador_id = $1
          ) t
        ),
        total_resenas = (
          SELECT COUNT(*) FROM resenas_padel WHERE a_jugador_id = $1
        ) + (
          SELECT COUNT(*) FROM resenas_club_jugador WHERE jugador_id = $1
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
