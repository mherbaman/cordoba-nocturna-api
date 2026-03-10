// ================================================
//   CÓRDOBA NOCTURNA — Servidor Principal
//   Arranca acá todo el backend
// ================================================

require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { initDatabase } = require('./database');

const app = express();
const PORT = process.env.PORT || 3000;

// ── Middlewares ──────────────────────────────────────────────────────
app.use(express.json({ limit: '10mb' })); // 10mb para aceptar fotos en base64
app.use(express.urlencoded({ extended: true }));

// CORS — permite que tu app HTML hable con esta API
app.use(cors({
  origin: [
    process.env.FRONTEND_URL,
    'http://localhost:3000',
    'http://localhost:5500',
    // Agregá acá cualquier dominio que necesite acceder
  ],
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// ── Rutas ────────────────────────────────────────────────────────────
app.use('/auth',        require('./routes/auth'));
app.use('/negocios',    require('./routes/negocios'));
app.use('/sesiones',    require('./routes/sesiones'));
app.use('/matches',     require('./routes/matches'));
app.use('/superadmin',  require('./routes/superadmin'));

// ── Ruta de salud (para verificar que la API está viva) ──────────────
app.get('/', (req, res) => {
  res.json({
    plataforma: 'Córdoba Nocturna API',
    version: '1.0.0',
    estado: '🟢 Online',
    timestamp: new Date().toISOString()
  });
});

// ── Arrancar servidor ────────────────────────────────────────────────
async function arrancar() {
  try {
    // Primero inicializar la base de datos
    await initDatabase();

    // Después arrancar el servidor
    app.listen(PORT, () => {
      console.log(`
╔══════════════════════════════════════════╗
║      CÓRDOBA NOCTURNA API                ║
║      Puerto: ${PORT}                        ║
║      Estado: 🟢 Online                   ║
╚══════════════════════════════════════════╝
      `);
    });
  } catch (err) {
    console.error('❌ Error al arrancar:', err);
    process.exit(1);
  }
}

arrancar();
