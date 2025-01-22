const express = require('express');
const router = express.Router();
const db = require('../config/db');

// Agregar productos al carrito
// Agregar productos al carrito
router.post('/', (req, res) => {
  const { Usuario_ID, Productos } = req.body;

  // Validar que los datos requeridos existan
  if (!Usuario_ID || !Productos) {
    return res.status(400).json({ error: 'Faltan datos en la solicitud.' });
  }

  // Validar que los productos sean correctos
  if (!Array.isArray(Productos) || Productos.some(p => !p.producto_id || !p.cantidad || p.cantidad <= 0)) {
    return res.status(400).json({ error: 'Los productos deben tener un ID válido y una cantidad positiva.' });
  }

  // Validar que el usuario exista
  const queryUsuario = 'SELECT Usuario_ID FROM Usuarios WHERE Usuario_ID = ?';
  db.query(queryUsuario, [Usuario_ID], (err, results) => {
    if (err) {
      console.error('Error al verificar Usuario_ID:', err);
      return res.status(500).json({ error: 'Error al verificar el usuario.' });
    }
    if (results.length === 0) {
      return res.status(400).json({ error: 'El usuario no existe.' });
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
        // Si ya existe un carrito
        carrito = results[0];
        let productos = JSON.parse(carrito.Productos);

        // Actualizar o agregar los productos al carrito
        Productos.forEach(p => {
          const productoExistente = productos.find(item => item.producto_id === p.producto_id);
          if (productoExistente) {
            productoExistente.cantidad += p.cantidad;
          } else {
            productos.push(p);
          }
        });

        // Calcular el total actualizado
        const queryProductos = 'SELECT Producto_ID, Precio FROM Productos WHERE Producto_ID IN (?)';
        db.query(queryProductos, [productos.map(p => p.producto_id)], (err, productoResults) => {
          if (err) {
            console.error('Error al obtener los precios de los productos:', err);
            return res.status(500).send('Error al obtener los precios');
          }

          let totalCalculado = 0;
          productos.forEach(p => {
            const productoPrecio = productoResults.find(pr => pr.Producto_ID === p.producto_id);
            if (productoPrecio) {
              totalCalculado += p.cantidad * productoPrecio.Precio;
            }
          });

          // Actualizar el carrito
          const queryActualizarCarrito = `UPDATE Carrito SET Productos = ?, Total = ? WHERE Carrito_ID = ?`;
          db.query(queryActualizarCarrito, [JSON.stringify(productos), totalCalculado, carrito.Carrito_ID], (err) => {
            if (err) {
              console.error('Error al actualizar el carrito:', err);
              return res.status(500).send('Error al actualizar el carrito');
            }
            res.status(200).json({ mensaje: 'Producto(s) agregado(s) al carrito', total: totalCalculado });
          });
        });
      } else {
        // Si no existe un carrito, creamos uno nuevo
        const queryPrecio = 'SELECT Producto_ID, Precio FROM Productos WHERE Producto_ID IN (?)';
        db.query(queryPrecio, [Productos.map(p => p.producto_id)], (err, productoResults) => {
          if (err) {
            console.error('Error al obtener los precios de los productos:', err);
            return res.status(500).send('Error al obtener los precios');
          }

          let totalCalculado = 0;
          Productos.forEach(p => {
            const productoPrecio = productoResults.find(pr => pr.Producto_ID === p.producto_id);
            if (productoPrecio) {
              totalCalculado += p.cantidad * productoPrecio.Precio;
            }
          });

          const queryNuevoCarrito = `INSERT INTO Carrito (Usuario_ID, Productos, Total) VALUES (?, ?, ?)`;
          db.query(queryNuevoCarrito, [Usuario_ID, JSON.stringify(Productos), totalCalculado], (err) => {
            if (err) {
              console.error('Error al crear el carrito:', err);
              return res.status(500).send('Error al crear el carrito');
            }
            res.status(201).json({ mensaje: 'Carrito creado y producto(s) agregado(s)', total: totalCalculado });
          });
        });
      }
    });
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

    // Calcular el nuevo total del carrito basado en todos los productos
    let total = 0;
    const calcularTotal = async () => {
      for (let p of productos) {
        const queryPrecio = 'SELECT Precio FROM Productos WHERE Producto_ID = ?';
        const [productoResult] = await db.promise().query(queryPrecio, [p.producto_id]);

        if (productoResult.length > 0) {
          total += p.cantidad * productoResult[0].Precio;
        }
      }
    };

    calcularTotal()
      .then(() => {
        // Actualizar el carrito con los nuevos productos y el total
        const queryActualizarCarrito = `UPDATE Carrito SET Productos = ?, Total = ? WHERE Carrito_ID = ?`;
        db.query(queryActualizarCarrito, [JSON.stringify(productos), total, carrito.Carrito_ID], (err) => {
          if (err) {
            console.error('Error al actualizar el carrito:', err);
            return res.status(500).send('Error al actualizar el carrito');
          }

          res.status(200).json({ mensaje: 'Cantidad del producto actualizada', total });
        });
      })
      .catch(error => {
        console.error('Error al calcular el total del carrito:', error);
        res.status(500).send('Error al calcular el total del carrito');
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

    if (productos.length === 0) {
      // Si no quedan productos, reinicia el carrito
      const queryVaciarCarrito = `UPDATE Carrito SET Productos = '[]', Total = 0 WHERE Carrito_ID = ?`;
      db.query(queryVaciarCarrito, [carrito.Carrito_ID], (err) => {
        if (err) {
          console.error('Error al vaciar el carrito:', err);
          return res.status(500).send('Error al vaciar el carrito');
        }
        res.status(200).json({ mensaje: 'Producto eliminado del carrito. Carrito vacío.', total: 0 });
      });
    } else {
      // Calcular el nuevo total con los productos restantes
      const queryProductos = 'SELECT Producto_ID, Precio FROM Productos WHERE Producto_ID IN (?)';
      db.query(queryProductos, [productos.map(p => p.producto_id)], (err, productoResults) => {
        if (err) {
          console.error('Error al obtener los precios de los productos:', err);
          return res.status(500).send('Error al obtener los precios');
        }

        const total = productos.reduce((acc, p) => {
          const productoPrecio = productoResults.find(pr => pr.Producto_ID === p.producto_id);
          return acc + (productoPrecio ? p.cantidad * productoPrecio.Precio : 0);
        }, 0);

        // Actualizar el carrito con los productos restantes y el nuevo total
        const queryActualizarCarrito = `UPDATE Carrito SET Productos = ?, Total = ? WHERE Carrito_ID = ?`;
        db.query(queryActualizarCarrito, [JSON.stringify(productos), total, carrito.Carrito_ID], (err) => {
          if (err) {
            console.error('Error al actualizar el carrito:', err);
            return res.status(500).send('Error al actualizar el carrito');
          }

          res.status(200).json({ mensaje: 'Producto eliminado del carrito', total });
        });
      });
    }
  });
});


module.exports = router;
