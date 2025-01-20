const express = require('express');
const router = express.Router();
const db = require('../config/db');

// Listar categorías
router.get('/', (req, res) => {
  const query = `SELECT * FROM Categorias`;

  db.query(query, (err, results) => {
    if (err) {
      console.error(err);
      res.status(500).send('Error al obtener categorías');
    } else {
      res.status(200).json(results);
    }
  });
});

// Crear nueva categoría
router.post('/', (req, res) => {
  const { Nombre, Tipo } = req.body;

  const query = `INSERT INTO Categorias (Nombre, Tipo) VALUES (?, ?)`;
  db.query(query, [Nombre, Tipo], (err) => {
    if (err) {
      console.error(err);
      res.status(500).send('Error al agregar categoría');
    } else {
      res.status(201).send('Categoría agregada con éxito');
    }
  });
});

module.exports = router;
