require('dotenv').config();
const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const http = require('http');
const { Server } = require('socket.io');

// Importar rutas
const usuariosRoutes = require('./routes/usuarios');
const productosRoutes = require('./routes/productos');
const pedidosRoutes = require('./routes/pedidos');
const authRoutes = require('./routes/auth'); 
const carritoRouter = require('./routes/carrito');
const categoriasRouter = require('./routes/categorias');

const app = express();
const PORT = process.env.PORT || 3000;

// Crear el servidor HTTP
const server = http.createServer(app);

// Configurar Socket.io
const io = new Server(server);
global.io = io; // Hacer io global para usarlo en las rutas

// Manejar conexiones de WebSocket
io.on('connection', (socket) => {
  console.log('Cliente conectado');

  socket.on('disconnect', () => {
    console.log('Cliente desconectado');
  });
});

// Middleware
app.use(cors());
app.use(bodyParser.json());

// Prefijo común para todas las rutas: "/api"
app.use('/api', (req, res, next) => {
  console.log(`Nueva solicitud para la API: ${req.method} ${req.url}`);
  next(); // Continuar con las rutas definidas
});

// Rutas (ya están bajo "/api")
app.use('/api/usuarios', usuariosRoutes);
app.use('/api/productos', productosRoutes);
app.use('/api/pedidos', pedidosRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/carrito', carritoRouter);
app.use('/api/categorias', categoriasRouter);

// Iniciar servidor
server.listen(PORT, () => {
  console.log(`Servidor corriendo en http://localhost:${PORT}`);
});
