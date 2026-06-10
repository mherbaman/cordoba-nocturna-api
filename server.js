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
// Service Worker con scope amplio para PWA en /padel/
app.get('/OneSignalSDKWorker.js', (req, res) => {
  res.setHeader('Service-Worker-Allowed', '/');
  res.setHeader('Content-Type', 'application/javascript');
  res.sendFile(require('path').join(__dirname, 'public', 'OneSignalSDKWorker.js'));
});
app.get("/padel/", (req, res) => { const ref = req.query.ref || ""; if(!ref) return res.sendFile(require("path").join(__dirname, "public", "padel-connect.html")); const fs = require("fs"); let html = fs.readFileSync(require("path").join(__dirname, "public", "padel-connect.html"), "utf8"); html = html.replace("</head>", "<script>window._REF_INJECT=\""+ref+"\";</script></head>"); res.send(html); });
// Ruta /padel/ con inyección de ref — ANTES del static

app.get('/padel', (req, res) => {
  const ref = req.query.ref ? '?ref='+req.query.ref : '';
  res.redirect(301, '/padel/'+ref);
});

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
app.use('/americanos', require('./routes/americanos'));
app.use('/embajadores', require('./routes/embajadores'));
const americanosParejas = require('./routes/americanos_parejas');
app.use('/americanos-parejas', americanosParejas);

// ── Ruta raíz — sirve la app ─────────────────────────────────────────
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// ── Panel admin ──────────────────────────────────────────────────────
// ── Service Workers por scope ────────────────────────────────────────
app.get('/padel/sw.js', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'sw-padel.js'));
});
app.get('/admin/sw.js', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'sw-admin.js'));
});
app.get('/cconnect/sw.js', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'sw-cconnect.js'));
});

// ── Rutas carpeta → HTML ──────────────────────────────────────────────


app.get('/admin/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'admin.html'));
});
app.get('/admin', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'admin.html'));
});
app.get('/padelclub', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'padelclub.html'));
});
app.get('/padelclub/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'padelclub.html'));
});

app.get('/cconnect/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'cordoba-connect.html'));
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
