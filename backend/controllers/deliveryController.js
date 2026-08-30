const prisma = require('../config/db');

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

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

// Haversine formula: calculate distance between two lat/long points in kilometers
const haversineDistance = (lat1, lon1, lat2, lon2) => {
  if (lat1 == null || lon1 == null || lat2 == null || lon2 == null) return null;
  const R = 6371; // Earth's radius in km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
};

// Helper: format order for response (same as orderController)
const shapeOrder = (order) => {
  if (!order) return order;
  return {
    ...order,
    _id: order.id,
    subtotal: order.subtotal?.toNumber ? order.subtotal.toNumber() : order.subtotal,
    totalAmount: order.totalAmount?.toNumber ? order.totalAmount.toNumber() : order.totalAmount,
    deliveryFee: order.deliveryFee?.toNumber ? order.deliveryFee.toNumber() : order.deliveryFee,
    discountAmount: order.discountAmount?.toNumber ? order.discountAmount.toNumber() : order.discountAmount,
    deliveryType: order.deliveryType,
    deliveryCity: order.deliveryCity,
    deliveryArea: order.deliveryArea,
    buyer: order.buyer ? { ...order.buyer, _id: order.buyer.id } : order.buyer,
    farmer: order.farmer ? { ...order.farmer, _id: order.farmer.id } : order.farmer,
    deliveryMan: order.deliveryMan
      ? { ...order.deliveryMan, _id: order.deliveryMan.id }
      : order.deliveryMan,
    items: order.items
      ? order.items.map((item) => ({
          ...item,
          unitPrice: item.unitPrice?.toNumber ? item.unitPrice.toNumber() : item.unitPrice,
          total: item.total?.toNumber ? item.total.toNumber() : item.total,
        }))
      : order.items,
  };
};

// =============================================================================
// FIND NEARBY DELIVERY MEN
// =============================================================================

/**
 * POST /api/delivery/find-nearby
 * Farmer searches for nearby available delivery men for a specific order.
 *
 * How it works:
 * 1. Farmer sends their orderId and optional maxDistance (default 10km).
 * 2. We look up the order to get the farmer's location and delivery type.
 * 3. We fetch all active delivery men.
 * 4. For each delivery man, we calculate distance using the Haversine formula.
 * 5. We check if they can take this order type (instant = fully available,
 *    normal = has capacity in the same city).
 * 6. We sort results: preferred area matches first, then by distance.
 * 7. We return the list with distance, capacity, and vehicle info.
 *
 * Why: This lets the farmer see WHO is nearby and AVAILABLE before sending
 * a request. No more guessing or manually calling delivery men.
 */
const findNearbyDeliveryMen = async (req, res) => {
  try {
    if (req.user.role !== 'farmer' && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Only farmers and admins can search for delivery men' });
    }

    const { orderId, maxDistance = 10 } = req.body;
    if (!orderId) {
      return res.status(400).json({ message: 'orderId is required' });
    }

    // Get the order and farmer details
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: {
        farmer: { select: { id: true, latitude: true, longitude: true, name: true } },
      },
    });

    if (!order) {
      return res.status(404).json({ message: 'Order not found' });
    }

    if (order.farmerId !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'You can only search for delivery men for your own orders' });
    }

    // Fetch all active delivery men with their profiles
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

    // For each delivery man, calculate distance and check capacity
    const results = await Promise.all(
      deliveryMen.map(async (dm) => {
        const profile = dm.deliveryManProfile;

        // Use current GPS location if available, otherwise fallback to user location
        const dmLat = profile?.currentLatitude ?? dm.latitude;
        const dmLng = profile?.currentLongitude ?? dm.longitude;
        const farmerLat = order.farmer?.latitude;
        const farmerLng = order.farmer?.longitude;

        const distance = haversineDistance(farmerLat, farmerLng, dmLat, dmLng);

        // Check capacity based on order delivery type
        let canTake = false;
        let reason = '';

        if (order.deliveryType === 'instant') {
          // Instant: delivery man must be fully available (not doing any instant delivery)
          canTake = profile?.isAvailable === true;
          reason = canTake ? 'Available for instant delivery' : 'Currently busy with another instant delivery';
        } else {
          // Normal: check if they have capacity in the SAME city
          const activeNormalOrders = await prisma.order.count({
            where: {
              deliveryManId: dm.id,
              deliveryType: 'normal',
              deliveryCity: order.deliveryCity,
              status: { in: ['awaiting_delivery', 'shipped', 'out_for_delivery'] },
            },
          });
          const capacity = profile?.maxOrders || 3;
          canTake = activeNormalOrders < capacity;
          reason = canTake
            ? `Can carry ${capacity - activeNormalOrders} more normal orders in ${order.deliveryCity || 'this area'}`
            : `At max capacity (${capacity} orders) in ${order.deliveryCity || 'this area'}`;
        }

        // Check preferred area match (higher priority if matches)
        const preferredAreas = profile?.preferredAreas || [];
        const areaMatch = preferredAreas.some(
          (area) =>
            area?.toLowerCase() === order.deliveryCity?.toLowerCase() ||
            area?.toLowerCase() === order.deliveryArea?.toLowerCase()
        );

        return {
          _id: dm.id,
          id: dm.id,
          name: dm.name,
          phone: dm.phone,
          profileImage: dm.profileImage,
          vehicleType: profile?.vehicleType,
          distanceKm: distance ? parseFloat(distance.toFixed(2)) : null,
          currentLatitude: dmLat,
          currentLongitude: dmLng,
          lastLocationUpdate: profile?.lastLocationUpdate,
          isAvailable: profile?.isAvailable,
          preferredAreas,
          areaMatch, // true if delivery man's preferred area matches order area
          canTake,
          reason,
          maxOrders: profile?.maxOrders || 3,
        };
      })
    );

    // Filter by max distance (only if we have coordinates)
    let filtered = results.filter((dm) => {
      if (dm.distanceKm === null) return true; // Include if no location data
      return dm.distanceKm <= parseFloat(maxDistance);
    });

    // Sort: area matches first, then by distance
    filtered.sort((a, b) => {
      if (a.areaMatch && !b.areaMatch) return -1;
      if (!a.areaMatch && b.areaMatch) return 1;
      if (a.distanceKm == null && b.distanceKm == null) return 0;
      if (a.distanceKm == null) return 1;
      if (b.distanceKm == null) return -1;
      return a.distanceKm - b.distanceKm;
    });

    res.json({
      orderId,
      orderDeliveryType: order.deliveryType,
      orderCity: order.deliveryCity,
      farmerLocation: {
        latitude: order.farmer?.latitude,
        longitude: order.farmer?.longitude,
      },
      deliveryMen: filtered,
    });
  } catch (error) {
    console.error('Find nearby delivery men error:', error);
    res.status(500).json({ message: error.message });
  }
};

// =============================================================================
// SEND DELIVERY REQUEST
// =============================================================================

/**
 * POST /api/delivery/send-request
 * Farmer sends a delivery request to a specific delivery man.
 *
 * How it works:
 * 1. Farmer selects a delivery man from the nearby search results.
 * 2. We create a DeliveryRequest record with status "pending".
 * 3. We update the order status to "awaiting_delivery".
 * 4. We create a Notification for the delivery man.
 * 5. The delivery man sees this in their dashboard and can accept/reject.
 *
 * Why: Instead of directly assigning (old way), we now ASK the delivery man
 * first. This respects their choice and prevents forced assignments.
 */
const sendDeliveryRequest = async (req, res) => {
  try {
    if (req.user.role !== 'farmer' && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Only farmers can send delivery requests' });
    }

    const { orderId, deliveryManId, message } = req.body;
    if (!orderId || !deliveryManId) {
      return res.status(400).json({ message: 'orderId and deliveryManId are required' });
    }

    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: {
        farmer: { select: { id: true, name: true, address: true, latitude: true, longitude: true } },
        buyer: { select: { id: true, name: true, address: true } },
        items: { include: { product: { select: { name: true } } } },
      },
    });

    if (!order) {
      return res.status(404).json({ message: 'Order not found' });
    }

    if (order.farmerId !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'You can only send requests for your own orders' });
    }

    if (order.status !== 'confirmed' && order.status !== 'processing') {
      return res.status(400).json({
        message: `Cannot send delivery request for order in "${order.status}" status. Must be confirmed or processing.`,
      });
    }

    if (order.deliveryManId) {
      return res.status(400).json({ message: 'This order already has a delivery man assigned' });
    }

    // Verify delivery man exists and is valid
    const dm = await prisma.user.findUnique({
      where: { id: deliveryManId },
      include: { deliveryManProfile: true },
    });

    if (!dm || dm.role !== 'delivery_man') {
      return res.status(404).json({ message: 'Delivery man not found' });
    }

    // Check if a pending request already exists for this order+deliveryMan combo
    const existingRequest = await prisma.deliveryRequest.findFirst({
      where: {
        orderId,
        deliveryManId,
        status: 'pending',
      },
    });

    if (existingRequest) {
      return res.status(400).json({ message: 'A pending request already exists for this delivery man' });
    }

    // Create the request and update order status in one transaction
    const request = await prisma.$transaction(async (tx) => {
      const newRequest = await tx.deliveryRequest.create({
        data: {
          orderId,
          deliveryManId,
          status: 'pending',
          requestType: order.deliveryType,
          message: message || null,
        },
      });

      // Update order status to awaiting_delivery if not already
      if (order.status !== 'awaiting_delivery') {
        await tx.order.update({
          where: { id: orderId },
          data: { status: 'awaiting_delivery' },
        });

        await tx.orderStatusHistory.create({
          data: {
            orderId,
            status: 'awaiting_delivery',
            notes: `Delivery request sent to ${dm.name}`,
            changedBy: req.user.id,
          },
        });
      }

      // Notify the delivery man
      await createNotification(tx, {
        userId: deliveryManId,
        type: 'order_update',
        title: 'New Delivery Request',
        body: `You have a new ${order.deliveryType} delivery request from ${order.farmer.name} for order ${order.orderNumber}.`,
        data: { orderId, requestId: newRequest.id, orderNumber: order.orderNumber },
      });

      return newRequest;
    });

    res.status(201).json({
      message: 'Delivery request sent successfully',
      request: {
        id: request.id,
        status: request.status,
        requestType: request.requestType,
        deliveryMan: { _id: dm.id, name: dm.name, phone: dm.phone },
        order: {
          _id: order.id,
          orderNumber: order.orderNumber,
          deliveryType: order.deliveryType,
          deliveryCity: order.deliveryCity,
          deliveryArea: order.deliveryArea,
        },
      },
    });
  } catch (error) {
    console.error('Send delivery request error:', error);
    res.status(500).json({ message: error.message });
  }
};

// =============================================================================
// RESPOND TO DELIVERY REQUEST
// =============================================================================

/**
 * PUT /api/delivery/respond-request/:requestId
 * Delivery man accepts or rejects a delivery request.
 *
 * How it works:
 * 1. Delivery man sees the request in their dashboard.
 * 2. They send { status: "accepted" } or { status: "rejected" }.
 * 3. If accepted:
 *    - We assign the delivery man to the order.
 *    - For INSTANT: we mark the delivery man as unavailable (busy).
 *    - For NORMAL: we just add the order to their batch (no availability change).
 *    - We mark ALL OTHER pending requests for this order as EXPIRED.
 *    - We notify the farmer.
 *    - We notify the customer that a delivery man is assigned.
 * 4. If rejected:
 *    - We mark the request as rejected.
 *    - The delivery man stays available.
 *    - The farmer can send a new request to someone else.
 *
 * Why: This gives delivery men CONTROL over which orders they take.
 * The automatic expiration of other requests prevents double-booking.
 */
const respondToDeliveryRequest = async (req, res) => {
  try {
    if (req.user.role !== 'delivery_man' && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Only delivery men can respond to requests' });
    }

    const { requestId } = req.params;
    const { status: responseStatus } = req.body; // "accepted" or "rejected"

    if (!['accepted', 'rejected'].includes(responseStatus)) {
      return res.status(400).json({ message: 'status must be "accepted" or "rejected"' });
    }

    const request = await prisma.deliveryRequest.findUnique({
      where: { id: requestId },
      include: {
        order: {
          include: {
            farmer: { select: { id: true, name: true, phone: true } },
            buyer: { select: { id: true, name: true, phone: true } },
          },
        },
        deliveryMan: { select: { id: true, name: true } },
      },
    });

    if (!request) {
      return res.status(404).json({ message: 'Delivery request not found' });
    }

    if (request.deliveryManId !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'This request is not for you' });
    }

    if (request.status !== 'pending') {
      return res.status(400).json({ message: `This request has already been ${request.status}` });
    }

    const order = request.order;

    // If accepting, verify the order is still available
    if (responseStatus === 'accepted') {
      if (order.deliveryManId) {
        return res.status(400).json({ message: 'This order already has a delivery man assigned' });
      }

      // For instant, verify delivery man is available
      if (order.deliveryType === 'instant') {
        const profile = await prisma.deliveryManProfile.findUnique({
          where: { userId: req.user.id },
        });
        if (!profile?.isAvailable) {
          return res.status(400).json({ message: 'You are currently busy with another instant delivery' });
        }
      }

      // For normal, verify capacity in the same city
      if (order.deliveryType === 'normal') {
        const activeNormalOrders = await prisma.order.count({
          where: {
            deliveryManId: req.user.id,
            deliveryType: 'normal',
            deliveryCity: order.deliveryCity,
            status: { in: ['awaiting_delivery', 'shipped', 'out_for_delivery'] },
          },
        });
        const profile = await prisma.deliveryManProfile.findUnique({
          where: { userId: req.user.id },
        });
        const maxOrders = profile?.maxOrders || 3;
        if (activeNormalOrders >= maxOrders) {
          return res.status(400).json({
            message: `You are at max capacity (${maxOrders} orders) in ${order.deliveryCity || 'this area'}. Cannot accept more normal orders here.`,
          });
        }
      }
    }

    // Process the response
    await prisma.$transaction(async (tx) => {
      // Update this request
      await tx.deliveryRequest.update({
        where: { id: requestId },
        data: {
          status: responseStatus,
          respondedAt: new Date(),
        },
      });

      if (responseStatus === 'accepted') {
        // Assign delivery man to order
        await tx.order.update({
          where: { id: order.id },
          data: { deliveryManId: req.user.id },
        });

        // For instant delivery, mark delivery man as unavailable
        if (order.deliveryType === 'instant') {
          await tx.deliveryManProfile.update({
            where: { userId: req.user.id },
            data: { isAvailable: false },
          });
        }

        // Mark ALL other pending requests for this order as EXPIRED
        await tx.deliveryRequest.updateMany({
          where: {
            orderId: order.id,
            status: 'pending',
            id: { not: requestId },
          },
          data: {
            status: 'expired',
            respondedAt: new Date(),
          },
        });

        // Notify farmer
        await createNotification(tx, {
          userId: order.farmerId,
          type: 'order_update',
          title: 'Delivery Man Assigned',
          body: `${req.user.name} has accepted your delivery request for order ${order.orderNumber}.`,
          data: { orderId: order.id, orderNumber: order.orderNumber, deliveryManId: req.user.id },
        });

        // Notify customer
        await createNotification(tx, {
          userId: order.buyerId,
          type: 'order_update',
          title: 'Delivery Man Assigned',
          body: `A delivery man has been assigned to your order ${order.orderNumber}. They will collect the products soon.`,
          data: { orderId: order.id, orderNumber: order.orderNumber },
        });
      } else {
        // Rejected: notify farmer so they can find someone else
        await createNotification(tx, {
          userId: order.farmerId,
          type: 'order_update',
          title: 'Delivery Request Declined',
          body: `${req.user.name} declined the delivery request for order ${order.orderNumber}. Please find another delivery man.`,
          data: { orderId: order.id, orderNumber: order.orderNumber },
        });
      }
    });

    res.json({
      message: `Delivery request ${responseStatus}`,
      requestId,
      orderId: order.id,
      orderNumber: order.orderNumber,
      responseStatus,
    });
  } catch (error) {
    console.error('Respond to delivery request error:', error);
    res.status(500).json({ message: error.message });
  }
};

// =============================================================================
// GET DELIVERY REQUESTS (for delivery man)
// =============================================================================

/**
 * GET /api/delivery/my-requests
 * Delivery man sees all pending delivery requests sent to them.
 *
 * Returns full order details so the delivery man can decide
 * whether to accept (distance, products, location, etc.).
 */
const getDeliveryRequests = async (req, res) => {
  try {
    if (req.user.role !== 'delivery_man' && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Only delivery men can view requests' });
    }

    const userId = req.user.role === 'admin' ? req.query.deliveryManId || req.user.id : req.user.id;

    const requests = await prisma.deliveryRequest.findMany({
      where: {
        deliveryManId: userId,
        status: req.query.status || 'pending',
      },
      include: {
        order: {
          include: {
            farmer: {
              select: { id: true, name: true, phone: true, address: true, latitude: true, longitude: true },
            },
            buyer: {
              select: { id: true, name: true, phone: true, address: true, latitude: true, longitude: true },
            },
            items: {
              include: {
                product: { select: { name: true, images: true } },
              },
            },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    res.json(
      requests.map((r) => ({
        _id: r.id,
        id: r.id,
        status: r.status,
        requestType: r.requestType,
        message: r.message,
        createdAt: r.createdAt,
        respondedAt: r.respondedAt,
        order: shapeOrder(r.order),
      }))
    );
  } catch (error) {
    console.error('Get delivery requests error:', error);
    res.status(500).json({ message: error.message });
  }
};

// =============================================================================
// GET MY ACTIVE DELIVERIES
// =============================================================================

/**
 * GET /api/delivery/my-deliveries
 * Delivery man sees all their currently active deliveries.
 *
 * How it works:
 * - Instant orders: shown separately (max 1 at a time).
 * - Normal orders: grouped by city so the delivery man can see their batch.
 * - Each order includes farmer location, buyer location, and product details.
 *
 * Why: This is the delivery man's DASHBOARD. They can see everything
 * they need to deliver right now, organized by city for normal deliveries.
 */
const getMyActiveDeliveries = async (req, res) => {
  try {
    if (req.user.role !== 'delivery_man' && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Only delivery men can view deliveries' });
    }

    const userId = req.user.role === 'admin' ? req.query.deliveryManId || req.user.id : req.user.id;

    const activeOrders = await prisma.order.findMany({
      where: {
        deliveryManId: userId,
        status: { in: ['awaiting_delivery', 'shipped', 'out_for_delivery'] },
      },
      include: {
        farmer: {
          select: { id: true, name: true, phone: true, address: true, latitude: true, longitude: true },
        },
        buyer: {
          select: { id: true, name: true, phone: true, address: true, latitude: true, longitude: true },
        },
        items: {
          include: {
            product: { select: { name: true, images: true } },
          },
        },
        statusHistory: { orderBy: { createdAt: 'asc' } },
      },
      orderBy: { createdAt: 'desc' },
    });

    const instant = activeOrders.filter((o) => o.deliveryType === 'instant');
    const normal = activeOrders.filter((o) => o.deliveryType === 'normal');

    // Group normal orders by city
    const normalByCity = {};
    for (const order of normal) {
      const city = order.deliveryCity || 'Unknown Area';
      if (!normalByCity[city]) {
        normalByCity[city] = [];
      }
      normalByCity[city].push(shapeOrder(order));
    }

    res.json({
      instant: instant.map(shapeOrder),
      normal: normalByCity,
      totalActive: activeOrders.length,
    });
  } catch (error) {
    console.error('Get active deliveries error:', error);
    res.status(500).json({ message: error.message });
  }
};

// =============================================================================
// MARK DELIVERY STARTED (single order)
// =============================================================================

/**
 * PUT /api/delivery/start-delivery/:orderId
 * Delivery man marks a single order as "out_for_delivery".
 *
 * How it works:
 * 1. Delivery man has collected the products from the farmer.
 * 2. They call this endpoint to start delivery for THIS specific order.
 * 3. We update the order status to "out_for_delivery".
 * 4. We create a tracking point from their current GPS location.
 * 5. We notify the customer.
 *
 * Why: This is the moment the customer gets notified that their products
 * are on the way, with live tracking info.
 */
const markDeliveryStarted = async (req, res) => {
  try {
    if (req.user.role !== 'delivery_man' && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Only delivery men can start delivery' });
    }

    const { orderId } = req.params;
    const userId = req.user.id;

    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: {
        buyer: { select: { id: true, name: true, phone: true } },
        farmer: { select: { id: true, name: true } },
      },
    });

    if (!order) {
      return res.status(404).json({ message: 'Order not found' });
    }

    if (order.deliveryManId !== userId && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'This order is not assigned to you' });
    }

    if (order.status !== 'shipped') {
      return res.status(400).json({
        message: `Order must be shipped by the farmer before starting delivery. Current status: ${order.status}`,
      });
    }

    // Get delivery man's current location for initial tracking
    const dmProfile = await prisma.deliveryManProfile.findUnique({
      where: { userId },
    });

    await prisma.$transaction(async (tx) => {
      await tx.order.update({
        where: { id: orderId },
        data: { status: 'out_for_delivery' },
      });

      await tx.orderStatusHistory.create({
        data: {
          orderId: orderId,
          status: 'out_for_delivery',
          notes: 'Delivery man started delivery',
          changedBy: userId,
        },
      });

      // Create initial tracking point
      if (dmProfile?.currentLatitude && dmProfile?.currentLongitude) {
        await tx.deliveryTracking.create({
          data: {
            orderId: orderId,
            latitude: dmProfile.currentLatitude,
            longitude: dmProfile.currentLongitude,
            status: 'moving',
          },
        });
      }

      // Notify customer
      await createNotification(tx, {
        userId: order.buyerId,
        type: 'order_update',
        title: 'Your Order is Out for Delivery!',
        body: `Order ${order.orderNumber} is now being delivered. You can track the live location in the app.`,
        data: { orderId, orderNumber: order.orderNumber },
      });
    });

    res.json({
      message: 'Delivery started successfully',
      order: {
        _id: order.id,
        orderNumber: order.orderNumber,
        status: 'out_for_delivery',
        deliveryMan: {
          name: req.user.name,
          phone: req.user.phone,
          currentLatitude: dmProfile?.currentLatitude,
          currentLongitude: dmProfile?.currentLongitude,
        },
      },
    });
  } catch (error) {
    console.error('Mark delivery started error:', error);
    res.status(500).json({ message: error.message });
  }
};

// =============================================================================
// START BATCH DELIVERY (normal delivery - multiple orders at once)
// =============================================================================

/**
 * PUT /api/delivery/start-batch
 * Delivery man starts delivery for ALL their normal orders in a specific city.
 *
 * How it works:
 * 1. Delivery man has collected products from multiple farmers in the same city.
 * 2. They call this with { city: "Dhaka" }.
 * 3. We mark ALL their normal orders in that city as "out_for_delivery".
 * 4. We create tracking points and notify all customers.
 *
 * Why: For normal delivery, the delivery man carries multiple orders.
 * Instead of marking each one individually, they can start the whole batch
 * at once when they begin their delivery route.
 */
const startBatchDelivery = async (req, res) => {
  try {
    if (req.user.role !== 'delivery_man' && req.user.role !== 'admin') {
            return res.status(403).json({ message: 'Only delivery men can start batch delivery' });
    }

    const { city } = req.body;
    if (!city) {
      return res.status(400).json({ message: 'city is required' });
    }

    const userId = req.user.id;

    // Find all shipped normal orders in this city assigned to this delivery man
    const orders = await prisma.order.findMany({
      where: {
        deliveryManId: userId,
        deliveryType: 'normal',
        deliveryCity: city,
        status: 'shipped',
      },
      include: {
        buyer: { select: { id: true, name: true, phone: true } },
      },
    });

    if (orders.length === 0) {
      return res.status(400).json({ message: `No shipped normal orders found in ${city}` });
    }

    const dmProfile = await prisma.deliveryManProfile.findUnique({
      where: { userId },
    });

    await prisma.$transaction(async (tx) => {
      for (const order of orders) {
        await tx.order.update({
          where: { id: order.id },
          data: { status: 'out_for_delivery' },
        });

        await tx.orderStatusHistory.create({
          data: {
            orderId: order.id,
            status: 'out_for_delivery',
            notes: 'Batch delivery started',
            changedBy: userId,
          },
        });

        if (dmProfile?.currentLatitude && dmProfile?.currentLongitude) {
          await tx.deliveryTracking.create({
            data: {
              orderId: order.id,
              latitude: dmProfile.currentLatitude,
              longitude: dmProfile.currentLongitude,
              status: 'moving',
            },
          });
        }

        await createNotification(tx, {
          userId: order.buyerId,
          type: 'order_update',
          title: 'Your Order is Out for Delivery!',
          body: `Order ${order.orderNumber} is now being delivered as part of a batch. You can track the live location.`,
          data: { orderId: order.id, orderNumber: order.orderNumber },
        });
      }
    });

    res.json({
      message: `Batch delivery started for ${orders.length} orders in ${city}`,
      orders: orders.map((o) => ({ _id: o.id, orderNumber: o.orderNumber })),
    });
  } catch (error) {
    console.error('Start batch delivery error:', error);
    res.status(500).json({ message: error.message });
  }
};

// =============================================================================
// GET NORMAL DELIVERY BATCHES
// =============================================================================

/**
 * GET /api/delivery/batches
 * Delivery man sees available normal delivery batches they can join.
 *
 * How it works:
 * 1. We look for orders with deliveryType="normal" that are "awaiting_delivery"
 *    (farmer sent requests but no delivery man assigned yet).
 * 2. We group these by city.
 * 3. We show the delivery man which cities have the most available orders.
 * 4. The delivery man can then send a request for orders in their preferred city.
 *
 * Why: This helps delivery men PLAN their day. They can see which cities
 * have the most demand and choose where to work.
 */
const getNormalDeliveryBatches = async (req, res) => {
  try {
    if (req.user.role !== 'delivery_man' && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Only delivery men can view batches' });
    }

    // Find all normal orders awaiting delivery (no delivery man assigned yet)
    const orders = await prisma.order.findMany({
      where: {
        deliveryType: 'normal',
        status: 'awaiting_delivery',
        deliveryManId: null,
      },
      include: {
        farmer: { select: { id: true, name: true, address: true, latitude: true, longitude: true } },
        buyer: { select: { id: true, name: true, address: true } },
        items: { include: { product: { select: { name: true } } } },
      },
    });

    // Group by city
    const batches = {};
    for (const order of orders) {
      const city = order.deliveryCity || 'Unknown';
      if (!batches[city]) {
        batches[city] = {
          city,
          orderCount: 0,
          totalEarnings: 0,
          orders: [],
        };
      }
      batches[city].orderCount += 1;
      batches[city].totalEarnings += order.deliveryFee?.toNumber ? order.deliveryFee.toNumber() : parseFloat(order.deliveryFee || 0);
      batches[city].orders.push({
        _id: order.id,
        orderNumber: order.orderNumber,
        deliveryArea: order.deliveryArea,
        deliveryFee: order.deliveryFee?.toNumber ? order.deliveryFee.toNumber() : parseFloat(order.deliveryFee || 0),
        farmer: order.farmer,
        itemCount: order.items.length,
      });
    }

    // Convert to array and sort by order count
    const batchList = Object.values(batches).sort((a, b) => b.orderCount - a.orderCount);

    res.json({
      totalBatches: batchList.length,
      totalOrders: orders.length,
      batches: batchList,
    });
  } catch (error) {
    console.error('Get normal delivery batches error:', error);
    res.status(500).json({ message: error.message });
  }
};

// =============================================================================
// UPDATE DELIVERY PREFERENCES
// =============================================================================

/**
 * PUT /api/delivery/preferences
 * Delivery man updates their preferred delivery areas and max orders.
 *
 * How it works:
 * - preferredAreas: array of city/area names like ["Dhaka", "Gazipur"].
 *   When orders are available in these areas, the delivery man is shown
 *   FIRST in the farmer's search results.
 * - maxOrders: maximum number of normal orders they can carry at once.
 *   Default is 3. They can increase this if they have a bigger vehicle.
 *
 * Why: Delivery men should control WHERE they work and HOW MUCH they carry.
 * If no orders are in their preferred area, they still see other areas
 * (just sorted lower in the list).
 */
const updateDeliveryPreferences = async (req, res) => {
  try {
    if (req.user.role !== 'delivery_man' && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Only delivery men can update preferences' });
    }

    const { preferredAreas, maxOrders } = req.body;
    const userId = req.user.id;

    const updateData = {};
    if (preferredAreas !== undefined) {
      if (!Array.isArray(preferredAreas)) {
        return res.status(400).json({ message: 'preferredAreas must be an array of strings' });
      }
      updateData.preferredAreas = preferredAreas.filter((a) => typeof a === 'string' && a.trim() !== '');
    }
    if (maxOrders !== undefined) {
      const max = parseInt(maxOrders);
      if (isNaN(max) || max < 1 || max > 20) {
        return res.status(400).json({ message: 'maxOrders must be between 1 and 20' });
      }
      updateData.maxOrders = max;
    }

    const updated = await prisma.deliveryManProfile.update({
      where: { userId },
      data: updateData,
    });

    res.json({
      message: 'Preferences updated successfully',
      preferences: {
        preferredAreas: updated.preferredAreas,
        maxOrders: updated.maxOrders,
      },
    });
  } catch (error) {
    console.error('Update delivery preferences error:', error);
    res.status(500).json({ message: error.message });
  }
};

// =============================================================================
// NOTIFICATIONS
// =============================================================================

/**
 * GET /api/delivery/notifications
 * Get all notifications for the logged-in user.
 */
const getMyNotifications = async (req, res) => {
  try {
    const userId = req.user.id;
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(50, Math.max(1, parseInt(req.query.limit) || 20));

    const [notifications, total] = await Promise.all([
      prisma.notification.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.notification.count({ where: { userId } }),
    ]);

    res.json({
      data: notifications,
      total,
      page,
      totalPages: Math.ceil(total / limit),
      unreadCount: notifications.filter((n) => !n.isRead).length,
    });
  } catch (error) {
    console.error('Get notifications error:', error);
    res.status(500).json({ message: error.message });
  }
};

/**
 * PUT /api/delivery/notifications/:id/read
 * Mark a notification as read.
 */
const markNotificationRead = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    const notification = await prisma.notification.findUnique({
      where: { id },
    });

    if (!notification) {
      return res.status(404).json({ message: 'Notification not found' });
    }

    if (notification.userId !== userId && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Not your notification' });
    }

    await prisma.notification.update({
      where: { id },
      data: { isRead: true },
    });

    res.json({ message: 'Notification marked as read' });
  } catch (error) {
    console.error('Mark notification read error:', error);
    res.status(500).json({ message: error.message });
  }
};

// =============================================================================
// TOGGLE AVAILABILITY
// =============================================================================

/**
 * PUT /api/delivery/toggle-availability
 * Delivery man manually goes online or offline.
 *
 * How it works:
 * - When going online (isAvailable: true), the delivery man starts receiving
 *   delivery requests from farmers.
 * - When going offline (isAvailable: false), no new requests are sent to them.
 * - For instant deliveries, availability is auto-managed. But for normal
 *   deliveries, the delivery man controls their own status.
 *
 * Why: Delivery men need control over WHEN they work. This is the "turn on
 * location" feature — they go online when ready to work, offline when done.
 */
const toggleAvailability = async (req, res) => {
  try {
    if (req.user.role !== 'delivery_man' && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Only delivery men can toggle availability' });
    }

    const { isAvailable } = req.body;
    if (typeof isAvailable !== 'boolean') {
      return res.status(400).json({ message: 'isAvailable must be true or false' });
    }

    const updated = await prisma.deliveryManProfile.update({
      where: { userId: req.user.id },
      data: { isAvailable },
    });

    res.json({
      message: isAvailable ? 'You are now ONLINE and will receive delivery requests' : 'You are now OFFLINE',
      isAvailable: updated.isAvailable,
    });
  } catch (error) {
    console.error('Toggle availability error:', error);
    res.status(500).json({ message: error.message });
  }
};

// =============================================================================
// EXPORTS
// =============================================================================

module.exports = {
  findNearbyDeliveryMen,
  sendDeliveryRequest,
  respondToDeliveryRequest,
  getDeliveryRequests,
  getMyActiveDeliveries,
  markDeliveryStarted,
  startBatchDelivery,
  getNormalDeliveryBatches,
  updateDeliveryPreferences,
  getMyNotifications,
  markNotificationRead,
  toggleAvailability,
};