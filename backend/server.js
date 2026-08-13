require('dotenv').config();

const compression = require('compression');
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const path = require('path');

const deliveryRoutes = require('./routes/deliveryRoutes');
const userRoutes = require('./routes/userRoutes');
const productRoutes = require('./routes/productRoutes');
const cartRoutes = require('./routes/cartRoutes');
const orderRoutes = require('./routes/orderRoutes');
const reviewRoutes = require('./routes/reviewRoutes');
const messageRoutes = require('./routes/messageRoutes');

const app = express();

// 1. Security headers
app.use(helmet({
  crossOriginResourcePolicy: { policy: 'cross-origin' },
}));

// 2. Rate limiting (auth routes first, then general)
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: 'Too many login attempts, please try again after 15 minutes.' },
});
app.use('/api/users/login', authLimiter);
app.use('/api/users/register', authLimiter);

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: 'Too many requests from this IP, please try again later.' },
});
app.use('/api/', limiter);

// 3. CORS - MUST come before routes
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:5173',
  credentials: true,
}));

// 4. Body parsing
app.use(compression());
app.use(express.json({ limit: '10kb' }));

// 5. Static files
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// 6. Routes
app.use('/api/users', userRoutes);
app.use('/api/products', productRoutes);
app.use('/api/cart', cartRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/reviews', reviewRoutes);
app.use('/api/messages', messageRoutes);
app.use('/api/delivery', deliveryRoutes);

// 7. Health check
app.get('/', (req, res) => {
  res.send('AgriSync API is running');
});

// 8. Global error handler
app.use((err, req, res, next) => {
  console.error('ERROR:', err.stack);
  const message = process.env.NODE_ENV === 'production'
    ? 'Something went wrong!'
    : err.message;
  res.status(err.status || 500).json({ message });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});