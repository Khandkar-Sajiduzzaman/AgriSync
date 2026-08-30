const prisma = require('../config/db');

// POST /api/negotiations
// Buyer creates a new offer
const createOffer = async (req, res) => {
  try {
    if (req.user.role !== 'buyer') {
      return res.status(403).json({ message: 'Only buyers can make offers' });
    }

    const { productId, offerPrice, message } = req.body;
    const buyerId = req.user.id;

    const product = await prisma.product.findUnique({ where: { id: productId } });
    if (!product || !product.isAvailable) {
      return res.status(404).json({ message: 'Product is not available' });
    }

    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);

    const negotiation = await prisma.negotiation.create({
      data: {
        productId,
        buyerId,
        farmerId: product.farmerId,
        offerPrice,
        status: 'pending',
        message: message || 'I would like to negotiate the price.',
        expiresAt,
        history: {
          create: [{
            senderId: buyerId,
            offerPrice,
            message: message || 'Initial offer from buyer.',
          }]
        }
      },
      include: { history: true, product: true }
    });

    res.status(201).json(negotiation);
  } catch (error) {
    console.error('Create offer error:', error);
    res.status(500).json({ message: 'Failed to submit offer' });
  }
};

// PUT /api/negotiations/:id/respond
// Farmer responds to a pending offer
const respondToOffer = async (req, res) => {
  try {
    if (req.user.role !== 'farmer') {
      return res.status(403).json({ message: 'Only farmers can respond to offers' });
    }

    const { id } = req.params;
    const { status, counterPrice, message } = req.body; 
    const farmerId = req.user.id;

    const negotiation = await prisma.negotiation.findUnique({ where: { id } });

    if (!negotiation) {
      return res.status(404).json({ message: 'Negotiation not found' });
    }

    if (negotiation.farmerId !== farmerId) {
      return res.status(403).json({ message: 'Not authorized for this negotiation' });
    }

    if (negotiation.status !== 'pending' && negotiation.status !== 'countered') {
      return res.status(400).json({ message: 'This negotiation is closed' });
    }

    const updateData = {
      status,
      message: message || `Offer ${status}`,
    };

    if (status === 'countered') {
      if (!counterPrice) return res.status(400).json({ message: 'Counter price is required' });
      updateData.counterPrice = counterPrice;
      updateData.expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); 
    }

    const updatedNegotiation = await prisma.negotiation.update({
      where: { id },
      data: {
        ...updateData,
        history: {
          create: [{
            senderId: farmerId,
            offerPrice: status === 'countered' ? counterPrice : negotiation.offerPrice,
            message: message || `Farmer ${status} the offer.`,
          }]
        }
      },
      include: { history: true, product: true }
    });

    res.json(updatedNegotiation);
  } catch (error) {
    console.error('Respond to offer error:', error);
    res.status(500).json({ message: 'Failed to process response' });
  }
};

// GET /api/negotiations
// Fetch negotiations for the logged-in user
const getMyNegotiations = async (req, res) => {
  try {
    const userId = req.user.id;
    const role = req.user.role;

    const where = role === 'buyer' ? { buyerId: userId } : { farmerId: userId };

    const negotiations = await prisma.negotiation.findMany({
      where,
      include: {
        product: { select: { id: true, name: true, images: true, price: true } },
        buyer: { select: { id: true, name: true } },
        farmer: { select: { id: true, name: true } },
        history: { orderBy: { createdAt: 'asc' } }
      },
      orderBy: { updatedAt: 'desc' }
    });

    res.json(negotiations);
  } catch (error) {
    console.error('Get negotiations error:', error);
    res.status(500).json({ message: 'Failed to load negotiations' });
  }
};

// Export everything at the bottom!
module.exports = { 
  createOffer, 
  respondToOffer, 
  getMyNegotiations 
};