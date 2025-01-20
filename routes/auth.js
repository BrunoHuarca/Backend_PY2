// routes/auth.js

const express = require('express');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const db = require('../config/db');  // Importamos la conexión a la base de datos

const router = express.Router();

// Ruta de Login
router.post('/login', async (req, res) => {
  const { Nombre, Contraseña } = req.body;

  try {
    if (!Nombre || !Contraseña) {
      return res.status(400).json({ mensaje: 'Nombre y contraseña son requeridos' });
    }

    // Verificar si el usuario existe
    const [resultado] = await db.promise().query('SELECT * FROM Usuarios WHERE Nombre = ?', [Nombre]);
    if (resultado.length === 0) {
      return res.status(401).json({ mensaje: 'Credenciales incorrectas' });
    }

    const usuario = resultado[0];
    console.log('Usuario encontrado:', usuario);

    // Verificar que los valores sean válidos antes de comparar
    if (!usuario.Contraseña) {
      console.error('Error: Hash de contraseña no encontrado en la base de datos');
      return res.status(500).json({ mensaje: 'Error interno en el servidor' });
    }

    const esContraseñaCorrecta = await bcrypt.compare(Contraseña, usuario.Contraseña);
    if (!esContraseñaCorrecta) {
      return res.status(401).json({ mensaje: 'Credenciales incorrectas' });
    }

    // Generar el token JWT
    const token = jwt.sign(
      { Usuario_ID: usuario.Usuario_ID, Rol: usuario.Rol },
      process.env.JWT_SECRET_KEY || 'default_secret',
      { expiresIn: '1h' }
    );

    res.json({ mensaje: 'Login exitoso', token });

  } catch (error) {
    console.error('Error en la ruta /login:', error.message, error.stack);
    res.status(500).json({ mensaje: `Error interno: ${error.message}` });
  }
});


// Ruta de Registro
router.post('/register', async (req, res) => {
  const { Nombre, Contraseña, Direccion, Numero, Referencia, Ubicacion } = req.body;

  // Validar que los campos no estén vacíos
  if (!Nombre || !Contraseña || !Direccion || !Numero || !Referencia || !Ubicacion) {
    return res.status(400).json({ mensaje: 'Todos los campos son requeridos' });
  }

  try {
    // Verificar si el usuario ya existe
    const [resultado] = await db.promise().query('SELECT * FROM Usuarios WHERE Nombre = ?', [Nombre]);
    if (resultado.length > 0) {
      return res.status(400).json({ mensaje: 'El nombre de usuario ya está en uso' });
    }

    // Encriptar la contraseña
    const contraseñaHash = await bcrypt.hash(Contraseña, 10);

    // Insertar al nuevo usuario
    const ubicacionString = typeof Ubicacion === 'string' ? Ubicacion : JSON.stringify(Ubicacion);
    await db.promise().query(
      'INSERT INTO Usuarios (Nombre, Contraseña, Direccion, Numero, Referencia, Ubicacion) VALUES (?, ?, ?, ?, ?, ?)',
      [Nombre, contraseñaHash, Direccion, Numero, Referencia, ubicacionString]
    );

    res.status(201).json({ mensaje: 'Usuario registrado exitosamente' });

  } catch (error) {
    console.error('Error al registrar el usuario:', error.message);
    res.status(500).json({ mensaje: `Error al registrar el usuario: ${error.message}` });
  }
});


module.exports = router;
