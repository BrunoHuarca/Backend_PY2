const express = require('express');
const router = express.Router();
const db = require('../config/db');

// Obtener notificaciones por usuario
router.get('/:Usuario_ID', (req, res) => {
  const { Usuario_ID } = req.params;

  const query = `
    SELECT n.* 
    FROM Notificaciones n
    JOIN Pedidos p ON n.Pedido_ID = p.Pedido_ID
    WHERE p.Usuario_ID = ?
    ORDER BY n.Fecha_Creacion DESC
  `;

  db.query(query, [Usuario_ID], (err, results) => {
    if (err) {
      console.error(err);
      res.status(500).send('Error al obtener notificaciones');
    } else {
      res.status(200).json(results);
    }
  });
});

// Marcar notificación como vista
router.put('/:Notificacion_ID/vista', (req, res) => {
  const { Notificacion_ID } = req.params;

  const query = `UPDATE Notificaciones SET Visto = TRUE WHERE Notificacion_ID = ?`;
  db.query(query, [Notificacion_ID], (err) => {
    if (err) {
      console.error(err);
      res.status(500).send('Error al marcar notificación como vista');
    } else {
      res.status(200).send('Notificación marcada como vista');
    }
  });
});

module.exports = router;
