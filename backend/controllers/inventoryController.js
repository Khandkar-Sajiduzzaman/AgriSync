const prisma = require('../config/db');

const LOW_STOCK_THRESHOLD = 10;

const inventoryRequestTableExists = async () => {
  try {
    const rows = await prisma.$queryRaw`SELECT to_regclass('public."InventoryChangeRequest"')::text AS table_name`;
    return Boolean(rows && rows[0] && rows[0].table_name === '"InventoryChangeRequest"');
  } catch (error) {
    console.warn('InventoryChangeRequest table availability check failed:', error.message);
    return true;
  }
};

const getStockStatus = (stock) => {
  if (stock <= 0) return 'OUT OF STOCK';
  if (stock <= LOW_STOCK_THRESHOLD) return 'LOW STOCK';
  return 'IN STOCK';
};

const toRequestShape = (request) => ({
  ...request,
  _id: request.id,
  productName: request.product?.name,
  farmerName: request.farmer?.name,
  reviewerName: request.reviewedBy?.name,
  statusLabel: request.status,
});

const createInventoryRequest = async (req, res) => {
  try {
    if (req.user.role !== 'farmer') {
      return res.status(403).json({ message: 'Only farmers can submit inventory change requests' });
    }

    const tableReady = await inventoryRequestTableExists();
    if (!tableReady) {
      return res.status(500).json({ message: 'Inventory change requests are not available in the current database schema.' });
    }

    const { productId, requestedStock, reason } = req.body;

    if (!productId) {
      return res.status(400).json({ message: 'Product is required' });
    }

    const parsedStock = Number.parseInt(requestedStock, 10);
    if (!Number.isInteger(parsedStock) || parsedStock < 0 || parsedStock > 1000000) {
      return res.status(400).json({ message: 'Requested stock must be a valid number between 0 and 1000000' });
    }

    const cleanReason = typeof reason === 'string' ? reason.trim() : '';
    if (!cleanReason) {
      return res.status(400).json({ message: 'Reason is required' });
    }

    const product = await prisma.product.findUnique({
      where: { id: productId },
    });

    if (!product || product.isRemoved) {
      return res.status(404).json({ message: 'Product not found' });
    }

    if (product.farmerId !== req.user.id) {
      return res.status(403).json({ message: 'You can only request stock changes for your own products' });
    }

    const existingPending = await prisma.inventoryChangeRequest.findFirst({
      where: {
        farmerId: req.user.id,
        productId,
        status: 'PENDING',
      },
    });

    if (existingPending) {
      return res.status(409).json({ message: 'A pending request already exists for this product' });
    }

    const request = await prisma.inventoryChangeRequest.create({
      data: {
        farmerId: req.user.id,
        productId,
        currentStock: product.stock,
        requestedStock: parsedStock,
        reason: cleanReason,
      },
      include: {
        farmer: { select: { id: true, name: true } },
        product: { select: { id: true, name: true, stock: true, unit: true } },
      },
    });

    res.status(201).json(toRequestShape(request));
  } catch (error) {
    console.error('Create inventory request error:', error);
    res.status(500).json({ message: 'Failed to create inventory request' });
  }
};

const getMyInventoryRequests = async (req, res) => {
  try {
    if (req.user.role !== 'farmer') {
      return res.status(403).json({ message: 'Only farmers can view their inventory requests' });
    }

    const tableReady = await inventoryRequestTableExists();
    if (!tableReady) {
      return res.status(500).json({ message: 'Inventory change requests are not available in the current database schema.' });
    }

    const requests = await prisma.inventoryChangeRequest.findMany({
      where: { farmerId: req.user.id },
      include: {
        product: { select: { id: true, name: true, stock: true, unit: true } },
        reviewedBy: { select: { id: true, name: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    res.json(requests.map(toRequestShape));
  } catch (error) {
    console.error('Get my inventory requests error:', error);
    res.status(500).json({ message: 'Failed to load your inventory requests' });
  }
};

const getInventoryRequests = async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Only admins can view inventory requests' });
    }

    const tableReady = await inventoryRequestTableExists();
    if (!tableReady) {
      return res.status(500).json({ message: 'Inventory change requests are not available in the current database schema.' });
    }

    const { status } = req.query;
    const where = status ? { status } : {};

    const requests = await prisma.inventoryChangeRequest.findMany({
      where,
      include: {
        farmer: { select: { id: true, name: true } },
        product: { select: { id: true, name: true, stock: true, unit: true } },
        reviewedBy: { select: { id: true, name: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    res.json(requests.map(toRequestShape));
  } catch (error) {
    console.error('Get inventory requests error:', error);
    res.status(500).json({ message: 'Failed to load inventory requests' });
  }
};

const approveInventoryRequest = async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Only admins can approve inventory requests' });
    }

    const request = await prisma.inventoryChangeRequest.findUnique({
      where: { id: req.params.id },
      include: {
        product: true,
        farmer: { select: { id: true, name: true } },
      },
    });

    if (!request) {
      return res.status(404).json({ message: 'Inventory request not found' });
    }

    if (request.status !== 'PENDING') {
      return res.status(409).json({ message: 'This request has already been processed' });
    }

    const result = await prisma.$transaction(async (tx) => {
      const oldStock = request.product.stock;
      const newStock = request.requestedStock;

      const updatedProduct = await tx.product.update({
        where: { id: request.productId },
        data: { stock: newStock },
      });

      await tx.inventoryLog.create({
        data: {
          productId: request.productId,
          oldStock,
          newStock,
          change: newStock - oldStock,
          reason: `inventory_request_approved:${request.reason}`.slice(0, 200),
        },
      });

      const updatedRequest = await tx.inventoryChangeRequest.update({
        where: { id: request.id },
        data: {
          status: 'APPROVED',
          reviewedById: req.user.id,
          approvedAt: new Date(),
          rejectedAt: null,
          rejectionReason: null,
        },
        include: {
          product: { select: { id: true, name: true, stock: true, unit: true } },
          farmer: { select: { id: true, name: true } },
          reviewedBy: { select: { id: true, name: true } },
        },
      });

      return { updatedProduct, updatedRequest };
    });

    res.json({
      message: 'Inventory request approved',
      request: toRequestShape(result.updatedRequest),
      product: { ...result.updatedProduct, _id: result.updatedProduct.id },
    });
  } catch (error) {
    console.error('Approve inventory request error:', error);
    res.status(500).json({ message: 'Failed to approve inventory request' });
  }
};

const rejectInventoryRequest = async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Only admins can reject inventory requests' });
    }

    const { rejectionReason } = req.body;
    const cleanReason = typeof rejectionReason === 'string' ? rejectionReason.trim() : '';

    if (!cleanReason) {
      return res.status(400).json({ message: 'A rejection reason is required' });
    }

    const request = await prisma.inventoryChangeRequest.findUnique({
      where: { id: req.params.id },
      include: {
        product: { select: { id: true, name: true, stock: true, unit: true } },
        farmer: { select: { id: true, name: true } },
      },
    });

    if (!request) {
      return res.status(404).json({ message: 'Inventory request not found' });
    }

    if (request.status !== 'PENDING') {
      return res.status(409).json({ message: 'This request has already been processed' });
    }

    const updatedRequest = await prisma.inventoryChangeRequest.update({
      where: { id: request.id },
      data: {
        status: 'REJECTED',
        reviewedById: req.user.id,
        rejectionReason: cleanReason,
        rejectedAt: new Date(),
        approvedAt: null,
      },
      include: {
        farmer: { select: { id: true, name: true } },
        product: { select: { id: true, name: true, stock: true, unit: true } },
        reviewedBy: { select: { id: true, name: true } },
      },
    });

    res.json({
      message: 'Inventory request rejected',
      request: toRequestShape(updatedRequest),
    });
  } catch (error) {
    console.error('Reject inventory request error:', error);
    res.status(500).json({ message: 'Failed to reject inventory request' });
  }
};

const getInventoryOverview = async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Only admins can view inventory overview' });
    }

    const tableReady = await inventoryRequestTableExists();
    const [totalProducts, inStockProducts, lowStockProducts, outOfStockProducts, pendingRequests] = await Promise.all([
      prisma.product.count({ where: { isRemoved: false } }),
      prisma.product.count({ where: { isRemoved: false, stock: { gt: 0 } } }),
      prisma.product.count({ where: { isRemoved: false, stock: { gt: 0, lte: LOW_STOCK_THRESHOLD } } }),
      prisma.product.count({ where: { isRemoved: false, stock: 0 } }),
      tableReady ? prisma.inventoryChangeRequest.count({ where: { status: 'PENDING' } }) : prisma.inventoryChangeRequest.count({ where: { status: 'PENDING' } }),
    ]);

    res.json({
      totalProducts,
      inStockProducts,
      lowStockProducts,
      outOfStockProducts,
      pendingRequests,
      lowStockThreshold: LOW_STOCK_THRESHOLD,
    });
  } catch (error) {
    console.error('Inventory overview error:', error);
    res.status(500).json({ message: 'Failed to load inventory overview' });
  }
};

const getInventoryProducts = async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Only admins can view inventory products' });
    }

    const products = await prisma.product.findMany({
      where: { isRemoved: false },
      include: {
        farmer: { select: { id: true, name: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    const mapped = products.map((product) => ({
      ...product,
      _id: product.id,
      stockStatus: getStockStatus(product.stock),
      farmerName: product.farmer?.name,
    }));

    res.json(mapped);
  } catch (error) {
    console.error('Get inventory products error:', error);
    res.status(500).json({ message: 'Failed to load inventory list' });
  }
};

const getInventoryHistory = async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Only admins can view inventory history' });
    }

    const logs = await prisma.inventoryLog.findMany({
      include: {
        product: {
          include: {
            farmer: { select: { id: true, name: true } },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: 200,
    });

    res.json(logs.map((log) => ({
      ...log,
      _id: log.id,
      productName: log.product?.name,
      farmerName: log.product?.farmer?.name,
      productId: log.productId,
    })));
  } catch (error) {
    console.error('Get inventory history error:', error);
    res.status(500).json({ message: 'Failed to load inventory history' });
  }
};

const adjustInventoryStock = async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Only admins can adjust stock directly' });
    }

    const { newStock, reason } = req.body;
    const parsedStock = Number.parseInt(newStock, 10);
    if (!Number.isInteger(parsedStock) || parsedStock < 0 || parsedStock > 1000000) {
      return res.status(400).json({ message: 'New stock must be a valid number between 0 and 1000000' });
    }

    const cleanReason = typeof reason === 'string' ? reason.trim() : '';
    if (!cleanReason) {
      return res.status(400).json({ message: 'Reason is required' });
    }

    const product = await prisma.product.findUnique({ where: { id: req.params.id } });
    if (!product || product.isRemoved) {
      return res.status(404).json({ message: 'Product not found' });
    }

    const result = await prisma.$transaction(async (tx) => {
      const oldStock = product.stock;
      const updatedProduct = await tx.product.update({
        where: { id: product.id },
        data: { stock: parsedStock },
      });

      await tx.inventoryLog.create({
        data: {
          productId: product.id,
          oldStock,
          newStock: parsedStock,
          change: parsedStock - oldStock,
          reason: `manual_adjustment:${cleanReason}`.slice(0, 200),
        },
      });

      return updatedProduct;
    });

    res.json({
      message: 'Inventory adjusted successfully',
      product: { ...result, _id: result.id, stockStatus: getStockStatus(result.stock) },
    });
  } catch (error) {
    console.error('Adjust inventory stock error:', error);
    res.status(500).json({ message: 'Failed to adjust inventory stock' });
  }
};

module.exports = {
  LOW_STOCK_THRESHOLD,
  getStockStatus,
  createInventoryRequest,
  getMyInventoryRequests,
  getInventoryRequests,
  approveInventoryRequest,
  rejectInventoryRequest,
  getInventoryOverview,
  getInventoryProducts,
  getInventoryHistory,
  adjustInventoryStock,
};
