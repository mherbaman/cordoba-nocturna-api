// ================================================
//   CÓRDOBA NOCTURNA — Servidor Principal
//   Con Socket.io para chat en tiempo real
// ================================================

require('dotenv').config();
const express = require('express');
const cors = require('cors');
const http = require('http');
const { Server } = require('socket.io');
const { initDatabase, agregarTablaMensajes } = require('./database');
const { iniciarLimpieza } = require('./limpieza');

const app = express();
const server = http.createServer(app);
const PORT = process.env.PORT || 3000;

// ── Socket.io ────────────────────────────────────────────────────────
const io = new Server(server, {
  cors: {
    origin: [
      process.env.FRONTEND_URL,
      'http://localhost:3000',
      'http://localhost:5500',
    ],
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
app.use(cors({
  origin: [
    process.env.FRONTEND_URL,
    'http://localhost:3000',
    'http://localhost:5500',
  ],
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// ── Rutas ────────────────────────────────────────────────────────────
app.use('/auth',        require('./routes/auth'));
app.use('/negocios',    require('./routes/negocios'));
app.use('/sesiones',    require('./routes/sesiones'));
app.use('/matches',     require('./routes/matches'));
app.use('/mensajes',    require('./routes/mensajes'));
app.use('/superadmin',  require('./routes/superadmin'));

// ── Ruta de salud ────────────────────────────────────────────────────
app.get('/', (req, res) => {
  res.json({
    plataforma: 'Córdoba Nocturna API',
    version: '1.1.0',
    estado: '🟢 Online',
    chat: '🟢 Socket.io activo',
    timestamp: new Date().toISOString()
  });
});

// ── Arrancar ─────────────────────────────────────────────────────────
async function arrancar() {
  try {
    await initDatabase();
    await agregarTablaMensajes();
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
