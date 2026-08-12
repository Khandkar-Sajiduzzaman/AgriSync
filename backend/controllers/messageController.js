const prisma = require('../config/db');

// Send a new message
const sendMessage = async (req, res) => {
  try {
    const { receiverId, content, productId, orderId } = req.body;
    const senderId = req.user.id;

    if (!receiverId || !content) {
      return res.status(400).json({ message: 'Receiver ID and content are required' });
    }

    const message = await prisma.message.create({
      data: {
        senderId,
        receiverId,
        content,
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
    res.status(500).json({ message: error.message });
  }
};

// Get chat history with a specific user
const getMessages = async (req, res) => {
  try {
    const { userId } = req.params;
    const myId = req.user.id;

    const messages = await prisma.message.findMany({
      where: {
        OR: [
          { senderId: myId, receiverId: userId },
          { senderId: userId, receiverId: myId },
        ],
      },
      orderBy: { createdAt: 'asc' },
    });

    // Mark received messages as read
    await prisma.message.updateMany({
      where: {
        senderId: userId,
        receiverId: myId,
        isRead: false,
      },
      data: { isRead: true },
    });

    res.json(messages);
  } catch (error) {
    console.error('Get messages error:', error);
    res.status(500).json({ message: error.message });
  }
};

// Get a list of all conversations for the current user
const getConversations = async (req, res) => {
  try {
    const myId = req.user.id;

    const allMessages = await prisma.message.findMany({
      where: {
        OR: [{ senderId: myId }, { receiverId: myId }],
      },
      include: {
        sender: { select: { id: true, name: true, role: true, profileImage: true } },
        receiver: { select: { id: true, name: true, role: true, profileImage: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    // Deduplicate to get the latest message per conversation partner
    const conversationsMap = new Map();

    allMessages.forEach((msg) => {
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

    res.json(Array.from(conversationsMap.values()));
  } catch (error) {
    console.error('Get conversations error:', error);
    res.status(500).json({ message: error.message });
  }
};

module.exports = {
  sendMessage,
  getMessages,
  getConversations,
};