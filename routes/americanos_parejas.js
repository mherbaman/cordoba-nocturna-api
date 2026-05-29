// ============================================================
// routes/americanos_parejas.js
// Pádel Americano por Parejas — CórdobaLux
// ============================================================
const express = require('express');
const router  = express.Router();
const { pool } = require('../database');
const { Resend } = require('resend');
const resend = new Resend('re_9bDafDkq_EDfpWKTWcE4gmB7rpdMJXA3G');
const { authAdmin, authUsuario } = require('../middleware/auth');

// ── CREAR TABLAS (ejecutar una vez) ─────────────────────────────────
router.post('/setup', authAdmin, async (req, res) => {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS americanos_parejas (
        id SERIAL PRIMARY KEY,
        nombre VARCHAR(200) NOT NULL,
        sede VARCHAR(200),
        zona VARCHAR(100),
        categoria VARCHAR(200),
        fecha DATE,
        hora_inicio TIME DEFAULT '09:00',
        cantidad_canchas INT DEFAULT 2,
        precio_inscripcion NUMERIC(10,2) DEFAULT 0,
        duracion_partido_min INT DEFAULT 20,
        descanso_entre_rondas_min INT DEFAULT 5,
        formato VARCHAR(50) DEFAULT 'mejor_de_7',
        descripcion TEXT,
        estado VARCHAR(50) DEFAULT 'abierto',
        creado_en TIMESTAMP DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS americanos_parejas_categorias (
        id SERIAL PRIMARY KEY,
        americano_id INT REFERENCES americanos_parejas(id) ON DELETE CASCADE,
        nombre VARCHAR(100) NOT NULL,
        genero VARCHAR(20) DEFAULT 'mixto',
        cupo_max INT DEFAULT 8,
        creado_en TIMESTAMP DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS americanos_parejas_inscripciones (
        id SERIAL PRIMARY KEY,
        americano_id INT REFERENCES americanos_parejas(id) ON DELETE CASCADE,
        categoria_id INT REFERENCES americanos_parejas_categorias(id) ON DELETE CASCADE,
        jugador1_id UUID REFERENCES usuarios(id),
        jugador1_nombre VARCHAR(200),
        jugador1_email VARCHAR(200),
        jugador2_id UUID REFERENCES usuarios(id),
        jugador2_nombre VARCHAR(200),
        jugador2_email VARCHAR(200),
        nombre_pareja VARCHAR(300),
        grupo INT,
        creado_en TIMESTAMP DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS americanos_parejas_partidos (
        id SERIAL PRIMARY KEY,
        americano_id INT REFERENCES americanos_parejas(id) ON DELETE CASCADE,
        categoria_id INT REFERENCES americanos_parejas_categorias(id) ON DELETE CASCADE,
        fase VARCHAR(50) DEFAULT 'grupos',
        grupo INT,
        ronda INT DEFAULT 1,
        cancha INT DEFAULT 1,
        hora_inicio TIME,
        hora_fin TIME,
        pareja1_id INT REFERENCES americanos_parejas_inscripciones(id),
        pareja2_id INT REFERENCES americanos_parejas_inscripciones(id),
        games_pareja1 INT,
        games_pareja2 INT,
        ganador_id INT REFERENCES americanos_parejas_inscripciones(id),
        estado VARCHAR(50) DEFAULT 'pendiente',
        creado_en TIMESTAMP DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS americanos_parejas_posiciones (
        id SERIAL PRIMARY KEY,
        americano_id INT REFERENCES americanos_parejas(id) ON DELETE CASCADE,
        categoria_id INT REFERENCES americanos_parejas_categorias(id) ON DELETE CASCADE,
        pareja_id INT REFERENCES americanos_parejas_inscripciones(id) ON DELETE CASCADE,
        grupo INT,
        partidos_jugados INT DEFAULT 0,
        partidos_ganados INT DEFAULT 0,
        games_favor INT DEFAULT 0,
        games_contra INT DEFAULT 0,
        diferencia INT DEFAULT 0,
        puntos INT DEFAULT 0
      );
    `);
    res.json({ ok: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ── LISTAR AMERICANOS PAREJAS (público) ─────────────────────────────
router.get('/', async (req, res) => {
  try {
    const { rows } = await pool.query(`
      SELECT ap.*,
        (SELECT COUNT(*) FROM americanos_parejas_inscripciones WHERE americano_id = ap.id) as total_inscriptos,
        (SELECT COUNT(*) FROM americanos_parejas_categorias WHERE americano_id = ap.id) as total_categorias
      FROM americanos_parejas ap
      ORDER BY ap.fecha DESC, ap.creado_en DESC
    `);
    // Por cada americano, obtener inscriptos por categoría
    for (const a of rows) {
      const { rows: cats } = await pool.query(`
        SELECT c.*, 
          (SELECT COUNT(*) FROM americanos_parejas_inscripciones WHERE categoria_id = c.id) as inscriptos
        FROM americanos_parejas_categorias c WHERE c.americano_id = $1 ORDER BY c.id`, [a.id]);
      a.categorias = cats;
    }
    res.json(rows);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ── DETALLE AMERICANO ────────────────────────────────────────────────
router.get('/:id', async (req, res) => {
  try {
    const id = req.params.id;
    const { rows: [a] } = await pool.query('SELECT * FROM americanos_parejas WHERE id=$1', [id]);
    if (!a) return res.status(404).json({ error: 'No encontrado' });

    const { rows: categorias } = await pool.query(
      'SELECT * FROM americanos_parejas_categorias WHERE americano_id=$1 ORDER BY id', [id]);

    const { rows: parejas } = await pool.query(
      'SELECT * FROM americanos_parejas_inscripciones WHERE americano_id=$1 ORDER BY categoria_id, id', [id]);

    const { rows: partidos } = await pool.query(
      'SELECT p.*, i1.nombre_pareja as pareja1_nombre, i2.nombre_pareja as pareja2_nombre FROM americanos_parejas_partidos p LEFT JOIN americanos_parejas_inscripciones i1 ON p.pareja1_id=i1.id LEFT JOIN americanos_parejas_inscripciones i2 ON p.pareja2_id=i2.id WHERE p.americano_id=$1 ORDER BY p.categoria_id, p.fase, p.grupo, p.ronda, p.id', [id]);

    const { rows: posiciones } = await pool.query(`
      SELECT pos.*, i.nombre_pareja 
      FROM americanos_parejas_posiciones pos
      JOIN americanos_parejas_inscripciones i ON pos.pareja_id = i.id
      WHERE pos.americano_id=$1
      ORDER BY pos.categoria_id, pos.grupo, pos.puntos DESC, pos.diferencia DESC`, [id]);

    res.json({ ...a, categorias, parejas, partidos, posiciones });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ── CREAR AMERICANO PAREJAS (admin) ─────────────────────────────────
router.post('/', authAdmin, async (req, res) => {
  try {
    const { nombre, sede, zona, fecha, hora_inicio, cantidad_canchas,
            precio_inscripcion, duracion_partido_min, descanso_entre_rondas_min,
            formato, descripcion, categorias } = req.body;

    if (!nombre || !fecha) return res.status(400).json({ error: 'Nombre y fecha son requeridos' });

    const { rows: [a] } = await pool.query(`
      INSERT INTO americanos_parejas 
        (nombre, sede, zona, fecha, hora_inicio, cantidad_canchas, precio_inscripcion,
         duracion_partido_min, descanso_entre_rondas_min, formato, descripcion)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)
      RETURNING *`,
      [nombre, sede||null, zona||null, fecha, hora_inicio||'09:00', cantidad_canchas||2,
       precio_inscripcion||0, duracion_partido_min||20, descanso_entre_rondas_min||5,
       formato||'mejor_de_7', descripcion||null]);

    // Crear categorías
    const catsCreadas = [];
    if (categorias && categorias.length) {
      for (const cat of categorias) {
        const { rows: [c] } = await pool.query(
          'INSERT INTO americanos_parejas_categorias (americano_id, nombre, genero, cupo_max) VALUES ($1,$2,$3,$4) RETURNING *',
          [a.id, cat.nombre, cat.genero||'mixto', cat.cupo_max||8]);
        catsCreadas.push(c);
      }
    }

    res.json({ ...a, categorias: catsCreadas });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ── CAMBIAR ESTADO ───────────────────────────────────────────────────
router.put('/:id/estado', authAdmin, async (req, res) => {
  try {
    const { estado } = req.body;
    await pool.query('UPDATE americanos_parejas SET estado=$1 WHERE id=$2', [estado, req.params.id]);
    res.json({ ok: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ── BUSCAR USUARIO POR NOMBRE O EMAIL (para inscripción de compañero) ─
router.get('/:id/buscar-jugador', authUsuario, async (req, res) => {
  try {
    const { q } = req.query;
    const americanoId = req.params.id;
    if (!q || q.length < 2) return res.json([]);

    // Buscar en jugadores_padel JOIN usuarios, excluyendo al que busca
    const { rows } = await pool.query(`
      SELECT u.id, u.nombre, u.apellido, u.email, u.foto_url, jp.nivel, jp.zona
      FROM usuarios u
      LEFT JOIN jugadores_padel jp ON jp.usuario_id = u.id
      WHERE u.activo = true
        AND u.id != $1
        AND (
          LOWER(u.nombre) LIKE LOWER($2)
          OR LOWER(u.email) LIKE LOWER($3)
        )
        AND u.id NOT IN (
          SELECT jugador1_id FROM americanos_parejas_inscripciones WHERE americano_id=$4
          UNION
          SELECT jugador2_id FROM americanos_parejas_inscripciones WHERE americano_id=$4
        )
      LIMIT 10`,
      [req.usuario.id, `%${q}%`, `%${q}%`, americanoId]);
    res.json(rows);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ── INSCRIBIR PAREJA (jugador desde la app) ──────────────────────────
router.post('/:id/inscribir', authUsuario, async (req, res) => {
  try {
    const americanoId = req.params.id;
    const { categoria_id, jugador2_id } = req.body;

    const { rows: [a] } = await pool.query('SELECT * FROM americanos_parejas WHERE id=$1', [americanoId]);
    if (!a) return res.status(404).json({ error: 'Americano no encontrado' });
    if (a.estado !== 'abierto') return res.status(400).json({ error: 'Las inscripciones están cerradas' });

    // Verificar cupo
    const { rows: [cat] } = await pool.query('SELECT * FROM americanos_parejas_categorias WHERE id=$1 AND americano_id=$2', [categoria_id, americanoId]);
    if (!cat) return res.status(404).json({ error: 'Categoría no encontrada' });
    const { rows: [{ count }] } = await pool.query('SELECT COUNT(*) FROM americanos_parejas_inscripciones WHERE categoria_id=$1', [categoria_id]);
    if (parseInt(count) >= cat.cupo_max) return res.status(400).json({ error: 'Categoría llena' });

    // Verificar que el jugador1 no esté ya inscripto en esta categoría
    const { rows: yaInscripto } = await pool.query(
      'SELECT id FROM americanos_parejas_inscripciones WHERE americano_id=$1 AND categoria_id=$2 AND (jugador1_id=$3 OR jugador2_id=$3)',
      [americanoId, categoria_id, req.usuario.id]);
    if (yaInscripto.length) return res.status(400).json({ error: 'Ya estás inscripto en esta categoría' });

    // Verificar que el jugador2 exista y no esté inscripto
    const { rows: [u1] } = await pool.query('SELECT id, nombre, apellido, email FROM usuarios WHERE id=$1', [req.usuario.id]);
    const { rows: [u2] } = await pool.query('SELECT id, nombre, apellido, email FROM usuarios WHERE id=$1', [jugador2_id]);
    if (!u2) return res.status(404).json({ error: 'El compañero seleccionado no existe' });

    const { rows: yaInscripto2 } = await pool.query(
      'SELECT id FROM americanos_parejas_inscripciones WHERE americano_id=$1 AND categoria_id=$2 AND (jugador1_id=$3 OR jugador2_id=$3)',
      [americanoId, categoria_id, jugador2_id]);
    if (yaInscripto2.length) return res.status(400).json({ error: 'Tu compañero ya está inscripto en esta categoría' });

    const nombre_pareja = `${u1.nombre}${u1.apellido?' '+u1.apellido:''} / ${u2.nombre}${u2.apellido?' '+u2.apellido:''}`;

    const { rows: [ins] } = await pool.query(`
      INSERT INTO americanos_parejas_inscripciones 
        (americano_id, categoria_id, jugador1_id, jugador1_nombre, jugador1_email,
         jugador2_id, jugador2_nombre, jugador2_email, nombre_pareja)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING *`,
      [americanoId, categoria_id, u1.id, u1.nombre+(u1.apellido?' '+u1.apellido:''), u1.email,
       u2.id, u2.nombre+(u2.apellido?' '+u2.apellido:''), u2.email, nombre_pareja]);

    res.json(ins);
  } catch (e) {
    if (e.code === '23505') return res.status(400).json({ error: 'Una de las personas ya está inscripta' });
    res.status(500).json({ error: e.message });
  }
});

// ── INSCRIBIR PAREJA (admin, por ID de usuario) ──────────────────────
router.post('/:id/inscribir-admin', authAdmin, async (req, res) => {
  try {
    const americanoId = req.params.id;
    const { categoria_id, jugador1_id, jugador2_id } = req.body;

    const { rows: [u1] } = await pool.query('SELECT id, nombre, email FROM usuarios WHERE id=$1', [jugador1_id]);
    const { rows: [u2] } = await pool.query('SELECT id, nombre, email FROM usuarios WHERE id=$1', [jugador2_id]);
    if (!u1 || !u2) return res.status(404).json({ error: 'Uno o ambos usuarios no encontrados' });

    const nombre_pareja = `${u1.nombre}${u1.apellido?' '+u1.apellido:''} / ${u2.nombre}${u2.apellido?' '+u2.apellido:''}`;
    const { rows: [ins] } = await pool.query(`
      INSERT INTO americanos_parejas_inscripciones 
        (americano_id, categoria_id, jugador1_id, jugador1_nombre, jugador1_email,
         jugador2_id, jugador2_nombre, jugador2_email, nombre_pareja)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING *`,
      [americanoId, categoria_id, u1.id, u1.nombre+(u1.apellido?' '+u1.apellido:''), u1.email,
       u2.id, u2.nombre+(u2.apellido?' '+u2.apellido:''), u2.email, nombre_pareja]);

    res.json(ins);
  } catch (e) {
    if (e.code === '23505') return res.status(400).json({ error: 'Una de las personas ya está inscripta' });
    res.status(500).json({ error: e.message });
  }
});

// ── QUITAR PAREJA (admin) ────────────────────────────────────────────
router.delete('/:id/parejas/:parejaId', authAdmin, async (req, res) => {
  try {
    await pool.query('DELETE FROM americanos_parejas_inscripciones WHERE id=$1 AND americano_id=$2',
      [req.params.parejaId, req.params.id]);
    res.json({ ok: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ── GENERAR FIXTURE ──────────────────────────────────────────────────
router.post('/:id/generar-fixture', authAdmin, async (req, res) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const americanoId = parseInt(req.params.id);
    const { rows: [a] } = await client.query('SELECT * FROM americanos_parejas WHERE id=$1', [americanoId]);
    const { rows: categorias } = await client.query(
      'SELECT * FROM americanos_parejas_categorias WHERE americano_id=$1 ORDER BY id', [americanoId]);

    // Limpiar partidos y posiciones anteriores
    await client.query('DELETE FROM americanos_parejas_partidos WHERE americano_id=$1', [americanoId]);
    await client.query('DELETE FROM americanos_parejas_posiciones WHERE americano_id=$1', [americanoId]);

    let totalPartidos = 0;
    const durMin = a.duracion_partido_min || 20;
    const descMin = a.descanso_entre_rondas_min || 5;
    const canchas = a.cantidad_canchas || 2;
    const horaBase = a.hora_inicio || '09:00';

    for (const cat of categorias) {
      const { rows: parejas } = await client.query(
        'SELECT * FROM americanos_parejas_inscripciones WHERE categoria_id=$1 ORDER BY id', [cat.id]);

      if (parejas.length < 2) continue;

      // Dividir en 2 grupos (si hay suficientes)
      const mitad = Math.ceil(parejas.length / 2);
      const grupo1 = parejas.slice(0, mitad);
      const grupo2 = parejas.slice(mitad);

      // Asignar grupo a cada pareja
      for (const p of grupo1) {
        await client.query('UPDATE americanos_parejas_inscripciones SET grupo=1 WHERE id=$1', [p.id]);
        p.grupo = 1;
      }
      for (const p of grupo2) {
        await client.query('UPDATE americanos_parejas_inscripciones SET grupo=2 WHERE id=$1', [p.id]);
        p.grupo = 2;
      }

      // Inicializar posiciones
      for (const p of parejas) {
        await client.query(`
          INSERT INTO americanos_parejas_posiciones 
            (americano_id, categoria_id, pareja_id, grupo)
          VALUES ($1,$2,$3,$4)`,
          [americanoId, cat.id, p.id, p.grupo || (grupo1.includes(p) ? 1 : 2)]);
      }

      // Generar round-robin dentro de cada grupo con rondas correctas
      // Algoritmo: en cada ronda, una pareja juega UNA sola vez
      const generarRondasCorrect = (grupo, numGrupo) => {
        const rondas = [];
        const n = grupo.length;
        const lista = [...grupo];
        if (n % 2 !== 0) lista.push(null); // bye si impar
        const total = lista.length;
        for (let r = 0; r < total - 1; r++) {
          const ronda = [];
          for (let i = 0; i < total / 2; i++) {
            const p1 = lista[i];
            const p2 = lista[total - 1 - i];
            if (p1 && p2) ronda.push({ p1, p2, grupo: numGrupo });
          }
          rondas.push(ronda);
          // Rotar: fijar el primero, rotar el resto
          lista.splice(1, 0, lista.pop());
        }
        return rondas;
      };

      const rondasG1 = generarRondasCorrect(grupo1, 1);
      const rondasG2 = generarRondasCorrect(grupo2, 2);

      // Intercalar rondas de ambos grupos para usar canchas eficientemente
      const maxRondas = Math.max(rondasG1.length, rondasG2.length);

      const addMin = (h, m, delta) => {
        m += delta;
        h += Math.floor(m / 60);
        m = m % 60;
        return [`${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}`, h, m];
      };

      let [hh, mm] = horaBase.split(':').map(Number);
      let rondaNum = 1;

      for (let r = 0; r < maxRondas; r++) {
        const partidos = [...(rondasG1[r] || []), ...(rondasG2[r] || [])];
        if (!partidos.length) continue;

        const hi = `${String(hh).padStart(2,'0')}:${String(mm).padStart(2,'0')}`;
        const [hf, nhh, nmm] = addMin(hh, mm, durMin);

        let canchaActual = 1;
        for (const m of partidos) {
          await client.query(`
            INSERT INTO americanos_parejas_partidos
              (americano_id, categoria_id, fase, grupo, ronda, cancha, hora_inicio, hora_fin, pareja1_id, pareja2_id)
            VALUES ($1,$2,'grupos',$3,$4,$5,$6,$7,$8,$9)`,
            [americanoId, cat.id, m.grupo, rondaNum, canchaActual, hi, hf, m.p1.id, m.p2.id]);
          totalPartidos++;
          canchaActual++;
        }

        rondaNum++;
        hh = nhh; mm = nmm;
        const [,ah,am] = addMin(hh, mm, descMin);
        hh = ah; mm = am;
      }
    }

    await client.query("UPDATE americanos_parejas SET estado='en_curso' WHERE id=$1", [americanoId]);
    // Enviar email individual a cada pareja con su partido de ronda 1
    try {
      const { rows: partidos_r1 } = await pool.query(`
        SELECT p.*, i1.nombre_pareja as p1_nombre, i1.jugador1_email as p1_j1_email, i1.jugador2_email as p1_j2_email,
               i2.nombre_pareja as p2_nombre, i2.jugador1_email as p2_j1_email, i2.jugador2_email as p2_j2_email,
               c.nombre as cat_nombre
        FROM americanos_parejas_partidos p
        JOIN americanos_parejas_inscripciones i1 ON p.pareja1_id = i1.id
        JOIN americanos_parejas_inscripciones i2 ON p.pareja2_id = i2.id
        JOIN americanos_parejas_categorias c ON p.categoria_id = c.id
        WHERE p.americano_id=$1 AND p.ronda=1 AND p.fase='grupos'`, [americanoId]);
      const { rows: [am] } = await pool.query('SELECT * FROM americanos_parejas WHERE id=$1', [americanoId]);
      for (const p of partidos_r1) {
        const fecha_str = am.fecha ? new Date(am.fecha).toLocaleDateString('es-AR',{weekday:'long',day:'numeric',month:'long'}) : '';
        const hora_str = p.hora_inicio ? p.hora_inicio.substring(0,5) : '';
        const emailHtml = (miPareja, rival) => `
          <div style="font-family:sans-serif;background:#07000f;color:#fff;padding:32px;border-radius:16px;max-width:500px;margin:0 auto">
            <div style="font-size:28px;font-weight:900;margin-bottom:4px">🎾 PÁDEL AMERICANO</div>
            <div style="font-size:16px;color:#22c55e;margin-bottom:20px">${am.nombre} — ${p.cat_nombre}</div>
            <div style="background:rgba(34,197,94,.1);border:1px solid rgba(34,197,94,.3);border-radius:12px;padding:16px;margin-bottom:16px">
              <div style="font-size:12px;color:rgba(255,255,255,.4);margin-bottom:8px">TU PRIMER PARTIDO</div>
              <div style="font-size:18px;font-weight:700;margin-bottom:4px">${miPareja}</div>
              <div style="font-size:14px;color:rgba(255,255,255,.5);margin-bottom:12px">vs</div>
              <div style="font-size:18px;font-weight:700;color:#fbbf24">${rival}</div>
            </div>
            <div style="display:flex;gap:12px;margin-bottom:20px">
              <div style="background:rgba(255,255,255,.05);border-radius:10px;padding:12px;flex:1;text-align:center">
                <div style="font-size:11px;color:rgba(255,255,255,.4);margin-bottom:4px">FECHA</div>
                <div style="font-size:13px;font-weight:600">${fecha_str}</div>
              </div>
              <div style="background:rgba(255,255,255,.05);border-radius:10px;padding:12px;flex:1;text-align:center">
                <div style="font-size:11px;color:rgba(255,255,255,.4);margin-bottom:4px">HORA</div>
                <div style="font-size:24px;font-weight:900;color:#22c55e">${hora_str}hs</div>
              </div>
              <div style="background:rgba(255,255,255,.05);border-radius:10px;padding:12px;flex:1;text-align:center">
                <div style="font-size:11px;color:rgba(255,255,255,.4);margin-bottom:4px">CANCHA</div>
                <div style="font-size:24px;font-weight:900;color:#22c55e">${p.cancha}</div>
              </div>
            </div>
            <a href="https://api.cordobalux.com/padel" style="display:inline-block;background:linear-gradient(135deg,#16a34a,#22c55e);color:#fff;padding:12px 24px;border-radius:50px;text-decoration:none;font-weight:700">Ver fixture completo →</a>
          </div>`;
        // Email a pareja 1
        const emails_p1 = [p.p1_j1_email, p.p1_j2_email].filter(Boolean);
        if (emails_p1.length) await resend.emails.send({ from:'PadelConnect <partidos@send.cordobalux.com>', to:emails_p1, subject:`🎾 Tu primer partido — ${am.nombre}`, html: emailHtml(p.p1_nombre, p.p2_nombre) });
        // Email a pareja 2
        const emails_p2 = [p.p2_j1_email, p.p2_j2_email].filter(Boolean);
        if (emails_p2.length) await resend.emails.send({ from:'PadelConnect <partidos@send.cordobalux.com>', to:emails_p2, subject:`🎾 Tu primer partido — ${am.nombre}`, html: emailHtml(p.p2_nombre, p.p1_nombre) });
      }
    } catch(emailR1Err) { console.error('Email ronda 1 error:', emailR1Err.message); }
    await client.query('COMMIT');

    // Enviar email a todos los usuarios
    try {
      const { rows: usuarios } = await pool.query(
        "SELECT email, nombre FROM usuarios WHERE activo=true AND email NOT LIKE '%@test.com' AND email IS NOT NULL");
      const { rows: [am] } = await pool.query('SELECT * FROM americanos_parejas WHERE id=$1', [americanoId]);
      const emailList = usuarios.map(u => u.email).filter(Boolean);
      if (emailList.length) {
        await resend.emails.send({
          from: 'PadelConnect <partidos@send.cordobalux.com>',
          to: emailList,
          subject: `🎾 ¡Comenzó el ${am.nombre}!`,
          html: `<div style="font-family:sans-serif;background:#07000f;color:#fff;padding:32px;border-radius:16px;max-width:500px;margin:0 auto">
            <div style="font-size:32px;font-weight:900;letter-spacing:2px;margin-bottom:8px">PÁDEL AMERICANO</div>
            <div style="font-size:18px;color:#22c55e;font-weight:700;margin-bottom:16px">${am.nombre}</div>
            ${am.sede ? `<p>📍 ${am.sede}</p>` : ''}
            <p>📅 ${am.fecha ? new Date(am.fecha).toLocaleDateString('es-AR',{weekday:'long',day:'numeric',month:'long'}) : ''}</p>
            <p style="color:rgba(255,255,255,.6);font-size:14px">¡El americano arrancó! Seguí los resultados en la app.</p>
            <a href="https://api.cordobalux.com/padel" style="display:inline-block;margin-top:16px;background:linear-gradient(135deg,#16a34a,#22c55e);color:#fff;padding:12px 24px;border-radius:50px;text-decoration:none;font-weight:700">Ver en PadelConnect →</a>
          </div>`
        });
      }
    } catch(emailErr) { console.error('Email error:', emailErr.message); }

    res.json({ ok: true, partidos: totalPartidos });
  } catch (e) {
    await client.query('ROLLBACK');
    res.status(500).json({ error: e.message });
  } finally { client.release(); }
});

// ── CARGAR RESULTADO DE PARTIDO ──────────────────────────────────────
router.put('/partidos/:partidoId/resultado', authAdmin, async (req, res) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const { games_pareja1, games_pareja2 } = req.body;
    const partidoId = req.params.partidoId;

    const { rows: [p] } = await client.query('SELECT * FROM americanos_parejas_partidos WHERE id=$1', [partidoId]);
    if (!p) return res.status(404).json({ error: 'Partido no encontrado' });

    const ganador_id = games_pareja1 >= games_pareja2 ? p.pareja1_id : p.pareja2_id;

    await client.query(`
      UPDATE americanos_parejas_partidos
      SET games_pareja1=$1, games_pareja2=$2, ganador_id=$3, estado='jugado'
      WHERE id=$4`,
      [games_pareja1, games_pareja2, ganador_id, partidoId]);

    // Actualizar posiciones
    const updatePos = async (parejaId, gfavor, gcontra, gano) => {
      await client.query(`
        UPDATE americanos_parejas_posiciones SET
          partidos_jugados = partidos_jugados + 1,
          partidos_ganados = partidos_ganados + $1,
          games_favor = games_favor + $2,
          games_contra = games_contra + $3,
          diferencia = diferencia + $4,
          puntos = puntos + $5
        WHERE americano_id=$6 AND categoria_id=$7 AND pareja_id=$8`,
        [gano?1:0, gfavor, gcontra, gfavor-gcontra, gano?3:0, p.americano_id, p.categoria_id, parejaId]);
    };
    await updatePos(p.pareja1_id, games_pareja1, games_pareja2, ganador_id===p.pareja1_id);
    await updatePos(p.pareja2_id, games_pareja2, games_pareja1, ganador_id===p.pareja2_id);

    // Verificar si todos los partidos de grupos están jugados para generar bracket
    const { rows: pendientesGrupos } = await client.query(`
      SELECT COUNT(*) as cnt FROM americanos_parejas_partidos 
      WHERE americano_id=$1 AND categoria_id=$2 AND fase='grupos' AND estado='pendiente'`,
      [p.americano_id, p.categoria_id]);

    if (parseInt(pendientesGrupos[0].cnt) === 0) {
      await generarBracket(client, p.americano_id, p.categoria_id);
    }

    await client.query('COMMIT');

    // Verificar fase para enviar email
    await verificarYEnviarEmail(req.params.partidoId, p);

    res.json({ ok: true });
  } catch (e) {
    await client.query('ROLLBACK');
    res.status(500).json({ error: e.message });
  } finally { client.release(); }
});

// ── GENERAR BRACKET ELIMINATORIO ─────────────────────────────────────
async function generarBracket(client, americanoId, categoriaId) {
  // Obtener top 1 y top 2 de cada grupo
  const { rows: pos } = await client.query(`
    SELECT * FROM americanos_parejas_posiciones 
    WHERE americano_id=$1 AND categoria_id=$2
    ORDER BY grupo, puntos DESC, diferencia DESC, games_favor DESC`,
    [americanoId, categoriaId]);

  const grupo1 = pos.filter(p => parseInt(p.grupo) === 1);
  const grupo2 = pos.filter(p => parseInt(p.grupo) === 2);

  if (!grupo1.length || !grupo2.length) return;

  const { rows: [am] } = await client.query('SELECT * FROM americanos_parejas WHERE id=$1', [americanoId]);

  // Verificar partidos existentes de eliminatorias para este americano+categoría
  const { rows: existentes } = await client.query(
    "SELECT COUNT(*) as cnt FROM americanos_parejas_partidos WHERE americano_id=$1 AND categoria_id=$2 AND fase!='grupos'",
    [americanoId, categoriaId]);
  if (parseInt(existentes[0].cnt) > 0) return; // Ya generado

  // Si hay 2 grupos de 1, es directamente final
  if (grupo1.length === 1 && grupo2.length === 1) {
    await client.query(`
      INSERT INTO americanos_parejas_partidos (americano_id,categoria_id,fase,ronda,cancha,pareja1_id,pareja2_id)
      VALUES ($1,$2,'final',1,1,$3,$4)`,
      [americanoId, categoriaId, grupo1[0].pareja_id, grupo2[0].pareja_id]);
    return;
  }

  // Semifinales: 1ro G1 vs 2do G2, 1ro G2 vs 2do G1
  if (grupo1.length >= 2 && grupo2.length >= 2) {
    await client.query(`
      INSERT INTO americanos_parejas_partidos (americano_id,categoria_id,fase,ronda,cancha,pareja1_id,pareja2_id)
      VALUES ($1,$2,'semifinal',1,1,$3,$4)`,
      [americanoId, categoriaId, grupo1[0].pareja_id, grupo2[1].pareja_id]);
    await client.query(`
      INSERT INTO americanos_parejas_partidos (americano_id,categoria_id,fase,ronda,cancha,pareja1_id,pareja2_id)
      VALUES ($1,$2,'semifinal',1,2,$3,$4)`,
      [americanoId, categoriaId, grupo2[0].pareja_id, grupo1[1].pareja_id]);
  } else {
    // Un grupo tiene solo 1 pareja: va directo a la final contra el 1ro del otro
    const p1 = grupo1[0].pareja_id;
    const p2 = grupo2[0].pareja_id;
    await client.query(`
      INSERT INTO americanos_parejas_partidos (americano_id,categoria_id,fase,ronda,cancha,pareja1_id,pareja2_id)
      VALUES ($1,$2,'final',1,1,$3,$4)`,
      [americanoId, categoriaId, p1, p2]);
  }
}

// ── CARGAR RESULTADO ELIMINATORIA (genera siguiente ronda) ───────────
router.put('/partidos/:partidoId/resultado-bracket', authAdmin, async (req, res) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const { games_pareja1, games_pareja2 } = req.body;
    const { rows: [p] } = await client.query('SELECT * FROM americanos_parejas_partidos WHERE id=$1', [req.params.partidoId]);
    if (!p) return res.status(404).json({ error: 'Partido no encontrado' });

    const ganador_id = games_pareja1 >= games_pareja2 ? p.pareja1_id : p.pareja2_id;
    const perdedor_id = games_pareja1 >= games_pareja2 ? p.pareja2_id : p.pareja1_id;

    await client.query(`
      UPDATE americanos_parejas_partidos
      SET games_pareja1=$1, games_pareja2=$2, ganador_id=$3, estado='jugado' WHERE id=$4`,
      [games_pareja1, games_pareja2, ganador_id, req.params.partidoId]);

    if (p.fase === 'semifinal') {
      // Ver si ya hay otra semifinal jugada
      const { rows: semis } = await client.query(`
        SELECT * FROM americanos_parejas_partidos 
        WHERE americano_id=$1 AND categoria_id=$2 AND fase='semifinal'`,
        [p.americano_id, p.categoria_id]);

      const semiJugadas = semis.filter(s => s.estado === 'jugado');
      if (semiJugadas.length === 2) {
        const ganadores = semis.map(s => s.ganador_id);
        const perdedores = semis.map(s => s.ganador_id === s.pareja1_id ? s.pareja2_id : s.pareja1_id);
        // Crear final y tercer puesto
        await client.query(`
          INSERT INTO americanos_parejas_partidos (americano_id,categoria_id,fase,ronda,cancha,pareja1_id,pareja2_id)
          VALUES ($1,$2,'final',1,1,$3,$4)`,
          [p.americano_id, p.categoria_id, ganadores[0], ganadores[1]]);
        await client.query(`
          INSERT INTO americanos_parejas_partidos (americano_id,categoria_id,fase,ronda,cancha,pareja1_id,pareja2_id)
          VALUES ($1,$2,'tercer_puesto',1,2,$3,$4)`,
          [p.americano_id, p.categoria_id, perdedores[0], perdedores[1]]);

        // Email cuartos/semifinal finalizados
        await enviarEmailEtapa(p.americano_id, 'semifinal');
      }
    } else if (p.fase === 'final') {
      // Enviar email campeón
      await enviarEmailCampeon(p.americano_id, p.categoria_id, ganador_id);
    }

    await client.query('COMMIT');
    res.json({ ok: true, ganador_id });
  } catch (e) {
    await client.query('ROLLBACK');
    res.status(500).json({ error: e.message });
  } finally { client.release(); }
});

// ── ENVIAR EMAIL ETAPAS ──────────────────────────────────────────────
async function enviarEmailEtapa(americanoId, etapa) {
  try {
    const { rows: [am] } = await pool.query('SELECT * FROM americanos_parejas WHERE id=$1', [americanoId]);
    const { rows: usuarios } = await pool.query(
      "SELECT email FROM usuarios WHERE activo=true AND email NOT LIKE '%@test.com' AND email IS NOT NULL");
    const emailList = usuarios.map(u => u.email).filter(Boolean);
    const etapaLabel = { cuartos: 'Cuartos de Final', semifinal: 'Semifinales', final: 'Gran Final' }[etapa] || etapa;
    if (!emailList.length) return;
    await resend.emails.send({
      from: 'PadelConnect <partidos@send.cordobalux.com>',
      to: emailList,
      subject: `🏆 ${etapaLabel} — ${am.nombre}`,
      html: `<div style="font-family:sans-serif;background:#07000f;color:#fff;padding:32px;border-radius:16px;max-width:500px;margin:0 auto">
        <div style="font-size:28px;font-weight:900;margin-bottom:8px">🏆 ${etapaLabel}</div>
        <div style="font-size:18px;color:#22c55e;margin-bottom:16px">${am.nombre}</div>
        <p style="color:rgba(255,255,255,.7)">¡Ya están los resultados de ${etapaLabel}! Seguí el bracket en la app.</p>
        <a href="https://api.cordobalux.com/padel" style="display:inline-block;margin-top:16px;background:linear-gradient(135deg,#16a34a,#22c55e);color:#fff;padding:12px 24px;border-radius:50px;text-decoration:none;font-weight:700">Ver resultados →</a>
      </div>`
    });
  } catch(e) { console.error('Email etapa error:', e.message); }
}

async function enviarEmailCampeon(americanoId, categoriaId, ganadorParejaId) {
  try {
    const { rows: [am] } = await pool.query('SELECT * FROM americanos_parejas WHERE id=$1', [americanoId]);
    const { rows: [pareja] } = await pool.query('SELECT * FROM americanos_parejas_inscripciones WHERE id=$1', [ganadorParejaId]);
    const { rows: [cat] } = await pool.query('SELECT * FROM americanos_parejas_categorias WHERE id=$1', [categoriaId]);
    const { rows: usuarios } = await pool.query(
      "SELECT email FROM usuarios WHERE activo=true AND email NOT LIKE '%@test.com' AND email IS NOT NULL");
    const emailList = usuarios.map(u => u.email).filter(Boolean);
    if (!emailList.length || !pareja) return;
    await resend.emails.send({
      from: 'PadelConnect <partidos@send.cordobalux.com>',
      to: emailList,
      subject: `🥇 ¡CAMPEONES! — ${am.nombre}`,
      html: `<div style="font-family:sans-serif;background:#07000f;color:#fff;padding:32px;border-radius:16px;max-width:500px;margin:0 auto">
        <div style="font-size:32px;font-weight:900;margin-bottom:8px">🥇 ¡CAMPEONES!</div>
        <div style="font-size:18px;color:#fbbf24;margin-bottom:8px">${am.nombre}</div>
        ${cat ? `<div style="font-size:14px;color:rgba(255,255,255,.5);margin-bottom:16px">Categoría: ${cat.nombre}</div>` : ''}
        <div style="background:rgba(251,191,36,.15);border:1px solid rgba(251,191,36,.4);border-radius:12px;padding:20px;text-align:center;margin-bottom:16px">
          <div style="font-size:36px;margin-bottom:8px">🏆</div>
          <div style="font-size:22px;font-weight:900;color:#fbbf24">${pareja.nombre_pareja}</div>
        </div>
        <a href="https://api.cordobalux.com/padel" style="display:inline-block;background:linear-gradient(135deg,#b45309,#fbbf24);color:#000;padding:12px 24px;border-radius:50px;text-decoration:none;font-weight:700">Ver bracket final →</a>
      </div>`
    });
  } catch(e) { console.error('Email campeón error:', e.message); }
}

async function verificarYEnviarEmail(partidoId, p) {
  try {
    if (p.fase === 'semifinal') await enviarEmailEtapa(p.americano_id, 'semifinal');
    if (p.fase === 'final') await enviarEmailCampeon(p.americano_id, p.categoria_id, p.ganador_id);
  } catch(e) { /* silencioso */ }
}

// ── ELIMINAR AMERICANO (admin) ───────────────────────────────────────
router.delete('/:id', authAdmin, async (req, res) => {
  try {
    await pool.query('DELETE FROM americanos_parejas WHERE id=$1', [req.params.id]);
    res.json({ ok: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

module.exports = router;
