const prisma = require('../config/db');

const shapeOffer = (offer) => ({
  ...offer,
  _id: offer.id,
  discountAmount: offer.discountAmount?.toNumber ? offer.discountAmount.toNumber() : offer.discountAmount,
  minOrderAmount: offer.minOrderAmount?.toNumber ? offer.minOrderAmount.toNumber() : offer.minOrderAmount,
  productName: offer.product?.name,
  farmerName: offer.farmer?.name,
  reviewerName: offer.reviewedBy?.name,
});

const offerInclude = {
  product: { select: { id: true, name: true, farmerId: true } },
  farmer: { select: { id: true, name: true, email: true } },
  reviewedBy: { select: { id: true, name: true } },
};

const validateOffer = ({ title, description, discountPercent, discountAmount, minOrderAmount, startDate, endDate }) => {
  if (!title || title.trim().length < 2 || title.trim().length > 200) return 'Title must be 2-200 characters';
  if (!description || !description.trim()) return 'Description is required';
  const percent = discountPercent === '' || discountPercent === null || discountPercent === undefined ? null : Number(discountPercent);
  const amount = discountAmount === '' || discountAmount === null || discountAmount === undefined ? null : Number(discountAmount);
  const minimum = minOrderAmount === '' || minOrderAmount === null || minOrderAmount === undefined ? null : Number(minOrderAmount);
  if (percent === null && amount === null) return 'Provide a percentage or fixed discount';
  if (percent !== null && (!Number.isFinite(percent) || percent <= 0 || percent > 100)) return 'Discount percentage must be between 1 and 100';
  if (amount !== null && (!Number.isFinite(amount) || amount <= 0)) return 'Discount amount must be greater than 0';
  if (minimum !== null && (!Number.isFinite(minimum) || minimum < 0)) return 'Minimum order amount must be 0 or greater';
  const start = new Date(startDate);
  const end = new Date(endDate);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || end <= start) return 'End date must be after the start date';
  return null;
};

const createOffer = async (req, res) => {
  try {
    if (req.user.role !== 'farmer') return res.status(403).json({ message: 'Only farmers can submit offer requests' });
    const { productId, title, description, discountPercent, discountAmount, minOrderAmount, startDate, endDate } = req.body;
    const validationError = validateOffer(req.body);
    if (!productId) return res.status(400).json({ message: 'Product is required' });
    if (validationError) return res.status(400).json({ message: validationError });
    const product = await prisma.product.findUnique({ where: { id: productId }, select: { id: true, name: true, farmerId: true, isRemoved: true } });
    if (!product || product.isRemoved) return res.status(404).json({ message: 'Product not found' });
    if (product.farmerId !== req.user.id) return res.status(403).json({ message: 'You can only request offers for your own products' });
    const offer = await prisma.promotion.create({
      data: {
        farmerId: req.user.id, productId, title: title.trim(), description: description.trim(),
        discountPercent: discountPercent === '' || discountPercent == null ? null : Number(discountPercent),
        discountAmount: discountAmount === '' || discountAmount == null ? null : Number(discountAmount),
        minOrderAmount: minOrderAmount === '' || minOrderAmount == null ? null : Number(minOrderAmount),
        startDate: new Date(startDate), endDate: new Date(endDate),
      },
      include: offerInclude,
    });
    res.status(201).json(shapeOffer(offer));
  } catch (error) {
    console.error('Create offer request error:', error);
    res.status(500).json({ message: 'Failed to submit offer request' });
  }
};

const getMyOffers = async (req, res) => {
  try {
    if (req.user.role !== 'farmer') return res.status(403).json({ message: 'Only farmers can view their offer requests' });
    const offers = await prisma.promotion.findMany({ where: { farmerId: req.user.id }, include: offerInclude, orderBy: { createdAt: 'desc' } });
    res.json(offers.map(shapeOffer));
  } catch (error) { res.status(500).json({ message: 'Failed to load offer requests' }); }
};

const getOffers = async (req, res) => {
  try {
    if (req.user.role !== 'admin') return res.status(403).json({ message: 'Only admins can view offer requests' });
    const offers = await prisma.promotion.findMany({ where: req.query.status ? { status: req.query.status } : {}, include: offerInclude, orderBy: { createdAt: 'desc' } });
    res.json(offers.map(shapeOffer));
  } catch (error) { res.status(500).json({ message: 'Failed to load offer requests' }); }
};

const getActiveOffers = async (req, res) => {
  try {
    if (req.user.role !== 'buyer') return res.status(403).json({ message: 'Only buyers can view active offers' });
    const now = new Date();
    const offers = await prisma.promotion.findMany({
      where: {
        status: 'APPROVED',
        isActive: true,
        startDate: { lte: now },
        endDate: { gte: now },
        productPromotions: { some: {} },
      },
      include: {
        productPromotions: {
          include: { product: { select: { id: true, name: true, images: true } } },
        },
      },
      orderBy: { endDate: 'asc' },
    });

    const result = offers.flatMap((offer) => offer.productPromotions.map(({ product }) => ({
      ...offer,
      _id: offer.id,
      product: { ...product, _id: product.id },
      discountAmount: offer.discountAmount?.toNumber ? offer.discountAmount.toNumber() : offer.discountAmount,
      minOrderAmount: offer.minOrderAmount?.toNumber ? offer.minOrderAmount.toNumber() : offer.minOrderAmount,
      productPromotions: undefined,
    })));
    res.json(result);
  } catch (error) {
    console.error('Get active offers error:', error);
    res.status(500).json({ message: 'Failed to load active offers' });
  }
};

const reviewOffer = async (req, res) => {
  try {
    if (req.user.role !== 'admin') return res.status(403).json({ message: 'Only admins can review offer requests' });
    const action = req.params.action;
    if (!['approve', 'reject'].includes(action)) return res.status(400).json({ message: 'Invalid review action' });
    const existing = await prisma.promotion.findUnique({ where: { id: req.params.id } });
    if (!existing) return res.status(404).json({ message: 'Offer request not found' });
    if (existing.status !== 'PENDING') return res.status(409).json({ message: 'This request has already been processed' });
    const rejectionReason = typeof req.body?.rejectionReason === 'string' ? req.body.rejectionReason.trim() : '';
    if (action === 'reject' && !rejectionReason) return res.status(400).json({ message: 'A rejection reason is required' });
    const updated = await prisma.$transaction(async (tx) => {
      const offer = await tx.promotion.update({
        where: { id: existing.id },
        data: { status: action === 'approve' ? 'APPROVED' : 'REJECTED', isActive: action === 'approve', reviewedById: req.user.id, reviewedAt: new Date(), rejectionReason: action === 'reject' ? rejectionReason : null },
        include: offerInclude,
      });
      if (action === 'approve' && existing.productId) {
        await tx.productPromotion.upsert({ where: { productId_promotionId: { productId: existing.productId, promotionId: existing.id } }, create: { productId: existing.productId, promotionId: existing.id }, update: {} });
      }
      return offer;
    });
    res.json({ message: `Offer request ${action}d`, request: shapeOffer(updated) });
  } catch (error) {
    console.error('Review offer request error:', error);
    res.status(500).json({ message: 'Failed to review offer request' });
  }
};

module.exports = { createOffer, getMyOffers, getOffers, getActiveOffers, reviewOffer };