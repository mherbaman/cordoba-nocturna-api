// ================================================
//   CÓRDOBA NOCTURNA — Base de datos
//   Conexión a PostgreSQL y creación de tablas
// ================================================

const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

async function initDatabase() {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // ── negocios ─────────────────────────────────────────────────────
    await client.query(`
      CREATE TABLE IF NOT EXISTS negocios (
        id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        nombre           VARCHAR(100) NOT NULL,
        tipo             VARCHAR(50) NOT NULL,
        slug             VARCHAR(100) UNIQUE NOT NULL,
        descripcion      TEXT,
        logo_url         TEXT,
        color_primario   VARCHAR(7) DEFAULT '#ff2d78',
        color_secundario VARCHAR(7) DEFAULT '#7c3aed',
        activo           BOOLEAN DEFAULT true,
        plan             VARCHAR(50) DEFAULT 'basico',
        creado_en        TIMESTAMP DEFAULT NOW(),
        dueno_nombre     VARCHAR(100),
        dueno_email      VARCHAR(100),
        dueno_tel        VARCHAR(50)
      )
    `);

    // ── usuarios ──────────────────────────────────────────────────────
    await client.query(`
      CREATE TABLE IF NOT EXISTS usuarios (
        id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        nombre        VARCHAR(100) NOT NULL,
        email         VARCHAR(100) UNIQUE,
        telefono      VARCHAR(50),
        password_hash TEXT,
        foto_url      TEXT,
        vibe          VARCHAR(100),
        edad          INTEGER,
        activo        BOOLEAN DEFAULT true,
        creado_en     TIMESTAMP DEFAULT NOW(),
        ultimo_login  TIMESTAMP
      )
    `);

    // ── sesiones_noche ────────────────────────────────────────────────
    await client.query(`
      CREATE TABLE IF NOT EXISTS sesiones_noche (
        id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        negocio_id     UUID REFERENCES negocios(id) ON DELETE CASCADE,
        nombre         VARCHAR(100) NOT NULL,
        codigo_qr      VARCHAR(50) UNIQUE NOT NULL,
        activa         BOOLEAN DEFAULT true,
        abierta_en     TIMESTAMP DEFAULT NOW(),
        cerrada_en     TIMESTAMP,
        total_usuarios INTEGER DEFAULT 0,
        total_matches  INTEGER DEFAULT 0
      )
    `);

    // ── presencias ────────────────────────────────────────────────────
    await client.query(`
      CREATE TABLE IF NOT EXISTS presencias (
        id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        usuario_id       UUID REFERENCES usuarios(id) ON DELETE CASCADE,
        sesion_id        UUID REFERENCES sesiones_noche(id) ON DELETE CASCADE,
        negocio_id       UUID REFERENCES negocios(id) ON DELETE CASCADE,
        activa           BOOLEAN DEFAULT true,
        entro_en         TIMESTAMP DEFAULT NOW(),
        ultima_actividad TIMESTAMP DEFAULT NOW(),
        UNIQUE(usuario_id, sesion_id)
      )
    `);

    // ── likes ─────────────────────────────────────────────────────────
    await client.query(`
      CREATE TABLE IF NOT EXISTS likes (
        id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        de_usuario  UUID REFERENCES usuarios(id) ON DELETE CASCADE,
        a_usuario   UUID REFERENCES usuarios(id) ON DELETE CASCADE,
        sesion_id   UUID REFERENCES sesiones_noche(id) ON DELETE CASCADE,
        es_super    BOOLEAN DEFAULT false,
        creado_en   TIMESTAMP DEFAULT NOW(),
        UNIQUE(de_usuario, a_usuario, sesion_id)
      )
    `);

    // ── matches ───────────────────────────────────────────────────────
    await client.query(`
      CREATE TABLE IF NOT EXISTS matches (
        id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        usuario_1   UUID REFERENCES usuarios(id) ON DELETE CASCADE,
        usuario_2   UUID REFERENCES usuarios(id) ON DELETE CASCADE,
        sesion_id   UUID REFERENCES sesiones_noche(id) ON DELETE CASCADE,
        negocio_id  UUID REFERENCES negocios(id) ON DELETE CASCADE,
        creado_en   TIMESTAMP DEFAULT NOW()
      )
    `);

    // ── admins ────────────────────────────────────────────────────────
    await client.query(`
      CREATE TABLE IF NOT EXISTS admins (
        id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        negocio_id    UUID REFERENCES negocios(id) ON DELETE CASCADE,
        nombre        VARCHAR(100) NOT NULL,
        email         VARCHAR(100) UNIQUE NOT NULL,
        password_hash TEXT NOT NULL,
        es_superadmin BOOLEAN DEFAULT false,
        activo        BOOLEAN DEFAULT true,
        creado_en     TIMESTAMP DEFAULT NOW()
      )
    `);

    // ── mensajes ──────────────────────────────────────────────────────
    await client.query(`
      CREATE TABLE IF NOT EXISTS mensajes (
        id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        match_id    UUID REFERENCES matches(id) ON DELETE CASCADE,
        de_usuario  UUID REFERENCES usuarios(id) ON DELETE CASCADE,
        texto       VARCHAR(500) NOT NULL,
        leido       BOOLEAN DEFAULT false,
        creado_en   TIMESTAMP DEFAULT NOW(),
        expira_en   TIMESTAMP NOT NULL
      )
    `);

    // ── sponsors ──────────────────────────────────────────────────────
    await client.query(`
      CREATE TABLE IF NOT EXISTS sponsors (
        id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        nombre      VARCHAR(100) NOT NULL,
        promo       VARCHAR(200) NOT NULL,
        emoji       VARCHAR(10) DEFAULT '🎯',
        tag         VARCHAR(20) DEFAULT 'PROMO',
        whatsapp    VARCHAR(50),
        instagram   VARCHAR(100),
        imagen_url  TEXT,
        activo      BOOLEAN DEFAULT true,
        orden       INTEGER DEFAULT 0,
        pantalla    VARCHAR(20) DEFAULT 'todas',
        creado_en   TIMESTAMP DEFAULT NOW()
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

async function agregarTablaMensajes() {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS mensajes (
        id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        match_id    UUID REFERENCES matches(id) ON DELETE CASCADE,
        de_usuario  UUID REFERENCES usuarios(id) ON DELETE CASCADE,
        texto       VARCHAR(500) NOT NULL,
        leido       BOOLEAN DEFAULT false,
        creado_en   TIMESTAMP DEFAULT NOW(),
        expira_en   TIMESTAMP NOT NULL
      )
    `);
    console.log('✅ Tabla mensajes lista');
  } catch (err) {
    console.error('Error creando tabla mensajes:', err);
  }
}

async function agregarTablaSponsors() {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS sponsors (
        id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        nombre      VARCHAR(100) NOT NULL,
        promo       VARCHAR(200) NOT NULL,
        emoji       VARCHAR(10) DEFAULT '🎯',
        tag         VARCHAR(20) DEFAULT 'PROMO',
        whatsapp    VARCHAR(50),
        instagram   VARCHAR(100),
        imagen_url  TEXT,
        activo      BOOLEAN DEFAULT true,
        orden       INTEGER DEFAULT 0,
        pantalla    VARCHAR(20) DEFAULT 'todas',
        creado_en   TIMESTAMP DEFAULT NOW()
      )
    `);
    console.log('✅ Tabla sponsors lista');
  } catch (err) {
    console.error('Error creando tabla sponsors:', err);
  }
}

module.exports = { pool, initDatabase, agregarTablaMensajes, agregarTablaSponsors };
