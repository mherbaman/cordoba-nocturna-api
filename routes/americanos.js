// ================================================
//   CÓRDOBA NOCTURNA — Super 8 Americano
//   Routes: /americanos
// ================================================
const express = require('express');
const router = express.Router();
const { pool } = require('../database');

// ── Helpers ──────────────────────────────────────────────────────────

function formatPrecio(n) {
  if (!n) return '$ 0';
  return '$ ' + Number(n).toLocaleString('es-AR');
}

// Algoritmo de fixture americano para 8 jugadores
// Devuelve 7 rondas, cada ronda tiene 2 partidos de 4 jugadores
function generarFixtureAmericano(jugadores) {
  // jugadores: array de 8 objetos {usuario_id, nombre}
  // Algoritmo de rotación estándar para americano
  const n = jugadores.length; // 8
  const rondas = [];

  // Tabla fija de combinaciones para 8 jugadores americano
  // Cada ronda: [ [a,b vs c,d], [e,f vs g,h] ]
  const combinaciones = [
    [[0,1],[2,3],[4,5],[6,7]],
    [[0,2],[1,3],[4,6],[5,7]],
    [[0,3],[1,2],[4,7],[5,6]],
    [[0,4],[1,5],[2,6],[3,7]],
    [[0,5],[1,4],[2,7],[3,6]],
    [[0,6],[1,7],[2,4],[3,5]],
    [[0,7],[1,6],[2,5],[3,4]],
  ];

  for (let r = 0; r < 7; r++) {
    const [p1, p2, p3, p4] = combinaciones[r];
    rondas.push([
      { pareja1: [jugadores[p1[0]], jugadores[p1[1]]], pareja2: [jugadores[p2[0]], jugadores[p2[1]]] },
      { pareja1: [jugadores[p3[0]], jugadores[p3[1]]], pareja2: [jugadores[p4[0]], jugadores[p4[1]]] },
    ]);
  }
  return rondas;
}

function calcularHorarios(horaInicio, duracionMin, descansoMin, ronda, cancha) {
  // ronda 0-based, cancha 0-based
  // Todas las canchas juegan en paralelo, así que solo depende de la ronda
  const totalMinPorRonda = duracionMin + descansoMin;
  const offsetMin = ronda * totalMinPorRonda;
  const [h, m] = horaInicio.substring(0, 5).split(':').map(Number);
  const inicioMin = h * 60 + m + offsetMin;
  const finMin = inicioMin + duracionMin;
  const toTime = (mins) => {
    const hh = String(Math.floor(mins / 60)).padStart(2, '0');
    const mm = String(mins % 60).padStart(2, '0');
    return `${hh}:${mm}`;
  };
  return { hora_inicio: toTime(inicioMin), hora_fin: toTime(finMin) };
}

async function recalcularPosiciones(americano_id, client) {
  const db = client || pool;

  // Traer todos los jugadores inscriptos
  const jugRes = await db.query(
    'SELECT usuario_id, nombre FROM americanos_jugadores WHERE americano_id = $1',
    [americano_id]
  );

  // Inicializar stats
  const stats = {};
  for (const j of jugRes.rows) {
    stats[j.usuario_id] = {
      usuario_id: j.usuario_id,
      nombre: j.nombre,
      partidos_jugados: 0,
      partidos_ganados: 0,
      partidos_perdidos: 0,
      games_favor: 0,
      games_contra: 0,
      diferencia: 0,
    };
  }

  // Traer todos los partidos jugados
  const pRes = await db.query(
    `SELECT * FROM americanos_partidos WHERE americano_id = $1 AND estado = 'jugado'`,
    [americano_id]
  );

  for (const p of pRes.rows) {
    const g1 = p.games_pareja1;
    const g2 = p.games_pareja2;
    const pareja1 = [p.jugador1a_id, p.jugador1b_id];
    const pareja2 = [p.jugador2a_id, p.jugador2b_id];
    const gano1 = g1 > g2;
    const gano2 = g2 > g1;

    for (const uid of pareja1) {
      if (!stats[uid]) continue;
      stats[uid].partidos_jugados++;
      stats[uid].games_favor += g1;
      stats[uid].games_contra += g2;
      if (gano1) stats[uid].partidos_ganados++;
      else if (gano2) stats[uid].partidos_perdidos++;
    }
    for (const uid of pareja2) {
      if (!stats[uid]) continue;
      stats[uid].partidos_jugados++;
      stats[uid].games_favor += g2;
      stats[uid].games_contra += g1;
      if (gano2) stats[uid].partidos_ganados++;
      else if (gano1) stats[uid].partidos_perdidos++;
    }
  }

  // Calcular diferencia y ordenar
  const ranking = Object.values(stats).map(s => ({
    ...s,
    diferencia: s.games_favor - s.games_contra,
  })).sort((a, b) => {
    if (b.games_favor !== a.games_favor) return b.games_favor - a.games_favor;
    if (b.diferencia !== a.diferencia) return b.diferencia - a.diferencia;
    return a.games_contra - b.games_contra;
  });

  // Upsert posiciones
  for (let i = 0; i < ranking.length; i++) {
    const s = ranking[i];
    await db.query(`
      INSERT INTO americanos_posiciones
        (americano_id, usuario_id, nombre, partidos_jugados, partidos_ganados, partidos_perdidos,
         games_favor, games_contra, diferencia, posicion, actualizado_en)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,now())
      ON CONFLICT (americano_id, usuario_id) DO UPDATE SET
        nombre=$3, partidos_jugados=$4, partidos_ganados=$5, partidos_perdidos=$6,
        games_favor=$7, games_contra=$8, diferencia=$9, posicion=$10, actualizado_en=now()
    `, [americano_id, s.usuario_id, s.nombre, s.partidos_jugados, s.partidos_ganados,
        s.partidos_perdidos, s.games_favor, s.games_contra, s.diferencia, i + 1]);
  }
}

async function actualizarELO(americano_id) {
  // Al finalizar el americano, actualizar ELO por posición
  const pos = await pool.query(
    'SELECT usuario_id, posicion FROM americanos_posiciones WHERE americano_id = $1 ORDER BY posicion',
    [americano_id]
  );
  const total = pos.rows.length;
  for (const p of pos.rows) {
    let bonus = 0;
    if (p.posicion === 1) bonus = 30;
    else if (p.posicion === 2) bonus = 15;
    else if (p.posicion === 3) bonus = 5;
    else bonus = -10;
    await pool.query(`
      UPDATE jugadores_padel
      SET ranking_puntos = GREATEST(COALESCE(ranking_puntos, 1000) + $1, 0),
          actualizado_en = now()
      WHERE usuario_id = $2
    `, [bonus, p.usuario_id]);
  }
}

async function enviarEmailPartido(partido, americano, ronda) {
  // Placeholder — misma lógica que torneos
  // Se implementa en siguiente fase
}

// ── GET /americanos — listar todos ───────────────────────────────────
router.get('/', async (req, res) => {
  try {
    const r = await pool.query(`
      SELECT a.*,
        (SELECT COUNT(*) FROM americanos_jugadores aj WHERE aj.americano_id = a.id AND aj.estado = 'confirmado') AS inscriptos
      FROM americanos a
      ORDER BY a.fecha DESC, a.creado_en DESC
    `);
    res.json(r.rows);
  } catch (err) {
    console.error('GET /americanos:', err);
    res.status(500).json({ error: err.message });
  }
});

// ── GET /americanos/:id — detalle ────────────────────────────────────
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const a = await pool.query('SELECT * FROM americanos WHERE id = $1', [id]);
    if (!a.rows.length) return res.status(404).json({ error: 'No encontrado' });

    const jugadores = await pool.query(
      'SELECT aj.*, u.email FROM americanos_jugadores aj JOIN usuarios u ON u.id = aj.usuario_id WHERE aj.americano_id = $1 ORDER BY aj.creado_en',
      [id]
    );
    const partidos = await pool.query(
      `SELECT ap.*,
        u1a.nombre as nombre_1a, u1b.nombre as nombre_1b,
        u2a.nombre as nombre_2a, u2b.nombre as nombre_2b
       FROM americanos_partidos ap
       LEFT JOIN usuarios u1a ON u1a.id = ap.jugador1a_id
       LEFT JOIN usuarios u1b ON u1b.id = ap.jugador1b_id
       LEFT JOIN usuarios u2a ON u2a.id = ap.jugador2a_id
       LEFT JOIN usuarios u2b ON u2b.id = ap.jugador2b_id
       WHERE ap.americano_id = $1 ORDER BY ap.ronda, ap.cancha`,
      [id]
    );
    const posiciones = await pool.query(
      'SELECT * FROM americanos_posiciones WHERE americano_id = $1 ORDER BY posicion',
      [id]
    );

    res.json({
      ...a.rows[0],
      jugadores: jugadores.rows,
      partidos: partidos.rows,
      posiciones: posiciones.rows,
    });
  } catch (err) {
    console.error('GET /americanos/:id:', err);
    res.status(500).json({ error: err.message });
  }
});

// ── POST /americanos — crear ─────────────────────────────────────────
router.post('/', async (req, res) => {
  try {
    const {
      nombre, descripcion, sede, fecha, hora_inicio,
      cantidad_canchas, duracion_partido_min, descanso_entre_rondas_min,
      formato, precio_inscripcion
    } = req.body;

    if (!nombre || !fecha) return res.status(400).json({ error: 'Nombre y fecha son obligatorios' });

    const r = await pool.query(`
      INSERT INTO americanos
        (nombre, descripcion, sede, fecha, hora_inicio, cantidad_canchas,
         duracion_partido_min, descanso_entre_rondas_min, formato, precio_inscripcion, estado)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,'abierto')
      RETURNING *
    `, [nombre, descripcion || null, sede || null, fecha,
        hora_inicio || '09:00', cantidad_canchas || 2,
        duracion_partido_min || 20, descanso_entre_rondas_min || 5,
        formato || 'mejor_de_7', precio_inscripcion || 0]);

    res.json(r.rows[0]);
  } catch (err) {
    console.error('POST /americanos:', err);
    res.status(500).json({ error: err.message });
  }
});

// ── PUT /americanos/:id — modificar ──────────────────────────────────
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const {
      nombre, descripcion, sede, fecha, hora_inicio,
      cantidad_canchas, duracion_partido_min, descanso_entre_rondas_min,
      formato, precio_inscripcion, estado
    } = req.body;

    const r = await pool.query(`
      UPDATE americanos SET
        nombre=$1, descripcion=$2, sede=$3, fecha=$4, hora_inicio=$5,
        cantidad_canchas=$6, duracion_partido_min=$7, descanso_entre_rondas_min=$8,
        formato=$9, precio_inscripcion=$10, estado=$11, actualizado_en=now()
      WHERE id=$12 RETURNING *
    `, [nombre, descripcion, sede, fecha, hora_inicio,
        cantidad_canchas, duracion_partido_min, descanso_entre_rondas_min,
        formato, precio_inscripcion, estado, id]);

    res.json(r.rows[0]);
  } catch (err) {
    console.error('PUT /americanos/:id:', err);
    res.status(500).json({ error: err.message });
  }
});

// ── DELETE /americanos/:id — eliminar ────────────────────────────────
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    // CASCADE elimina posiciones, partidos y jugadores automáticamente
    await pool.query('DELETE FROM americanos WHERE id = $1', [id]);
    res.json({ ok: true });
  } catch (err) {
    console.error('DELETE /americanos/:id:', err);
    res.status(500).json({ error: err.message });
  }
});

// ── POST /americanos/:id/inscribir — inscribir jugador ───────────────
router.post('/:id/inscribir', async (req, res) => {
  try {
    const { id } = req.params;
    const { usuario_id, nombre, email } = req.body;

    const am = await pool.query('SELECT * FROM americanos WHERE id = $1', [id]);
    if (!am.rows.length) return res.status(404).json({ error: 'Americano no encontrado' });
    if (am.rows[0].estado !== 'abierto') return res.status(400).json({ error: 'Las inscripciones están cerradas' });

    const inscriptos = await pool.query(
      "SELECT COUNT(*) FROM americanos_jugadores WHERE americano_id = $1 AND estado = 'confirmado'",
      [id]
    );
    if (parseInt(inscriptos.rows[0].count) >= am.rows[0].max_jugadores) {
      return res.status(400).json({ error: 'El americano ya está completo' });
    }

    const r = await pool.query(`
      INSERT INTO americanos_jugadores (americano_id, usuario_id, nombre, email, estado)
      VALUES ($1,$2,$3,$4,'confirmado')
      ON CONFLICT (americano_id, usuario_id) DO NOTHING
      RETURNING *
    `, [id, usuario_id, nombre, email]);

    // Inicializar posición
    await pool.query(`
      INSERT INTO americanos_posiciones (americano_id, usuario_id, nombre)
      VALUES ($1,$2,$3)
      ON CONFLICT (americano_id, usuario_id) DO NOTHING
    `, [id, usuario_id, nombre]);

    res.json({ ok: true, jugador: r.rows[0] });
  } catch (err) {
    console.error('POST /americanos/:id/inscribir:', err);
    res.status(500).json({ error: err.message });
  }
});

// ── DELETE /americanos/:id/jugadores/:uid — desinscribir ─────────────
router.delete('/:id/jugadores/:uid', async (req, res) => {
  try {
    const { id, uid } = req.params;
    await pool.query('DELETE FROM americanos_jugadores WHERE americano_id=$1 AND usuario_id=$2', [id, uid]);
    await pool.query('DELETE FROM americanos_posiciones WHERE americano_id=$1 AND usuario_id=$2', [id, uid]);
    res.json({ ok: true });
  } catch (err) {
    console.error('DELETE jugador:', err);
    res.status(500).json({ error: err.message });
  }
});

// ── POST /americanos/:id/generar-fixture — genera todas las rondas ───
router.post('/:id/generar-fixture', async (req, res) => {
  try {
    const { id } = req.params;

    const am = await pool.query('SELECT * FROM americanos WHERE id = $1', [id]);
    if (!am.rows.length) return res.status(404).json({ error: 'No encontrado' });
    const a = am.rows[0];

    const jugRes = await pool.query(
      "SELECT usuario_id, nombre FROM americanos_jugadores WHERE americano_id = $1 AND estado = 'confirmado' ORDER BY creado_en",
      [id]
    );
    if (jugRes.rows.length !== 8) {
      return res.status(400).json({ error: `Se necesitan exactamente 8 jugadores. Hay ${jugRes.rows.length}.` });
    }

    // Borrar fixture anterior si existe
    await pool.query('DELETE FROM americanos_partidos WHERE americano_id = $1', [id]);

    const jugadores = jugRes.rows;
    const rondas = generarFixtureAmericano(jugadores);
    const horaInicio = a.hora_inicio.substring(0, 5);
    const duracion = a.duracion_partido_min;
    const descanso = a.descanso_entre_rondas_min;

    for (let r = 0; r < rondas.length; r++) {
      const partidos = rondas[r]; // 2 partidos en paralelo
      for (let c = 0; c < partidos.length; c++) {
        const p = partidos[c];
        const horario = calcularHorarios(horaInicio, duracion, descanso, r, c);
        await pool.query(`
          INSERT INTO americanos_partidos
            (americano_id, ronda, jugador1a_id, jugador1b_id, jugador2a_id, jugador2b_id,
             cancha, hora_inicio, hora_fin)
          VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
        `, [
          id, r + 1,
          p.pareja1[0].usuario_id, p.pareja1[1].usuario_id,
          p.pareja2[0].usuario_id, p.pareja2[1].usuario_id,
          c + 1, horario.hora_inicio, horario.hora_fin
        ]);
      }
    }

    // Cambiar estado a 'en_curso'
    await pool.query("UPDATE americanos SET estado='en_curso', actualizado_en=now() WHERE id=$1", [id]);

    res.json({ ok: true, rondas: rondas.length, partidos: rondas.length * 2 });
  } catch (err) {
    console.error('POST generar-fixture:', err);
    res.status(500).json({ error: err.message });
  }
});

// ── PUT /americanos/partidos/:pid/resultado — cargar resultado ────────
router.put('/partidos/:pid/resultado', async (req, res) => {
  try {
    const { pid } = req.params;
    const { games_pareja1, games_pareja2 } = req.body;

    const g1 = parseInt(games_pareja1);
    const g2 = parseInt(games_pareja2);

    // Validar formato según tipo
    const pRes = await pool.query('SELECT * FROM americanos_partidos WHERE id = $1', [pid]);
    if (!pRes.rows.length) return res.status(404).json({ error: 'Partido no encontrado' });
    const partido = pRes.rows[0];

    const amRes = await pool.query('SELECT formato FROM americanos WHERE id = $1', [partido.americano_id]);
    const formato = amRes.rows[0]?.formato;

    if (formato === 'mejor_de_7' && g1 + g2 !== 7) {
      return res.status(400).json({ error: 'En formato mejor de 7, los games deben sumar 7' });
    }
    if (formato === 'set' && (g1 < 0 || g2 < 0)) {
      return res.status(400).json({ error: 'Games inválidos' });
    }

    await pool.query(`
      UPDATE americanos_partidos SET
        games_pareja1=$1, games_pareja2=$2, estado='jugado', cargado_en=now()
      WHERE id=$3
    `, [g1, g2, pid]);

    // Recalcular posiciones
    await recalcularPosiciones(partido.americano_id);

    // Verificar si todos los partidos están jugados → finalizar
    const pendRes = await pool.query(
      "SELECT COUNT(*) FROM americanos_partidos WHERE americano_id=$1 AND estado='pendiente'",
      [partido.americano_id]
    );
    if (parseInt(pendRes.rows[0].count) === 0) {
      await pool.query(
        "UPDATE americanos SET estado='finalizado', actualizado_en=now() WHERE id=$1",
        [partido.americano_id]
      );
      await actualizarELO(partido.americano_id);
    }

    res.json({ ok: true });
  } catch (err) {
    console.error('PUT resultado:', err);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
