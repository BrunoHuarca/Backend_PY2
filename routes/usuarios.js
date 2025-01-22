const express = require('express');
const router = express.Router();
const db = require('../config/db');

// Obtener datos del usuario por ID
router.get('/:id', (req, res) => {
  const { id } = req.params;

  const query = `SELECT * FROM Usuarios WHERE Usuario_ID = ?`;

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
// Editar datos del usuario
router.put('/editar', (req, res) => {
  const { id, nombre, numero, direccion, ubicacion, referencia, contrasena } = req.body;

  if (!id || !nombre || !numero || !direccion || !ubicacion || !referencia) {
    return res.status(400).send({ mensaje: 'Faltan datos para actualizar el usuario' });
  }

  // Construir consulta dinámica para solo actualizar los campos proporcionados
  const camposActualizar = [];
  const valoresActualizar = [];

  if (nombre) {
    camposActualizar.push('Nombre = ?');
    valoresActualizar.push(nombre);
  }
  if (numero) {
    camposActualizar.push('Numero = ?');
    valoresActualizar.push(numero);
  }
  if (direccion) {
    camposActualizar.push('Direccion = ?');
    valoresActualizar.push(direccion);
  }
  if (ubicacion) {
    camposActualizar.push('Ubicacion = ?');
    valoresActualizar.push(JSON.stringify(ubicacion)); // Almacenar como JSON
  }
  if (referencia) {
    camposActualizar.push('Referencia = ?');
    valoresActualizar.push(referencia);
  }
  if (contrasena) {
    camposActualizar.push('Contraseña = ?');
    valoresActualizar.push(contrasena); // Asume que la contraseña está encriptada si es necesario
  }

  valoresActualizar.push(id); // Agregar el ID al final para WHERE

  const query = `
    UPDATE Usuarios
    SET ${camposActualizar.join(', ')}
    WHERE Usuario_ID = ?
  `;

  db.query(query, valoresActualizar, (err) => {
    if (err) {
      console.error('Error al actualizar los datos del usuario:', err);
      return res.status(500).send({ mensaje: 'Error al actualizar los datos' });
    }

    res.send({ mensaje: 'Datos actualizados con éxito' });
  });
});



module.exports = router;
