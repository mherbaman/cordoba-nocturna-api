#!/usr/bin/env python3
"""
Agrega endpoints de partidos públicos a routes/padel.js
Ejecutar en el VPS dentro del repo: python3 2_endpoints_partidos_publicos.py
"""

ARCHIVO = 'routes/padel.js'

NUEVO_CODIGO = r"""

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
router.post('/partidos-publicos', authMiddleware, async (req, res) => {
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
    res.json({ ok: true, partido: result.rows[0] });
  } catch (err) {
    console.error('Error crear partido público:', err);
    res.status(500).json({ error: err.message });
  }
});

// DELETE /padel/partidos-publicos/:id  — eliminar partido público (requiere auth admin)
router.delete('/partidos-publicos/:id', authMiddleware, async (req, res) => {
  try {
    await pool.query('DELETE FROM partidos_publicos WHERE id = $1', [req.params.id]);
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /padel/partidos-publicos/:id/inscribirse  — jugador se inscribe
router.post('/partidos-publicos/:id/inscribirse', authMiddleware, async (req, res) => {
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
router.delete('/partidos-publicos/:id/desinscribirse', authMiddleware, async (req, res) => {
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
"""

with open(ARCHIVO, 'r', encoding='utf-8') as f:
    contenido = f.read()

# Insertar antes del último export o module.exports
marcador = 'module.exports = router'
if marcador not in contenido:
    print(f"ERROR: No se encontró '{marcador}' en {ARCHIVO}")
    exit(1)

if '/partidos-publicos' in contenido:
    print("Los endpoints de partidos-publicos ya existen. No se modificó nada.")
    exit(0)

nuevo = contenido.replace(marcador, NUEVO_CODIGO + '\n' + marcador)

with open(ARCHIVO, 'w', encoding='utf-8') as f:
    f.write(nuevo)

print(f"✅ Endpoints agregados a {ARCHIVO}")
