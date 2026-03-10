// ================================================
//   CÓRDOBA NOCTURNA — Base de datos
//   Conexión a PostgreSQL y creación de tablas
// ================================================

const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

// ── Crear todas las tablas si no existen ─────────────────────────────
async function initDatabase() {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // ── TABLA: negocios ──────────────────────────────────────────────
    // Cada disco, restaurante o bar es un "negocio"
    await client.query(`
      CREATE TABLE IF NOT EXISTS negocios (
        id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        nombre      VARCHAR(100) NOT NULL,
        tipo        VARCHAR(50) NOT NULL,  -- 'disco', 'restaurante', 'bar'
        slug        VARCHAR(100) UNIQUE NOT NULL, -- 'disco-la-noche'
        descripcion TEXT,
        logo_url    TEXT,
        color_primario   VARCHAR(7) DEFAULT '#ff2d78',
        color_secundario VARCHAR(7) DEFAULT '#7c3aed',
        activo      BOOLEAN DEFAULT true,
        plan        VARCHAR(50) DEFAULT 'basico', -- 'basico', 'pro'
        creado_en   TIMESTAMP DEFAULT NOW(),
        -- Datos de contacto del dueño
        dueno_nombre VARCHAR(100),
        dueno_email  VARCHAR(100),
        dueno_tel    VARCHAR(50)
      )
    `);

    // ── TABLA: usuarios ──────────────────────────────────────────────
    // Cada persona que se registra en la plataforma
    await client.query(`
      CREATE TABLE IF NOT EXISTS usuarios (
        id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        nombre      VARCHAR(100) NOT NULL,
        email       VARCHAR(100) UNIQUE,
        telefono    VARCHAR(50),
        password_hash TEXT,
        foto_url    TEXT,
        vibe        VARCHAR(100),
        edad        INTEGER,
        activo      BOOLEAN DEFAULT true,
        creado_en   TIMESTAMP DEFAULT NOW(),
        ultimo_login TIMESTAMP
      )
    `);

    // ── TABLA: sesiones_noche ────────────────────────────────────────
    // Cada vez que un local abre su sala para una noche
    await client.query(`
      CREATE TABLE IF NOT EXISTS sesiones_noche (
        id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        negocio_id   UUID REFERENCES negocios(id) ON DELETE CASCADE,
        nombre       VARCHAR(100) NOT NULL, -- 'Sábado 7 de marzo'
        codigo_qr    VARCHAR(50) UNIQUE NOT NULL, -- código único de esa noche
        activa       BOOLEAN DEFAULT true,
        abierta_en   TIMESTAMP DEFAULT NOW(),
        cerrada_en   TIMESTAMP,
        -- Estadísticas (se actualizan automáticamente)
        total_usuarios INTEGER DEFAULT 0,
        total_matches  INTEGER DEFAULT 0
      )
    `);

    // ── TABLA: presencias ────────────────────────────────────────────
    // Registra qué usuarios están en qué sesión esa noche
    // Si un usuario va al restaurante y después a la disco,
    // tiene DOS presencias — pero solo una activa a la vez
    await client.query(`
      CREATE TABLE IF NOT EXISTS presencias (
        id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        usuario_id   UUID REFERENCES usuarios(id) ON DELETE CASCADE,
        sesion_id    UUID REFERENCES sesiones_noche(id) ON DELETE CASCADE,
        negocio_id   UUID REFERENCES negocios(id) ON DELETE CASCADE,
        activa       BOOLEAN DEFAULT true,   -- false = se fue o expiró
        entro_en     TIMESTAMP DEFAULT NOW(),
        ultima_actividad TIMESTAMP DEFAULT NOW(),
        UNIQUE(usuario_id, sesion_id)        -- no puede estar dos veces en la misma sesión
      )
    `);

    // ── TABLA: likes ─────────────────────────────────────────────────
    // Cada vez que alguien le da like a otro
    await client.query(`
      CREATE TABLE IF NOT EXISTS likes (
        id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        de_usuario   UUID REFERENCES usuarios(id) ON DELETE CASCADE,
        a_usuario    UUID REFERENCES usuarios(id) ON DELETE CASCADE,
        sesion_id    UUID REFERENCES sesiones_noche(id) ON DELETE CASCADE,
        es_super     BOOLEAN DEFAULT false,  -- true = fue un ⚡ super like
        creado_en    TIMESTAMP DEFAULT NOW(),
        UNIQUE(de_usuario, a_usuario, sesion_id) -- no puede likear dos veces en la misma noche
      )
    `);

    // ── TABLA: matches ───────────────────────────────────────────────
    // Se crea automáticamente cuando dos usuarios se dan like mutuamente
    await client.query(`
      CREATE TABLE IF NOT EXISTS matches (
        id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        usuario_1    UUID REFERENCES usuarios(id) ON DELETE CASCADE,
        usuario_2    UUID REFERENCES usuarios(id) ON DELETE CASCADE,
        sesion_id    UUID REFERENCES sesiones_noche(id) ON DELETE CASCADE,
        negocio_id   UUID REFERENCES negocios(id) ON DELETE CASCADE,
        creado_en    TIMESTAMP DEFAULT NOW()
      )
    `);

    // ── TABLA: admins ────────────────────────────────────────────────
    // Dueños de locales que acceden al panel de su negocio
    await client.query(`
      CREATE TABLE IF NOT EXISTS admins (
        id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        negocio_id   UUID REFERENCES negocios(id) ON DELETE CASCADE,
        nombre       VARCHAR(100) NOT NULL,
        email        VARCHAR(100) UNIQUE NOT NULL,
        password_hash TEXT NOT NULL,
        es_superadmin BOOLEAN DEFAULT false,  -- true = sos vos
        activo       BOOLEAN DEFAULT true,
        creado_en    TIMESTAMP DEFAULT NOW()
      )
    `);

    await client.query('COMMIT');
    console.log('✅ Base de datos inicializada correctamente');

  } catch (err) {
    await client.query('ROLLBACK');
    console.error('❌ Error inicializando base de datos:', err);
    throw err;
  } finally {
    client.release();
  }
}

module.exports = { pool, initDatabase };
