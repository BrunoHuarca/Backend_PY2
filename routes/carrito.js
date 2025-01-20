const express = require('express');
const router = express.Router();
const db = require('../config/db');

// Agregar un producto al carrito
router.post('/', (req, res) => {
  const { Usuario_ID, Producto_ID, Cantidad } = req.body;

  // Verificar que los campos necesarios no sean nulos ni vacíos
  if (!Usuario_ID || !Producto_ID || !Cantidad) {
    return res.status(400).send('Faltan datos en la solicitud.');
  }

  // Verificar que la cantidad sea un número positivo
  if (isNaN(Cantidad) || Cantidad <= 0) {
    return res.status(400).send('La cantidad debe ser un número positivo.');
  }

  // Consultar si ya existe un carrito para este usuario
  const queryCarritoExistente = `SELECT * FROM Carrito WHERE Usuario_ID = ?`;
  db.query(queryCarritoExistente, [Usuario_ID], (err, results) => {
    if (err) {
      console.error('Error al verificar el carrito:', err);
      return res.status(500).send('Error al verificar el carrito');
    }

    let carrito;
    if (results.length > 0) {
      // Si ya existe un carrito, obtenemos los productos actuales y los actualizamos
      carrito = results[0];
      let productos = JSON.parse(carrito.Productos);
      const productoExistente = productos.find(p => p.producto_id === Producto_ID);

      if (productoExistente) {
        // Si el producto ya está en el carrito, actualizamos la cantidad
        productoExistente.cantidad += Cantidad;
      } else {
        // Si el producto no está en el carrito, lo agregamos
        productos.push({ producto_id: Producto_ID, cantidad: Cantidad });
      }

      // Calcular el total actualizado del carrito
      const queryProductos = 'SELECT Precio FROM Productos WHERE Producto_ID = ?';
      db.query(queryProductos, [Producto_ID], (err, productoResult) => {
        if (err) {
          console.error('Error al obtener el precio del producto:', err);
          return res.status(500).send('Error al obtener el precio');
        }

        const precio = productoResult[0].Precio;
        const total = productos.reduce((acc, p) => acc + (p.cantidad * precio), 0);

        // Actualizar el carrito con los nuevos productos y el total
        const queryActualizarCarrito = `UPDATE Carrito SET Productos = ?, Total = ? WHERE Carrito_ID = ?`;
        db.query(queryActualizarCarrito, [JSON.stringify(productos), total, carrito.Carrito_ID], (err) => {
          if (err) {
            console.error('Error al actualizar el carrito:', err);
            return res.status(500).send('Error al actualizar el carrito');
          }

          res.status(200).json({ mensaje: 'Producto agregado al carrito', total });
        });
      });
    } else {
      // Si no existe un carrito, creamos uno nuevo
      const productos = [{ producto_id: Producto_ID, cantidad: Cantidad }];
      const queryPrecio = 'SELECT Precio FROM Productos WHERE Producto_ID = ?';
      db.query(queryPrecio, [Producto_ID], (err, productoResult) => {
        if (err) {
          console.error('Error al obtener el precio del producto:', err);
          return res.status(500).send('Error al obtener el precio');
        }

        const precio = productoResult[0].Precio;
        const total = Cantidad * precio;

        const queryNuevoCarrito = `INSERT INTO Carrito (Usuario_ID, Productos, Total) VALUES (?, ?, ?)`;
        db.query(queryNuevoCarrito, [Usuario_ID, JSON.stringify(productos), total], (err, result) => {
          if (err) {
            console.error('Error al crear el carrito:', err);
            return res.status(500).send('Error al crear el carrito');
          }

          res.status(201).json({ mensaje: 'Carrito creado y producto agregado', total });
        });
      });
    }
  });
});

// Obtener el carrito de un usuario
router.get('/:Usuario_ID', (req, res) => {
  const { Usuario_ID } = req.params;

  const queryCarrito = `SELECT * FROM Carrito WHERE Usuario_ID = ?`;
  db.query(queryCarrito, [Usuario_ID], (err, results) => {
    if (err) {
      console.error('Error al obtener el carrito:', err);
      return res.status(500).send('Error al obtener el carrito');
    }

    if (results.length === 0) {
      return res.status(404).send('No se encontró el carrito');
    }

    res.status(200).json(results[0]);  // Devolver el carrito del usuario
  });
});

// Editar la cantidad de un producto en el carrito
router.put('/:Usuario_ID/producto/:Producto_ID', (req, res) => {
  const { Usuario_ID, Producto_ID } = req.params;
  const { Cantidad } = req.body;

  if (isNaN(Cantidad) || Cantidad <= 0) {
    return res.status(400).send('La cantidad debe ser un número positivo mayor que 0');
  }

  const queryCarrito = `SELECT * FROM Carrito WHERE Usuario_ID = ?`;
  db.query(queryCarrito, [Usuario_ID], (err, results) => {
    if (err) {
      console.error('Error al obtener el carrito:', err);
      return res.status(500).send('Error al obtener el carrito');
    }

    if (results.length === 0) {
      return res.status(404).send('No se encontró el carrito');
    }

    let carrito = results[0];
    let productos = JSON.parse(carrito.Productos);
    let productoExistente = productos.find(p => p.producto_id === parseInt(Producto_ID));

    if (!productoExistente) {
      return res.status(404).send('Producto no encontrado en el carrito');
    }

    // Actualizar la cantidad del producto
    productoExistente.cantidad = Cantidad;

    // Calcular el nuevo total del carrito
    const queryPrecio = 'SELECT Precio FROM Productos WHERE Producto_ID = ?';
    db.query(queryPrecio, [Producto_ID], (err, productoResult) => {
      if (err) {
        console.error('Error al obtener el precio del producto:', err);
        return res.status(500).send('Error al obtener el precio');
      }

      const precio = productoResult[0].Precio;
      const total = productos.reduce((acc, p) => acc + (p.cantidad * precio), 0);

      // Actualizar el carrito con los nuevos productos y el total
      const queryActualizarCarrito = `UPDATE Carrito SET Productos = ?, Total = ? WHERE Carrito_ID = ?`;
      db.query(queryActualizarCarrito, [JSON.stringify(productos), total, carrito.Carrito_ID], (err) => {
        if (err) {
          console.error('Error al actualizar el carrito:', err);
          return res.status(500).send('Error al actualizar el carrito');
        }

        res.status(200).json({ mensaje: 'Cantidad del producto actualizada', total });
      });
    });
  });
});

// Eliminar un producto del carrito
router.delete('/:Usuario_ID/producto/:Producto_ID', (req, res) => {
  const { Usuario_ID, Producto_ID } = req.params;

  const queryCarrito = `SELECT * FROM Carrito WHERE Usuario_ID = ?`;
  db.query(queryCarrito, [Usuario_ID], (err, results) => {
    if (err) {
      console.error('Error al obtener el carrito:', err);
      return res.status(500).send('Error al obtener el carrito');
    }

    if (results.length === 0) {
      return res.status(404).send('No se encontró el carrito');
    }

    let carrito = results[0];
    let productos = JSON.parse(carrito.Productos);
    let index = productos.findIndex(p => p.producto_id === parseInt(Producto_ID));

    if (index === -1) {
      return res.status(404).send('Producto no encontrado en el carrito');
    }

    // Eliminar el producto del carrito
    productos.splice(index, 1);

    // Calcular el nuevo total del carrito
    const queryPrecio = 'SELECT Precio FROM Productos WHERE Producto_ID = ?';
    db.query(queryPrecio, [Producto_ID], (err, productoResult) => {
      if (err) {
        console.error('Error al obtener el precio del producto:', err);
        return res.status(500).send('Error al obtener el precio');
      }

      const precio = productoResult[0].Precio;
      const total = productos.reduce((acc, p) => acc + (p.cantidad * precio), 0);

      // Actualizar el carrito con los nuevos productos y el total
      const queryActualizarCarrito = `UPDATE Carrito SET Productos = ?, Total = ? WHERE Carrito_ID = ?`;
      db.query(queryActualizarCarrito, [JSON.stringify(productos), total, carrito.Carrito_ID], (err) => {
        if (err) {
          console.error('Error al actualizar el carrito:', err);
          return res.status(500).send('Error al actualizar el carrito');
        }

        res.status(200).json({ mensaje: 'Producto eliminado del carrito', total });
      });
    });
  });
});

module.exports = router;
