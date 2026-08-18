require('dotenv').config();

const compression = require('compression');
const express = require('express');
const cors = require('cors');
const path = require('path');
const deliveryRoutes = require('./routes/deliveryRoutes');
const deliveryZoneRoutes = require('./routes/deliveryZoneRoutes');

const userRoutes = require('./routes/userRoutes');
const productRoutes = require('./routes/productRoutes');
const cartRoutes = require('./routes/cartRoutes');
const orderRoutes = require('./routes/orderRoutes');
const reviewRoutes = require('./routes/reviewRoutes');
const messageRoutes = require('./routes/messageRoutes');
const inventoryRoutes = require('./routes/inventoryRoutes');
const comparisonRoutes = require('./routes/comparisonRoutes');

const app = express();

// CORS: Explicitly allow your frontend origin
// This prevents "No Access-Control-Allow-Origin header" errors
app.use(cors({
  origin: 'http://localhost:5173',
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(compression());
app.use(express.json());

// Serve uploaded images
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// API Routes
app.use('/api/users', userRoutes);
app.use('/api/products', productRoutes);
app.use('/api/cart', cartRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/reviews', reviewRoutes);
app.use('/api/messages', messageRoutes);
app.use('/api/inventory', inventoryRoutes);
app.use('/api/delivery', deliveryRoutes);
app.use('/api/delivery-zones', deliveryZoneRoutes);
app.use('/api/comparisons', comparisonRoutes);

// Health check — visit http://localhost:5000/ to confirm backend is alive
app.get('/', (req, res) => {
  res.send('AgriSync API (Supabase + Prisma) is running');
});

// Global error handler — catches errors from controllers and sends JSON instead of crashing
app.use((err, req, res, next) => {
  console.error('ERROR:', err.message);
  console.error(err.stack);
  res.status(err.status || 500).json({
    message: err.message || 'Something went wrong!',
    // Only show stack trace in development
    ...(process.env.NODE_ENV !== 'production' && { stack: err.stack })
  });
});

// Catch unhandled promise rejections (e.g., Prisma query fails unexpectedly)
// WITHOUT this, your server dies on any async error
process.on('unhandledRejection', (err) => {
  console.error('UNHANDLED REJECTION (server stays alive):', err.message);
  console.error(err.stack);
});

// Catch uncaught exceptions (e.g., trying to use a variable before declaration)
// These are fatal — we log them and let nodemon restart
process.on('uncaughtException', (err) => {
  console.error('UNCAUGHT EXCEPTION (server will restart):', err.message);
  console.error(err.stack);
  process.exit(1);
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});