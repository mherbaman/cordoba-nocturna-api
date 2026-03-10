// ================================================
//   CÓRDOBA NOCTURNA — Limpieza automática
//   Borra mensajes expirados cada noche a las 3am
//   Mensajes duran 8 días
// ================================================

const { pool } = require('./database');

async function limpiarMensajesExpirados() {
  try {
    const result = await pool.query(`
      DELETE FROM mensajes 
      WHERE expira_en < NOW()
    `);
    if (result.rowCount > 0) {
      console.log(`🧹 ${result.rowCount} mensajes expirados borrados`);
    }
  } catch (err) {
    console.error('Error en limpieza:', err);
  }
}

function iniciarLimpieza() {
  function msFaltan3am() {
    const ahora = new Date();
    const prox3am = new Date();
    prox3am.setDate(ahora.getDate() + 1);
    prox3am.setHours(3, 0, 0, 0);
    return prox3am - ahora;
  }

  setTimeout(() => {
    limpiarMensajesExpirados();
    setInterval(limpiarMensajesExpirados, 24 * 60 * 60 * 1000);
  }, msFaltan3am());

  console.log('🕒 Limpieza programada para las 3am diariamente (mensajes expiran a los 8 días)');
}

module.exports = { iniciarLimpieza, limpiarMensajesExpirados };
