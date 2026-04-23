// ================================================
//   CÓRDOBA NOCTURNA — Servidor Principal
//   Con Socket.io para chat en tiempo real
// ================================================
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const http = require('http');
const path = require('path');
const { Server } = require('socket.io');
const { initDatabase, agregarTablaMensajes, agregarTablaSponsors, agregarTablasPadel } = require('./database');
const webpush = require('web-push');

webpush.setVapidDetails(
  'mailto:admin@cordobalux.com',
  'BBC-BM0lWegmCr3e5ROgYJne9T_OtJDmUFPReuJkAUR83TOE90VmdVXLFBGZGde6VdFo5Ru53jziQPtQ_hZcd4Q',
  '0y0zMBqZdqIdvA7G9FWTENw_2DpOBzAc97uL-oSHFUo'
);
const { iniciarLimpieza } = require('./limpieza');

const app = express();
const server = http.createServer(app);
const PORT = process.env.PORT || 3000;

// ── Socket.io ────────────────────────────────────────────────────────
const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST']
  }
});

app.set('io', io);

io.on('connection', (socket) => {
  socket.on('unirse', (usuario_id) => {
    socket.join(`usuario_${usuario_id}`);
    console.log(`👤 Usuario ${usuario_id} conectado al chat`);
  });
  socket.on('disconnect', () => {
    console.log(`👤 Usuario desconectado`);
  });
});

// ── Middlewares ──────────────────────────────────────────────────────
app.use(express.json({ limit: '20mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(cors({ origin: '*' }));

// ── HTML estático ────────────────────────────────────────────────────
app.use(express.static(path.join(__dirname, 'public')));

// ── Rutas ────────────────────────────────────────────────────────────
app.use('/auth',        require('./routes/auth'));
app.use('/negocios',    require('./routes/negocios'));
app.use('/sesiones',    require('./routes/sesiones'));
app.use('/matches',     require('./routes/matches'));
app.use('/mensajes',    require('./routes/mensajes'));
app.use('/superadmin',  require('./routes/superadmin'));
app.use('/sponsors',    require('./routes/sponsors'));
app.use('/padel',     require('./routes/padel'));
app.use('/torneos',   require('./routes/torneos'));
app.use('/torneos',   require('./routes/torneos'));

// ── Ruta raíz — sirve la app ─────────────────────────────────────────
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// ── Panel admin ──────────────────────────────────────────────────────
app.get('/admin', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'admin.html'));
});

// ── Arrancar ─────────────────────────────────────────────────────────
async function arrancar() {
  try {
    await initDatabase();
    await agregarTablaMensajes();
    await agregarTablaSponsors();
    await agregarTablasPadel();
    iniciarLimpieza();
    server.listen(PORT, () => {
      console.log(`
╔══════════════════════════════════════════╗
║      CÓRDOBA NOCTURNA API v1.1           ║
║      Puerto: ${PORT}                        ║
║      Estado: 🟢 Online                   ║
║      Chat:   🟢 Socket.io activo         ║
╚══════════════════════════════════════════╝
      `);
    });
  } catch (err) {
    console.error('Error al arrancar:', err);
    process.exit(1);
  }
}

arrancar();
app.use('/torneos',   require('./routes/torneos'));
