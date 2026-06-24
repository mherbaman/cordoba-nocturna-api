
// onesignal.js — Helper para enviar notificaciones push via OneSignal
const fetch = require('node-fetch');

const ONESIGNAL_APP_ID = '997d5c8c-eb9f-4dc6-b613-6d80c24832ed';
const ONESIGNAL_API_KEY = 'os_v2_app_tf6vzdhlt5g4nnqtnwamesbs5xwwqf3wehcebdvnhizz6ibj5boppvjackvjw2yd52yeiyx7s7ybwloj56t6bxsp3s7o4fz223qhkeq';

// Enviar a todos los suscriptores
async function notificarTodos(titulo, mensaje, url = 'https://cordobalux.com/padel') {
  return enviarNotificacion({ included_segments: ['Total Subscriptions'] }, titulo, mensaje, url);
}

// Enviar a un usuario específico por su external_id (usuario_id de la DB)
async function notificarUsuario(usuarioId, titulo, mensaje, url = 'https://cordobalux.com/padel') {
  return enviarNotificacion({ include_aliases: { external_id: [usuarioId] }, target_channel: 'push' }, titulo, mensaje, url);
}

// Enviar a una lista de usuarios
async function notificarUsuarios(usuarioIds, titulo, mensaje, url = 'https://cordobalux.com/padel') {
  if (!usuarioIds.length) return;
  return enviarNotificacion({ include_aliases: { external_id: usuarioIds }, target_channel: 'push' }, titulo, mensaje, url);
}

async function enviarNotificacion(filtros, titulo, mensaje, url) {
  try {
    const body = {
      app_id: ONESIGNAL_APP_ID,
      headings: { en: titulo, es: titulo },
      contents: { en: mensaje, es: mensaje },
      url,
      chrome_web_icon: 'https://cordobalux.com/icons/padel-192.png',
      ...filtros
    };
    const r = await fetch('https://onesignal.com/api/v1/notifications', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${ONESIGNAL_API_KEY}`
      },
      body: JSON.stringify(body)
    });
    const data = await r.json();
    console.log('OneSignal:', data.id || data.errors);
    return data;
  } catch(e) {
    console.error('OneSignal error:', e.message);
  }
}

module.exports = { notificarTodos, notificarUsuario, notificarUsuarios };
