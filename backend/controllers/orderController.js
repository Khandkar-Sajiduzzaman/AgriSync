const prisma = require('../config/db');

// Helper: convert Decimal to plain number and add _id alias
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

// Helper: format order for response
const shapeOrder = (order) => {
  if (!order) return order;
  return {
    ...order,
    _id: order.id,
    subtotal: order.subtotal?.toNumber
      ? order.subtotal.toNumber()
      : order.subtotal,
    totalAmount: order.totalAmount?.toNumber
      ? order.totalAmount.toNumber()
      : order.totalAmount,
    deliveryFee: order.deliveryFee?.toNumber
      ? order.deliveryFee.toNumber()
      : order.deliveryFee,
    discountAmount: order.discountAmount?.toNumber
      ? order.discountAmount.toNumber()
      : order.discountAmount,
    buyer: order.buyer ? { ...order.buyer, _id: order.buyer.id } : order.buyer,
    farmer: order.farmer
      ? { ...order.farmer, _id: order.farmer.id }
      : order.farmer,
    deliveryMan: order.deliveryMan
      ? { ...order.deliveryMan, _id: order.deliveryMan.id }
      : order.deliveryMan,
    items: order.items
      ? order.items.map((item) => ({
          ...item,
          unitPrice: item.unitPrice?.toNumber
            ? item.unitPrice.toNumber()
            : item.unitPrice,
          total: item.total?.toNumber ? item.total.toNumber() : item.total,
          product: shapeProduct(item.product),
        }))
      : order.items,
  };
};

// Generate human-readable order number: AGR-20260809-XXXX
const generateOrderNumber = () => {
  const now = new Date();
  const dateStr =
    now.getFullYear().toString() +
    String(now.getMonth() + 1).padStart(2, '0') +
    String(now.getDate()).padStart(2, '0');
  const random = Math.floor(1000 + Math.random() * 9000);
  return `AGR-${dateStr}-${random}`;
};

/**
 * POST /api/orders
 * Place an order from the cart.
 *
 * Flow:
 * 1. Get cart items
 * 2. Group by farmer (one order per farmer)
 * 3. For each farmer: verify stock, calculate totals, create order + items,
 *    deduct stock, log inventory, record status history
 * 4. Clear cart
 */
const placeOrder = async (req, res) => {
  try {
    if (req.user.role !== 'buyer') {
      return res.status(403).json({ message: 'Only buyers can place orders' });
    }

    const buyerId = req.user.id;
    let {
      deliveryAddress,
      deliveryNotes,
      paymentMethod = 'cash_on_delivery',
      deliveryFee = 0,
      discountAmount = 0,
    } = req.body;

    if (!deliveryAddress || deliveryAddress.trim() === '') {
      return res.status(400).json({ message: 'Delivery address is required' });
    }

    // SECURITY: Validate and sanitize fee/discount
    deliveryFee = Math.max(0, parseFloat(deliveryFee) || 0);
    discountAmount = Math.max(0, parseFloat(discountAmount) || 0);

    // SECURITY: Cap unreasonable values
    if (deliveryFee > 10000) {
      return res.status(400).json({ message: 'Delivery fee exceeds maximum allowed' });
    }
    if (discountAmount > 100000) {
      return res.status(400).json({ message: 'Discount amount exceeds maximum allowed' });
    }


    // Step 1: Get all cart items with product details
    const cartItems = await prisma.cartItem.findMany({
      where: { userId: buyerId },
      include: { product: true },
    });

    if (cartItems.length === 0) {
      return res.status(400).json({ message: 'Your cart is empty' });
    }

    // Step 2: Group items by farmerId
    const itemsByFarmer = {};
    for (const item of cartItems) {
      const farmerId = item.product.farmerId;
      if (!itemsByFarmer[farmerId]) {
        itemsByFarmer[farmerId] = [];
      }
      itemsByFarmer[farmerId].push(item);
    }

    const createdOrders = [];

    // Step 3: Process each farmer's group inside a database transaction
    for (const farmerId of Object.keys(itemsByFarmer)) {
      const items = itemsByFarmer[farmerId];

      // 3a. Verify stock is still available
      for (const item of items) {
        if (item.quantity > item.product.stock) {
          return res.status(400).json({
            message: `Not enough stock for "${item.product.name}". Available: ${item.product.stock}, Requested: ${item.quantity}`,
          });
        }
        if (!item.product.isAvailable || item.product.isRemoved || !item.product.isApproved) {
          return res.status(400).json({
            message: `"${item.product.name}" is no longer available for purchase`,
          });
        }
      }

      // 3b. Calculate subtotal (sum of all item totals)
      let subtotal = 0;
      for (const item of items) {
        const unitPrice = item.product.price.toNumber
          ? item.product.price.toNumber()
          : parseFloat(item.product.price);
        subtotal += unitPrice * item.quantity;
      }

      const dFee = parseFloat(deliveryFee) || 0;
      const disc = parseFloat(discountAmount) || 0;
      const totalAmount = subtotal + dFee - disc;

      // 3c-g. Transaction: create order, items, deduct stock, log inventory, record history
      const order = await prisma.$transaction(async (tx) => {
        const newOrder = await tx.order.create({
          data: {
            orderNumber: generateOrderNumber(),
            buyerId,
            farmerId,
            status: 'pending',
            paymentStatus: 'pending',
            paymentMethod,
            subtotal,
            totalAmount,
            deliveryFee: dFee || null,
            discountAmount: disc || null,
            deliveryAddress,
            deliveryNotes: deliveryNotes || null,
          },
        });

        for (const item of items) {
          const unitPrice = item.product.price.toNumber
            ? item.product.price.toNumber()
            : parseFloat(item.product.price);
          const itemTotal = unitPrice * item.quantity;

          // Create order item with snapshot data
          await tx.orderItem.create({
            data: {
              orderId: newOrder.id,
              productId: item.productId,
              quantity: item.quantity,
              unitPrice: item.product.price,
              total: itemTotal,
              unit: item.product.unit,           // NEW: snapshot unit
              productName: item.product.name,  // NEW: snapshot name
            },
          });

          // Deduct stock
          const oldStock = item.product.stock;
          const newStock = oldStock - item.quantity;

          await tx.product.update({
            where: { id: item.productId },
            data: { stock: newStock },
          });

          // Log inventory change
          await tx.inventoryLog.create({
            data: {
              productId: item.productId,
              oldStock,
              newStock,
              change: -item.quantity,
              reason: 'order_placed',
            },
          });
        }

        // Initial status history
        await tx.orderStatusHistory.create({
          data: {
            orderId: newOrder.id,
            status: 'pending',
            notes: 'Order placed by buyer',
            changedBy: buyerId,
          },
        });

        return newOrder;
      });

      // Fetch complete order with relations
      const fullOrder = await prisma.order.findUnique({
        where: { id: order.id },
        include: {
          buyer: { select: { id: true, name: true, email: true, phone: true, address: true } },
          farmer: { select: { id: true, name: true, email: true, phone: true, address: true } },
          items: {
            include: {
              product: {
                include: {
                  farmer: { select: { id: true, name: true } },
                },
              },
            },
          },
          statusHistory: { orderBy: { createdAt: 'asc' } },
        },
      });

      // AUTO-START CHAT ON ORDER
      if (buyerId !== farmerId) {
        await prisma.message.create({
          data: {
            senderId: buyerId,
            receiverId: farmerId,
            content: `Hello! I have placed a new order (${fullOrder.orderNumber}) for your products.`,
            orderId: fullOrder.id,
          }
        });
      }

      createdOrders.push(shapeOrder(fullOrder));
    }

    // Step 4: Clear cart
    await prisma.cartItem.deleteMany({
      where: { userId: buyerId },
    });

    res.status(201).json({
      message: `Order${createdOrders.length > 1 ? 's' : ''} placed successfully`,
      orders: createdOrders,
    });
  } catch (error) {
    console.error('Place order error:', error);
    res.status(500).json({ message: error.message });
  }
};

/**
 * GET /api/orders
 * Get all orders for the logged-in user.
 */
const getMyOrders = async (req, res) => {
  try {
    const userId = req.user.id;
    const userRole = req.user.role;
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(50, Math.max(1, parseInt(req.query.limit) || 20));

    let where = {};

    if (userRole === 'buyer') {
      where = { buyerId: userId };
    } else if (userRole === 'farmer') {
      where = { farmerId: userId };
    } else if (userRole === 'delivery_man') {
      where = { deliveryManId: userId };
    } else if (userRole === 'admin') {
      where = {};
    } else {
      return res.status(403).json({ message: 'Access denied' });
    }

    const [orders, total] = await Promise.all([
      prisma.order.findMany({
        where,
        select: {
          id: true,
          orderNumber: true,
          status: true,
          paymentMethod: true,
          totalAmount: true,
          createdAt: true,
          buyer: { select: { id: true, name: true } },
          farmer: { select: { id: true, name: true } },
          items: {
            select: {
              id: true,
              quantity: true,
              productName: true,
              product: { select: { id: true, images: true } },
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.order.count({ where })
    ]);

    res.json({
      data: orders.map((o) => ({
        _id: o.id,
        orderNumber: o.orderNumber,
        status: o.status,
        paymentMethod: o.paymentMethod,
        totalAmount: o.totalAmount?.toNumber ? o.totalAmount.toNumber() : o.totalAmount,
        createdAt: o.createdAt,
        buyer: o.buyer ? { _id: o.buyer.id, name: o.buyer.name } : null,
        farmer: o.farmer ? { _id: o.farmer.id, name: o.farmer.name } : null,
        items: o.items.map((item) => ({
          id: item.id,
          quantity: item.quantity,
          productName: item.productName,
          product: item.product ? { id: item.product.id, images: item.product.images } : null,
        })),
      })),
      total,
      page,
      totalPages: Math.ceil(total / limit),
    });
  } catch (error) {
    console.error('Get orders error:', error);
    res.status(500).json({ message: 'Failed to fetch orders' });
  }
};
/**
 * GET /api/orders/:id
 * Get detailed information about a single order.
 */
const getOrderById = async (req, res) => {
  try {
    const order = await prisma.order.findUnique({
      where: { id: req.params.id },
      include: {
        items: {
          include: {
            product: {
              select: { id: true, name: true, images: true, unit: true },
            },
          },
        },
        buyer: { select: { id: true, name: true, phone: true, email: true } },
        farmer: { select: { id: true, name: true, phone: true, email: true } },
        deliveryMan: { select: { id: true, name: true, phone: true } },
        statusHistory: true,
        tracking: true,
      },
    });

    if (!order) return res.status(404).json({ message: 'Order not found' });

    if (req.user.role === 'buyer' && order.buyerId !== req.user.id) {
      return res.status(403).json({ message: 'Not authorized' });
    }
    if (req.user.role === 'farmer' && order.farmerId !== req.user.id) {
      return res.status(403).json({ message: 'Not authorized' });
    }
    if (req.user.role === 'delivery_man' && order.deliveryManId !== req.user.id) {
      return res.status(403).json({ message: 'Not authorized' });
    }
    if (req.user.role !== 'admin' && req.user.role !== 'buyer' && req.user.role !== 'farmer' && req.user.role !== 'delivery_man') {
      return res.status(403).json({ message: 'Not authorized' });
    }

    // SECURITY: Limit PII based on who is asking
    const buyerInfo = { _id: order.buyer.id, name: order.buyer.name };
    const farmerInfo = { _id: order.farmer.id, name: order.farmer.name };

    // Farmers and delivery men need buyer phone for delivery coordination
    if (req.user.role === 'farmer' || req.user.role === 'delivery_man' || req.user.role === 'admin') {
      buyerInfo.phone = order.buyer.phone;
    }

    // Delivery men need farmer phone for pickup coordination
    if (req.user.role === 'delivery_man' || req.user.role === 'admin') {
      farmerInfo.phone = order.farmer.phone;
    }

    res.json({
      _id: order.id,
      orderNumber: order.orderNumber,
      status: order.status,
      paymentMethod: order.paymentMethod,
      paymentStatus: order.paymentStatus,
      totalAmount: order.totalAmount?.toNumber ? order.totalAmount.toNumber() : order.totalAmount,
      deliveryFee: order.deliveryFee?.toNumber ? order.deliveryFee.toNumber() : order.deliveryFee,
      discountAmount: order.discountAmount?.toNumber ? order.discountAmount.toNumber() : order.discountAmount,
      deliveryAddress: order.deliveryAddress,
      deliveryNotes: order.deliveryNotes,
      estimatedDelivery: order.estimatedDelivery,
      createdAt: order.createdAt,
      cancelledAt: order.cancelledAt,
      buyer: buyerInfo,
      farmer: farmerInfo,
      deliveryMan: order.deliveryMan ? { _id: order.deliveryMan.id, name: order.deliveryMan.name } : null,
      items: order.items.map((item) => ({
        id: item.id,
        productName: item.productName,
        quantity: item.quantity,
        unitPrice: item.unitPrice?.toNumber ? item.unitPrice.toNumber() : item.unitPrice,
        total: item.total?.toNumber ? item.total.toNumber() : item.total,
        unit: item.unit,
        product: item.product,
      })),
      statusHistory: order.statusHistory,
      tracking: order.tracking,
    });
  } catch (error) {
    console.error('Get order error:', error);
    res.status(500).json({ message: 'Failed to fetch order' });
  }
};

/**
 * PUT /api/orders/:id/status
 * Update the status of an order.
 */
const updateOrderStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status, notes } = req.body;
    const userId = req.user.id;
    const userRole = req.user.role;

    const validStatuses = [
      'pending', 'confirmed', 'processing', 'shipped',
      'out_for_delivery', 'delivered', 'cancelled', 'refunded',
    ];

    if (!validStatuses.includes(status)) {
      return res.status(400).json({ message: 'Invalid status value' });
    }
    // SECURITY: Validate status transitions
    const allowedTransitions = {
      buyer: {
        pending: ['cancelled'],
      },
      farmer: {
        pending: ['confirmed'],
        confirmed: ['processing'],
        processing: ['shipped'],
      },
      delivery_man: {
        shipped: ['out_for_delivery'],
        out_for_delivery: ['delivered'],
      },
      admin: ['pending', 'confirmed', 'processing', 'shipped', 'out_for_delivery', 'delivered', 'cancelled', 'refunded'],
    };

    const currentStatus = order.status;

    if (userRole !== 'admin') {
      const roleTransitions = allowedTransitions[userRole] || {};
      const allowed = roleTransitions[currentStatus] || [];
      if (!allowed.includes(status)) {
        return res.status(400).json({ 
          message: `Cannot change status from ${currentStatus} to ${status}` 
        });
      }
    }
    const order = await prisma.order.findUnique({
      where: { id },
      include: { items: { include: { product: true } } },
    });

    if (!order) {
      return res.status(404).json({ message: 'Order not found' });
    }

    const isBuyer = order.buyerId === userId;
    const isFarmer = order.farmerId === userId;
    const isDeliveryMan = order.deliveryManId === userId;
    const isAdmin = userRole === 'admin';

    let canUpdate = false;

    if (isAdmin) {
      canUpdate = true;
    } else if (isBuyer) {
      if (status === 'cancelled' && order.status === 'pending') {
        canUpdate = true;
      }
        } else if (isFarmer) {
      const farmerAllowed = ['confirmed', 'processing', 'shipped', 'cancelled'];
      if (farmerAllowed.includes(status)) {
        // Prevent shipping if no delivery man is assigned
        if (status === 'shipped' && !order.deliveryManId) {
          return res.status(400).json({
            message: 'Please assign a delivery man before marking as shipped',
          });
        }
        const flow = ['pending', 'confirmed', 'processing', 'shipped', 'out_for_delivery', 'delivered'];
        const currentIndex = flow.indexOf(order.status);
        const newIndex = flow.indexOf(status);
        if (newIndex > currentIndex || status === 'cancelled') {
          canUpdate = true;
        }
      }
     
    } else if (isDeliveryMan) {
      const deliveryAllowed = ['out_for_delivery', 'delivered'];
      if (deliveryAllowed.includes(status)) {
        const flow = ['pending', 'confirmed', 'processing', 'shipped', 'out_for_delivery', 'delivered'];
        const currentIndex = flow.indexOf(order.status);
        const newIndex = flow.indexOf(status);
        if (newIndex > currentIndex) {
          canUpdate = true;
        }
      }
    }

    if (!canUpdate) {
      return res.status(403).json({
        message: `You are not authorized to change status from "${order.status}" to "${status}"`,
      });
    }

    // If cancelling, restore stock and record cancellation
    if (status === 'cancelled' && order.status !== 'cancelled') {
      await prisma.$transaction(async (tx) => {
        for (const item of order.items) {
          const product = await tx.product.findUnique({
            where: { id: item.productId },
          });

          await tx.product.update({
            where: { id: item.productId },
            data: { stock: product.stock + item.quantity },
          });

          await tx.inventoryLog.create({
            data: {
              productId: item.productId,
              oldStock: product.stock,
              newStock: product.stock + item.quantity,
              change: item.quantity,
              reason: 'order_cancelled',
            },
          });
        }

        await tx.order.update({
          where: { id },
          data: {
            status,
            paymentStatus: 'refunded',
            cancelledAt: new Date(),
            cancelledBy: userId,
          },
        });

        await tx.orderStatusHistory.create({
          data: {
            orderId: id,
            status,
            notes: notes || 'Order cancelled',
            changedBy: userId,
          },
        });
      });
    } else {
      // Normal status update
      await prisma.$transaction(async (tx) => {
        await tx.order.update({
          where: { id },
          data: { status },
        });

        await tx.orderStatusHistory.create({
          data: {
            orderId: id,
            status,
            notes: notes || `Status updated to ${status}`,
            changedBy: userId,
          },
        });
      });
    }

    const updatedOrder = await prisma.order.findUnique({
      where: { id },
      include: {
        buyer: { select: { id: true, name: true, email: true, phone: true } },
        farmer: { select: { id: true, name: true, email: true, phone: true } },
        deliveryMan: { select: { id: true, name: true, phone: true } },
        items: {
          include: {
            product: {
              include: {
                farmer: { select: { id: true, name: true } },
              },
            },
          },
        },
        statusHistory: { orderBy: { createdAt: 'asc' } },
      },
    });

    res.json({
      message: 'Order status updated',
      order: shapeOrder(updatedOrder),
    });
  } catch (error) {
    console.error('Update order status error:', error);
    res.status(500).json({ message: error.message });
  }
};

/**
 * GET /api/orders/:id/tracking
 * Get the full tracking/status history.
 */
const getOrderTracking = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;
    const userRole = req.user.role;

    const order = await prisma.order.findUnique({
      where: { id },
      select: { buyerId: true, farmerId: true, deliveryManId: true },
    });

    if (!order) {
      return res.status(404).json({ message: 'Order not found' });
    }

    const isInvolved =
      order.buyerId === userId ||
      order.farmerId === userId ||
      order.deliveryManId === userId ||
      userRole === 'admin';

    if (!isInvolved) {
      return res.status(403).json({ message: 'Not authorized to view tracking' });
    }

    const statusHistory = await prisma.orderStatusHistory.findMany({
      where: { orderId: id },
      orderBy: { createdAt: 'asc' },
    });

    const trackingUpdates = await prisma.deliveryTracking.findMany({
      where: { orderId: id },
      orderBy: { createdAt: 'asc' },
    });

    res.json({
      orderId: id,
      statusHistory,
      trackingUpdates,
    });
  } catch (error) {
    console.error('Get order tracking error:', error);
    res.status(500).json({ message: error.message });
  }
};

/**
 * POST /api/orders/:id/tracking
 * Add a delivery tracking update (GPS coordinates).
 */
const addTrackingUpdate = async (req, res) => {
  try {
    const { id } = req.params;
    const { latitude, longitude, status } = req.body;
    const userId = req.user.id;
    const userRole = req.user.role;

    const order = await prisma.order.findUnique({
      where: { id },
      select: { deliveryManId: true },
    });

    if (!order) {
      return res.status(404).json({ message: 'Order not found' });
    }

    if (order.deliveryManId !== userId && userRole !== 'admin') {
      return res.status(403).json({ message: 'Not authorized to update tracking' });
    }

    if (latitude === undefined || longitude === undefined) {
      return res.status(400).json({ message: 'Latitude and longitude are required' });
    }

    const tracking = await prisma.deliveryTracking.create({
      data: {
        orderId: id,
        latitude: parseFloat(latitude),
        longitude: parseFloat(longitude),
        status: status || null,
      },
    });

    res.status(201).json({ message: 'Tracking updated', tracking });
  } catch (error) {
    console.error('Add tracking update error:', error);
    res.status(500).json({ message: error.message });
  }
};
/**
 * GET /api/orders/available-delivery-men
 * Farmers and admins can see which delivery men are online and available.
 */
const getAvailableDeliveryMen = async (req, res) => {
  try {
    if (req.user.role !== 'farmer' && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Only farmers and admins can view delivery men' });
    }

    const deliveryMen = await prisma.user.findMany({
      where: { role: 'delivery_man', accountStatus: 'active' },
      select: {
        id: true,
        name: true,
        phone: true,
        profileImage: true,
        deliveryManProfile: {
          select: {
            vehicleType: true,
            currentLocation: true,
            isAvailable: true,
            averageRating: true,
            // SECURITY: Removed licenseNumber and address
          },
        },
      },
    });

    res.json(deliveryMen.map((dm) => ({
      ...dm,
      _id: dm.id,
    })));
  } catch (error) {
    console.error('Get available delivery men error:', error);
    res.status(500).json({ message: error.message });
  }
};

/**
 * PUT /api/orders/:id/assign-delivery
 * Farmer assigns a delivery man to an order. Also marks delivery man as unavailable.
 */
const assignDeliveryMan = async (req, res) => {
  try {
    const { id } = req.params;
    const { deliveryManId } = req.body;
    const userId = req.user.id;
    const userRole = req.user.role;

    if (!deliveryManId) {
      return res.status(400).json({ message: 'deliveryManId is required' });
    }

    const order = await prisma.order.findUnique({
      where: { id },
      select: { farmerId: true, status: true, deliveryManId: true },
    });

    if (!order) {
      return res.status(404).json({ message: 'Order not found' });
    }

    if (order.farmerId !== userId && userRole !== 'admin') {
      return res.status(403).json({ message: 'Only the farmer who owns this order can assign a delivery man' });
    }

    // Verify the delivery man exists and is available
    const dm = await prisma.user.findUnique({
      where: { id: deliveryManId },
      include: { deliveryManProfile: true },
    });

    if (!dm || dm.role !== 'delivery_man') {
      return res.status(404).json({ message: 'Delivery man not found' });
    }

    if (!dm.deliveryManProfile?.isAvailable) {
      return res.status(400).json({ message: 'This delivery man is currently unavailable' });
    }

    // Assign delivery man and mark them as busy
    await prisma.$transaction(async (tx) => {
      await tx.order.update({
        where: { id },
        data: { deliveryManId },
      });

      await tx.deliveryManProfile.update({
        where: { userId: deliveryManId },
        data: { isAvailable: false },
      });

      await tx.orderStatusHistory.create({
        data: {
          orderId: id,
          status: order.status, // keep current status, just log the assignment
          notes: `Delivery man assigned: ${dm.name}`,
          changedBy: userId,
        },
      });
    });

    res.json({ message: 'Delivery man assigned successfully', deliveryMan: { _id: dm.id, name: dm.name } });
  } catch (error) {
    console.error('Assign delivery man error:', error);
    res.status(500).json({ message: error.message });
  }
};

/**
 * PUT /api/delivery/location
 * Delivery man updates their current GPS coordinates.
 * Also creates a tracking record for any active order they are assigned to.
 */
const updateDeliveryLocation = async (req, res) => {
  try {
    if (req.user.role !== 'delivery_man') {
      return res.status(403).json({ message: 'Only delivery men can update location' });
    }

    const { latitude, longitude } = req.body;

    if (latitude === undefined || longitude === undefined) {
      return res.status(400).json({ message: 'Latitude and longitude are required' });
    }

    const lat = parseFloat(latitude);
    const lng = parseFloat(longitude);

    if (isNaN(lat) || isNaN(lng)) {
      return res.status(400).json({ message: 'Invalid coordinates' });
    }

    // SECURITY: Validate coordinate bounds (Bangladesh roughly)
    if (lat < 20 || lat > 27 || lng < 88 || lng > 93) {
      return res.status(400).json({ message: 'Coordinates out of valid range' });
    }

    const updated = await prisma.deliveryManProfile.update({
      where: { userId: req.user.id },
      data: {
        currentLocation: { latitude: lat, longitude: lng },
        lastLocationUpdate: new Date(),
      },
    });

    res.json({
      message: 'Location updated',
      currentLocation: updated.currentLocation,
    });
  } catch (error) {
    console.error('Update location error:', error);
    res.status(500).json({ message: 'Failed to update location' });
  }
};

/**
 * GET /api/orders/:id/latest-tracking
 * Returns ONLY the most recent tracking point. Lightweight for polling.
 */
const getLatestTracking = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;
    const userRole = req.user.role;

    const order = await prisma.order.findUnique({
      where: { id },
      select: { buyerId: true, farmerId: true, deliveryManId: true },
    });

    if (!order) {
      return res.status(404).json({ message: 'Order not found' });
    }

    const isInvolved =
      order.buyerId === userId ||
      order.farmerId === userId ||
      order.deliveryManId === userId ||
      userRole === 'admin';

    if (!isInvolved) {
      return res.status(403).json({ message: 'Not authorized' });
    }

    const latest = await prisma.deliveryTracking.findFirst({
      where: { orderId: id },
      orderBy: { createdAt: 'desc' },
    });

    // Also get delivery man's current live location from their profile
    let currentLocation = null;
    if (order.deliveryManId) {
      const dmProfile = await prisma.deliveryManProfile.findUnique({
        where: { userId: order.deliveryManId },
        select: { currentLatitude: true, currentLongitude: true, isAvailable: true },
      });
      if (dmProfile) {
        currentLocation = {
          latitude: dmProfile.currentLatitude,
          longitude: dmProfile.currentLongitude,
        };
      }
    }

    res.json({
      orderId: id,
      latestTracking: latest || null,
      currentLocation,
    });
  } catch (error) {
    console.error('Get latest tracking error:', error);
    res.status(500).json({ message: error.message });
  }
};
/**
 * GET /api/orders/delivery/location/:userId
 * Get a delivery man's current live GPS location.
 * SECURITY: Only the delivery man themselves, an admin, or a buyer/farmer
 * who has an active order with this delivery man can view the location.
 */
const getDeliveryLocation = async (req, res) => {
  try {
    const targetId = req.params.userId;

    // SECURITY: Only allow if user is requesting their own location,
    // or if they are an admin, or if the delivery man is assigned to their order
    const isSelf = req.user.id === targetId;
    const isAdmin = req.user.role === 'admin';

    let isAuthorized = isSelf || isAdmin;

    if (!isAuthorized && (req.user.role === 'buyer' || req.user.role === 'farmer')) {
      // Check if this delivery man is assigned to any active order belonging to this user
      const order = await prisma.order.findFirst({
        where: {
          deliveryManId: targetId,
          OR: [
            { buyerId: req.user.id },
            { farmerId: req.user.id },
          ],
          status: { notIn: ['cancelled', 'refunded', 'delivered'] },
        },
      });
      isAuthorized = !!order;
    }

    if (!isAuthorized) {
      return res.status(403).json({ message: 'Not authorized to view this location' });
    }

    const profile = await prisma.deliveryManProfile.findUnique({
      where: { userId: targetId },
      select: { currentLatitude: true, currentLongitude: true, isAvailable: true },
    });

    if (!profile) {
      return res.status(404).json({ message: 'Delivery man not found' });
    }

    res.json({
      userId: targetId,
      currentLatitude: profile.currentLatitude,
      currentLongitude: profile.currentLongitude,
      isAvailable: profile.isAvailable,
    });
  } catch (error) {
    console.error('Get delivery location error:', error);
    res.status(500).json({ message: 'Failed to fetch location' });
  }
};

module.exports = {
  placeOrder,
  getMyOrders,
  getOrderById,
  updateOrderStatus,
  getOrderTracking,
  addTrackingUpdate,
  getAvailableDeliveryMen,
  assignDeliveryMan,
  updateDeliveryLocation,
  getLatestTracking,
  getDeliveryLocation, 
};
