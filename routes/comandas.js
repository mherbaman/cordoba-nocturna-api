const express = require('express');
const router = express.Router();
const { pool } = require('../database');
const { authAdmin } = require('../middleware/auth');

// GET productos del club
router.get('/productos', authAdmin, async (req, res) => {
  try {
    const { negocio_id } = req.admin;
    const result = await pool.query(
      'SELECT * FROM productos_club WHERE negocio_id = $1 ORDER BY nombre ASC',
      [negocio_id]
    );
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al obtener productos' });
  }
});

// POST nuevo producto
router.post('/productos', authAdmin, async (req, res) => {
  try {
    const { negocio_id } = req.admin;
    const { nombre, precio } = req.body;
    if (!nombre || !precio) return res.status(400).json({ error: 'Faltan datos' });
    const result = await pool.query(
      'INSERT INTO productos_club (negocio_id, nombre, precio) VALUES ($1, $2, $3) RETURNING *',
      [negocio_id, nombre, parseInt(precio)]
    );
    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al crear producto' });
  }
});

// PUT editar precio o activo
router.put('/productos/:id', authAdmin, async (req, res) => {
  try {
    const { negocio_id } = req.admin;
    const { precio, activo, stock } = req.body;
    const fields = [];
    const values = [];
    let i = 1;
    if (precio !== undefined) { fields.push(`precio = $${i++}`); values.push(parseInt(precio)); }
    if (activo !== undefined) { fields.push(`activo = $${i++}`); values.push(activo); }
    if (stock !== undefined) { fields.push(`stock = $${i++}`); values.push(parseInt(stock)); }
    if (fields.length === 0) return res.status(400).json({ error: 'Nada que actualizar' });
    values.push(req.params.id, negocio_id);
    await pool.query(
      `UPDATE productos_club SET ${fields.join(', ')} WHERE id = $${i++} AND negocio_id = $${i++}`,
      values
    );
    res.json({ ok: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al actualizar producto' });
  }
});

// DELETE producto
router.delete('/productos/:id', authAdmin, async (req, res) => {
  try {
    const { negocio_id } = req.admin;
    await pool.query(
      'DELETE FROM productos_club WHERE id = $1 AND negocio_id = $2',
      [req.params.id, negocio_id]
    );
    res.json({ ok: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al borrar producto' });
  }
});

// GET comandas por periodo o fecha
router.get('/comandas', authAdmin, async (req, res) => {
  try {
    const { negocio_id } = req.admin;
    const { periodo, fecha } = req.query;
    let filtro = '';
    if (fecha) {
      filtro = `AND DATE(creado_en) = '${fecha}'`;
    } else if (periodo === 'ayer') {
      filtro = "AND DATE(creado_en) = CURRENT_DATE - INTERVAL '1 day'";
    } else if (periodo === 'semana') {
      filtro = "AND DATE(creado_en) >= CURRENT_DATE - INTERVAL '6 days'";
    } else if (periodo === 'mes') {
      filtro = "AND DATE(creado_en) >= CURRENT_DATE - INTERVAL '29 days'";
    } else {
      filtro = 'AND DATE(creado_en) = CURRENT_DATE';
    }
    const comandas = await pool.query(
      `SELECT * FROM comandas WHERE negocio_id = $1 ${filtro} ORDER BY creado_en DESC`,
      [negocio_id]
    );
    for (const c of comandas.rows) {
      const items = await pool.query(
        'SELECT * FROM comanda_items WHERE comanda_id = $1 ORDER BY creado_en ASC',
        [c.id]
      );
      c.items = items.rows;
    }
    res.json(comandas.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al obtener comandas' });
  }
});

// POST nueva comanda
router.post('/comandas', authAdmin, async (req, res) => {
  try {
    const { negocio_id } = req.admin;
    const { nombre, tipo, numero_cancha, descripcion, fecha } = req.body;
    if (!nombre) return res.status(400).json({ error: 'Falta el nombre' });
    const comanda = await pool.query(
      'INSERT INTO comandas (negocio_id, nombre, tipo, numero_cancha, descripcion, fecha) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *',
      [negocio_id, nombre, tipo||'jugadores', numero_cancha||null, descripcion||null, fecha||new Date().toISOString().split('T')[0]]
    );
    const c = comanda.rows[0];
    c.items = [];
    res.json(c);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al crear comanda' });
  }
});

// POST agregar item a comanda
router.post('/comandas/:id/items', authAdmin, async (req, res) => {
  try {
    const { negocio_id } = req.admin;
    const { descripcion, monto, tipo, metodo_pago, producto_id, cantidad } = req.body;
    if (!descripcion || !monto) return res.status(400).json({ error: 'Faltan datos' });
    const check = await pool.query(
      'SELECT id FROM comandas WHERE id = $1 AND negocio_id = $2 AND estado = $3',
      [req.params.id, negocio_id, 'abierta']
    );
    if (check.rows.length === 0) return res.status(404).json({ error: 'Comanda no encontrada' });
    // Descontar stock si es un producto
    if (producto_id && cantidad) {
      const prod = await pool.query('SELECT stock FROM productos_club WHERE id = $1 AND negocio_id = $2', [producto_id, negocio_id]);
      if (prod.rows.length > 0) {
        const stockActual = prod.rows[0].stock || 0;
        const nuevoStock = Math.max(0, stockActual - parseInt(cantidad));
        await pool.query('UPDATE productos_club SET stock = $1 WHERE id = $2', [nuevoStock, producto_id]);
      }
    }
    const item = await pool.query(
      'INSERT INTO comanda_items (comanda_id, descripcion, monto, tipo, metodo_pago, producto_id) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *',
      [req.params.id, descripcion, parseInt(monto), tipo || 'consumo', metodo_pago || 'efectivo', producto_id || null]
    );
    res.json(item.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al agregar item' });
  }
});

// PUT cerrar comanda
router.put('/comandas/:id/cerrar', authAdmin, async (req, res) => {
  try {
    const { negocio_id } = req.admin;
    await pool.query(
      `UPDATE comandas SET estado = 'cerrada', cerrado_en = NOW() WHERE id = $1 AND negocio_id = $2`,
      [req.params.id, negocio_id]
    );
    res.json({ ok: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al cerrar comanda' });
  }
});

// DELETE comanda
router.delete('/comandas/:id', authAdmin, async (req, res) => {
  try {
    const { negocio_id } = req.admin;
    await pool.query(
      'DELETE FROM comandas WHERE id = $1 AND negocio_id = $2',
      [req.params.id, negocio_id]
    );
    res.json({ ok: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al borrar comanda' });
  }
});

module.exports = router;
