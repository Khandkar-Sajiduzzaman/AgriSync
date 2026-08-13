const prisma = require('../config/db');

// Helper: shape product to include _id for frontend compatibility
const shapeProduct = (product) => {
  if (!product) return product;
  return {
    ...product,
    _id: product.id,
    price: product.price?.toNumber ? product.price.toNumber() : product.price,
    farmer: product.farmer
      ? { ...product.farmer, _id: product.farmer.id }
      : product.farmer,
  };
};

/**
 * POST /api/cart
 * Add a product to the buyer's cart.
 */
const addToCart = async (req, res) => {
  try {
    if (req.user.role !== 'buyer') {
      return res.status(403).json({ message: 'Only buyers can add to cart' });
    }

    const { productId, quantity } = req.body;
    const buyerId = req.user.id;

    if (!productId) {
      return res.status(400).json({ message: 'Product ID is required' });
    }

    // Fetch product first so we can validate stock and availability
    const product = await prisma.product.findUnique({
      where: { id: productId },
    });

    if (!product) {
      return res.status(404).json({ message: 'Product not found' });
    }

    if (!product.isAvailable || product.isRemoved || !product.isApproved) {
      return res.status(400).json({ message: 'Product is not available for purchase' });
    }

    // Parse and validate quantity (single declaration only)
    const qty = parseInt(quantity);
    if (isNaN(qty) || qty < 1 || qty > 1000) {
      return res.status(400).json({ message: 'Quantity must be between 1 and 1000' });
    }

    if (qty > product.stock) {
      return res.status(400).json({
        message: `Only ${product.stock} units available in stock`,
      });
    }

    const existingItem = await prisma.cartItem.findUnique({
      where: { userId_productId: { userId: buyerId, productId } },
    });

    let cartItem;

    if (existingItem) {
      const newQuantity = existingItem.quantity + qty;

      if (newQuantity > product.stock) {
        return res.status(400).json({
          message: `Cannot add ${qty} more. You already have ${existingItem.quantity} in cart. Stock limit: ${product.stock}`,
        });
      }

      cartItem = await prisma.cartItem.update({
        where: { id: existingItem.id },
        data: { quantity: newQuantity },
        include: { product: { include: { farmer: { select: { id: true, name: true } } } } },
      });
    } else {
      cartItem = await prisma.cartItem.create({
        data: { userId: buyerId, productId, quantity: qty },
        include: { product: { include: { farmer: { select: { id: true, name: true } } } } },
      });
    }

    res.status(201).json({
      message: 'Added to cart',
      cartItemId: cartItem.id,
      quantity: cartItem.quantity,
    });
  } catch (error) {
    console.error('Add to cart error:', error);
    res.status(500).json({ message: 'Failed to add to cart' });
  }
};

/**
 * GET /api/cart
 * Get all items in the buyer's cart with totals.
 */
const getCart = async (req, res) => {
  try {
    if (req.user.role !== 'buyer') {
      return res.status(403).json({ message: 'Only buyers can view cart' });
    }

    const userId = req.user.id;

    const cartItems = await prisma.cartItem.findMany({
      where: { userId },
      include: {
        product: {
          include: {
            farmer: {
              select: { id: true, name: true },
            },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    let totalItems = 0;
    let totalPrice = 0;

    const shapedItems = cartItems.map((item) => {
      const product = shapeProduct(item.product);
      const itemTotal = product.price * item.quantity;
      totalItems += item.quantity;
      totalPrice += itemTotal;

      return {
        ...item,
        product,
        itemTotal: parseFloat(itemTotal.toFixed(2)),
      };
    });

    res.json({
      items: shapedItems,
      summary: {
        totalItems,
        totalPrice: parseFloat(totalPrice.toFixed(2)),
      },
    });
  } catch (error) {
    console.error('Get cart error:', error);
    res.status(500).json({ message: 'Failed to fetch cart' });
  }
};

/**
 * PUT /api/cart/:productId
 * Update quantity of a specific product in the cart.
 */
const updateCartQuantity = async (req, res) => {
  try {
    if (req.user.role !== 'buyer') {
      return res.status(403).json({ message: 'Only buyers can update cart' });
    }

    const { productId } = req.params;
    const { quantity } = req.body;
    const userId = req.user.id;

    const qty = parseInt(quantity);
    if (isNaN(qty) || qty < 1 || qty > 1000) {
      return res.status(400).json({ message: 'Quantity must be between 1 and 1000' });
    }

    const product = await prisma.product.findUnique({
      where: { id: productId },
    });

    if (!product) {
      return res.status(404).json({ message: 'Product not found' });
    }

    if (qty > product.stock) {
      return res.status(400).json({
        message: `Only ${product.stock} units available in stock`,
      });
    }

    const cartItem = await prisma.cartItem.findUnique({
      where: { userId_productId: { userId, productId } },
    });

    if (!cartItem) {
      return res.status(404).json({ message: 'Item not found in cart' });
    }

    const updated = await prisma.cartItem.update({
      where: { id: cartItem.id },
      data: { quantity: qty },
      include: {
        product: {
          include: {
            farmer: { select: { id: true, name: true } },
          },
        },
      },
    });

    res.json({
      message: 'Cart updated',
      cartItem: {
        ...updated,
        product: shapeProduct(updated.product),
      },
    });
  } catch (error) {
    console.error('Update cart error:', error);
    res.status(500).json({ message: 'Failed to update cart' });
  }
};

/**
 * DELETE /api/cart/:productId
 * Remove a specific product from the cart.
 */
const removeFromCart = async (req, res) => {
  try {
    if (req.user.role !== 'buyer') {
      return res.status(403).json({ message: 'Only buyers can remove cart items' });
    }

    const { productId } = req.params;
    const userId = req.user.id;

    const cartItem = await prisma.cartItem.findUnique({
      where: { userId_productId: { userId, productId } },
    });

    if (!cartItem) {
      return res.status(404).json({ message: 'Item not found in cart' });
    }

    await prisma.cartItem.delete({
      where: { id: cartItem.id },
    });

    res.json({ message: 'Item removed from cart' });
  } catch (error) {
    console.error('Remove from cart error:', error);
    res.status(500).json({ message: 'Failed to remove from cart' });
  }
};

/**
 * DELETE /api/cart
 * Clear the entire cart.
 */
const clearCart = async (req, res) => {
  try {
    if (req.user.role !== 'buyer') {
      return res.status(403).json({ message: 'Only buyers can clear cart' });
    }

    await prisma.cartItem.deleteMany({
      where: { userId: req.user.id },
    });

    res.json({ message: 'Cart cleared' });
  } catch (error) {
    console.error('Clear cart error:', error);
    res.status(500).json({ message: 'Failed to clear cart' });
  }
};

const getCartCount = async (req, res) => {
  try {
    if (req.user.role !== 'buyer') {
      return res.status(403).json({ message: 'Only buyers can view cart' });
    }

    const result = await prisma.cartItem.aggregate({
      where: { userId: req.user.id },
      _sum: { quantity: true },
    });

    res.json({ totalItems: result._sum.quantity || 0 });
  } catch (error) {
    console.error('Get cart count error:', error);
    res.status(500).json({ message: 'Failed to fetch cart count' });
  }
};

module.exports = {
  addToCart,
  getCart,
  getCartCount,
  updateCartQuantity,
  removeFromCart,
  clearCart,
};