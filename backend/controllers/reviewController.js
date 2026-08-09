const prisma = require('../config/db');

// Helper: shape review for frontend compatibility
const shapeReview = (review) => {
  if (!review) return review;
  return {
    ...review,
    _id: review.id,
    author: review.author ? { ...review.author, _id: review.author.id } : review.author,
    product: review.product ? { ...review.product, _id: review.product.id } : review.product,
    order: review.order ? { ...review.order, _id: review.order.id } : review.order,
  };
};

// Helper: recalculate product & farmer ratings
const recalculateRatings = async (productId, farmerId) => {
  const productReviews = await prisma.review.findMany({
    where: { productId, isFlagged: false },
  });

  const productAvg =
    productReviews.length > 0
      ? productReviews.reduce((sum, r) => sum + r.rating, 0) / productReviews.length
      : 0;

  await prisma.product.update({
    where: { id: productId },
    data: {
      averageRating: parseFloat(productAvg.toFixed(2)),
      totalReviews: productReviews.length,
    },
  });

  const farmerProducts = await prisma.product.findMany({
    where: { farmerId },
    select: { averageRating: true, totalReviews: true },
  });

  const totalReviews = farmerProducts.reduce((sum, p) => sum + p.totalReviews, 0);
  const weightedSum = farmerProducts.reduce(
    (sum, p) => sum + p.averageRating * p.totalReviews,
    0
  );
  const farmerAvg = totalReviews > 0 ? weightedSum / totalReviews : 0;

  await prisma.farmerProfile.update({
    where: { userId: farmerId },
    data: {
      averageRating: parseFloat(farmerAvg.toFixed(2)),
      totalReviews: totalReviews,
    },
  });
};

const createReview = async (req, res) => {
  try {
    if (req.user.role !== 'buyer') {
      return res.status(403).json({ message: 'Only buyers can leave reviews' });
    }

    const { productId, orderId, rating, comment } = req.body;

    if (!productId || !orderId || !rating) {
      return res.status(400).json({ message: 'Product ID, Order ID, and rating are required' });
    }

    if (rating < 1 || rating > 5) {
      return res.status(400).json({ message: 'Rating must be between 1 and 5' });
    }

    const order = await prisma.order.findFirst({
      where: {
        id: orderId,
        buyerId: req.user.id,
        status: 'delivered',
        items: { some: { productId } },
      },
      include: { items: { where: { productId } } },
    });

    if (!order) {
      return res.status(403).json({
        message: 'You can only review products from delivered orders you have purchased',
      });
    }

    const existingReview = await prisma.review.findUnique({
      where: {
        authorId_productId_orderId: {
          authorId: req.user.id,
          productId,
          orderId,
        },
      },
    });

    if (existingReview) {
      return res.status(409).json({ message: 'You have already reviewed this product for this order' });
    }

    let fraudScore = 0;
    let isFlagged = false;

    if (rating === 1 || rating === 5) fraudScore += 0.3;
    if (comment && comment.length < 10) fraudScore += 0.3;
    if (!comment || comment.trim().length === 0) fraudScore += 0.2;
    if (fraudScore > 0.6) isFlagged = true;

    const review = await prisma.review.create({
      data: {
        rating,
        comment: comment || null,
        authorId: req.user.id,
        productId,
        orderId,
        isVerifiedPurchase: true,
        isFlagged,
        fraudScore: parseFloat(fraudScore.toFixed(2)),
      },
      include: {
        author: { select: { id: true, name: true, profileImage: true } },
        product: { select: { id: true, name: true, farmerId: true } },
        order: { select: { id: true, orderNumber: true } },
      },
    });

    await recalculateRatings(productId, order.farmerId);
    res.status(201).json(shapeReview(review));
  } catch (error) {
    console.error('Create review error:', error);
    res.status(500).json({ message: error.message });
  }
};

const getProductReviews = async (req, res) => {
  try {
    const { productId } = req.params;
    const { sort = 'newest' } = req.query;

    let orderBy = { createdAt: 'desc' };
    if (sort === 'highest') orderBy = { rating: 'desc' };
    if (sort === 'lowest') orderBy = { rating: 'asc' };
    if (sort === 'oldest') orderBy = { createdAt: 'asc' };

    const reviews = await prisma.review.findMany({
      where: { productId, isFlagged: false },
      include: {
        author: { select: { id: true, name: true, profileImage: true } },
        order: { select: { id: true, orderNumber: true } },
      },
      orderBy,
    });

    const distribution = await prisma.review.groupBy({
      by: ['rating'],
      where: { productId, isFlagged: false },
      _count: { rating: true },
    });

    const distMap = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
    distribution.forEach((d) => { distMap[d.rating] = d._count.rating; });

    const product = await prisma.product.findUnique({
      where: { id: productId },
      select: { averageRating: true, totalReviews: true },
    });

    res.json({
      reviews: reviews.map(shapeReview),
      averageRating: product?.averageRating || 0,
      totalReviews: product?.totalReviews || 0,
      distribution: distMap,
    });
  } catch (error) {
    console.error('Get product reviews error:', error);
    res.status(500).json({ message: error.message });
  }
};

const getMyReviews = async (req, res) => {
  try {
    const reviews = await prisma.review.findMany({
      where: { authorId: req.user.id },
      include: {
        product: { select: { id: true, name: true, images: true } },
        order: { select: { id: true, orderNumber: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
    res.json(reviews.map(shapeReview));
  } catch (error) {
    console.error('Get my reviews error:', error);
    res.status(500).json({ message: error.message });
  }
};

const deleteReview = async (req, res) => {
  try {
    const review = await prisma.review.findUnique({
      where: { id: req.params.id },
      include: { product: { select: { farmerId: true } } },
    });

    if (!review) return res.status(404).json({ message: 'Review not found' });
    if (review.authorId !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Not authorized to delete this review' });
    }

    await prisma.review.delete({ where: { id: req.params.id } });
    await recalculateRatings(review.productId, review.product.farmerId);
    res.json({ message: 'Review deleted successfully' });
  } catch (error) {
    console.error('Delete review error:', error);
    res.status(500).json({ message: error.message });
  }
};

const canReviewProduct = async (req, res) => {
  try {
    if (req.user.role !== 'buyer') return res.json({ canReview: false });

    const { productId } = req.params;
    const deliveredOrder = await prisma.order.findFirst({
      where: {
        buyerId: req.user.id,
        status: 'delivered',
        items: { some: { productId } },
      },
      select: { id: true, orderNumber: true },
    });

    const existingReview = await prisma.review.findFirst({
      where: { authorId: req.user.id, productId },
    });

    res.json({
      canReview: !!deliveredOrder && !existingReview,
      orderId: deliveredOrder?.id || null,
      hasReviewed: !!existingReview,
    });
  } catch (error) {
    console.error('Can review check error:', error);
    res.status(500).json({ message: error.message });
  }
};

module.exports = {
  createReview,
  getProductReviews,
  getMyReviews,
  deleteReview,
  canReviewProduct,
};