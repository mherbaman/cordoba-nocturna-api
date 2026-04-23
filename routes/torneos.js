// ============================================================
// routes/torneos.js — Módulo Torneos CórdobaLux
// ============================================================

const express = require('express');
const router = express.Router();
const crypto = require('crypto');
const { Resend } = require('resend');
const { authAdmin, authUsuario } = require('../middleware/auth');
const { pool } = require('../database');
const {
  generarFixture,
  generarBracket,
  calcularPosiciones,
  parsearResultado,
  generarSlots
} = require('../utils/fixtureGenerator');

const resend = new Resend('re_9bDafDkq_EDfpWKTWcE4gmB7rpdMJXA3G');
const FROM_EMAIL = 'PadelConnect <partidos@send.cordobalux.com>';
const APP_URL = 'https://cordobalux.com';

// ============================================================
// PÚBLICOS (sin auth)
// ============================================================

// GET /torneos — lista torneos visibles
router.get('/', async (req, res) => {
  try {
    const { rows } = await pool.query(`
      SELECT t.*,
        json_agg(
          json_build_object(
            'id', ct.id,
            'nombre', ct.nombre,
            'nivel', ct.nivel,
            'genero', ct.genero,
            'cupo_max', ct.cupo_max,
            'inscriptos', (
              SELECT COUNT(*) FROM parejas_torneo p
              WHERE p.categoria_id = ct.id AND p.estado = 'confirmada'
            )
          ) ORDER BY ct.genero, ct.nivel
        ) AS categorias
      FROM torneos t
      LEFT JOIN categorias_torneo ct ON ct.torneo_id = t.id AND ct.activa = true
      WHERE t.estado != 'borrador'
      GROUP BY t.id
      ORDER BY t.fecha_inicio DESC
    `);
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al obtener torneos' });
  }
});

// GET /torneos/admin/lista — todos los torneos para el admin
router.get('/admin/lista', authAdmin, async (req, res) => {
  try {
    const { rows } = await pool.query(`
      SELECT t.*,
        (SELECT COUNT(*) FROM categorias_torneo WHERE torneo_id = t.id) AS total_categorias,
        (SELECT COUNT(*) FROM parejas_torneo WHERE torneo_id = t.id AND estado = 'confirmada') AS total_parejas
      FROM torneos t
      ORDER BY t.creado_en DESC
    `);
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al obtener torneos' });
  }
});

// GET /torneos/:id — detalle, posiciones y bracket
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const torneo = await pool.query('SELECT * FROM torneos WHERE id = $1', [id]);
    if (!torneo.rows[0]) return res.status(404).json({ error: 'Torneo no encontrado' });

    const categorias = await pool.query(`
      SELECT ct.*,
        (SELECT COUNT(*) FROM parejas_torneo p WHERE p.categoria_id = ct.id AND p.estado = 'confirmada') AS inscriptos
      FROM categorias_torneo ct WHERE ct.torneo_id = $1 AND ct.activa = true
      ORDER BY ct.genero, ct.nivel
    `, [id]);

    // Posiciones por categoría/grupo
    const posiciones = await pool.query(`
      SELECT pos.*, pt.nombre_pareja,
        u1.nombre AS jugador1_nombre, u1.foto_url AS jugador1_foto,
        u2.nombre AS jugador2_nombre, u2.foto_url AS jugador2_foto
      FROM posiciones_torneo pos
      JOIN parejas_torneo pt ON pt.id = pos.pareja_id
      JOIN usuarios u1 ON u1.id = pt.jugador1_id
      LEFT JOIN usuarios u2 ON u2.id = pt.jugador2_id
      WHERE pos.torneo_id = $1
      ORDER BY pos.categoria_id, pos.grupo, pos.posicion
    `, [id]);

    // Partidos
    const partidos = await pool.query(`
      SELECT par.*,
        p1.nombre_pareja AS pareja1_nombre,
        p2.nombre_pareja AS pareja2_nombre,
        g.nombre_pareja AS ganador_nombre
      FROM partidos_torneo par
      LEFT JOIN parejas_torneo p1 ON p1.id = par.pareja1_id
      LEFT JOIN parejas_torneo p2 ON p2.id = par.pareja2_id
      LEFT JOIN parejas_torneo g  ON g.id  = par.ganador_id
      WHERE par.torneo_id = $1
      ORDER BY par.categoria_id, par.fase, par.grupo, par.ronda, par.cancha
    `, [id]);

    res.json({
      torneo: torneo.rows[0],
      categorias: categorias.rows,
      posiciones: posiciones.rows,
      partidos: partidos.rows
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al obtener torneo' });
  }
});

// GET /torneos/confirmar/:token — confirmar invitación de pareja
router.get('/confirmar/:token', async (req, res) => {
  try {
    const { token } = req.params;

    const { rows } = await pool.query(`
      SELECT pt.*, t.nombre AS torneo_nombre, ct.nombre AS categoria_nombre,
             u1.nombre AS jugador1_nombre
      FROM parejas_torneo pt
      JOIN torneos t ON t.id = pt.torneo_id
      JOIN categorias_torneo ct ON ct.id = pt.categoria_id
      JOIN usuarios u1 ON u1.id = pt.jugador1_id
      WHERE pt.token_invitacion = $1
    `, [token]);

    const pareja = rows[0];
    if (!pareja) return res.status(404).json({ error: 'Invitación no encontrada o expirada' });

    if (pareja.estado !== 'pendiente_confirmacion') {
      return res.status(400).json({ error: 'Esta invitación ya fue procesada', estado: pareja.estado });
    }

    if (new Date() > new Date(pareja.token_expira_en)) {
      return res.status(400).json({ error: 'La invitación expiró' });
    }

    res.json({
      valida: true,
      pareja,
      mensaje: `${pareja.jugador1_nombre} te invita a jugar el torneo ${pareja.torneo_nombre} — categoría ${pareja.categoria_nombre}`
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al verificar invitación' });
  }
});

// POST /torneos/confirmar/:token — aceptar o rechazar invitación
router.post('/confirmar/:token', async (req, res) => {
  try {
    const { token } = req.params;
    const { accion } = req.body; // 'aceptar' | 'rechazar'

    if (!['aceptar', 'rechazar'].includes(accion)) {
      return res.status(400).json({ error: 'Acción inválida' });
    }

    const { rows } = await pool.query(`
      SELECT pt.*, t.nombre AS torneo_nombre, ct.nombre AS categoria_nombre,
             u1.nombre AS jugador1_nombre, u1.email AS jugador1_email
      FROM parejas_torneo pt
      JOIN torneos t ON t.id = pt.torneo_id
      JOIN categorias_torneo ct ON ct.id = pt.categoria_id
      JOIN usuarios u1 ON u1.id = pt.jugador1_id
      WHERE pt.token_invitacion = $1
    `, [token]);

    const pareja = rows[0];
    if (!pareja) return res.status(404).json({ error: 'Invitación no encontrada' });
    if (pareja.estado !== 'pendiente_confirmacion') {
      return res.status(400).json({ error: 'Esta invitación ya fue procesada' });
    }
    if (new Date() > new Date(pareja.token_expira_en)) {
      return res.status(400).json({ error: 'La invitación expiró' });
    }

    const nuevoEstado = accion === 'aceptar' ? 'confirmada' : 'rechazada';

    await pool.query(`
      UPDATE parejas_torneo
      SET estado = $1, actualizado_en = NOW()
      WHERE token_invitacion = $2
    `, [nuevoEstado, token]);

    // Notificar al jugador 1
    if (accion === 'aceptar') {
      await resend.emails.send({
        from: FROM_EMAIL,
        to: pareja.jugador1_email,
        subject: `✅ ${pareja.jugador2_nombre} aceptó jugar con vos — ${pareja.torneo_nombre}`,
        html: emailParejaConfirmada(pareja)
      });
    }

    res.json({
      ok: true,
      estado: nuevoEstado,
      mensaje: accion === 'aceptar' ? 'Pareja confirmada. ¡Nos vemos en la cancha!' : 'Invitación rechazada'
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al procesar invitación' });
  }
});

// ============================================================
// USUARIO AUTENTICADO
// ============================================================

// POST /torneos/inscribir — crear pareja e invitar compañero
router.post('/inscribir', authUsuario, async (req, res) => {
  try {
    const { torneo_id, categoria_id, jugador2_email, jugador2_nombre, nombre_pareja } = req.body;
    const jugador1_id = req.usuario.id;

    // Validar torneo
    const torneoQ = await pool.query(
      "SELECT * FROM torneos WHERE id = $1 AND estado = 'inscripciones_abiertas'",
      [torneo_id]
    );
    if (!torneoQ.rows[0]) return res.status(400).json({ error: 'El torneo no está recibiendo inscripciones' });

    // Validar categoría
    const catQ = await pool.query(
      'SELECT * FROM categorias_torneo WHERE id = $1 AND torneo_id = $2 AND activa = true',
      [categoria_id, torneo_id]
    );
    if (!catQ.rows[0]) return res.status(400).json({ error: 'Categoría no válida' });

    // Verificar cupo
    const inscriptosQ = await pool.query(
      "SELECT COUNT(*) FROM parejas_torneo WHERE categoria_id = $1 AND estado = 'confirmada'",
      [categoria_id]
    );
    const inscriptos = parseInt(inscriptosQ.rows[0].count);
    if (inscriptos >= catQ.rows[0].cupo_max) {
      return res.status(400).json({ error: 'No hay cupos disponibles en esta categoría' });
    }

    // Verificar que jugador1 no esté ya inscripto en esta categoría
    const yaInscriptoQ = await pool.query(`
      SELECT id FROM parejas_torneo
      WHERE categoria_id = $1 AND jugador1_id = $2 AND estado NOT IN ('rechazada', 'eliminada')
    `, [categoria_id, jugador1_id]);
    if (yaInscriptoQ.rows[0]) {
      return res.status(400).json({ error: 'Ya estás inscripto en esta categoría' });
    }

    // Buscar si jugador2 existe en el sistema
    const jugador2Q = await pool.query(
      'SELECT id, nombre FROM usuarios WHERE email = $1',
      [jugador2_email.toLowerCase()]
    );
    const jugador2 = jugador2Q.rows[0];

    // Generar token de invitación (72hs de validez)
    const token = crypto.randomBytes(32).toString('hex');
    const expira = new Date();
    expira.setHours(expira.getHours() + 72);

    // Crear pareja
    const nuevaPareja = await pool.query(`
      INSERT INTO parejas_torneo
        (torneo_id, categoria_id, jugador1_id, jugador2_id, jugador2_email, jugador2_nombre,
         nombre_pareja, token_invitacion, token_expira_en, estado)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, 'pendiente_confirmacion')
      RETURNING *
    `, [
      torneo_id, categoria_id, jugador1_id,
      jugador2 ? jugador2.id : null,
      jugador2_email.toLowerCase(),
      jugador2_nombre,
      nombre_pareja || null,
      token, expira
    ]);

    const torneo = torneoQ.rows[0];
    const categoria = catQ.rows[0];
    const jugador1 = req.usuario;
    const linkConfirmacion = `${APP_URL}/confirmar-pareja.html?token=${token}`;

    // Enviar email de invitación
    await resend.emails.send({
      from: FROM_EMAIL,
      to: jugador2_email,
      subject: `🎾 ${jugador1.nombre} te invita a jugar el torneo ${torneo.nombre}`,
      html: emailInvitacion({
        jugador1Nombre: jugador1.nombre,
        jugador2Nombre: jugador2_nombre,
        torneoNombre: torneo.nombre,
        categoriaNombre: categoria.nombre,
        torneoFecha: torneo.fecha_inicio,
        torneoSede: torneo.sede,
        linkConfirmacion,
        expiraHoras: 72
      })
    });

    res.json({
      ok: true,
      pareja: nuevaPareja.rows[0],
      mensaje: `Invitación enviada a ${jugador2_email}. Tu compañero tiene 72hs para confirmar.`
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al inscribir pareja' });
  }
});

// GET /torneos/mis-inscripciones — parejas del usuario logueado
router.get('/mis-inscripciones', authUsuario, async (req, res) => {
  try {
    const { rows } = await pool.query(`
      SELECT pt.*,
        t.nombre AS torneo_nombre, t.fecha_inicio, t.fecha_fin, t.sede, t.estado AS torneo_estado,
        ct.nombre AS categoria_nombre,
        u1.nombre AS jugador1_nombre, u1.foto_url AS jugador1_foto,
        u2.nombre AS jugador2_nombre, u2.foto_url AS jugador2_foto
      FROM parejas_torneo pt
      JOIN torneos t ON t.id = pt.torneo_id
      JOIN categorias_torneo ct ON ct.id = pt.categoria_id
      JOIN usuarios u1 ON u1.id = pt.jugador1_id
      LEFT JOIN usuarios u2 ON u2.id = pt.jugador2_id
      WHERE (pt.jugador1_id = $1 OR pt.jugador2_id = $1)
        AND pt.estado NOT IN ('rechazada', 'eliminada')
      ORDER BY t.fecha_inicio DESC
    `, [req.usuario.id]);

    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al obtener inscripciones' });
  }
});

// ============================================================
// ADMIN
// ============================================================

// POST /torneos — crear torneo
router.post('/', authAdmin, async (req, res) => {
  try {
    const {
      nombre, descripcion, sede,
      fecha_inicio, fecha_fin,
      cantidad_canchas, duracion_partido_min,
      descanso_entre_rondas_min, hora_inicio_dia, hora_fin_dia,
      precio_inscripcion, categorias
    } = req.body;

    // Calcular capacidad del torneo
    const slots = generarSlots({
      fecha_inicio, fecha_fin,
      cantidad_canchas: cantidad_canchas || 1,
      duracion_partido_min: duracion_partido_min || 45,
      descanso_entre_rondas_min: descanso_entre_rondas_min || 15,
      hora_inicio_dia: hora_inicio_dia || '09:00',
      hora_fin_dia: hora_fin_dia || '21:00'
    });

    const { rows } = await pool.query(`
      INSERT INTO torneos
        (nombre, descripcion, sede, fecha_inicio, fecha_fin,
         cantidad_canchas, duracion_partido_min, descanso_entre_rondas_min,
         hora_inicio_dia, hora_fin_dia, precio_inscripcion, estado)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,'borrador')
      RETURNING *
    `, [
      nombre, descripcion, sede,
      fecha_inicio, fecha_fin,
      cantidad_canchas || 1,
      duracion_partido_min || 45,
      descanso_entre_rondas_min || 15,
      hora_inicio_dia || '09:00',
      hora_fin_dia || '21:00',
      precio_inscripcion || 0
    ]);

    const torneo = rows[0];

    // Crear categorías si vienen en el body
    if (categorias && categorias.length > 0) {
      for (const cat of categorias) {
        await pool.query(`
          INSERT INTO categorias_torneo (torneo_id, nombre, nivel, genero, cupo_max)
          VALUES ($1, $2, $3, $4, $5)
        `, [torneo.id, cat.nombre, cat.nivel, cat.genero, cat.cupo_max || 16]);
      }
    }

    res.json({
      ok: true,
      torneo,
      slots_disponibles: slots.length,
      mensaje: `Torneo creado. ${slots.length} slots disponibles para partidos.`
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al crear torneo' });
  }
});

// PUT /torneos/:id/estado — cambiar estado
router.put('/:id/estado', authAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { estado } = req.body;

    const estadosValidos = ['borrador', 'inscripciones_abiertas', 'inscripciones_cerradas', 'en_curso', 'finalizado'];
    if (!estadosValidos.includes(estado)) {
      return res.status(400).json({ error: 'Estado inválido' });
    }

    await pool.query(
      'UPDATE torneos SET estado = $1, actualizado_en = NOW() WHERE id = $2',
      [estado, id]
    );

    // Si se cierran inscripciones → disparar fixture automático
    if (estado === 'inscripciones_cerradas') {
      await generarFixtureCompleto(id);
    }

    res.json({ ok: true, estado });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al cambiar estado' });
  }
});

// POST /torneos/partidos/:id/resultado — cargar resultado
router.post('/partidos/:id/resultado', authAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { resultado_pareja1, resultado_pareja2, walkover_ganador_id } = req.body;

    const partidoQ = await pool.query(
      'SELECT * FROM partidos_torneo WHERE id = $1',
      [id]
    );
    const partido = partidoQ.rows[0];
    if (!partido) return res.status(404).json({ error: 'Partido no encontrado' });

    let updateData = {
      estado: 'jugado',
      cargado_por: req.admin.id,
      cargado_en: new Date()
    };

    if (walkover_ganador_id) {
      // Walkover
      updateData.estado = 'walkover';
      updateData.ganador_id = walkover_ganador_id;
    } else {
      const parsed = parsearResultado(resultado_pareja1, resultado_pareja2);
      if (!parsed) return res.status(400).json({ error: 'Formato de resultado inválido. Ej: "6-3 6-4"' });

      updateData.resultado_pareja1 = resultado_pareja1;
      updateData.resultado_pareja2 = resultado_pareja2;
      updateData.sets_pareja1 = parsed.sets_pareja1;
      updateData.sets_pareja2 = parsed.sets_pareja2;
      updateData.games_pareja1 = parsed.games_pareja1;
      updateData.games_pareja2 = parsed.games_pareja2;
      updateData.ganador_id = parsed.ganador === 1 ? partido.pareja1_id : partido.pareja2_id;
    }

    await pool.query(`
      UPDATE partidos_torneo SET
        estado = $1, resultado_pareja1 = $2, resultado_pareja2 = $3,
        sets_pareja1 = $4, sets_pareja2 = $5,
        games_pareja1 = $6, games_pareja2 = $7,
        ganador_id = $8, cargado_por = $9, cargado_en = $10
      WHERE id = $11
    `, [
      updateData.estado,
      updateData.resultado_pareja1 || null,
      updateData.resultado_pareja2 || null,
      updateData.sets_pareja1 || 0,
      updateData.sets_pareja2 || 0,
      updateData.games_pareja1 || 0,
      updateData.games_pareja2 || 0,
      updateData.ganador_id,
      updateData.cargado_por,
      updateData.cargado_en,
      id
    ]);

    // Recalcular posiciones del grupo
    if (partido.fase === 'grupos') {
      await recalcularPosiciones(partido.torneo_id, partido.categoria_id, partido.grupo);

      // Verificar si terminó la fase de grupos para generar bracket
      await verificarYGenerarBracket(partido.torneo_id, partido.categoria_id);
    }

    // Actualizar bracket si es semifinal
    if (partido.fase === 'semifinal') {
      await actualizarBracket(partido.torneo_id, partido.categoria_id, id, updateData.ganador_id);
    }

    // Enviar email de resultado a ambas parejas
    await enviarEmailResultado(partido, updateData);

    res.json({ ok: true, mensaje: 'Resultado cargado correctamente' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al cargar resultado' });
  }
});



// ============================================================
// DELEGADO (authUsuario + verificar que sea delegado)
// ============================================================

const authDelegado = async (req, res, next) => {
  try {
    // authUsuario ya cargó req.usuario
    const { rows } = await pool.query(
      'SELECT * FROM delegados_torneo WHERE usuario_id = $1 AND activo = true',
      [req.usuario.id]
    );
    if (!rows[0]) return res.status(403).json({ error: 'No tenés permisos de delegado' });
    req.delegado = rows[0];
    next();
  } catch (err) {
    res.status(500).json({ error: 'Error de autorización' });
  }
};

// POST /torneos/delegado/resultado — mismo que admin pero para delegados
router.post('/delegado/resultado/:id', authUsuario, authDelegado, async (req, res) => {
  req.admin = { id: req.usuario.id }; // adaptar para reutilizar lógica
  // Redirigir al handler de admin
  req.params.id = req.params.id;
  return router.handle(
    Object.assign(req, { url: `/partidos/${req.params.id}/resultado`, method: 'POST', isAdmin: false }),
    res,
    () => {}
  );
});

// GET /torneos/delegado/partidos-hoy — partidos del día para cargar
router.get('/delegado/partidos-hoy', authUsuario, authDelegado, async (req, res) => {
  try {
    const { torneo_id } = req.query;
    const hoy = new Date().toISOString().split('T')[0];

    let q = `
      SELECT par.*,
        p1.nombre_pareja AS pareja1_nombre, p2.nombre_pareja AS pareja2_nombre
      FROM partidos_torneo par
      LEFT JOIN parejas_torneo p1 ON p1.id = par.pareja1_id
      LEFT JOIN parejas_torneo p2 ON p2.id = par.pareja2_id
      WHERE par.fecha = $1
    `;
    const params = [hoy];

    if (torneo_id) {
      q += ' AND par.torneo_id = $2';
      params.push(torneo_id);
    }

    q += ' ORDER BY par.hora_inicio, par.cancha';

    const { rows } = await pool.query(q, params);
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al obtener partidos' });
  }
});

// ============================================================
// FUNCIONES INTERNAS
// ============================================================

async function generarFixtureCompleto(torneoId) {
  const torneoQ = await pool.query('SELECT * FROM torneos WHERE id = $1', [torneoId]);
  const torneo = torneoQ.rows[0];

  const categoriasQ = await pool.query(
    'SELECT * FROM categorias_torneo WHERE torneo_id = $1 AND activa = true',
    [torneoId]
  );

  const categorias = [];
  for (const cat of categoriasQ.rows) {
    const parejasQ = await pool.query(
      "SELECT * FROM parejas_torneo WHERE categoria_id = $1 AND estado = 'confirmada'",
      [cat.id]
    );
    categorias.push({ ...cat, parejas: parejasQ.rows });
  }

  const partidos = generarFixture(torneo, categorias);

  // Insertar todos los partidos
  for (const p of partidos) {
    await pool.query(`
      INSERT INTO partidos_torneo
        (torneo_id, categoria_id, fase, grupo, ronda, pareja1_id, pareja2_id,
         cancha, fecha, hora_inicio, hora_fin, estado)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)
    `, [
      p.torneo_id, p.categoria_id, p.fase, p.grupo, p.ronda,
      p.pareja1_id, p.pareja2_id,
      p.cancha, p.fecha, p.hora_inicio, p.hora_fin, p.estado
    ]);
  }

  // Inicializar posiciones
  for (const cat of categorias) {
    for (const pareja of cat.parejas) {
      await pool.query(`
        INSERT INTO posiciones_torneo
          (torneo_id, categoria_id, pareja_id, grupo)
        VALUES ($1, $2, $3, $4)
        ON CONFLICT (torneo_id, categoria_id, pareja_id) DO NOTHING
      `, [torneoId, cat.id, pareja.id, pareja.numero_grupo]);
    }
  }

  // Actualizar estado a en_curso
  await pool.query(
    "UPDATE torneos SET estado = 'en_curso', actualizado_en = NOW() WHERE id = $1",
    [torneoId]
  );

  // Enviar fixture por email a cada pareja
  await enviarFixturePorEmail(torneoId, categorias, partidos);

  console.log(`Fixture generado: ${partidos.length} partidos para torneo ${torneoId}`);
}

async function recalcularPosiciones(torneoId, categoriaId, grupo) {
  const parejasQ = await pool.query(
    'SELECT * FROM parejas_torneo WHERE categoria_id = $1 AND numero_grupo = $2 AND estado = $3',
    [categoriaId, grupo, 'confirmada']
  );

  const partidosQ = await pool.query(
    "SELECT * FROM partidos_torneo WHERE torneo_id = $1 AND categoria_id = $2 AND grupo = $3 AND fase = 'grupos'",
    [torneoId, categoriaId, grupo]
  );

  const posiciones = calcularPosiciones(parejasQ.rows, partidosQ.rows);

  for (const pos of posiciones) {
    await pool.query(`
      INSERT INTO posiciones_torneo
        (torneo_id, categoria_id, pareja_id, grupo,
         partidos_jugados, partidos_ganados, partidos_perdidos,
         sets_favor, sets_contra, games_favor, games_contra,
         puntos, posicion, actualizado_en)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,NOW())
      ON CONFLICT (torneo_id, categoria_id, pareja_id)
      DO UPDATE SET
        partidos_jugados = EXCLUDED.partidos_jugados,
        partidos_ganados = EXCLUDED.partidos_ganados,
        partidos_perdidos = EXCLUDED.partidos_perdidos,
        sets_favor = EXCLUDED.sets_favor,
        sets_contra = EXCLUDED.sets_contra,
        games_favor = EXCLUDED.games_favor,
        games_contra = EXCLUDED.games_contra,
        puntos = EXCLUDED.puntos,
        posicion = EXCLUDED.posicion,
        actualizado_en = NOW()
    `, [
      torneoId, categoriaId, pos.pareja_id, pos.grupo,
      pos.partidos_jugados, pos.partidos_ganados, pos.partidos_perdidos,
      pos.sets_favor, pos.sets_contra, pos.games_favor, pos.games_contra,
      pos.puntos, pos.posicion
    ]);
  }
}

async function verificarYGenerarBracket(torneoId, categoriaId) {
  // Verificar si todos los partidos de grupos están jugados
  const pendientesQ = await pool.query(`
    SELECT COUNT(*) FROM partidos_torneo
    WHERE torneo_id = $1 AND categoria_id = $2
      AND fase = 'grupos' AND estado NOT IN ('jugado', 'walkover')
  `, [torneoId, categoriaId]);

  if (parseInt(pendientesQ.rows[0].count) > 0) return; // Aún hay partidos pendientes

  // Verificar que no existan ya partidos de semifinal para esta categoría
  const semisQ = await pool.query(`
    SELECT COUNT(*) FROM partidos_torneo
    WHERE torneo_id = $1 AND categoria_id = $2 AND fase = 'semifinal'
  `, [torneoId, categoriaId]);

  if (parseInt(semisQ.rows[0].count) > 0) return; // Ya se generó el bracket

  // Obtener posiciones finales
  const posicionesQ = await pool.query(
    'SELECT * FROM posiciones_torneo WHERE torneo_id = $1 AND categoria_id = $2 ORDER BY grupo, posicion',
    [torneoId, categoriaId]
  );

  // Obtener slots libres para el bracket
  const torneoQ = await pool.query('SELECT * FROM torneos WHERE id = $1', [torneoId]);
  const slotsUsadosQ = await pool.query(
    "SELECT fecha, hora_inicio, cancha FROM partidos_torneo WHERE torneo_id = $1",
    [torneoId]
  );

  const slotsUsados = new Set(slotsUsadosQ.rows.map(s => `${s.fecha}-${s.hora_inicio}-${s.cancha}`));
  const todosSlots = generarSlots(torneoQ.rows[0]);
  const slotsLibres = todosSlots.filter(s => !slotsUsados.has(`${s.fecha}-${s.hora_inicio}-${s.cancha}`));

  const categoriaQ = await pool.query('SELECT * FROM categorias_torneo WHERE id = $1', [categoriaId]);

  const bracketPartidos = generarBracket(
    torneoQ.rows[0],
    categoriaQ.rows[0],
    posicionesQ.rows,
    slotsLibres
  );

  for (const p of bracketPartidos) {
    await pool.query(`
      INSERT INTO partidos_torneo
        (torneo_id, categoria_id, fase, ronda, pareja1_id, pareja2_id,
         cancha, fecha, hora_inicio, hora_fin, estado)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)
    `, [
      p.torneo_id, p.categoria_id, p.fase, p.ronda,
      p.pareja1_id, p.pareja2_id,
      p.cancha, p.fecha, p.hora_inicio, p.hora_fin, p.estado
    ]);
  }

  // Notificar a clasificados
  await notificarClasificados(torneoId, categoriaId, posicionesQ.rows);

  console.log(`Bracket generado para torneo ${torneoId}, categoría ${categoriaId}`);
}

async function actualizarBracket(torneoId, categoriaId, semifinalId, ganadorId) {
  // Determinar si es SF1 o SF2 y actualizar Final y 3er puesto
  const semisQ = await pool.query(`
    SELECT * FROM partidos_torneo
    WHERE torneo_id = $1 AND categoria_id = $2 AND fase = 'semifinal'
    ORDER BY id
  `, [torneoId, categoriaId]);

  const finalQ = await pool.query(`
    SELECT * FROM partidos_torneo
    WHERE torneo_id = $1 AND categoria_id = $2 AND fase = 'final'
  `, [torneoId, categoriaId]);

  const tercerQ = await pool.query(`
    SELECT * FROM partidos_torneo
    WHERE torneo_id = $1 AND categoria_id = $2 AND fase = 'tercer_puesto'
  `, [torneoId, categoriaId]);

  if (!finalQ.rows[0] || !tercerQ.rows[0]) return;

  const sf = semisQ.rows.find(s => s.id === parseInt(semifinalId));
  if (!sf) return;

  const perdedorId = sf.pareja1_id === ganadorId ? sf.pareja2_id : sf.pareja1_id;

  const esSF1 = semisQ.rows[0].id === parseInt(semifinalId);

  if (esSF1) {
    await pool.query(
      'UPDATE partidos_torneo SET pareja1_id = $1 WHERE id = $2',
      [ganadorId, finalQ.rows[0].id]
    );
    await pool.query(
      'UPDATE partidos_torneo SET pareja1_id = $1 WHERE id = $2',
      [perdedorId, tercerQ.rows[0].id]
    );
  } else {
    await pool.query(
      'UPDATE partidos_torneo SET pareja2_id = $1 WHERE id = $2',
      [ganadorId, finalQ.rows[0].id]
    );
    await pool.query(
      'UPDATE partidos_torneo SET pareja2_id = $1 WHERE id = $2',
      [perdedorId, tercerQ.rows[0].id]
    );
  }
}

// ============================================================
// EMAILS
// ============================================================

async function enviarFixturePorEmail(torneoId, categorias, partidos) {
  for (const cat of categorias) {
    for (const pareja of cat.parejas) {
      const partidosDeLaPareja = partidos.filter(
        p => p.pareja1_id === pareja.id || p.pareja2_id === pareja.id
      );

      if (!pareja.jugador1_id) continue;

      const emailsQ = await pool.query(
        'SELECT email, nombre FROM usuarios WHERE id = ANY($1)',
        [[pareja.jugador1_id, pareja.jugador2_id].filter(Boolean)]
      );

      for (const usuario of emailsQ.rows) {
        await resend.emails.send({
          from: FROM_EMAIL,
          to: usuario.email,
          subject: `🎾 Tu fixture está listo — ${cat.nombre}`,
          html: emailFixture(pareja, cat, partidosDeLaPareja, usuario.nombre)
        }).catch(err => console.error(`Error email fixture a ${usuario.email}:`, err));
      }
    }
  }
}

async function enviarEmailResultado(partido, resultado) {
  const parejasQ = await pool.query(`
    SELECT pt.*, u1.email AS email1, u1.nombre AS nombre1,
           u2.email AS email2, u2.nombre AS nombre2
    FROM parejas_torneo pt
    JOIN usuarios u1 ON u1.id = pt.jugador1_id
    LEFT JOIN usuarios u2 ON u2.id = pt.jugador2_id
    WHERE pt.id = ANY($1)
  `, [[partido.pareja1_id, partido.pareja2_id].filter(Boolean)]);

  const ganadorQ = await pool.query(
    'SELECT nombre_pareja FROM parejas_torneo WHERE id = $1',
    [resultado.ganador_id]
  );
  const ganadorNombre = ganadorQ.rows[0]?.nombre_pareja || '';

  for (const pareja of parejasQ.rows) {
    for (const email of [pareja.email1, pareja.email2].filter(Boolean)) {
      await resend.emails.send({
        from: FROM_EMAIL,
        to: email,
        subject: `Resultado: ${partido.resultado_pareja1 || 'W/O'} — Cancha ${partido.cancha}`,
        html: emailResultado(partido, resultado, ganadorNombre)
      }).catch(err => console.error(`Error email resultado:`, err));
    }
  }
}

async function notificarClasificados(torneoId, categoriaId, posiciones) {
  const torneoQ = await pool.query('SELECT nombre FROM torneos WHERE id = $1', [torneoId]);
  const catQ = await pool.query('SELECT nombre FROM categorias_torneo WHERE id = $1', [categoriaId]);

  const top2Grupo1 = posiciones.filter(p => p.grupo === 1 && p.posicion <= 2);
  const top2Grupo2 = posiciones.filter(p => p.grupo === 2 && p.posicion <= 2);
  const clasificados = [...top2Grupo1, ...top2Grupo2];

  for (const pos of clasificados) {
    const pareja = await pool.query(`
      SELECT pt.*, u1.email AS email1, u2.email AS email2
      FROM parejas_torneo pt
      JOIN usuarios u1 ON u1.id = pt.jugador1_id
      LEFT JOIN usuarios u2 ON u2.id = pt.jugador2_id
      WHERE pt.id = $1
    `, [pos.pareja_id]);

    if (!pareja.rows[0]) continue;
    const p = pareja.rows[0];

    for (const email of [p.email1, p.email2].filter(Boolean)) {
      await resend.emails.send({
        from: FROM_EMAIL,
        to: email,
        subject: `🏆 Clasificaste a semifinales — ${catQ.rows[0]?.nombre}`,
        html: emailClasificacion(p.nombre_pareja, torneoQ.rows[0]?.nombre, catQ.rows[0]?.nombre, pos.posicion, pos.grupo)
      }).catch(err => console.error('Error email clasificación:', err));
    }
  }
}

// ============================================================
// TEMPLATES DE EMAIL (HTML inline)
// ============================================================

function emailInvitacion({ jugador1Nombre, jugador2Nombre, torneoNombre, categoriaNombre, torneoFecha, torneoSede, linkConfirmacion, expiraHoras }) {
  const fecha = new Date(torneoFecha).toLocaleDateString('es-AR', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
  return `
  <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;color:#333">
    <div style="background:#1a1a2e;padding:24px;text-align:center">
      <h1 style="color:#fff;margin:0;font-size:22px">🎾 PadelConnect</h1>
      <p style="color:#aaa;margin:4px 0 0;font-size:13px">cordobalux.com</p>
    </div>
    <div style="padding:32px 24px">
      <h2 style="margin:0 0 16px">¡Te invitaron a jugar!</h2>
      <p style="font-size:16px;line-height:1.6"><strong>${jugador1Nombre}</strong> te invita a formar pareja en el torneo:</p>
      <div style="background:#f5f5f5;border-radius:8px;padding:20px;margin:20px 0">
        <p style="margin:0 0 8px;font-size:18px;font-weight:bold">${torneoNombre}</p>
        <p style="margin:0 0 4px;color:#666">📋 Categoría: ${categoriaNombre}</p>
        <p style="margin:0 0 4px;color:#666">📅 Fecha: ${fecha}</p>
        ${torneoSede ? `<p style="margin:0;color:#666">📍 Sede: ${torneoSede}</p>` : ''}
      </div>
      <a href="${linkConfirmacion}" style="display:block;background:#e63946;color:#fff;text-align:center;padding:14px 24px;border-radius:8px;text-decoration:none;font-size:16px;font-weight:bold;margin:24px 0">
        ✅ Confirmar participación
      </a>
      <p style="color:#999;font-size:13px;text-align:center">Esta invitación expira en ${expiraHoras} horas.</p>
    </div>
  </div>`;
}

function emailParejaConfirmada(pareja) {
  return `
  <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;color:#333">
    <div style="background:#1a1a2e;padding:24px;text-align:center">
      <h1 style="color:#fff;margin:0;font-size:22px">🎾 PadelConnect</h1>
    </div>
    <div style="padding:32px 24px">
      <h2>✅ ¡Pareja confirmada!</h2>
      <p><strong>${pareja.jugador2_nombre}</strong> aceptó tu invitación para el torneo <strong>${pareja.torneo_nombre}</strong> — categoría <strong>${pareja.categoria_nombre}</strong>.</p>
      <p>Cuando se cierren las inscripciones vas a recibir tu fixture completo por email.</p>
    </div>
  </div>`;
}

function emailFixture(pareja, categoria, partidos, usuarioNombre) {
  const filaPartidos = partidos.map((p, i) => {
    const fecha = new Date(p.fecha).toLocaleDateString('es-AR', { weekday: 'short', day: 'numeric', month: 'short' });
    return `<tr style="border-bottom:1px solid #eee">
      <td style="padding:10px 8px">${i + 1}</td>
      <td style="padding:10px 8px">${fecha}</td>
      <td style="padding:10px 8px">${p.hora_inicio}</td>
      <td style="padding:10px 8px;text-align:center">Cancha ${p.cancha}</td>
    </tr>`;
  }).join('');

  return `
  <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;color:#333">
    <div style="background:#1a1a2e;padding:24px;text-align:center">
      <h1 style="color:#fff;margin:0;font-size:22px">🎾 PadelConnect</h1>
    </div>
    <div style="padding:32px 24px">
      <h2>Tu fixture está listo, ${usuarioNombre}!</h2>
      <p>Pareja: <strong>${pareja.nombre_pareja || 'Tu pareja'}</strong> — ${categoria.nombre}</p>
      <p>Tenés <strong>${partidos.length} partidos garantizados</strong> en la fase de grupos:</p>
      <table style="width:100%;border-collapse:collapse;font-size:14px">
        <thead><tr style="background:#f0f0f0">
          <th style="padding:10px 8px;text-align:left">#</th>
          <th style="padding:10px 8px;text-align:left">Fecha</th>
          <th style="padding:10px 8px;text-align:left">Hora</th>
          <th style="padding:10px 8px;text-align:center">Cancha</th>
        </tr></thead>
        <tbody>${filaPartidos}</tbody>
      </table>
      <p style="margin-top:20px;font-size:13px;color:#666">
        El rival de cada partido se muestra en tiempo real en la app.<br>
        Seguí el torneo en <a href="${APP_URL}/padel-connect.html">cordobalux.com</a>
      </p>
    </div>
  </div>`;
}

function emailResultado(partido, resultado, ganadorNombre) {
  const esWalkover = resultado.estado === 'walkover';
  return `
  <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;color:#333">
    <div style="background:#1a1a2e;padding:24px;text-align:center">
      <h1 style="color:#fff;margin:0;font-size:22px">🎾 PadelConnect</h1>
    </div>
    <div style="padding:32px 24px">
      <h2>Resultado cargado</h2>
      <div style="background:#f5f5f5;border-radius:8px;padding:20px;text-align:center">
        <p style="font-size:22px;font-weight:bold;margin:0">${esWalkover ? 'W/O' : `${resultado.resultado_pareja1} / ${resultado.resultado_pareja2}`}</p>
        <p style="margin:8px 0 0;color:#666">Ganador: <strong>${ganadorNombre}</strong></p>
        <p style="margin:4px 0 0;color:#999;font-size:13px">Cancha ${partido.cancha} — Ronda ${partido.ronda}</p>
      </div>
      <p style="margin-top:20px;text-align:center">
        <a href="${APP_URL}/padel-connect.html" style="color:#e63946">Ver tabla de posiciones →</a>
      </p>
    </div>
  </div>`;
}

function emailClasificacion(nombrePareja, torneoNombre, categoriaNombre, posicion, grupo) {
  return `
  <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;color:#333">
    <div style="background:#1a1a2e;padding:24px;text-align:center">
      <h1 style="color:#fff;margin:0;font-size:22px">🎾 PadelConnect</h1>
    </div>
    <div style="padding:32px 24px;text-align:center">
      <div style="font-size:48px">🏆</div>
      <h2>¡Clasificaste a semifinales!</h2>
      <p><strong>${nombrePareja}</strong> terminó <strong>${posicion}° del Grupo ${grupo}</strong> en la categoría ${categoriaNombre}.</p>
      <p>El fixture de semifinales ya está disponible en la app.</p>
      <a href="${APP_URL}/padel-connect.html" style="display:inline-block;background:#e63946;color:#fff;padding:14px 28px;border-radius:8px;text-decoration:none;font-weight:bold;margin-top:16px">
        Ver bracket →
      </a>
    </div>
  </div>`;
}

module.exports = router;
