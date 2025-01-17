const express = require('express');
const router = express.Router();
const db = require('../config/db');

// Obtener productos
router.get('/', (req, res) => {
  const query = `SELECT * FROM Productos WHERE Disponible = 1`;

  db.query(query, (err, results) => {
    if (err) {
      console.error(err);
      res.status(500).send('Error del servidor');
    } else {
      res.status(200).json(results);
    }
  });
});

// Agregar producto
router.post('/', (req, res) => {
  const { Nombre, Descripcion, Precio, Imagen_Url, Categoria_ID } = req.body;

  const query = `INSERT INTO Productos (Nombre, Descripcion, Precio, Imagen_Url, Categoria_ID) 
                 VALUES (?, ?, ?, ?, ?)`;

  db.query(query, [Nombre, Descripcion, Precio, Imagen_Url, Categoria_ID], (err, result) => {
    if (err) {
      console.error(err);
      res.status(500).send('Error al agregar producto');
    } else {
      res.status(201).send('Producto agregado con éxito');
    }
  });
});

module.exports = router;
