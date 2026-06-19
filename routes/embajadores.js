// ================================================
//   EMBAJADORES — Rutas
//   Login, dashboard, comunidad, actividad
// ================================================

const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { pool } = require('../database');

// ── Middleware auth embajador ─────────────────────────────────────────
function authEmbajador(req, res, next) {
  const auth = req.headers.authorization;
  if (!auth || !auth.startsWith('Bearer ')) return res.status(401).json({ error: 'Sin token' });
  try {
    const payload = jwt.verify(auth.split(' ')[1], process.env.JWT_SECRET);
    if (!payload.embajador_id) return res.status(401).json({ error: 'Token inválido' });
    req.embajador = payload;
    next();
  } catch { res.status(401).json({ error: 'Token inválido' }); }
}

// ── POST /embajadores/login ───────────────────────────────────────────
router.post('/login', async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) return res.status(400).json({ error: 'Faltan datos' });
  try {
    const r = await pool.query('SELECT * FROM embajadores WHERE email = $1 AND activo = true', [email]);
    if (!r.rows.length) return res.status(401).json({ error: 'Email o contraseña incorrectos' });
    const emb = r.rows[0];
    const ok = await bcrypt.compare(password, emb.password_hash);
    if (!ok) return res.status(401).json({ error: 'Email o contraseña incorrectos' });
    await pool.query('UPDATE embajadores SET ultimo_login = NOW() WHERE id = $1', [emb.id]);
    const token = jwt.sign(
      { embajador_id: emb.id, nombre: emb.nombre, codigo: emb.codigo },
      process.env.JWT_SECRET,
      { expiresIn: '30d' }
    );
    res.json({
      token,
      embajador: {
        id: emb.id, nombre: emb.nombre, email: emb.email,
        codigo: emb.codigo, nivel: emb.nivel, telefono: emb.telefono
      }
    });
  } catch (err) {
    console.error('Error login embajador:', err);
    res.status(500).json({ error: 'Error interno' });
  }
});

// ── GET /embajadores/dashboard ────────────────────────────────────────
router.get('/dashboard', authEmbajador, async (req, res) => {
  const { embajador_id } = req.embajador;
  try {
    // Comunidad total
    const comunidad = await pool.query(
      'SELECT COUNT(*) FROM usuarios WHERE embajador_id = $1', [embajador_id]
    );

    // Reservas del mes (Caso A)
    const reservasMes = await pool.query(`
      SELECT COUNT(*) as cantidad, COALESCE(SUM(1000), 0) as monto
      FROM reservas_padel rp
      JOIN usuarios u ON u.id = rp.usuario_id
      WHERE u.embajador_id = $1
        AND rp.canal = 'app'
        AND rp.estado = 'confirmada'
        AND DATE_TRUNC('month', rp.fecha) = DATE_TRUNC('month', CURRENT_DATE)
    `, [embajador_id]);

    // Reservas hoy (Caso A)
    const reservasHoy = await pool.query(`
      SELECT COUNT(*) as cantidad
      FROM reservas_padel rp
      JOIN usuarios u ON u.id = rp.usuario_id
      WHERE u.embajador_id = $1
        AND rp.canal = 'app'
        AND rp.estado = 'confirmada'
        AND rp.fecha = CURRENT_DATE
    `, [embajador_id]);

    // Nivel del embajador
    const embData = await pool.query(
      'SELECT nivel, nombre, codigo, email, telefono, creado_en FROM embajadores WHERE id = $1',
      [embajador_id]
    );
    const emb = embData.rows[0];

    // Caso B (solo nivel plata/oro) — inscripciones de su red en eventos ajenos este mes
    let casoBMes = { cantidad: '0', monto: '0' };
    if (emb.nivel === 'plata' || emb.nivel === 'oro') {
      // torneos
      const torneosCasoB = await pool.query(`
        SELECT COUNT(*) as cantidad
        FROM parejas_torneo pt
        JOIN usuarios u ON (u.id = pt.jugador1_id OR u.id = pt.jugador2_id)
        WHERE u.embajador_id = $1
          AND DATE_TRUNC('month', pt.creado_en) = DATE_TRUNC('month', CURRENT_DATE)
      `, [embajador_id]);
      // americanos
      const americanosCasoB = await pool.query(`
        SELECT COUNT(*) as cantidad
        FROM americanos_jugadores aj
        JOIN usuarios u ON u.id = aj.usuario_id
        WHERE u.embajador_id = $1
          AND DATE_TRUNC('month', aj.creado_en) = DATE_TRUNC('month', CURRENT_DATE)
      `, [embajador_id]);
      const totalCasoB = parseInt(torneosCasoB.rows[0].cantidad) + parseInt(americanosCasoB.rows[0].cantidad);
      casoBMes = { cantidad: String(totalCasoB), monto: String(totalCasoB * 1000) };
    }

    // Ganancias últimos 6 meses (Caso A)
    const historico = await pool.query(`
      SELECT
        TO_CHAR(DATE_TRUNC('month', rp.fecha), 'Mon') as mes,
        DATE_TRUNC('month', rp.fecha) as fecha_mes,
        COUNT(*) as reservas,
        COUNT(*) * 1000 as monto
      FROM reservas_padel rp
      JOIN usuarios u ON u.id = rp.usuario_id
      WHERE u.embajador_id = $1
        AND rp.canal = 'app'
        AND rp.estado = 'confirmada'
        AND rp.fecha >= DATE_TRUNC('month', CURRENT_DATE) - INTERVAL '5 months'
      GROUP BY DATE_TRUNC('month', rp.fecha)
      ORDER BY fecha_mes ASC
    `, [embajador_id]);

    // Actividad reciente
    const actividad = await pool.query(`
      SELECT
        u.nombre || ' ' || u.apellido as jugador,
        rp.fecha,
        rp.hora_inicio,
        n.nombre as club,
        'reserva' as tipo
      FROM reservas_padel rp
      JOIN usuarios u ON u.id = rp.usuario_id
      JOIN negocios n ON n.id = rp.negocio_id
      WHERE u.embajador_id = $1
        AND rp.canal = 'app'
        AND rp.estado = 'confirmada'
      ORDER BY rp.fecha DESC, rp.hora_inicio DESC
      LIMIT 10
    `, [embajador_id]);

    res.json({
      embajador: emb,
      kpis: {
        comunidad_total: parseInt(comunidad.rows[0].count),
        reservas_mes: parseInt(reservasMes.rows[0].cantidad),
        ganancias_mes: parseInt(reservasMes.rows[0].monto) + parseInt(casoBMes.monto),
        reservas_hoy: parseInt(reservasHoy.rows[0].cantidad),
        caso_b_mes: parseInt(casoBMes.cantidad),
        caso_b_monto: parseInt(casoBMes.monto)
      },
      historico: historico.rows,
      actividad: actividad.rows
    });
  } catch (err) {
    console.error('Error dashboard embajador:', err);
    res.status(500).json({ error: 'Error interno' });
  }
});

// ── GET /embajadores/comunidad ────────────────────────────────────────
router.get('/comunidad', authEmbajador, async (req, res) => {
  const { embajador_id } = req.embajador;
  try {
    const r = await pool.query(`
      SELECT
        u.id, u.nombre, u.apellido, u.email, u.telefono,
        u.zona_principal, u.creado_en,
        jp.nivel, jp.ranking_puntos, jp.partidos_jugados,
        COUNT(DISTINCT rp.id) as reservas_total
      FROM usuarios u
      LEFT JOIN jugadores_padel jp ON jp.usuario_id = u.id
      LEFT JOIN reservas_padel rp ON rp.usuario_id = u.id AND rp.canal = 'app' AND rp.estado = 'confirmada'
      WHERE u.embajador_id = $1
      GROUP BY u.id, jp.nivel, jp.ranking_puntos, jp.partidos_jugados
      ORDER BY u.creado_en DESC
    `, [embajador_id]);
    res.json({ comunidad: r.rows, total: r.rows.length });
  } catch (err) {
    console.error('Error comunidad embajador:', err);
    res.status(500).json({ error: 'Error interno' });
  }
});

// ── GET /embajadores/me ───────────────────────────────────────────────
router.get('/me', authEmbajador, async (req, res) => {
  try {
    const r = await pool.query(
      'SELECT id, nombre, email, telefono, codigo, nivel, creado_en, ultimo_login FROM embajadores WHERE id = $1',
      [req.embajador.embajador_id]
    );
    res.json(r.rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Error interno' });
  }
});

// ── GET /embajadores/eventos-proximos ────────────────────────────────
router.get('/eventos-proximos', authEmbajador, async (req, res) => {
  try {
    const torneos = await pool.query(`
      SELECT id, nombre, sede, fecha_inicio as fecha, precio_inscripcion, estado, 'torneo' as tipo
      FROM torneos
      WHERE estado IN ('abierto','borrador')
        AND fecha_inicio >= CURRENT_DATE
      ORDER BY fecha_inicio ASC LIMIT 3
    `);
    const americanos = await pool.query(`
      SELECT id, nombre, sede, fecha, precio_inscripcion, estado, max_jugadores,
        (SELECT COUNT(*) FROM americanos_jugadores WHERE americano_id = americanos.id) as inscriptos,
        'americano' as tipo
      FROM americanos
      WHERE estado IN ('abierto')
        AND fecha >= CURRENT_DATE
      ORDER BY fecha ASC LIMIT 3
    `);
    res.json({ torneos: torneos.rows, americanos: americanos.rows });
  } catch(err) {
    console.error('Error eventos proximos:', err);
    res.status(500).json({ error: 'Error interno' });
  }
});

// ── POST /embajadores/partidos — crear partido público como embajador
router.post('/partidos', authEmbajador, async (req, res) => {
  try {
    const { embajador_id, nombre } = req.embajador;
    const { zona, categoria, fecha, hora, lugar, costo, descripcion, cupos } = req.body;
    if (!zona || !categoria || !fecha || !hora) {
      return res.status(400).json({ error: 'zona, categoria, fecha y hora son obligatorios' });
    }
    const result = await pool.query(
      `INSERT INTO partidos_publicos (zona, categoria, fecha, hora, lugar, costo, descripcion, cupos, creado_por_nombre, embajador_id)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) RETURNING *`,
      [zona, categoria, fecha, hora, lugar||null, costo||null, descripcion||null, cupos||4, nombre, embajador_id]
    );
    res.json(result.rows[0]);
  } catch(err) {
    console.error('POST /embajadores/partidos:', err);
    res.status(500).json({ error: err.message });
  }
});

// ── GET /embajadores/mis-partidos — partidos creados por este embajador
router.get('/mis-partidos', authEmbajador, async (req, res) => {
  try {
    const { embajador_id } = req.embajador;
    const { rows } = await pool.query(`
      SELECT pp.*,
        COUNT(pi2.id)::int AS inscriptos
      FROM partidos_publicos pp
      LEFT JOIN partidos_publicos_inscriptos pi2 ON pi2.partido_id = pp.id
      WHERE pp.embajador_id = $1
        AND pp.fecha >= (NOW() AT TIME ZONE 'America/Argentina/Cordoba')::date
      GROUP BY pp.id
      ORDER BY pp.fecha ASC, pp.hora ASC
    `, [embajador_id]);
    res.json(rows);
  } catch(err) {
    console.error('GET /embajadores/mis-partidos:', err);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
