const prisma = require('../config/db');

// =============================================================================
// FRAUD DETECTION ENGINE
// =============================================================================
// This helper analyzes a review across multiple dimensions and returns:
//   - fraudScore: 0.0 to 1.0 (higher = more suspicious)
//   - fraudReasons: array of string codes explaining WHY
//   - isFlagged: true if score exceeds threshold (0.6)
// =============================================================================

const analyzeFraud = async (rating, comment, authorId, productId) => {
  let fraudScore = 0.0;
  const fraudReasons = [];

  // --- Rule 1: Extreme Rating Bias ---
  // Ratings of 1 or 5 are more commonly abused (extreme opinions)
  if (rating === 1 || rating === 5) {
    fraudScore += 0.25;
    fraudReasons.push('extreme_rating');
  }

  // --- Rule 2: Short or Missing Comment ---
  // Genuine reviews usually have meaningful text
  if (!comment || comment.trim().length === 0) {
    fraudScore += 0.30;
    fraudReasons.push('missing_comment');
  } else if (comment.trim().length < 15) {
    fraudScore += 0.20;
    fraudReasons.push('short_comment');
  }

  // --- Rule 3: Duplicate Content Detection ---
  // Check if this buyer has used the EXACT same comment on another review
  if (comment && comment.trim().length > 5) {
    const trimmedComment = comment.trim().toLowerCase();
    const duplicateReview = await prisma.review.findFirst({
      where: {
        authorId,
        id: { not: undefined }, // exclude self (for updates, not needed for create)
        comment: { equals: trimmedComment, mode: 'insensitive' },
      },
    });
    if (duplicateReview) {
      fraudScore += 0.35;
      fraudReasons.push('duplicate_content');
    }
  }

  // --- Rule 4: Rapid Review Detection (Bot Pattern) ---
  // If buyer posted another review in the last 10 minutes, flag as suspicious
  const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000);
  const recentReview = await prisma.review.findFirst({
    where: {
      authorId,
      createdAt: { gte: tenMinutesAgo },
    },
  });
  if (recentReview) {
    fraudScore += 0.25;
    fraudReasons.push('rapid_reviews');
  }

  // --- Rule 5: Rating-Comment Mismatch ---
  // 5-star with negative words, or 1-star with overly positive words
  if (comment) {
    const lowerComment = comment.toLowerCase();
    const negativeWords = ['bad', 'terrible', 'worst', 'hate', 'awful', 'poor', 'disappointing'];
    const positiveWords = ['excellent', 'amazing', 'love', 'perfect', 'best', 'great', 'fantastic'];
    
    if (rating === 5 && negativeWords.some(w => lowerComment.includes(w))) {
      fraudScore += 0.30;
      fraudReasons.push('rating_comment_mismatch');
    }
    if (rating === 1 && positiveWords.some(w => lowerComment.includes(w))) {
      fraudScore += 0.30;
      fraudReasons.push('rating_comment_mismatch');
    }
  }

  // --- Rule 6: Generic/Bot-like Comment Patterns ---
  const genericPatterns = [
    'good product', 'nice product', 'great product', 'best product',
    'very good', 'very nice', 'ok ok', 'not bad', 'satisfied',
  ];
  if (comment && genericPatterns.some(p => comment.toLowerCase().includes(p))) {
    fraudScore += 0.15;
    fraudReasons.push('generic_comment');
  }

  // Cap score at 1.0
  fraudScore = Math.min(fraudScore, 1.0);

  // Flag if score exceeds threshold
  const isFlagged = fraudScore >= 0.60;

  return {
    fraudScore: parseFloat(fraudScore.toFixed(2)),
    fraudReasons,
    isFlagged,
  };
};

// Helper: shape review for frontend compatibility (adds _id aliases)
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
// Only counts APPROVED or non-flagged reviews
const recalculateRatings = async (productId, farmerId) => {
  const productReviews = await prisma.review.findMany({
    where: {
      productId,
      OR: [
        { isFlagged: false },
        { moderationStatus: 'approved' },
      ],
    },
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

// =============================================================================
// CONTROLLER FUNCTIONS
// =============================================================================

// POST /api/reviews — Create a new review
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

    // Verify the buyer actually purchased and received this product
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

    // Check if already reviewed this product for this order
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

    // Run fraud detection
    const fraudAnalysis = await analyzeFraud(rating, comment, req.user.id, productId);

    const review = await prisma.review.create({
      data: {
        rating,
        comment: comment || null,
        authorId: req.user.id,
        productId,
        orderId,
        isVerifiedPurchase: true,
        isFlagged: fraudAnalysis.isFlagged,
        fraudScore: fraudAnalysis.fraudScore,
        fraudReasons: fraudAnalysis.fraudReasons,
        moderationStatus: fraudAnalysis.isFlagged ? 'pending' : 'approved',
      },
      include: {
        author: { select: { id: true, name: true, profileImage: true } },
        product: { select: { id: true, name: true, farmerId: true } },
        order: { select: { id: true, orderNumber: true } },
      },
    });

    await recalculateRatings(productId, order.farmerId);

    res.status(201).json({
      ...shapeReview(review),
      fraudWarning: fraudAnalysis.isFlagged
        ? 'Your review has been flagged for moderation and will be visible after admin approval.'
        : undefined,
    });
  } catch (error) {
    console.error('Create review error:', error);
    res.status(500).json({ message: error.message });
  }
};

// GET /api/reviews/product/:productId — Get reviews for a product
const getProductReviews = async (req, res) => {
  try {
    const { productId } = req.params;
    const { sort = 'newest' } = req.query;

    let orderBy = { createdAt: 'desc' };
    if (sort === 'highest') orderBy = { rating: 'desc' };
    if (sort === 'lowest') orderBy = { rating: 'asc' };
    if (sort === 'oldest') orderBy = { createdAt: 'asc' };

    // Only show approved reviews to public
    // Flagged reviews with pending moderation are HIDDEN
    const reviews = await prisma.review.findMany({
      where: {
        productId,
        OR: [
          { isFlagged: false },
          { moderationStatus: 'approved' },
        ],
      },
      include: {
        author: { select: { id: true, name: true, profileImage: true } },
        order: { select: { id: true, orderNumber: true } },
      },
      orderBy,
    });

    const distribution = await prisma.review.groupBy({
      by: ['rating'],
      where: {
        productId,
        OR: [
          { isFlagged: false },
          { moderationStatus: 'approved' },
        ],
      },
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

// GET /api/reviews/my — Get my reviews
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

// DELETE /api/reviews/:id — Delete a review
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

// GET /api/reviews/can-review/:productId — Check if buyer can review
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

// =============================================================================
// ADMIN ENDPOINTS (Fraud Moderation)
// =============================================================================

// GET /api/reviews/flagged — Get all flagged reviews for admin moderation
const getFlaggedReviews = async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Admin access required' });
    }

    const { status = 'pending' } = req.query;

    // Build where clause based on tab
    const where = {
      moderationStatus: status,
    };

    if (status === 'pending') {
      // Pending tab: only show currently flagged reviews
      where.isFlagged = true;
    } else {
      // Approved/Rejected tabs: show reviews that were flagged AND moderated
      // (has fraudScore or was moderated by an admin)
      where.OR = [
        { fraudScore: { not: null } },
        { moderatedById: { not: null } },
      ];
    }

    const reviews = await prisma.review.findMany({
      where,
      include: {
        author: { select: { id: true, name: true, email: true } },
        product: { select: { id: true, name: true, images: true, farmerId: true } },
        order: { select: { id: true, orderNumber: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    res.json(reviews.map(shapeReview));
  } catch (error) {
    console.error('Get flagged reviews error:', error);
    res.status(500).json({ message: error.message });
  }
};

// PATCH /api/reviews/:id/moderate — Admin approves or rejects a flagged review
const moderateReview = async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Admin access required' });
    }

    const { id } = req.params;
    const { action, note } = req.body; // action: 'approve' or 'reject'

    if (!['approve', 'reject'].includes(action)) {
      return res.status(400).json({ message: 'Action must be "approve" or "reject"' });
    }

    const review = await prisma.review.findUnique({
      where: { id },
      include: { product: { select: { farmerId: true } } },
    });

    if (!review) return res.status(404).json({ message: 'Review not found' });
    if (!review.isFlagged) {
      return res.status(400).json({ message: 'Only flagged reviews can be moderated' });
    }

    const updated = await prisma.review.update({
      where: { id },
      data: {
        moderationStatus: action === 'approve' ? 'approved' : 'rejected',
        moderatedById: req.user.id,
        moderatedAt: new Date(),
        moderationNote: note || null,
        // If rejected, keep isFlagged true but hide it from public
        // If approved, unflag it so it shows publicly
        isFlagged: action === 'reject',
      },
      include: {
        author: { select: { id: true, name: true } },
        product: { select: { id: true, name: true, farmerId: true } },
      },
    });

    // Recalculate ratings since visibility changed
    await recalculateRatings(review.productId, review.product.farmerId);

    res.json({
      message: `Review ${action === 'approve' ? 'approved' : 'rejected'} successfully`,
      review: shapeReview(updated),
    });
  } catch (error) {
    console.error('Moderate review error:', error);
    res.status(500).json({ message: error.message });
  }
};

// GET /api/reviews/stats — Fraud statistics for admin dashboard
const getReviewStats = async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Admin access required' });
    }

    const totalReviews = await prisma.review.count();
    const flaggedReviews = await prisma.review.count({ where: { isFlagged: true } });
    const pendingModeration = await prisma.review.count({
      where: { isFlagged: true, moderationStatus: 'pending' },
    });
    const approvedAfterFlag = await prisma.review.count({
      where: { moderationStatus: 'approved' },
    });
    const rejectedReviews = await prisma.review.count({
      where: { moderationStatus: 'rejected' },
    });

    // Top fraud reasons
    const allFlagged = await prisma.review.findMany({
      where: { isFlagged: true },
      select: { fraudReasons: true },
    });
    const reasonCounts = {};
    allFlagged.forEach((r) => {
      (r.fraudReasons || []).forEach((reason) => {
        reasonCounts[reason] = (reasonCounts[reason] || 0) + 1;
      });
    });

    res.json({
      totalReviews,
      flaggedReviews,
      pendingModeration,
      approvedAfterFlag,
      rejectedReviews,
      flagRate: totalReviews > 0 ? ((flaggedReviews / totalReviews) * 100).toFixed(2) : 0,
      topFraudReasons: Object.entries(reasonCounts)
        .sort((a, b) => b[1] - a[1])
        .map(([reason, count]) => ({ reason, count })),
    });
  } catch (error) {
    console.error('Get review stats error:', error);
    res.status(500).json({ message: error.message });
  }
};

module.exports = {
  createReview,
  getProductReviews,
  getMyReviews,
  deleteReview,
  canReviewProduct,
  getFlaggedReviews,
  moderateReview,
  getReviewStats,
};