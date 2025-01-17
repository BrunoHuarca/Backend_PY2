const express = require('express');
const router = express.Router();
const db = require('../config/db');

// Registrar usuario
router.post('/registro', (req, res) => {
  const { nombre, numero, contraseña, direccion, ubicacion } = req.body;

  const query = `INSERT INTO Usuarios (Nombre, Numero, Contraseña, Direccion, Ubicacion) 
                 VALUES (?, ?, ?, ?, ?)`;
  db.query(query, [nombre, numero, contraseña, direccion, JSON.stringify(ubicacion)], (err, result) => {
    if (err) {
      console.error(err);
      res.status(500).send('Error al registrar usuario');
    } else {
      res.status(201).send('Usuario registrado con éxito');
    }
  });
});

// Login de usuario
router.post('/login', (req, res) => {
  const { nombre, contraseña } = req.body;

  const query = `SELECT * FROM Usuarios WHERE Nombre = ?`;
  db.query(query, [nombre], (err, results) => {
    if (err) {
      console.error(err);
      res.status(500).send('Error del servidor');
    } else if (results.length === 0) {
      res.status(404).send('Usuario no encontrado');
    } else if (contraseña === results[0].Contraseña) {
      res.status(200).json({ mensaje: 'Inicio de sesión exitoso', usuario: results[0] });
    } else {
      res.status(401).send('Contraseña incorrecta');
    }
  });
});

module.exports = router;
