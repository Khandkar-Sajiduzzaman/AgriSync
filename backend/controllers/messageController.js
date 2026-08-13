const prisma = require('../config/db');

// SECURITY: Basic XSS sanitization helper
const sanitize = (str) => {
  if (typeof str !== 'string') return '';
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;');
};

const sendMessage = async (req, res) => {
  try {
    const { receiverId, content, productId, orderId } = req.body;
    const senderId = req.user.id;

    if (!receiverId || !content) {
      return res.status(400).json({ message: 'Receiver ID and content are required' });
    }

    // SECURITY: Block self-messaging
    if (receiverId === senderId) {
      return res.status(400).json({ message: 'Cannot message yourself' });
    }

    // SECURITY: Limit message length
    if (content.length > 2000) {
      return res.status(400).json({ message: 'Message too long (max 2000 characters)' });
    }

    // SECURITY: Verify receiver exists
    const receiver = await prisma.user.findUnique({ where: { id: receiverId } });
    if (!receiver) {
      return res.status(404).json({ message: 'Receiver not found' });
    }

    const message = await prisma.message.create({
      data: {
        senderId,
        receiverId,
        content: sanitize(content.trim()),
        productId: productId || null,
        orderId: orderId || null,
      },
      include: {
        sender: { select: { id: true, name: true, role: true } },
        receiver: { select: { id: true, name: true, role: true } },
      },
    });

    res.status(201).json(message);
  } catch (error) {
    console.error('Send message error:', error);
    res.status(500).json({ message: 'Failed to send message' });
  }
};

const getMessages = async (req, res) => {
  try {
    const { userId } = req.params;
    const myId = req.user.id;
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(50, Math.max(1, parseInt(req.query.limit) || 20));

    const messages = await prisma.message.findMany({
      where: {
        OR: [
          { senderId: myId, receiverId: userId },
          { senderId: userId, receiverId: myId },
        ],
      },
      orderBy: { createdAt: 'desc' }, // Newest first
      skip: (page - 1) * limit,
      take: limit,
    });

    // Mark received messages as read (only on first page)
    if (page === 1) {
      await prisma.message.updateMany({
        where: {
          senderId: userId,
          receiverId: myId,
          isRead: false,
        },
        data: { isRead: true },
      });
    }

    res.json(messages.reverse()); // Return oldest-first for chat display
  } catch (error) {
    console.error('Get messages error:', error);
    res.status(500).json({ message: 'Failed to fetch messages' });
  }
};

const getConversations = async (req, res) => {
  try {
    const myId = req.user.id;
    const limit = Math.min(50, Math.max(1, parseInt(req.query.limit) || 20));

    // SECURITY: Use distinct + take instead of loading ALL messages
    const recentMessages = await prisma.message.findMany({
      where: {
        OR: [{ senderId: myId }, { receiverId: myId }],
      },
      include: {
        sender: { select: { id: true, name: true, role: true, profileImage: true } },
        receiver: { select: { id: true, name: true, role: true, profileImage: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: 200, // Reasonable cap to prevent memory crash
    });

    const conversationsMap = new Map();

    recentMessages.forEach((msg) => {
      const partner = msg.senderId === myId ? msg.receiver : msg.sender;
      if (!conversationsMap.has(partner.id)) {
        conversationsMap.set(partner.id, {
          partner,
          lastMessage: msg,
          unreadCount: msg.receiverId === myId && !msg.isRead ? 1 : 0,
        });
      } else if (msg.receiverId === myId && !msg.isRead) {
        conversationsMap.get(partner.id).unreadCount += 1;
      }
    });

    res.json(Array.from(conversationsMap.values()).slice(0, limit));
  } catch (error) {
    console.error('Get conversations error:', error);
    res.status(500).json({ message: 'Failed to fetch conversations' });
  }
};

module.exports = {
  sendMessage,
  getMessages,
  getConversations,
};