// middleware/auth.js

const jwt = require('jsonwebtoken');

// Middleware para proteger rutas
const verificarToken = (req, res, next) => {
  const token = req.headers['authorization']?.split(' ')[1]; // Token enviado como Bearer

  if (!token) {
    return res.status(403).json({ mensaje: 'Se requiere autenticación' });
  }

  jwt.verify(token, process.env.JWT_SECRET_KEY, (err, decoded) => {
    if (err) {
      return res.status(401).json({ mensaje: 'Token no válido' });
    }
    req.usuario = decoded; // Agregamos la información del usuario al request
    next();
  });
};

module.exports = { verificarToken };
