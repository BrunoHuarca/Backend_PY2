const express = require('express');
const router = express.Router();
const db = require('../config/db');

// Obtener datos del usuario por ID
router.get('/:id', (req, res) => {
  const { id } = req.params;

  const query = `SELECT Direccion_Entrega, Ubicacion_Entrega, Telefono_Cliente 
                 FROM Usuarios WHERE Usuario_ID = ?`;

  db.query(query, [id], (err, results) => {
    if (err) {
      console.error(err);
      return res.status(500).send('Error al obtener los datos del usuario');
    }

    if (results.length === 0) {
      return res.status(404).send('Usuario no encontrado');
    }

    // Retornamos los datos del usuario
    res.status(200).json(results[0]);
  });
});

module.exports = router;
