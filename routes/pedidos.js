const express = require('express');
const router = express.Router();
const db = require('../config/db');

// Crear un pedido
router.post('/', (req, res) => {
  const { Usuario_ID, Productos, Total, Direccion_Entrega, Ubicacion_Entrega, Telefono_Cliente, Referencia_Entrega } = req.body;

  // Validaciones de entrada (se mantienen igual)
  if (!Usuario_ID || !Productos || !Total || !Direccion_Entrega || !Ubicacion_Entrega || !Telefono_Cliente) {
    return res.status(400).send('Faltan datos en la solicitud.');
  }

  if (!Array.isArray(Productos) || Productos.some(p => typeof p.producto_id !== 'number' || typeof p.cantidad !== 'number')) {
    return res.status(400).send('El campo Productos debe ser un array de objetos con "producto_id" y "cantidad".');
  }

  const total = parseFloat(Total);
  if (isNaN(total) || total <= 0) {
    return res.status(400).send('El total debe ser un número válido y mayor que 0.');
  }

  const codigoPedido = `PED-${Date.now()}`;
  const productosJSON = JSON.stringify(Productos);

  const queryPedido = `
    INSERT INTO Pedidos (Codigo_Pedido, Usuario_ID, Productos, Total, Direccion_Entrega, Ubicacion_Entrega, Telefono_Cliente, Referencia_Entrega) 
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)`;

  db.query(
    queryPedido,
    [
      codigoPedido,
      Usuario_ID,
      productosJSON,
      total,
      Direccion_Entrega,
      JSON.stringify(Ubicacion_Entrega),
      Telefono_Cliente,
      Referencia_Entrega
    ],
    (err, result) => {
      if (err) {
        console.error('Error al crear el pedido:', err);
        return res.status(500).send('Error al crear el pedido');
      }

      const pedidoId = result.insertId;

      // Eliminar el carrito del usuario
      const queryEliminarCarrito = `DELETE FROM Carrito WHERE Usuario_ID = ?`;

      db.query(queryEliminarCarrito, [Usuario_ID], (err) => {
        if (err) {
          console.error('Error al eliminar el carrito:', err);
          return res.status(500).send('Pedido creado, pero hubo un error al eliminar el carrito');
        }

        // Guardar notificación
        const queryNotificacion = `
          INSERT INTO Notificaciones (Pedido_ID, Mensaje) 
          VALUES (?, ?)`;

        const mensaje = `Nuevo pedido creado con código ${codigoPedido}`;

        db.query(queryNotificacion, [pedidoId, mensaje], (err) => {
          if (err) {
            console.error('Error al guardar la notificación:', err);
            return res.status(500).send('Pedido creado, pero hubo un error al guardar la notificación');
          }

          // Enviar respuesta con éxito
          res.status(201).json({
            mensaje: 'Pedido creado con éxito',
            codigoPedido,
            pedidoId,
          });

          // Emitir notificación en tiempo real si se está usando WebSocket o SSE
          if (global.io) {
            global.io.emit('nueva-notificacion', { mensaje });
          }
        });
      });
    }
  );
});



// Obtener pedidos por usuario (solo para clientes)
router.get('/usuario/:Usuario_ID', (req, res) => {
  const { Usuario_ID } = req.params;

  // Verificar que el Usuario_ID sea válido
  if (!Usuario_ID) {
    return res.status(400).send('El ID de usuario es necesario');
  }

  const query = `SELECT * FROM Pedidos WHERE Usuario_ID = ? ORDER BY Fecha_Pedido DESC`;
  db.query(query, [Usuario_ID], (err, results) => {
    if (err) {
      console.error('Error al obtener los pedidos:', err);
      return res.status(500).send('Error al obtener pedidos');
    }

    res.status(200).json(results);  // Solo devolver los pedidos del cliente
  });
});

// Obtener todos los pedidos (solo para administradores)
router.get('/', (req, res) => {
  // Verificar que el usuario sea administrador (esto depende de tu sistema de autenticación)
  // Aquí asumo que tienes algún sistema para verificar si el usuario es administrador
  // Ejemplo: req.user contiene los datos del usuario autenticado
  const esAdmin = req.user && req.user.rol === 'admin';  // Suponiendo que req.user contiene los datos del usuario autenticado

  if (esAdmin) {
    return res.status(403).send('Acceso denegado. Solo los administradores pueden ver todos los pedidos.');
  }

  const query = `SELECT * FROM Pedidos ORDER BY Fecha_Pedido DESC`;
  db.query(query, (err, results) => {
    if (err) {
      console.error('Error al obtener los pedidos:', err);
      return res.status(500).send('Error al obtener pedidos');
    }

    res.status(200).json(results);
  });
});

// Obtener un pedido por ID (solo para clientes o administradores)
router.get('/:Pedido_ID', (req, res) => {
  const { Pedido_ID } = req.params;
  const { Usuario_ID } = req.query;  // Suponiendo que el usuario logueado puede enviar su Usuario_ID en la consulta

  if (!Pedido_ID || !Usuario_ID) {
    return res.status(400).send('El ID del pedido y el ID del usuario son necesarios');
  }

  const query = `SELECT * FROM Pedidos WHERE Pedido_ID = ? AND Usuario_ID = ?`;
  db.query(query, [Pedido_ID, Usuario_ID], (err, results) => {
    if (err) {
      console.error('Error al obtener el pedido:', err);
      return res.status(500).send('Error al obtener el pedido');
    }

    if (results.length === 0) {
      return res.status(404).send('Pedido no encontrado');
    }

    res.status(200).json(results[0]);
  });
});

// Obtener detalles de un pedido con productos y cantidades
router.get('/pedido/:Pedido_ID', (req, res) => {
  const { Pedido_ID } = req.params;

  const query = `
    SELECT 
        jt.producto_id, 
        p.Nombre, 
        p.Descripcion, 
        p.Precio,
        jt.cantidad
    FROM Pedidos pd
    JOIN JSON_TABLE(
        pd.Productos, 
        '$[*]' COLUMNS (
            producto_id INT PATH '$.producto_id',
            cantidad INT PATH '$.cantidad'
        )
    ) AS jt ON 1=1
    JOIN Productos p ON p.Producto_ID = jt.producto_id
    WHERE pd.Pedido_ID = ?
  `;

  db.query(query, [Pedido_ID], (err, results) => {
    if (err) {
      console.error('Error al obtener los detalles del pedido:', err);
      return res.status(500).send('Error al obtener los detalles del pedido');
    }

    if (results.length === 0) {
      return res.status(404).send('Pedido no encontrado');
    }

    res.status(200).json(results);
  });
});


// Actualizar estado del pedido (solo para administradores)
router.put('/:Pedido_ID/estado', (req, res) => {
  const { Pedido_ID } = req.params;
  const { Estado } = req.body;

  // Verificar que el Estado no sea nulo
  if (!Estado) {
    return res.status(400).send('El estado del pedido es necesario');
  }

  // Validar si el estado es uno de los valores permitidos
  const estadosValidos = ['pendiente', 'recibido', 'preparando', 'en_camino', 'entregado'];
  if (!estadosValidos.includes(Estado)) {
    return res.status(400).send('Estado no válido');
  }

  // Consultar el estado actual del pedido
  const queryEstadoActual = `SELECT Estado FROM Pedidos WHERE Pedido_ID = ?`;
  db.query(queryEstadoActual, [Pedido_ID], (err, result) => {
    if (err) {
      console.error('Error al verificar el estado actual:', err);
      return res.status(500).send('Error al verificar el estado actual');
    }

    const estadoActual = result[0].Estado;
    // Si el estado actual es igual al nuevo, no hacer nada
    if (estadoActual === Estado) {
      return res.status(400).send('El estado es el mismo que el actual');
    }

    // Actualizar el estado del pedido
    const query = `UPDATE Pedidos SET Estado = ? WHERE Pedido_ID = ?`;
    db.query(query, [Estado, Pedido_ID], (err) => {
      if (err) {
        console.error('Error al actualizar el estado del pedido:', err);
        return res.status(500).send('Error al actualizar estado del pedido');
      }

      // Registrar el cambio en el historial de estados
      const historialQuery = `
        INSERT INTO HistorialEstados (Pedido_ID, Estado) 
        VALUES (?, ?)`; // Aquí se registra el cambio en el historial

      db.query(historialQuery, [Pedido_ID, Estado], (historialErr) => {
        if (historialErr) {
          console.error('Error al registrar el historial:', historialErr);
          return res.status(500).send('Error al registrar el historial');
        }

        // Crear una notificación para el cambio de estado
        const mensajeNotificacion = `El estado del pedido ${Pedido_ID} ha cambiado a ${Estado}`;
        const queryNotificacion = `INSERT INTO Notificaciones (Pedido_ID, Mensaje) VALUES (?, ?)`;

        db.query(queryNotificacion, [Pedido_ID, mensajeNotificacion], (notificacionErr) => {
          if (notificacionErr) {
            console.error('Error al guardar la notificación:', notificacionErr);
            return res.status(500).send('Error al guardar la notificación');
          }

          // Responder con éxito
          res.status(200).send('Estado actualizado con éxito y notificación enviada');
        });
      });
    });
  });
});

module.exports = router;
