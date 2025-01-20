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
      console.log('Productos obtenidos:', results); // Imprimir la respuesta en consola
      res.status(200).json(results);
    }
  });
});

// Obtener un solo producto por ID
router.get('/:productoId', (req, res) => {
  const productoId = req.params.productoId;
  const query = 'SELECT * FROM Productos WHERE Producto_ID = ?';

  db.query(query, [productoId], (err, results) => {
    if (err) {
      console.error(err);
      return res.status(500).send('Error al obtener el producto');
    }
    if (results.length > 0) {
      res.status(200).json(results[0]);
    } else {
      res.status(404).send('Producto no encontrado');
    }
  });
});

// Obtener productos por Categoria_ID
router.get('/categoria/:Categoria_ID', (req, res) => {
  const { Categoria_ID } = req.params;

  // Verificar que el Categoria_ID sea válido
  if (!Categoria_ID) {
    return res.status(400).send('El ID de la categoría es necesario');
  }

  // Sentencia SQL para obtener productos de una categoría específica
  const query = 'SELECT * FROM Productos WHERE Categoria_ID = ?';

  // Ejecutar la consulta
  db.query(query, [Categoria_ID], (err, results) => {
    if (err) {
      console.error('Error al obtener productos:', err);
      return res.status(500).send('Error al obtener productos');
    }

    if (results.length === 0) {
      return res.status(404).send('No se encontraron productos en esta categoría');
    }

    // Devolver los resultados como respuesta
    res.status(200).json(results);
  });
});

// Agregar producto
router.post('/', (req, res) => {
  const { Nombre, Descripcion, Precio, Imagen_Url, Categoria_ID } = req.body;
// Verificar que los campos no sean nulos
if (categoriaId == null || categoriaId <= 0) {
  print("Error: Categoria_ID es inválido");
  return;
}

  // Validación para los otros campos (opcional)
  if (!Nombre || !Descripcion || !Precio) {
    return res.status(400).json({ message: 'Nombre, Descripción y Precio son campos requeridos' });
  }

  // Consulta SQL para insertar el nuevo producto
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
