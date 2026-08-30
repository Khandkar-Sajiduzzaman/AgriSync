const prisma = require('../config/db');

const withId = (obj) => (obj ? { ...obj, _id: obj.id } : obj);

// ── Dashboard Stats ──
const getStats = async (req, res) => {
  try {
    const [
      totalUsers,
      totalFarmers,
      totalBuyers,
      totalDeliveryMen,
      totalProducts,
      pendingProducts,
      removedProducts,
      totalOrders,
      totalRevenueAgg,
    ] = await Promise.all([
      prisma.user.count(),
      prisma.user.count({ where: { role: 'farmer' } }),
      prisma.user.count({ where: { role: 'buyer' } }),
      prisma.user.count({ where: { role: 'delivery_man' } }),
      prisma.product.count(),
      prisma.product.count({ where: { isApproved: false, isRemoved: false } }),
      prisma.product.count({ where: { isRemoved: true } }),
      prisma.order.count(),
      prisma.order.aggregate({ _sum: { totalAmount: true } }),
    ]);

    res.json({
      totalUsers,
      totalFarmers,
      totalBuyers,
      totalDeliveryMen,
      totalProducts,
      pendingProducts,
      removedProducts,
      totalOrders,
      totalRevenue: totalRevenueAgg._sum.totalAmount?.toNumber() || 0,
    });
  } catch (error) {
    console.error('Get stats error:', error);
    res.status(500).json({ message: 'Failed to fetch stats' });
  }
};

// ── User Management ──
const getAllUsers = async (req, res) => {
  try {
    const { role, status, search, page = 1, limit = 20 } = req.query;
    const where = {};

    if (role) where.role = role;
    if (status) where.accountStatus = status;
    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
      ];
    }

    const [users, total] = await Promise.all([
      prisma.user.findMany({
        where,
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          accountStatus: true,
          phone: true,
          address: true,
          createdAt: true,
          updatedAt: true,
          farmerProfile: { select: { farmName: true, verificationStatus: true, averageRating: true } },
          buyerProfile: { select: { rewardPoints: true } },
          deliveryManProfile: { select: { vehicleType: true, isAvailable: true } },
          _count: { select: { products: true, ordersAsBuyer: true, ordersAsFarmer: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip: (parseInt(page) - 1) * parseInt(limit),
        take: parseInt(limit),
      }),
      prisma.user.count({ where }),
    ]);

    res.json({
      data: users.map((u) => ({
        ...withId(u),
        productsCount: u._count.products,
        ordersCount: u.role === 'buyer' ? u._count.ordersAsBuyer : u._count.ordersAsFarmer,
      })),
      total,
      page: parseInt(page),
      totalPages: Math.ceil(total / parseInt(limit)),
    });
  } catch (error) {
    console.error('Get all users error:', error);
    res.status(500).json({ message: 'Failed to fetch users' });
  }
};

const updateUserStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { accountStatus, reason } = req.body;

    if (!['active', 'suspended', 'deactivated'].includes(accountStatus)) {
      return res.status(400).json({ message: 'Invalid status' });
    }

    const user = await prisma.user.findUnique({ where: { id } });
    if (!user) return res.status(404).json({ message: 'User not found' });
    if (id === req.user.id) return res.status(403).json({ message: 'Cannot change your own status' });
    if (user.role === 'admin') return res.status(403).json({ message: 'Cannot modify another admin' });

    const updated = await prisma.$transaction(async (tx) => {
      const u = await tx.user.update({
        where: { id },
        data: { accountStatus },
        select: { id: true, name: true, email: true, role: true, accountStatus: true },
      });

      await tx.adminActionLog.create({
        data: {
          adminId: req.user.id,
          action: accountStatus === 'active' ? 'activate_user' : 'suspend_user',
          targetType: 'user',
          targetId: id,
          reason: reason || `Status changed to ${accountStatus}`,
        },
      });

      return u;
    });

    res.json({ message: `User status updated to ${accountStatus}`, user: withId(updated) });
  } catch (error) {
    console.error('Update user status error:', error);
    res.status(500).json({ message: 'Failed to update user status' });
  }
};

// ── Product Moderation ──
const getAllProductsAdmin = async (req, res) => {
  try {
    const { status, search, page = 1, limit = 20 } = req.query;
    const where = {};

    if (status === 'pending') {
      where.isApproved = false;
      where.isRemoved = false;
    } else if (status === 'approved') {
      where.isApproved = true;
      where.isRemoved = false;
    } else if (status === 'removed') {
      where.isRemoved = true;
    }

    if (search) where.name = { contains: search, mode: 'insensitive' };

    const [products, total] = await Promise.all([
      prisma.product.findMany({
        where,
        include: { farmer: { select: { id: true, name: true, email: true } } },
        orderBy: { createdAt: 'desc' },
        skip: (parseInt(page) - 1) * parseInt(limit),
        take: parseInt(limit),
      }),
      prisma.product.count({ where }),
    ]);

    res.json({
      data: products.map((p) => ({
        ...withId(p),
        price: p.price?.toNumber ? p.price.toNumber() : p.price,
        farmer: withId(p.farmer),
      })),
      total,
      page: parseInt(page),
      totalPages: Math.ceil(total / parseInt(limit)),
    });
  } catch (error) {
    console.error('Get all products admin error:', error);
    res.status(500).json({ message: 'Failed to fetch products' });
  }
};

const getPendingProducts = async (req, res) => {
  try {
    const { page = 1, limit = 20 } = req.query;
    const where = { isApproved: false, isRemoved: false };

    const [products, total] = await Promise.all([
      prisma.product.findMany({
        where,
        include: { farmer: { select: { id: true, name: true, email: true, phone: true } } },
        orderBy: { createdAt: 'desc' },
        skip: (parseInt(page) - 1) * parseInt(limit),
        take: parseInt(limit),
      }),
      prisma.product.count({ where }),
    ]);

    res.json({
      data: products.map((p) => ({
        ...withId(p),
        price: p.price?.toNumber ? p.price.toNumber() : p.price,
        farmer: withId(p.farmer),
      })),
      total,
      page: parseInt(page),
      totalPages: Math.ceil(total / parseInt(limit)),
    });
  } catch (error) {
    console.error('Get pending products error:', error);
    res.status(500).json({ message: 'Failed to fetch pending products' });
  }
};

const approveProduct = async (req, res) => {
  try {
    const { id } = req.params;
    const product = await prisma.product.findUnique({ where: { id } });
    if (!product) return res.status(404).json({ message: 'Product not found' });

    const updated = await prisma.$transaction(async (tx) => {
      const p = await tx.product.update({
        where: { id },
        data: { isApproved: true, approvedAt: new Date(), approvedBy: req.user.id },
      });
      await tx.adminActionLog.create({
        data: {
          adminId: req.user.id,
          action: 'approve_product',
          targetType: 'product',
          targetId: id,
          reason: 'Product approved by admin',
        },
      });
      return p;
    });

    res.json({ message: 'Product approved', product: withId(updated) });
  } catch (error) {
    console.error('Approve product error:', error);
    res.status(500).json({ message: 'Failed to approve product' });
  }
};

const removeProduct = async (req, res) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;
    if (!reason || reason.trim().length < 5) {
      return res.status(400).json({ message: 'Removal reason required (min 5 chars)' });
    }

    const product = await prisma.product.findUnique({ where: { id } });
    if (!product) return res.status(404).json({ message: 'Product not found' });

    const updated = await prisma.$transaction(async (tx) => {
      const p = await tx.product.update({
        where: { id },
        data: { isRemoved: true, removalReason: reason.trim() },
      });
      await tx.adminActionLog.create({
        data: {
          adminId: req.user.id,
          action: 'remove_product',
          targetType: 'product',
          targetId: id,
          reason: reason.trim(),
        },
      });
      return p;
    });

    res.json({ message: 'Product removed', product: withId(updated) });
  } catch (error) {
    console.error('Remove product error:', error);
    res.status(500).json({ message: 'Failed to remove product' });
  }
};

const restoreProduct = async (req, res) => {
  try {
    const { id } = req.params;
    const product = await prisma.product.findUnique({ where: { id } });
    if (!product) return res.status(404).json({ message: 'Product not found' });

    const updated = await prisma.$transaction(async (tx) => {
      const p = await tx.product.update({
        where: { id },
        data: { isRemoved: false, removalReason: null },
      });
      await tx.adminActionLog.create({
        data: {
          adminId: req.user.id,
          action: 'restore_product',
          targetType: 'product',
          targetId: id,
          reason: 'Product restored by admin',
        },
      });
      return p;
    });

    res.json({ message: 'Product restored', product: withId(updated) });
  } catch (error) {
    console.error('Restore product error:', error);
    res.status(500).json({ message: 'Failed to restore product' });
  }
};

// ── Action Logs ──
const getActionLogs = async (req, res) => {
  try {
    const { page = 1, limit = 50 } = req.query;
    const [logs, total] = await Promise.all([
      prisma.adminActionLog.findMany({
        include: { admin: { select: { id: true, name: true, email: true } } },
        orderBy: { createdAt: 'desc' },
        skip: (parseInt(page) - 1) * parseInt(limit),
        take: parseInt(limit),
      }),
      prisma.adminActionLog.count(),
    ]);

    res.json({
      data: logs.map((l) => ({ ...withId(l), admin: withId(l.admin) })),
      total,
      page: parseInt(page),
      totalPages: Math.ceil(total / parseInt(limit)),
    });
  } catch (error) {
    console.error('Get action logs error:', error);
    res.status(500).json({ message: 'Failed to fetch action logs' });
  }
};

const generateSalesReport = async (req, res) => {
  try {
    const { title, period, startDate, endDate } = req.body;

    if (!title || !period || !startDate || !endDate) {
      return res.status(400).json({ message: "Title, period, startDate, and endDate are required" });
    }

    const start = new Date(startDate);
    const end = new Date(endDate);
    end.setHours(23, 59, 59, 999);

    if (isNaN(start.getTime()) || isNaN(end.getTime()) || end < start) {
      return res.status(400).json({ message: "Invalid date range" });
    }

    // Query non-cancelled orders within the time window
    const orders = await prisma.order.findMany({
      where: {
        createdAt: { gte: start, lte: end },
        status: { notIn: ["cancelled", "refunded"] },
      },
      include: {
        buyer: { select: { id: true, name: true, email: true } },
        farmer: { select: { id: true, name: true, email: true } },
        items: {
          include: {
            product: { select: { id: true, name: true, legacyCategory: true } },
          },
        },
      },
    });

    const totalOrders = orders.length;
    let totalSalesUnits = 0;
    let totalRevenue = 0;
    const categoryBreakdown = {};
    const topProductsMap = {};

    orders.forEach((order) => {
      totalRevenue += order.totalAmount ? Number(order.totalAmount) : 0;

      order.items.forEach((item) => {
        totalSalesUnits += item.quantity;

        // Group by category
        const cat = item.product?.legacyCategory || "Uncategorized";
        const itemRevenue = item.total ? Number(item.total) : 0;
        if (!categoryBreakdown[cat]) {
          categoryBreakdown[cat] = { units: 0, revenue: 0 };
        }
        categoryBreakdown[cat].units += item.quantity;
        categoryBreakdown[cat].revenue += itemRevenue;

        // Group by product
        const prodName = item.productName || item.product?.name || "Unknown Product";
        if (!topProductsMap[prodName]) {
          topProductsMap[prodName] = { units: 0, revenue: 0 };
        }
        topProductsMap[prodName].units += item.quantity;
        topProductsMap[prodName].revenue += itemRevenue;
      });
    });

    const reportData = {
      startDate: start.toISOString(),
      endDate: end.toISOString(),
      generatedAt: new Date().toISOString(),
      categoryBreakdown,
      topProducts: Object.entries(topProductsMap)
        .map(([name, stats]) => ({ name, ...stats }))
        .sort((a, b) => b.revenue - a.revenue)
        .slice(0, 10),
    };

    const newReport = await prisma.salesReport.create({
      data: {
        adminId: req.user.id,
        title: title.trim(),
        period: period.trim(),
        totalOrders,
        totalSales: totalSalesUnits,
        totalRevenue: parseFloat(totalRevenue.toFixed(2)),
        data: reportData,
      },
      include: {
        admin: { select: { id: true, name: true, email: true } },
      },
    });

    res.status(201).json(newReport);
  } catch (error) {
    console.error("Generate sales report error:", error);
    res.status(500).json({ message: "Failed to generate sales report" });
  }
};

// Retrieve all generated sales reports
const getSalesReports = async (req, res) => {
  try {
    const { page = 1, limit = 20 } = req.query;
    const [reports, total] = await Promise.all([
      prisma.salesReport.findMany({
        include: { admin: { select: { id: true, name: true } } },
        orderBy: { createdAt: "desc" },
        skip: (parseInt(page) - 1) * parseInt(limit),
        take: parseInt(limit),
      }),
      prisma.salesReport.count(),
    ]);

    res.json({
      data: reports.map((r) => ({
        ...r,
        _id: r.id,
        totalRevenue: r.totalRevenue?.toNumber ? r.totalRevenue.toNumber() : Number(r.totalRevenue),
      })),
      total,
      page: parseInt(page),
      totalPages: Math.ceil(total / parseInt(limit)),
    });
  } catch (error) {
    console.error("Get sales reports error:", error);
    res.status(500).json({ message: "Failed to fetch sales reports" });
  }
};

// Retrieve single sales report by ID
const getSalesReportById = async (req, res) => {
  try {
    const report = await prisma.salesReport.findUnique({
      where: { id: req.params.id },
      include: { admin: { select: { id: true, name: true, email: true } } },
    });

    if (!report) {
      return res.status(404).json({ message: "Sales report not found" });
    }

    res.json({
      ...report,
      _id: report.id,
      totalRevenue: report.totalRevenue?.toNumber ? report.totalRevenue.toNumber() : Number(report.totalRevenue),
    });
  } catch (error) {
    console.error("Get sales report by ID error:", error);
    res.status(500).json({ message: "Failed to fetch sales report" });
  }
};

module.exports = {
  getStats,
  getAllUsers,
  updateUserStatus,
  getAllProductsAdmin,
  getPendingProducts,
  approveProduct,
  removeProduct,
  restoreProduct,
  getActionLogs,
  generateSalesReport,
  getSalesReports,
  getSalesReportById,
};