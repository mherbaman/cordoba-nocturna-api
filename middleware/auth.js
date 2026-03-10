// ================================================
//   CÓRDOBA NOCTURNA — Middleware de autenticación
// ================================================

const jwt = require('jsonwebtoken');

// Verifica que el request tenga un token válido de usuario
function authUsuario(req, res, next) {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'Token requerido' });
  try {
    req.usuario = jwt.verify(token, process.env.JWT_SECRET);
    next();
  } catch {
    res.status(401).json({ error: 'Token inválido o expirado' });
  }
}

// Verifica que el request tenga un token válido de admin
function authAdmin(req, res, next) {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'Token requerido' });
  try {
    req.admin = jwt.verify(token, process.env.JWT_SECRET);
    next();
  } catch {
    res.status(401).json({ error: 'Token inválido o expirado' });
  }
}

// Verifica que sea superadmin (vos)
function authSuperAdmin(req, res, next) {
  authAdmin(req, res, () => {
    if (!req.admin.es_superadmin) {
      return res.status(403).json({ error: 'Acceso denegado' });
    }
    next();
  });
}

module.exports = { authUsuario, authAdmin, authSuperAdmin };
