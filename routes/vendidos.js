const express = require('express');
const router = express.Router();  // Usamos router, no app
const db = require('../config/db');  // Usamos la conexión directa

// Obtener vendidos
router.get('/', (req, res) => {
    const query = `SELECT * FROM Vendidos`;
  
    db.query(query, (err, results) => {
      if (err) {
        console.error(err);
        return res.status(500).send('Error del servidor');
      } 
      console.log('Productos obtenidos:', results); // Imprimir la respuesta en consola
      return res.status(200).json(results);
    });
});

// Endpoint para mover un pedido a la tabla "Vendidos"
router.delete('/mover-a-vendidos/:pedidoId', async (req, res) => {
    const { pedidoId } = req.params;
    console.log(`Iniciando el proceso para mover el pedido con ID: ${pedidoId}`);

    try {
        // Obtener los datos del pedido desde la tabla "Pedidos"
        console.log(`Consultando el pedido con ID: ${pedidoId} en la tabla "Pedidos"`);
        
        // Usamos Promesas para consultas a la DB
        const pedido = await new Promise((resolve, reject) => {
            db.query('SELECT * FROM Pedidos WHERE Pedido_ID = ?', [pedidoId], (err, results) => {
                if (err) {
                    return reject(err);  // Si hay un error, rechazamos la promesa
                }
                resolve(results);  // Si no hay error, resolvemos con los resultados
            });
        });

        if (pedido.length === 0) {
            console.log(`No se encontró el pedido con ID: ${pedidoId}`);
            return res.status(404).json({ mensaje: 'El pedido no existe' });
        }

        const pedidoData = pedido[0];

        // Verificar si el Codigo_Pedido ya existe en la tabla "Vendidos"
        const existingPedido = await new Promise((resolve, reject) => {
            db.query('SELECT * FROM Vendidos WHERE Codigo_Pedido = ?', [pedidoData.Codigo_Pedido], (err, results) => {
                if (err) {
                    return reject(err);
                }
                resolve(results);
            });
        });

        if (existingPedido.length > 0) {
            console.log(`El Codigo_Pedido ${pedidoData.Codigo_Pedido} ya existe en la tabla Vendidos`);
            return res.status(400).json({ mensaje: 'El pedido ya ha sido movido a la tabla Vendidos' });
        }

        // Insertar el pedido en la tabla "Vendidos"
        console.log('Insertando el pedido en la tabla "Vendidos"...');
        const insertarQuery = `
            INSERT INTO Vendidos (
                Pedido_ID, Codigo_Pedido, Usuario_ID, Productos, Total, Estado, Direccion_Entrega, 
                Ubicacion_Entrega, Telefono_Cliente, Fecha_Pedido, Referencia_Entrega, Tipo_Pago, 
                Efectivo, Delivery
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `;
        
        // Usamos Promesas para la inserción
        await new Promise((resolve, reject) => {
            db.query(insertarQuery, [
                pedidoData.Pedido_ID,
                pedidoData.Codigo_Pedido,
                pedidoData.Usuario_ID,
                pedidoData.Productos,
                pedidoData.Total,
                pedidoData.Estado,
                pedidoData.Direccion_Entrega,
                pedidoData.Ubicacion_Entrega,
                pedidoData.Telefono_Cliente,
                pedidoData.Fecha_Pedido,
                pedidoData.Referencia_Entrega,
                pedidoData.Tipo_Pago,
                pedidoData.Efectivo,
                pedidoData.Delivery
            ], (err) => {
                if (err) {
                    console.error("Error al insertar el pedido en Vendidos:", err);
                    return reject(err);  // Rechazamos si hay error
                }
                resolve();  // Resolvemos si todo va bien
            });
        });

        // Eliminar el pedido de la tabla "Pedidos"
        console.log('Eliminando el pedido de la tabla "Pedidos"...');
        await new Promise((resolve, reject) => {
            db.query('DELETE FROM Pedidos WHERE Pedido_ID = ?', [pedidoId], (err) => {
                if (err) {
                    console.error("Error al eliminar el pedido de la tabla Pedidos:", err);
                    return reject(err);  // Rechazamos si hay error
                }
                resolve();  // Resolvemos si todo va bien
            });
        });

        console.log('Pedido movido correctamente a la tabla "Vendidos" y eliminado de "Pedidos"');
        res.json({ mensaje: 'El pedido ha sido movido a la tabla Vendidos correctamente' });

    } catch (error) {
        console.error('Error al mover el pedido:', error);
        res.status(500).json({ mensaje: 'Hubo un error al procesar el pedido', error: error.message });
    }
});



module.exports = router;
