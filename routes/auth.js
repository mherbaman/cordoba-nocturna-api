// ================================================
//   CÓRDOBA NOCTURNA — Rutas de usuarios
//   Registro, login, perfil
// ================================================

const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { pool } = require('../database');
const { authUsuario } = require('../middleware/auth');


// ── Helper: email de bienvenida ───────────────────────────────────────
async function enviarEmailBienvenida(usuario) {
  if (!usuario.email || usuario.email.endsWith('@test.com')) return;
  try {
    const { Resend } = require('resend');
    const resend = new Resend('re_9bDafDkq_EDfpWKTWcE4gmB7rpdMJXA3G');
    const html = `<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"></head>
<body style="margin:0;padding:0;background:#0a0015;font-family:Arial,sans-serif">
<div style="max-width:600px;margin:0 auto;background:#0a0015;color:#fff">
  <div style="background:linear-gradient(135deg,#0f0019,#1a0030);padding:40px 32px 32px;text-align:center;border-bottom:1px solid rgba(34,197,94,.2)">
    <div style="font-size:36px;font-weight:900;letter-spacing:3px;color:#22c55e;margin:0 0 4px">PADEL CONNECT</div>
    <div style="font-size:13px;color:rgba(255,255,255,.5);letter-spacing:1px;text-transform:uppercase">Tu app de pádel en Argentina</div>
  </div>
  <div style="padding:32px 32px 24px;text-align:center">
    <h1 style="font-size:26px;font-weight:700;margin:0 0 12px;color:#fff">¡Bienvenido/a a Padel Connect! 🎾</h1>
    <p style="font-size:15px;color:rgba(255,255,255,.65);margin:0;line-height:1.6">Estamos creando la comunidad más grande de pádel en Argentina, y te agradecemos que seas parte desde el comienzo. Encontrá jugadores, reservá canchas, tomá clases y competí — todo desde un solo lugar.</p>
  </div>
  <div style="font-size:11px;font-weight:700;letter-spacing:2px;color:rgba(34,197,94,.7);text-transform:uppercase;padding:0 32px;margin:8px 0 16px">¿Qué podés hacer?</div>
  <div style="padding:0 24px 8px;display:grid;grid-template-columns:1fr 1fr;gap:12px">
    <table width="100%" cellpadding="0" cellspacing="0" style="padding:0 8px">
      <tr>
        <td width="48%" style="padding:6px">
          <div style="background:rgba(255,255,255,.04);border:1px solid rgba(34,197,94,.15);border-radius:14px;padding:16px">
            <div style="font-size:22px;margin-bottom:8px">🎾</div>
            <div style="font-size:14px;font-weight:700;color:#fff;margin:0 0 4px">Armá tu partido</div>
            <div style="font-size:12px;color:rgba(255,255,255,.55);margin:0;line-height:1.5">Creá partidos o encontrá jugadores de tu nivel cuando quieras.</div>
          </div>
        </td>
        <td width="48%" style="padding:6px">
          <div style="background:rgba(255,255,255,.04);border:1px solid rgba(34,197,94,.15);border-radius:14px;padding:16px">
            <div style="font-size:22px;margin-bottom:8px">🔥</div>
            <div style="font-size:14px;font-weight:700;color:#fff;margin:0 0 4px">Falta 1</div>
            <div style="font-size:12px;color:rgba(255,255,255,.55);margin:0;line-height:1.5">¿Te falta un jugador? Completá tu partido al instante.</div>
          </div>
        </td>
      </tr>
      <tr>
        <td width="48%" style="padding:6px">
          <div style="background:rgba(255,255,255,.04);border:1px solid rgba(34,197,94,.15);border-radius:14px;padding:16px">
            <div style="font-size:22px;margin-bottom:8px">🎓</div>
            <div style="font-size:14px;font-weight:700;color:#fff;margin:0 0 4px">Clases particulares</div>
            <div style="font-size:12px;color:rgba(255,255,255,.55);margin:0;line-height:1.5">Reservá clases con profesores verificados de tu zona.</div>
          </div>
        </td>
        <td width="48%" style="padding:6px">
          <div style="background:rgba(255,255,255,.04);border:1px solid rgba(34,197,94,.15);border-radius:14px;padding:16px">
            <div style="font-size:22px;margin-bottom:8px">🏟️</div>
            <div style="font-size:14px;font-weight:700;color:#fff;margin:0 0 4px">Reservá canchas</div>
            <div style="font-size:12px;color:rgba(255,255,255,.55);margin:0;line-height:1.5">Encontrá y reservá canchas en clubes cerca tuyo.</div>
          </div>
        </td>
      </tr>
      <tr>
        <td width="48%" style="padding:6px">
          <div style="background:rgba(255,255,255,.04);border:1px solid rgba(34,197,94,.15);border-radius:14px;padding:16px">
            <div style="font-size:22px;margin-bottom:8px">🏆</div>
            <div style="font-size:14px;font-weight:700;color:#fff;margin:0 0 4px">Torneos y Super 8</div>
            <div style="font-size:12px;color:rgba(255,255,255,.55);margin:0;line-height:1.5">Inscribite, seguí tu ranking y competí en torneos.</div>
          </div>
        </td>
        <td width="48%" style="padding:6px">
          <div style="background:rgba(255,255,255,.04);border:1px solid rgba(34,197,94,.15);border-radius:14px;padding:16px">
            <div style="font-size:22px;margin-bottom:8px">🌙</div>
            <div style="font-size:14px;font-weight:700;color:#fff;margin:0 0 4px">Encuentros sociales</div>
            <div style="font-size:12px;color:rgba(255,255,255,.55);margin:0;line-height:1.5">Conectá con la comunidad en eventos y noches temáticas.</div>
          </div>
        </td>
      </tr>
    </table>
  </div>
  <div style="padding:32px;text-align:center">
    <a href="https://cordobalux.com/padel" style="display:inline-block;background:linear-gradient(135deg,#15803d,#22c55e);color:#fff;font-size:16px;font-weight:800;letter-spacing:1px;padding:16px 48px;border-radius:50px;text-decoration:none">ABRIR PADEL CONNECT →</a>
  </div>
  <div style="height:1px;background:rgba(255,255,255,.06);margin:0 32px"></div>
  <div style="padding:28px 32px;text-align:center">
    <div style="margin-bottom:12px">
      <a href="https://cordobalux.com/padel" style="color:rgba(34,197,94,.8);font-size:13px;text-decoration:none;margin:0 10px">Jugadores</a>
      <a href="https://cordobalux.com/profe" style="color:rgba(34,197,94,.8);font-size:13px;text-decoration:none;margin:0 10px">Profesores</a>
      <a href="mailto:padelconnect@cordobalux.com" style="color:rgba(34,197,94,.8);font-size:13px;text-decoration:none;margin:0 10px">padelconnect@cordobalux.com</a>
    </div>
    <div style="font-size:11px;color:rgba(255,255,255,.3)">© 2026 Padel Connect · CórdobaLux · Córdoba, Argentina</div>
  </div>
</div>
</body>
</html>`;
    await resend.emails.send({
      from: 'PadelConnect <partidos@send.cordobalux.com>',
      to: usuario.email,
      subject: '¡Bienvenido/a a Padel Connect! 🎾 Tu app de pádel en Argentina',
      html
    });
    await pool.query('UPDATE usuarios SET email_bienvenida_enviado = true WHERE id = $1', [usuario.id]);
  } catch(e) { console.error('Email bienvenida error:', e.message); }
}

// ── POST /auth/registro ──────────────────────────────────────────────
// El usuario se registra por primera vez
router.post('/registro', async (req, res) => {
  const { nombre, apellido, email, telefono, password, foto_url, vibe, edad, app_origen, zona_principal, zonas_extra } = req.body;

  if (!nombre || !password) {
    return res.status(400).json({ error: 'Nombre y contraseña son requeridos' });
  }

  try {
    // Verificar si el email ya existe
    if (email) {
      const existe = await pool.query('SELECT id FROM usuarios WHERE email = $1', [email]);
      if (existe.rows.length > 0) {
        return res.status(400).json({ error: 'El email ya está registrado' });
      }
    }

    const password_hash = await bcrypt.hash(password, 10);

    const result = await pool.query(`
      INSERT INTO usuarios (nombre, apellido, email, telefono, password_hash, foto_url, vibe, edad, app_origen, zona_principal, zonas_extra)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
      RETURNING id, nombre, apellido, email, foto_url, vibe, edad, telefono, app_origen, zona_principal, zonas_extra, creado_en
    `, [nombre, apellido||'', email, telefono, password_hash, foto_url, vibe, edad, app_origen||'padel', zona_principal||null, zonas_extra||null]);

    const usuario = result.rows[0];
    const token = jwt.sign(
      { id: usuario.id, nombre: usuario.nombre },
      process.env.JWT_SECRET,
      { expiresIn: '30d' }
    );

    // Registrar app de origen
    const appOrigen = app_origen || 'cordoba';
    await pool.query(`INSERT INTO usuarios_apps (usuario_id, app) VALUES ($1, $2) ON CONFLICT (usuario_id, app) DO NOTHING`, [usuario.id, appOrigen]);
    // Enviar email de bienvenida en background
    enviarEmailBienvenida(usuario).catch(()=>{});
    res.status(201).json({ usuario, token });

  } catch (err) {
    console.error('Error en registro:', err);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// ── POST /auth/login ─────────────────────────────────────────────────
// El usuario vuelve la semana siguiente — login con email/contraseña
router.post('/login', async (req, res) => {
  const { email, password } = req.body;

  try {
    const result = await pool.query(
      'SELECT * FROM usuarios WHERE email = $1 AND activo = true',
      [email]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({ error: 'Email o contraseña incorrectos' });
    }

    const usuario = result.rows[0];
    const passwordOk = await bcrypt.compare(password, usuario.password_hash);

    if (!passwordOk) {
      return res.status(401).json({ error: 'Email o contraseña incorrectos' });
    }

    // Actualizar último login
    await pool.query('UPDATE usuarios SET ultimo_login = NOW() WHERE id = $1', [usuario.id]);
    // Registrar app si viene en el body
    const { app: appLogin } = req.body;
    if (appLogin) {
      await pool.query(`INSERT INTO usuarios_apps (usuario_id, app) VALUES ($1, $2) ON CONFLICT (usuario_id, app) DO NOTHING`, [usuario.id, appLogin]);
    }

    const token = jwt.sign(
      { id: usuario.id, nombre: usuario.nombre },
      process.env.JWT_SECRET,
      { expiresIn: '30d' }
    );

    res.json({
      usuario: {
        id: usuario.id,
        nombre: usuario.nombre,
        email: usuario.email,
        foto_url: usuario.foto_url,
        vibe: usuario.vibe,
        edad: usuario.edad,
        apellido: usuario.apellido,
        telefono: usuario.telefono,
        app_origen: usuario.app_origen
      },
      token
    });

  } catch (err) {
    console.error('Error en login:', err);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// ── GET /auth/perfil ─────────────────────────────────────────────────
// Ver mi propio perfil
router.get('/perfil', authUsuario, async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT id, nombre, apellido, email, telefono, foto_url, vibe, edad, app_origen, creado_en FROM usuarios WHERE id = $1',
      [req.usuario.id]
    );
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// ── PUT /auth/perfil ─────────────────────────────────────────────────
// Actualizar mi perfil (nombre, foto, vibe)
router.put('/perfil', authUsuario, async (req, res) => {
  const { nombre, apellido, foto_url, vibe, edad, telefono } = req.body;
  try {
    const result = await pool.query(`
      UPDATE usuarios 
      SET nombre = COALESCE($1, nombre),
          apellido = COALESCE($2, apellido),
          foto_url = COALESCE($3, foto_url),
          vibe = COALESCE($4, vibe),
          edad = COALESCE($5, edad),
          telefono = COALESCE($6, telefono)
      WHERE id = $7
      RETURNING id, nombre, apellido, email, telefono, foto_url, vibe, edad, app_origen
    `, [nombre, apellido, foto_url, vibe, edad, telefono, req.usuario.id]);
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// ── POST /auth/cambiar-password ──────────────────────────────────────
router.post('/cambiar-password', authUsuario, async (req, res) => {
  const { password_actual, password_nueva } = req.body;
  if (!password_actual || !password_nueva) return res.status(400).json({ error: 'Faltan datos' });
  if (password_nueva.length < 6) return res.status(400).json({ error: 'La nueva contraseña debe tener al menos 6 caracteres' });
  try {
    const result = await pool.query('SELECT password_hash FROM usuarios WHERE id = $1', [req.usuario.id]);
    if (!result.rows.length) return res.status(404).json({ error: 'Usuario no encontrado' });
    const ok = await bcrypt.compare(password_actual, result.rows[0].password_hash);
    if (!ok) return res.status(401).json({ error: 'La contraseña actual es incorrecta' });
    const nuevo_hash = await bcrypt.hash(password_nueva, 10);
    await pool.query('UPDATE usuarios SET password_hash = $1 WHERE id = $2', [nuevo_hash, req.usuario.id]);
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: 'Error interno' });
  }
});


// ── POST /auth/enviar-bienvenida/:id ─────────────────────────────────
// Admin envía o reenvía el email de bienvenida a un usuario
router.post('/enviar-bienvenida/:id', async (req, res) => {
  try {
    const result = await pool.query('SELECT id, nombre, email FROM usuarios WHERE id = $1', [req.params.id]);
    if (!result.rows.length) return res.status(404).json({ error: 'Usuario no encontrado' });
    const usuario = result.rows[0];
    await enviarEmailBienvenida(usuario);
    res.json({ ok: true });
  } catch(err) {
    console.error('Error enviar bienvenida:', err);
    res.status(500).json({ error: 'Error interno' });
  }
});

module.exports = router;
