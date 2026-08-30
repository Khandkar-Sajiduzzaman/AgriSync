const prisma = require('../config/db');

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

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

// Helper: format order for response (includes NEW delivery fields)
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
    // NEW: delivery type and location fields
    deliveryType: order.deliveryType,
    deliveryCity: order.deliveryCity,
    deliveryArea: order.deliveryArea,
    buyer: order.buyer ? { ...order.buyer, _id: order.buyer.id } : order.buyer,
    farmer: order.farmer
      ? { ...order.farmer, _id: order.farmer.id }
      : order.farmer,
    deliveryMan: order.deliveryMan
      ? {
          ...order.deliveryMan,
          _id: order.deliveryMan.id,
          currentLatitude: order.deliveryMan.deliveryManProfile?.currentLatitude,
          currentLongitude: order.deliveryMan.deliveryManProfile?.currentLongitude,
        }
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

// Helper: create a notification record
const createNotification = async (tx, { userId, type, title, body, data }) => {
  if (!userId) return null;
  return tx.notification.create({
    data: {
      userId,
      type,
      title,
      body,
      data: data || {},
    },
  });
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

// =============================================================================
// ORDER PLACEMENT
// =============================================================================

/**
 * POST /api/orders
 * Place an order from the cart.
 *
 * MODIFIED: Now accepts deliveryType, deliveryCity, deliveryArea.
 * deliveryType can be "instant" (faster, costs more, 1 order per delivery man)
 * or "normal" (cheaper, delivery man can carry multiple orders in same city).
 */
const placeOrder = async (req, res) => {
  console.log('=== PLACE ORDER STARTED ===');
  console.log('User:', req.user);
  console.log('Body:', req.body);

  try {
    if (req.user.role !== 'buyer') {
      console.log('REJECTED: Not a buyer');
      return res.status(403).json({ message: 'Only buyers can place orders' });
    }

    const buyerId = req.user.id;
    const {
      deliveryAddress,
      deliveryNotes,
      paymentMethod = 'cash_on_delivery',
      deliveryFee,
      discountAmount = 0,
      // NEW: delivery type and location
      deliveryType = 'normal',
      deliveryCity,
      deliveryArea,
    } = req.body;

    console.log('Step 1: Validating address...');
    if (!deliveryAddress || deliveryAddress.trim() === '') {
      console.log('REJECTED: Missing address');
      return res.status(400).json({ message: 'Delivery address is required' });
    }

    // NEW: Validate delivery type
    if (!['instant', 'normal'].includes(deliveryType)) {
      return res.status(400).json({ message: 'deliveryType must be "instant" or "normal"' });
    }

    console.log('Step 2: Fetching cart items...');
    const cartItems = await prisma.cartItem.findMany({
      where: { userId: buyerId },
      include: { product: true },
    });
    console.log('Cart items found:', cartItems.length);

    if (cartItems.length === 0) {
      console.log('REJECTED: Empty cart');
      return res.status(400).json({ message: 'Your cart is empty' });
    }

    console.log('Step 3: Grouping by farmer...');
    const itemsByFarmer = {};
    for (const item of cartItems) {
      const farmerId = item.product.farmerId;
      if (!itemsByFarmer[farmerId]) {
        itemsByFarmer[farmerId] = [];
      }
      itemsByFarmer[farmerId].push(item);
    }
    console.log('Farmers:', Object.keys(itemsByFarmer));

    const createdOrders = [];

    for (const farmerId of Object.keys(itemsByFarmer)) {
      console.log('Step 4: Processing farmer:', farmerId);
      const items = itemsByFarmer[farmerId];

      console.log('Step 4a: Checking stock and availability...');
      for (const item of items) {
        if (item.quantity > item.product.stock) {
          console.log('REJECTED: Insufficient stock for', item.product.name);
          return res.status(400).json({
            message: `Insufficient stock for ${item.product.name}. Available: ${item.product.stock}, Requested: ${item.quantity}`,
          });
        }
        if (!item.product.isAvailable || item.product.isRemoved || !item.product.isApproved) {
          console.log('REJECTED: Product not available', item.product.name);
          return res.status(400).json({
            message: `${item.product.name} is no longer available`,
          });
        }
      }

      console.log('Step 4b: Calculating totals...');
      let subtotal = 0;
      for (const item of items) {
        const unitPrice = item.product.price.toNumber
          ? item.product.price.toNumber()
          : parseFloat(item.product.price);
        subtotal += unitPrice * item.quantity;
      }

      // NEW: Calculate delivery fee based on type if not provided
      let dFee = parseFloat(deliveryFee) || 0;
      if (dFee === 0) {
        dFee = deliveryType === 'instant' ? 150 : 60; // Instant costs more
      }
      const disc = parseFloat(discountAmount) || 0;
      const totalAmount = subtotal + dFee - disc;
      console.log('Subtotal:', subtotal, 'DeliveryFee:', dFee, 'Discount:', disc, 'Total:', totalAmount);

      console.log('Step 4c: Starting database transaction...');
      const newOrder = await prisma.$transaction(async (tx) => {
        console.log('  TX: Creating order...');
        const order = await tx.order.create({
          data: {
            orderNumber: generateOrderNumber(),
            buyerId,
            farmerId,
            status: 'pending',
            paymentStatus: 'pending',
            paymentMethod,
            subtotal,
            totalAmount,
            deliveryFee: dFee,
            discountAmount: disc === 0 ? 0 : disc || null,
            deliveryAddress,
            deliveryNotes: deliveryNotes || null,
            // NEW fields
            deliveryType,
            deliveryCity: deliveryCity || null,
            deliveryArea: deliveryArea || null,
          },
        });
        console.log('  TX: Order created:', order.id);

        console.log('  TX: Creating order items...');
        for (const item of items) {
          const unitPrice = item.product.price.toNumber
            ? item.product.price.toNumber()
            : parseFloat(item.product.price);
          const itemTotal = unitPrice * item.quantity;

          await tx.orderItem.create({
            data: {
              orderId: order.id,
              productId: item.productId,
              quantity: item.quantity,
              unitPrice: item.product.price,
              total: itemTotal,
              unit: item.product.unit,
              productName: item.product.name,
            },
          });

          const oldStock = item.product.stock;
          const newStock = oldStock - item.quantity;

          await tx.product.update({
            where: { id: item.productId },
            data: { stock: newStock },
          });

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

        await tx.orderStatusHistory.create({
          data: {
            orderId: order.id,
            status: 'pending',
            notes: 'Order placed by buyer',
            changedBy: buyerId,
          },
        });

        return order;
      });
      console.log('Step 4d: Transaction complete. Order ID:', newOrder.id);

      // Send message notification to farmer
      console.log('Step 4e: Sending notification...');
      if (buyerId !== farmerId) {
        await prisma.message.create({
          data: {
            senderId: buyerId,
            receiverId: farmerId,
            content: `Hello! I have placed a new order (${newOrder.orderNumber}) for your products.`,
            orderId: newOrder.id,
          }
        });
      }

      console.log('Step 4f: Building response...');
      // Build a lightweight shaped order without re-fetching from DB
      createdOrders.push({
        id: newOrder.id,
        _id: newOrder.id,
        orderNumber: newOrder.orderNumber,
        status: newOrder.status,
        paymentStatus: newOrder.paymentStatus,
        paymentMethod: newOrder.paymentMethod,
        subtotal: newOrder.subtotal,
        totalAmount: newOrder.totalAmount,
        deliveryFee: newOrder.deliveryFee,
        discountAmount: newOrder.discountAmount,
        deliveryAddress: newOrder.deliveryAddress,
        deliveryNotes: newOrder.deliveryNotes,
        // NEW fields in response
        deliveryType: newOrder.deliveryType,
        deliveryCity: newOrder.deliveryCity,
        deliveryArea: newOrder.deliveryArea,
        createdAt: newOrder.createdAt,
        updatedAt: newOrder.updatedAt,
        items: items.map(item => ({
          id: item.id,
          productId: item.productId,
          productName: item.product.name,
          quantity: item.quantity,
          unitPrice: item.product.price,
          total: (item.product.price.toNumber ? item.product.price.toNumber() : parseFloat(item.product.price)) * item.quantity,
          unit: item.product.unit,
          product: {
            id: item.product.id,
            name: item.product.name,
            images: item.product.images,
            unit: item.product.unit,
            farmer: { id: farmerId, name: itemsByFarmer[farmerId][0]?.product?.farmer?.name || 'Unknown' }
          }
        })),
        buyer: { id: req.user.id, name: req.user.name, email: req.user.email, phone: req.user.phone, address: req.user.address },
        farmer: { id: farmerId, name: itemsByFarmer[farmerId][0]?.product?.farmer?.name || 'Unknown Farmer' },
        deliveryMan: null,
        statusHistory: [{ status: 'pending', notes: 'Order placed by buyer', createdAt: newOrder.createdAt }],
        trackingUpdates: [],
        reviews: [],
      });
    }

    console.log('Step 5: Clearing cart...');
    await prisma.cartItem.deleteMany({
      where: { userId: buyerId },
    });

    console.log('=== PLACE ORDER SUCCESS ===');
    res.status(201).json({
      message: `Order${createdOrders.length > 1 ? 's' : ''} placed successfully`,
      orders: createdOrders,
    });
  } catch (error) {
    console.error('=== PLACE ORDER CRASH ===');
    console.error('Error name:', error.name);
    console.error('Error message:', error.message);
    console.error('Error stack:', error.stack);
    res.status(500).json({ message: error.message });
  }
};

// =============================================================================
// GET ORDERS
// =============================================================================

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
          // NEW: include delivery fields
          deliveryType: true,
          deliveryCity: true,
          deliveryArea: true,
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
        // NEW fields
        deliveryType: o.deliveryType,
        deliveryCity: o.deliveryCity,
        deliveryArea: o.deliveryArea,
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
    const { id } = req.params;
    const userId = req.user.id;
    const userRole = req.user.role;

    const existingOrder = await prisma.order.findUnique({
      where: { id },
      include: {
        buyer: { select: { id: true, name: true, email: true, phone: true, address: true, latitude: true, longitude: true } },
        farmer: { select: { id: true, name: true, email: true, phone: true, address: true, latitude: true, longitude: true } },
        deliveryMan: {
          select: {
            id: true,
            name: true,
            phone: true,
            deliveryManProfile: {
              select: {
                currentLatitude: true,
                currentLongitude: true,
                vehicleType: true,
              },
            },
          },
        },
        statusHistory: { orderBy: { createdAt: 'asc' } },
        trackingUpdates: { orderBy: { createdAt: 'asc' } },
        reviews: {
          include: {
            author: { select: { id: true, name: true } },
          },
        },
        // NEW: include delivery requests so farmer can see pending requests
        deliveryRequests: {
          include: {
            deliveryMan: { select: { id: true, name: true, phone: true } },
          },
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    if (!existingOrder) {
      return res.status(404).json({ message: 'Order not found' });
    }

    const isBuyer = existingOrder.buyerId === userId;
    const isFarmer = existingOrder.farmerId === userId;
    const isDeliveryMan = existingOrder.deliveryManId === userId;
    const isAdmin = userRole === 'admin';

    if (!isBuyer && !isFarmer && !isDeliveryMan && !isAdmin) {
      return res.status(403).json({ message: 'Not authorized to view this order' });
    }

    res.json(shapeOrder(existingOrder));
  } catch (error) {
    console.error('Get order by id error:', error);
    res.status(500).json({ message: error.message });
  }
};

// =============================================================================
// UPDATE ORDER STATUS
// =============================================================================

/**
 * PUT /api/orders/:id/status
 * Update the status of an order.
 *
 * MODIFIED: Added awaiting_delivery to flow, better validation,
 * and automatic notifications on key status changes.
 */
const updateOrderStatus = async (req, res) => {
  try {
    console.log('UPDATE ORDER STATUS CALLED');
    console.log('Params:', req.params);
    console.log('Body:', req.body);
    console.log('User:', req.user);

    const { id } = req.params;
    const { status, notes } = req.body;
    const userId = req.user.id;
    const userRole = req.user.role;

    // NEW: added awaiting_delivery to valid statuses
    const validStatuses = [
      'pending', 'confirmed', 'processing', 'awaiting_delivery',
      'shipped', 'out_for_delivery', 'delivered', 'cancelled', 'refunded',
    ];

    if (!validStatuses.includes(status)) {
      return res.status(400).json({ message: 'Invalid status value' });
    }

    const existingOrder = await prisma.order.findUnique({
      where: { id },
      include: { items: { include: { product: true } } },
    });

    if (!existingOrder) {
      return res.status(404).json({ message: 'Order not found' });
    }

    const isBuyer = existingOrder.buyerId === userId;
    const isFarmer = existingOrder.farmerId === userId;
    const isDeliveryMan = existingOrder.deliveryManId === userId;
    const isAdmin = userRole === 'admin';

    let canUpdate = false;

    // NEW: updated flow array to include awaiting_delivery
    const flow = ['pending', 'confirmed', 'processing', 'awaiting_delivery', 'shipped', 'out_for_delivery', 'delivered'];

    if (isAdmin) {
      canUpdate = true;
    } else if (isBuyer) {
      if (status === 'cancelled' && existingOrder.status === 'pending') {
        canUpdate = true;
      }
    } else if (isFarmer) {
      // NEW: added awaiting_delivery to farmer allowed statuses
      const farmerAllowed = ['confirmed', 'processing', 'awaiting_delivery', 'shipped', 'cancelled'];
      if (farmerAllowed.includes(status)) {
        if (status === 'shipped' && !existingOrder.deliveryManId) {
          return res.status(400).json({
            message: 'Please assign a delivery man before marking as shipped',
          });
        }
        const currentIndex = flow.indexOf(existingOrder.status);
        const newIndex = flow.indexOf(status);
        if (newIndex > currentIndex || status === 'cancelled') {
          canUpdate = true;
        }
      }
    } else if (isDeliveryMan) {
      const deliveryAllowed = ['out_for_delivery', 'delivered'];
      if (deliveryAllowed.includes(status)) {
        // NEW: strict validation - delivery man can only start delivery after farmer shipped
        if (status === 'out_for_delivery' && existingOrder.status !== 'shipped') {
          return res.status(400).json({
            message: 'Order must be marked as shipped by the farmer before starting delivery',
          });
        }
        // NEW: strict validation - can only deliver after out_for_delivery
        if (status === 'delivered' && existingOrder.status !== 'out_for_delivery') {
          return res.status(400).json({
            message: 'Order must be out for delivery before marking as delivered',
          });
        }
        const currentIndex = flow.indexOf(existingOrder.status);
        const newIndex = flow.indexOf(status);
        if (newIndex > currentIndex) {
          canUpdate = true;
        }
      }
    }

    if (!canUpdate) {
      return res.status(403).json({
        message: `You are not authorized to change status from "${existingOrder.status}" to "${status}"`,
      });
    }

    // Handle cancellation (restore stock)
    if (status === 'cancelled' && existingOrder.status !== 'cancelled') {
      await prisma.$transaction(async (tx) => {
        for (const item of existingOrder.items) {
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
      // Normal status update with notifications
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

        // NEW: Notifications and side effects on key status changes

        // When farmer marks as shipped -> notify delivery man
        if (status === 'shipped' && existingOrder.deliveryManId) {
          await createNotification(tx, {
            userId: existingOrder.deliveryManId,
            type: 'order_update',
            title: 'Order Ready for Pickup',
            body: `Farmer has prepared order ${existingOrder.orderNumber}. Please collect the products.`,
            data: { orderId: id, orderNumber: existingOrder.orderNumber },
          });
        }

        // When delivery man marks as out_for_delivery -> notify customer + create tracking point
        if (status === 'out_for_delivery') {
          await createNotification(tx, {
            userId: existingOrder.buyerId,
            type: 'order_update',
            title: 'Your Order is Out for Delivery!',
            body: `Order ${existingOrder.orderNumber} is now being delivered. You can track the live location in the app.`,
            data: { orderId: id, orderNumber: existingOrder.orderNumber },
          });

          // Create initial tracking point from delivery man's current GPS
          const dmProfile = await tx.deliveryManProfile.findUnique({
            where: { userId: existingOrder.deliveryManId },
          });
          if (dmProfile?.currentLatitude && dmProfile?.currentLongitude) {
            await tx.deliveryTracking.create({
              data: {
                orderId: id,
                latitude: dmProfile.currentLatitude,
                longitude: dmProfile.currentLongitude,
                status: 'moving',
              },
            });
          }
        }

        // When delivery man marks as delivered -> notify customer
        if (status === 'delivered') {
          await createNotification(tx, {
            userId: existingOrder.buyerId,
            type: 'order_update',
            title: 'Order Delivered!',
            body: `Your order ${existingOrder.orderNumber} has been delivered. Enjoy your products!`,
            data: { orderId: id, orderNumber: existingOrder.orderNumber },
          });
        }

        // When delivered, free up instant delivery men
        if (status === 'delivered' && existingOrder.deliveryManId) {
          const order = await tx.order.findUnique({
            where: { id },
            select: { deliveryType: true, deliveryManId: true },
          });
          if (order.deliveryType === 'instant' && order.deliveryManId) {
            await tx.deliveryManProfile.update({
              where: { userId: order.deliveryManId },
              data: { isAvailable: true },
            });
          }
        }
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

// =============================================================================
// TRACKING
// =============================================================================

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

// =============================================================================
// DELIVERY MANAGEMENT
// =============================================================================

/**
 * GET /api/orders/available-delivery-men
 * Farmers and admins can see which delivery men are online and available.
 *
 * MODIFIED: Now also shows capacity info for normal deliveries.
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
        latitude: true,
        longitude: true,
        division: true,
        district: true,
        upazila: true,
        deliveryManProfile: {
          select: {
            vehicleType: true,
            currentLatitude: true,
            currentLongitude: true,
            isAvailable: true,
            lastLocationUpdate: true,
            preferredAreas: true,
            maxOrders: true,
          },
        },
      },
    });

    // NEW: Calculate active normal orders for each delivery man
    const enriched = await Promise.all(
      deliveryMen.map(async (dm) => {
        const activeNormalOrders = await prisma.order.count({
          where: {
            deliveryManId: dm.id,
            deliveryType: 'normal',
            status: { in: ['awaiting_delivery', 'shipped', 'out_for_delivery'] },
          },
        });
        return {
          ...dm,
          _id: dm.id,
          activeNormalOrders,
          canTakeInstant: dm.deliveryManProfile?.isAvailable === true,
          canTakeNormal:
            activeNormalOrders < (dm.deliveryManProfile?.maxOrders || 3),
        };
      })
    );

    res.json(enriched);
  } catch (error) {
    console.error('Get available delivery men error:', error);
    res.status(500).json({ message: error.message });
  }
};

/**
 * PUT /api/orders/:id/assign-delivery
 * Farmer directly assigns a delivery man to an order.
 *
 * NOTE: This is the OLD direct-assignment flow. The NEW request-based flow
 * is in deliveryController.js. Keep this for backward compatibility.
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
          status: order.status,
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

    if (lat < 20 || lat > 27 || lng < 88 || lng > 93) {
      return res.status(400).json({ message: 'Coordinates out of valid range' });
    }

    const updated = await prisma.deliveryManProfile.update({
      where: { userId: req.user.id },
      data: {
        currentLatitude: lat,
        currentLongitude: lng,
        lastLocationUpdate: new Date(),
      },
    });

    const activeOrder = await prisma.order.findFirst({
      where: {
        deliveryManId: req.user.id,
        status: { in: ['shipped', 'out_for_delivery'] },
      },
    });

    if (activeOrder) {
      await prisma.deliveryTracking.create({
        data: {
          orderId: activeOrder.id,
          latitude: lat,
          longitude: lng,
          status: 'moving',
        },
      });
    }

    res.json({
      message: 'Location updated',
      currentLatitude: updated.currentLatitude,
      currentLongitude: updated.currentLongitude,
      lastLocationUpdate: updated.lastLocationUpdate,
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

    let currentLocation = null;
    let lastLocationUpdate = null;
    if (order.deliveryManId) {
      const dmProfile = await prisma.deliveryManProfile.findUnique({
        where: { userId: order.deliveryManId },
        select: { currentLatitude: true, currentLongitude: true, isAvailable: true, lastLocationUpdate: true },
      });
      if (dmProfile) {
        currentLocation = {
          latitude: dmProfile.currentLatitude,
          longitude: dmProfile.currentLongitude,
        };
        lastLocationUpdate = dmProfile.lastLocationUpdate;
      }
    }

    res.json({
      orderId: id,
      latestTracking: latest || null,
      currentLocation,
      lastLocationUpdate,
    });
  } catch (error) {
    console.error('Get latest tracking error:', error);
    res.status(500).json({ message: error.message });
  }
};

/**
 * GET /api/orders/delivery/location/:userId
 * Get a delivery man's current live GPS location.
 */
const getDeliveryLocation = async (req, res) => {
  try {
    const targetId = req.params.userId;

    const isSelf = req.user.id === targetId;
    const isAdmin = req.user.role === 'admin';

    let isAuthorized = isSelf || isAdmin;

    if (!isAuthorized && (req.user.role === 'buyer' || req.user.role === 'farmer')) {
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

// =============================================================================
// EXPORTS
// =============================================================================

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