// ================================================
//   CÓRDOBA NOCTURNA — Super 8 Americano
// ================================================
const express = require('express');
const router = express.Router();
const { pool } = require('../database');
const { Resend } = require('resend');
const resend = new Resend('re_9bDafDkq_EDfpWKTWcE4gmB7rpdMJXA3G');
const FROM_EMAIL = 'PadelConnect <partidos@send.cordobalux.com>';
const APP_URL = process.env.APP_URL || 'https://cordobalux.com';

// ── Fixture americano 8 jugadores ─────────────────────────────────────
function generarFixtureAmericano(jugadores) {
  const combinaciones = [
    [[0,1],[2,3],[4,5],[6,7]],
    [[0,2],[1,3],[4,6],[5,7]],
    [[0,3],[1,2],[4,7],[5,6]],
    [[0,4],[1,5],[2,6],[3,7]],
    [[0,5],[1,4],[2,7],[3,6]],
    [[0,6],[1,7],[2,4],[3,5]],
    [[0,7],[1,6],[2,5],[3,4]],
  ];
  const rondas = [];
  for (let r = 0; r < 7; r++) {
    const [p1,p2,p3,p4] = combinaciones[r];
    rondas.push([
      { pareja1: [jugadores[p1[0]], jugadores[p1[1]]], pareja2: [jugadores[p2[0]], jugadores[p2[1]]] },
      { pareja1: [jugadores[p3[0]], jugadores[p3[1]]], pareja2: [jugadores[p4[0]], jugadores[p4[1]]] },
    ]);
  }
  return rondas;
}

function calcularHorarios(horaInicio, duracionMin, descansoMin, ronda) {
  const totalMinPorRonda = duracionMin + descansoMin;
  const offsetMin = ronda * totalMinPorRonda;
  const [h, m] = horaInicio.substring(0,5).split(':').map(Number);
  const inicioMin = h * 60 + m + offsetMin;
  const finMin = inicioMin + duracionMin;
  const toTime = (mins) => `${String(Math.floor(mins/60)).padStart(2,'0')}:${String(mins%60).padStart(2,'0')}`;
  return { hora_inicio: toTime(inicioMin), hora_fin: toTime(finMin) };
}

async function recalcularPosiciones(americano_id) {
  const jugRes = await pool.query(
    'SELECT usuario_id, nombre FROM americanos_jugadores WHERE americano_id = $1',
    [americano_id]
  );
  const stats = {};
  for (const j of jugRes.rows) {
    stats[j.usuario_id] = { usuario_id: j.usuario_id, nombre: j.nombre,
      partidos_jugados:0, partidos_ganados:0, partidos_perdidos:0,
      games_favor:0, games_contra:0 };
  }
  const pRes = await pool.query(
    "SELECT * FROM americanos_partidos WHERE americano_id = $1 AND estado = 'jugado'",
    [americano_id]
  );
  for (const p of pRes.rows) {
    const g1 = p.games_pareja1, g2 = p.games_pareja2;
    const pareja1 = [p.jugador1a_id, p.jugador1b_id];
    const pareja2 = [p.jugador2a_id, p.jugador2b_id];
    const gano1 = g1 > g2, gano2 = g2 > g1;
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
  const ranking = Object.values(stats).map(s => ({
    ...s, diferencia: s.games_favor - s.games_contra
  })).sort((a,b) => {
    if (b.games_favor !== a.games_favor) return b.games_favor - a.games_favor;
    if ((b.games_favor-b.games_contra) !== (a.games_favor-a.games_contra)) return (b.games_favor-b.games_contra) - (a.games_favor-a.games_contra);
    return a.games_contra - b.games_contra;
  });
  for (let i = 0; i < ranking.length; i++) {
    const s = ranking[i];
    await pool.query(`
      INSERT INTO americanos_posiciones
        (americano_id, usuario_id, nombre, partidos_jugados, partidos_ganados, partidos_perdidos,
         games_favor, games_contra, diferencia, posicion, actualizado_en)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,now())
      ON CONFLICT (americano_id, usuario_id) DO UPDATE SET
        nombre=$3, partidos_jugados=$4, partidos_ganados=$5, partidos_perdidos=$6,
        games_favor=$7, games_contra=$8, diferencia=$9, posicion=$10, actualizado_en=now()
    `, [americano_id, s.usuario_id, s.nombre, s.partidos_jugados, s.partidos_ganados,
        s.partidos_perdidos, s.games_favor, s.games_contra, s.games_favor-s.games_contra, i+1]);
  }
}

async function actualizarELO(americano_id) {
  const pos = await pool.query(
    'SELECT usuario_id, posicion FROM americanos_posiciones WHERE americano_id = $1 ORDER BY posicion',
    [americano_id]
  );
  for (const p of pos.rows) {
    const bonus = p.posicion === 1 ? 30 : p.posicion === 2 ? 15 : p.posicion === 3 ? 5 : -10;
    await pool.query(
      'UPDATE jugadores_padel SET ranking_puntos = GREATEST(COALESCE(ranking_puntos,1000)+$1,0), actualizado_en=now() WHERE usuario_id=$2',
      [bonus, p.usuario_id]
    );
  }
}

function emailFixtureAmericano(jugador, americano, partidos) {
  const formato = americano.formato === 'mejor_de_7' ? 'Mejor de 7 games' : '1 Set';
  const filas = partidos.map((p, i) => {
    const hora = p.hora_inicio ? String(p.hora_inicio).substring(0,5) + 'hs' : 'A confirmar';
    const cancha = p.cancha ? 'C.' + p.cancha : 'A confirmar';
    const esP1 = p.jugador1a_id === jugador.usuario_id || p.jugador1b_id === jugador.usuario_id;
    const compas = esP1
      ? [p.nombre_1a, p.nombre_1b].filter(n => n && n !== jugador.nombre).join(' / ')
      : [p.nombre_2a, p.nombre_2b].filter(n => n && n !== jugador.nombre).join(' / ');
    const rivales = esP1
      ? (p.nombre_2a || '') + ' / ' + (p.nombre_2b || '')
      : (p.nombre_1a || '') + ' / ' + (p.nombre_1b || '');
    return '<tr style="border-bottom:1px solid #eee;' + (i%2===0?'background:#fafafa':'') + '">' +
      '<td style="padding:10px 8px;font-weight:700;color:#666">R' + p.ronda + '</td>' +
      '<td style="padding:10px 8px">' + hora + '</td>' +
      '<td style="padding:10px 8px;text-align:center">' + cancha + '</td>' +
      '<td style="padding:10px 8px;color:#666">' + (compas || 'compañero') + '</td>' +
      '<td style="padding:10px 8px;color:#1a1a2e;font-weight:600">vs ' + rivales + '</td>' +
      '</tr>';
  }).join('');
  return '<div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;color:#333">' +
    '<div style="background:#1a1a2e;padding:24px;text-align:center">' +
    '<h1 style="color:#fff;margin:0;font-size:22px">Padel Connect</h1>' +
    '<p style="color:rgba(255,255,255,.7);margin:8px 0 0;font-size:14px">Super 8 Americano</p></div>' +
    '<div style="padding:32px 24px">' +
    '<h2>Tu fixture esta listo, ' + jugador.nombre + '!</h2>' +
    '<p style="color:#666"><strong>' + americano.nombre + '</strong> - ' + (americano.sede||'') + ' - ' + String(americano.fecha).substring(0,10) + ' - ' + formato + '</p>' +
    '<p>Jugas <strong>' + partidos.length + ' partidos</strong> en el dia:</p>' +
    '<table style="width:100%;border-collapse:collapse;font-size:14px;margin-top:12px">' +
    '<thead><tr style="background:#1a1a2e;color:#fff">' +
    '<th style="padding:10px 8px;text-align:left">Ronda</th>' +
    '<th style="padding:10px 8px;text-align:left">Hora</th>' +
    '<th style="padding:10px 8px;text-align:center">Cancha</th>' +
    '<th style="padding:10px 8px;text-align:left">Companero</th>' +
    '<th style="padding:10px 8px;text-align:left">Rivales</th>' +
    '</tr></thead><tbody>' + filas + '</tbody></table>' +
    '<div style="margin-top:24px;padding:16px;background:#f0fdf4;border-left:4px solid #22c55e;border-radius:4px">' +
    '<p style="margin:0;font-size:13px;color:#15803d">Segui el ranking en la app: ' +
    '<a href="' + APP_URL + '/padel-connect.html" style="color:#15803d;font-weight:700">cordobalux.com</a></p></div>' +
    '</div></div>';
}

function emailResultadoAmericano(jugador, partido, proximo) {
  const esP1 = partido.jugador1a_id === jugador.usuario_id || partido.jugador1b_id === jugador.usuario_id;
  const misGames = esP1 ? partido.games_pareja1 : partido.games_pareja2;
  const gano = esP1 ? partido.games_pareja1 > partido.games_pareja2 : partido.games_pareja2 > partido.games_pareja1;
  const rival = esP1
    ? [partido.nombre_2a, partido.nombre_2b].filter(Boolean).join(' / ')
    : [partido.nombre_1a, partido.nombre_1b].filter(Boolean).join(' / ');
  const compas = esP1
    ? [partido.nombre_1a, partido.nombre_1b].filter(n => n && n !== jugador.nombre).join(' / ')
    : [partido.nombre_2a, partido.nombre_2b].filter(n => n && n !== jugador.nombre).join(' / ');
  const proximoHtml = proximo
    ? '<div style="background:#e8f5e9;border-radius:8px;padding:20px;margin-top:20px">' +
      '<h3 style="margin:0 0 10px;color:#2e7d32">Tu proximo partido</h3>' +
      '<p style="margin:4px 0"><strong>Ronda:</strong> ' + proximo.ronda + '</p>' +
      '<p style="margin:4px 0"><strong>Hora:</strong> ' + (proximo.hora_inicio ? String(proximo.hora_inicio).substring(0,5)+'hs' : 'A confirmar') + '</p>' +
      '<p style="margin:4px 0"><strong>Cancha:</strong> ' + (proximo.cancha || 'A confirmar') + '</p></div>'
    : '<p style="margin-top:16px;color:#999;font-size:13px">No tenes mas partidos pendientes.</p>';
  return '<div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;color:#333">' +
    '<div style="background:#1a1a2e;padding:24px;text-align:center">' +
    '<h1 style="color:#fff;margin:0;font-size:22px">Padel Connect</h1></div>' +
    '<div style="padding:32px 24px">' +
    '<h2>Resultado ' + (partido.fase==='semifinal'?'Semifinal':partido.fase==='final'?'Final':partido.fase==='tercer_puesto'?'3er Puesto':'Ronda '+partido.ronda) + '</h2>' +
    '<p style="color:#666;margin-bottom:16px">Hola <strong>' + jugador.nombre + '</strong>' + (compas?' · Compañero: <strong>'+compas+'</strong>':'') + '</p>' +
    '<div style="background:#f5f5f5;border-radius:8px;padding:20px;text-align:center">' +
    '<p style="color:#666;font-size:13px;margin:0 0 8px">vs <strong>' + rival + '</strong></p>' +
    '<p style="font-size:28px;font-weight:bold;margin:0">' + partido.games_pareja1 + ' - ' + partido.games_pareja2 + '</p>' +
    '<p style="margin:8px 0 0;color:' + (gano?'#15803d':'#dc2626') + ';font-weight:700">' + (gano?'Ganaste! 🎉':'Perdiste') + ' - ' + misGames + ' games a favor</p></div>' +
    proximoHtml +
    '<p style="margin-top:20px;text-align:center"><a href="' + APP_URL + '/padel-connect.html" style="color:#4f46e5">Ver ranking</a></p>' +
    '</div></div>';
}

function emailCampeonAmericano(jugador, americano, posicion) {
  const emojis = ['', '🥇','🥈','🥉'];
  const textos = ['', 'Campeon!', 'Subcampeon!', 'Tercer puesto!'];
  return '<div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;color:#333">' +
    '<div style="background:#1a1a2e;padding:24px;text-align:center">' +
    '<h1 style="color:#fff;margin:0;font-size:22px">Padel Connect</h1></div>' +
    '<div style="padding:32px 24px;text-align:center">' +
    '<div style="font-size:64px">' + (emojis[posicion]||'🏅') + '</div>' +
    '<h2>' + (textos[posicion]||posicion+'° puesto') + '</h2>' +
    '<p><strong>' + jugador.nombre + '</strong> termino <strong>' + posicion + '</strong> en ' + americano.nombre + '</p>' +
    '<p style="color:#666">Tu ranking ELO fue actualizado.</p>' +
    '<a href="' + APP_URL + '/padel-connect.html" style="display:inline-block;background:#4f46e5;color:#fff;padding:14px 28px;border-radius:8px;text-decoration:none;font-weight:bold;margin-top:16px">Ver ranking</a>' +
    '</div></div>';
}

async function enviarFixturePorEmail(americano_id) {
  try {
    const amRes = await pool.query('SELECT * FROM americanos WHERE id = $1', [americano_id]);
    const americano = amRes.rows[0];
    const jugRes = await pool.query(
      'SELECT aj.usuario_id, aj.nombre, u.email FROM americanos_jugadores aj JOIN usuarios u ON u.id = aj.usuario_id WHERE aj.americano_id = $1 AND aj.estado = $2',
      [americano_id, 'confirmado']
    );
    const partidosRes = await pool.query(
      `SELECT ap.*, TRIM(u1a.nombre || COALESCE(' ' || u1a.apellido, '')) as nombre_1a, TRIM(u1b.nombre || COALESCE(' ' || u1b.apellido, '')) as nombre_1b, TRIM(u2a.nombre || COALESCE(' ' || u2a.apellido, '')) as nombre_2a, TRIM(u2b.nombre || COALESCE(' ' || u2b.apellido, '')) as nombre_2b FROM americanos_partidos ap LEFT JOIN usuarios u1a ON u1a.id = ap.jugador1a_id LEFT JOIN usuarios u1b ON u1b.id = ap.jugador1b_id LEFT JOIN usuarios u2a ON u2a.id = ap.jugador2a_id LEFT JOIN usuarios u2b ON u2b.id = ap.jugador2b_id WHERE ap.americano_id = $1 ORDER BY ap.ronda, ap.cancha`,
      [americano_id]
    );
    for (const jug of jugRes.rows) {
      const misPartidos = partidosRes.rows.filter(p =>
        p.jugador1a_id === jug.usuario_id || p.jugador1b_id === jug.usuario_id ||
        p.jugador2a_id === jug.usuario_id || p.jugador2b_id === jug.usuario_id
      );
      await resend.emails.send({
        from: FROM_EMAIL,
        to: jug.email,
        subject: 'Tu fixture - ' + americano.nombre,
        html: emailFixtureAmericano(jug, americano, misPartidos)
      });
    }
    console.log('Emails fixture americano enviados: ' + americano_id);
  } catch(e) {
    console.error('Error emails fixture americano:', e.message);
  }
}

// ── GET /americanos ───────────────────────────────────────────────────
router.get('/', async (req, res) => {
  try {
    const r = await pool.query(
      'SELECT a.*, (SELECT COUNT(*) FROM americanos_jugadores aj WHERE aj.americano_id = a.id AND aj.estado = $1) AS inscriptos FROM americanos a ORDER BY a.fecha DESC, a.creado_en DESC',
      ['confirmado']
    );
    res.json(r.rows);
  } catch(err) { console.error('GET /americanos:', err); res.status(500).json({ error: err.message }); }
});

// ── GET /americanos/:id ───────────────────────────────────────────────
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const a = await pool.query('SELECT * FROM americanos WHERE id = $1', [id]);
    if (!a.rows.length) return res.status(404).json({ error: 'No encontrado' });
    const jugadores = await pool.query(
      `SELECT aj.*, u.email, COALESCE(jp.ranking_puntos, 1000) as ranking_puntos, COALESCE(jp.nivel, 'sin nivel') as categoria_jugador FROM americanos_jugadores aj JOIN usuarios u ON u.id = aj.usuario_id LEFT JOIN jugadores_padel jp ON jp.usuario_id = aj.usuario_id WHERE aj.americano_id = $1 ORDER BY aj.creado_en`,
      [id]
    );
    const partidos = await pool.query(
      `SELECT ap.*, TRIM(u1a.nombre || COALESCE(' ' || u1a.apellido, '')) as nombre_1a, TRIM(u1b.nombre || COALESCE(' ' || u1b.apellido, '')) as nombre_1b, TRIM(u2a.nombre || COALESCE(' ' || u2a.apellido, '')) as nombre_2a, TRIM(u2b.nombre || COALESCE(' ' || u2b.apellido, '')) as nombre_2b FROM americanos_partidos ap LEFT JOIN usuarios u1a ON u1a.id = ap.jugador1a_id LEFT JOIN usuarios u1b ON u1b.id = ap.jugador1b_id LEFT JOIN usuarios u2a ON u2a.id = ap.jugador2a_id LEFT JOIN usuarios u2b ON u2b.id = ap.jugador2b_id WHERE ap.americano_id = $1 ORDER BY ap.ronda, ap.cancha`,
      [id]
    );
    const posiciones = await pool.query(
      'SELECT * FROM americanos_posiciones WHERE americano_id = $1 ORDER BY posicion',
      [id]
    );
    res.json({ ...a.rows[0], jugadores: jugadores.rows, partidos: partidos.rows, posiciones: posiciones.rows });
  } catch(err) { console.error('GET /americanos/:id:', err); res.status(500).json({ error: err.message }); }
});

// ── POST /americanos ──────────────────────────────────────────────────
router.post('/', async (req, res) => {
  try {
    const { nombre, descripcion, sede, fecha, hora_inicio, cantidad_canchas,
            duracion_partido_min, descanso_entre_rondas_min, formato, precio_inscripcion, categoria } = req.body;
    if (!nombre || !fecha) return res.status(400).json({ error: 'Nombre y fecha son obligatorios' });
    const r = await pool.query(
      'INSERT INTO americanos (nombre, descripcion, sede, fecha, hora_inicio, cantidad_canchas, duracion_partido_min, descanso_entre_rondas_min, formato, precio_inscripcion, estado, categoria) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12) RETURNING *',
      [nombre, descripcion||null, sede||null, fecha, hora_inicio||'09:00',
       cantidad_canchas||2, duracion_partido_min||20, descanso_entre_rondas_min||5,
       formato||'mejor_de_7', precio_inscripcion||0, 'proximamente', categoria||null]
    );
    res.json(r.rows[0]);
  } catch(err) { console.error('POST /americanos:', err); res.status(500).json({ error: err.message }); }
});

// ── PUT /americanos/:id/estado ────────────────────────────────────────
router.put('/:id/estado', async (req, res) => {
  try {
    const { id } = req.params;
    const { estado } = req.body;
    const r = await pool.query(
      'UPDATE americanos SET estado=$1, actualizado_en=now() WHERE id=$2 RETURNING *',
      [estado, id]
    );
    res.json(r.rows[0]);
  } catch(err) { console.error('PUT estado:', err); res.status(500).json({ error: err.message }); }
});

// ── DELETE /americanos/:id ────────────────────────────────────────────
router.delete('/:id', async (req, res) => {
  try {
    await pool.query('DELETE FROM americanos WHERE id = $1', [req.params.id]);
    res.json({ ok: true });
  } catch(err) { console.error('DELETE /americanos/:id:', err); res.status(500).json({ error: err.message }); }
});

// ── POST /americanos/:id/inscribir ────────────────────────────────────
router.post('/:id/inscribir', async (req, res) => {
  try {
    const { id } = req.params;
    // Autenticacion por token
    const token = req.headers['authorization']?.split(' ')[1];
    if (!token) return res.status(401).json({ error: 'Debes iniciar sesion para inscribirte' });
    let usuario_id;
    try {
      const decoded = require('jsonwebtoken').verify(token, process.env.JWT_SECRET);
      usuario_id = decoded.id || decoded.usuario_id;
    } catch(e) { return res.status(401).json({ error: 'Token invalido' }); }
    // Datos del usuario
    const uRes = await pool.query('SELECT id, nombre, email FROM usuarios WHERE id = $1', [usuario_id]);
    if (!uRes.rows.length) return res.status(404).json({ error: 'Usuario no encontrado' });
    const { email } = uRes.rows[0];
    const nombre = [uRes.rows[0].nombre, uRes.rows[0].apellido].filter(Boolean).join(' ');
    // Validaciones del americano
    const am = await pool.query('SELECT * FROM americanos WHERE id = $1', [id]);
    if (!am.rows.length) return res.status(404).json({ error: 'No encontrado' });
    if (am.rows[0].estado !== 'abierto') return res.status(400).json({ error: 'Las inscripciones estan cerradas' });
    const cnt = await pool.query(
      'SELECT COUNT(*) FROM americanos_jugadores WHERE americano_id=$1 AND estado=$2', [id,'confirmado']
    );
    if (parseInt(cnt.rows[0].count) >= am.rows[0].max_jugadores)
      return res.status(400).json({ error: 'El americano ya esta completo' });
    // Insertar
    const ins = await pool.query(
      'INSERT INTO americanos_jugadores (americano_id, usuario_id, nombre, email, estado) VALUES ($1,$2,$3,$4,$5) ON CONFLICT (americano_id, usuario_id) DO NOTHING RETURNING id',
      [id, usuario_id, nombre, email, 'confirmado']
    );
    if (!ins.rows.length) return res.status(400).json({ error: 'Ya estas inscripto en este americano' });
    await pool.query(
      'INSERT INTO americanos_posiciones (americano_id, usuario_id, nombre) VALUES ($1,$2,$3) ON CONFLICT (americano_id, usuario_id) DO NOTHING',
      [id, usuario_id, nombre]
    );
    res.json({ ok: true, mensaje: 'Inscripcion confirmada' });
  } catch(err) { console.error('POST inscribir:', err); res.status(500).json({ error: err.message }); }
});

// ── DELETE /americanos/:id/jugadores/:uid ─────────────────────────────
router.delete('/:id/jugadores/:uid', async (req, res) => {
  try {
    const { id, uid } = req.params;
    await pool.query('DELETE FROM americanos_jugadores WHERE americano_id=$1 AND usuario_id=$2', [id, uid]);
    await pool.query('DELETE FROM americanos_posiciones WHERE americano_id=$1 AND usuario_id=$2', [id, uid]);
    res.json({ ok: true });
  } catch(err) { console.error('DELETE jugador:', err); res.status(500).json({ error: err.message }); }
});

// ── POST /americanos/:id/generar-fixture ──────────────────────────────
router.post('/:id/generar-fixture', async (req, res) => {
  try {
    const { id } = req.params;
    const am = await pool.query('SELECT * FROM americanos WHERE id = $1', [id]);
    if (!am.rows.length) return res.status(404).json({ error: 'No encontrado' });
    const a = am.rows[0];
    const jugRes = await pool.query(
      'SELECT usuario_id, nombre FROM americanos_jugadores WHERE americano_id=$1 AND estado=$2 ORDER BY creado_en',
      [id, 'confirmado']
    );
    if (jugRes.rows.length !== 8)
      return res.status(400).json({ error: 'Se necesitan exactamente 8 jugadores. Hay ' + jugRes.rows.length + '.' });
    await pool.query('DELETE FROM americanos_partidos WHERE americano_id = $1', [id]);
    const rondas = generarFixtureAmericano(jugRes.rows);
    const horaInicio = a.hora_inicio.substring(0,5);
    for (let r = 0; r < rondas.length; r++) {
      for (let c = 0; c < rondas[r].length; c++) {
        const p = rondas[r][c];
        const horario = calcularHorarios(horaInicio, a.duracion_partido_min, a.descanso_entre_rondas_min, r);
        await pool.query(
          'INSERT INTO americanos_partidos (americano_id, ronda, jugador1a_id, jugador1b_id, jugador2a_id, jugador2b_id, cancha, hora_inicio, hora_fin) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)',
          [id, r+1, p.pareja1[0].usuario_id, p.pareja1[1].usuario_id,
           p.pareja2[0].usuario_id, p.pareja2[1].usuario_id,
           c+1, horario.hora_inicio, horario.hora_fin]
        );
      }
    }
    await pool.query("UPDATE americanos SET estado='en_curso', actualizado_en=now() WHERE id=$1", [id]);
    await enviarFixturePorEmail(id);
    res.json({ ok: true, rondas: rondas.length, partidos: rondas.length * 2 });
  } catch(err) { console.error('POST generar-fixture:', err); res.status(500).json({ error: err.message }); }
});

// ── PUT /americanos/partidos/:pid/resultado ───────────────────────────
router.put('/partidos/:pid/resultado', async (req, res) => {
  try {
    const { pid } = req.params;
    const { games_pareja1, games_pareja2 } = req.body;
    const g1 = parseInt(games_pareja1), g2 = parseInt(games_pareja2);
    const pRes = await pool.query(
      `SELECT ap.*, TRIM(u1a.nombre || COALESCE(' ' || u1a.apellido, '')) as nombre_1a, TRIM(u1b.nombre || COALESCE(' ' || u1b.apellido, '')) as nombre_1b, TRIM(u2a.nombre || COALESCE(' ' || u2a.apellido, '')) as nombre_2a, TRIM(u2b.nombre || COALESCE(' ' || u2b.apellido, '')) as nombre_2b FROM americanos_partidos ap LEFT JOIN usuarios u1a ON u1a.id = ap.jugador1a_id LEFT JOIN usuarios u1b ON u1b.id = ap.jugador1b_id LEFT JOIN usuarios u2a ON u2a.id = ap.jugador2a_id LEFT JOIN usuarios u2b ON u2b.id = ap.jugador2b_id WHERE ap.id = $1`,
      [pid]
    );
    if (!pRes.rows.length) return res.status(404).json({ error: 'Partido no encontrado' });
    const partido = pRes.rows[0];
    const amRes = await pool.query('SELECT * FROM americanos WHERE id = $1', [partido.americano_id]);
    const americano = amRes.rows[0];
    if (americano.formato === 'mejor_de_7' && g1 + g2 !== 7)
      return res.status(400).json({ error: 'En formato mejor de 7, los games deben sumar 7' });
    await pool.query(
      "UPDATE americanos_partidos SET games_pareja1=$1, games_pareja2=$2, estado='jugado', cargado_en=now() WHERE id=$3",
      [g1, g2, pid]
    );
    await recalcularPosiciones(partido.americano_id);
    // Email resultado a cada jugador
    const uids = [partido.jugador1a_id, partido.jugador1b_id, partido.jugador2a_id, partido.jugador2b_id].filter(Boolean);
    const nombres = { [partido.jugador1a_id]: partido.nombre_1a, [partido.jugador1b_id]: partido.nombre_1b,
                      [partido.jugador2a_id]: partido.nombre_2a, [partido.jugador2b_id]: partido.nombre_2b };
    for (const uid of uids) {
      const eRes = await pool.query('SELECT email FROM usuarios WHERE id = $1', [uid]);
      if (!eRes.rows.length) continue;
      const proxRes = await pool.query(
        "SELECT * FROM americanos_partidos WHERE americano_id=$1 AND estado='pendiente' AND (jugador1a_id=$2 OR jugador1b_id=$2 OR jugador2a_id=$2 OR jugador2b_id=$2) ORDER BY ronda LIMIT 1",
        [partido.americano_id, uid]
      );
      await resend.emails.send({
        from: FROM_EMAIL,
        to: eRes.rows[0].email,
        subject: (partido.fase === 'semifinal' ? 'Semifinal' : partido.fase === 'final' ? 'Final' : partido.fase === 'tercer_puesto' ? '3er Puesto' : 'Ronda ' + partido.ronda) + ' - ' + americano.nombre,
        html: emailResultadoAmericano({ usuario_id: uid, nombre: nombres[uid] }, partido, proxRes.rows[0]||null)
      });
    }
    // Verificar si termino la fase actual
    const pendRes = await pool.query(
      "SELECT COUNT(*) FROM americanos_partidos WHERE americano_id=$1 AND estado='pendiente' AND fase=$2",
      [partido.americano_id, partido.fase]
    );
    const pendientes = parseInt(pendRes.rows[0].count);

    if (pendientes === 0 && partido.fase === 'americano') {
      // Termino la fase americana → generar bracket con top 4
      await recalcularPosiciones(partido.americano_id);
      const top4Res = await pool.query(
        'SELECT ap.usuario_id, ap.nombre FROM americanos_posiciones ap WHERE ap.americano_id=$1 ORDER BY ap.posicion ASC LIMIT 4',
        [partido.americano_id]
      );
      if (top4Res.rows.length === 4) {
        const [p1, p2, p3, p4] = top4Res.rows;
        // Semi 1: 1° vs 4°, Semi 2: 2° vs 3°
        // Ronda 8 = semis, Ronda 9 = final + 3er puesto
        await pool.query(
          "INSERT INTO americanos_partidos (americano_id, jugador1a_id, jugador1b_id, jugador2a_id, jugador2b_id, cancha, ronda, fase, estado) VALUES ($1,$2,NULL,$3,NULL,1,8,'semifinal','pendiente'), ($1,$4,NULL,$5,NULL,2,8,'semifinal','pendiente')",
          [partido.americano_id, p1.usuario_id, p4.usuario_id, p2.usuario_id, p3.usuario_id]
        );
        await pool.query("UPDATE americanos SET estado='bracket', actualizado_en=now() WHERE id=$1", [partido.americano_id]);
        console.log('Bracket generado para americano ' + partido.americano_id);
      }
    } else if (pendientes === 0 && partido.fase === 'semifinal') {
      // Termino semis → generar final y 3er puesto
      const semisRes = await pool.query(
        "SELECT * FROM americanos_partidos WHERE americano_id=$1 AND fase='semifinal' ORDER BY cancha",
        [partido.americano_id]
      );
      const semi1 = semisRes.rows[0];
      const semi2 = semisRes.rows[1];
      // Ganadores van a la final, perdedores al 3er puesto
      const ganS1 = semi1.games_pareja1 > semi1.games_pareja2 ? semi1.jugador1a_id : semi1.jugador2a_id;
      const perS1 = semi1.games_pareja1 > semi1.games_pareja2 ? semi1.jugador2a_id : semi1.jugador1a_id;
      const ganS2 = semi2.games_pareja1 > semi2.games_pareja2 ? semi2.jugador1a_id : semi2.jugador2a_id;
      const perS2 = semi2.games_pareja1 > semi2.games_pareja2 ? semi2.jugador2a_id : semi2.jugador1a_id;
      await pool.query(
        "INSERT INTO americanos_partidos (americano_id, jugador1a_id, jugador2a_id, cancha, ronda, fase, estado) VALUES ($1,$2,$3,1,9,'final','pendiente'), ($1,$4,$5,2,9,'tercer_puesto','pendiente')",
        [partido.americano_id, ganS1, ganS2, perS1, perS2]
      );
    } else if (pendientes === 0 && (partido.fase === 'final' || partido.fase === 'tercer_puesto')) {
      // Verificar si tanto final como 3er puesto estan jugados
      const brackPend = await pool.query(
        "SELECT COUNT(*) FROM americanos_partidos WHERE americano_id=$1 AND fase IN ('final','tercer_puesto') AND estado='pendiente'",
        [partido.americano_id]
      );
      if (parseInt(brackPend.rows[0].count) === 0) {
        // Todo terminado → actualizar ELO y enviar emails campeones
        await pool.query("UPDATE americanos SET estado='finalizado', actualizado_en=now() WHERE id=$1", [partido.americano_id]);
        await actualizarELO(partido.americano_id);
        const posRes = await pool.query(
          'SELECT ap.posicion, aj.usuario_id, aj.nombre, u.email FROM americanos_posiciones ap JOIN americanos_jugadores aj ON aj.usuario_id=ap.usuario_id AND aj.americano_id=ap.americano_id JOIN usuarios u ON u.id=aj.usuario_id WHERE ap.americano_id=$1 AND ap.posicion<=3 ORDER BY ap.posicion',
          [partido.americano_id]
        );
        for (const p of posRes.rows) {
          await resend.emails.send({
            from: FROM_EMAIL,
            to: p.email,
            subject: (p.posicion===1?'Campeon!':p.posicion===2?'Subcampeon!':'3er puesto!') + ' - ' + americano.nombre,
            html: emailCampeonAmericano(p, americano, p.posicion)
          });
        }
      }
    }
    res.json({ ok: true });
  } catch(err) { console.error('PUT resultado:', err); res.status(500).json({ error: err.message }); }
});

module.exports = router;
