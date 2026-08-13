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

// =============================================================================
// SPAM & HATE SPEECH CONFIG
// =============================================================================

// In-memory rate limit store (resets on server restart — good enough for demo)
const rateLimitStore = new Map(); // { userId: [timestamps] }
const lastMessageStore = new Map(); // { userId: { content, time } }

const SPAM_RULES = {
  maxMessagesPerMinute: 10,
  minSecondsBetweenMessages: 2,
  duplicateWindowSeconds: 30,
  maxMessageLength: 1000,
};

// Common profanity / hate speech words (English + Bengali)
// Add more words here as needed for your audience
const BANNED_WORDS = [
  // English slurs / hate
  'fuck', 'shit', 'bitch', 'asshole', 'bastard', 'damn', 'cunt', 'dick',
  'nigger', 'nigga', 'chink', 'paki', 'retard', 'fag', 'faggot', 'dyke',
  'whore', 'slut', 'kill yourself', 'kys', 'die', 'stupid', 'idiot', 'moron',
  // Bengali slurs / hate (common ones)
  'বোকাচোদা', 'মাদারচোদ', 'বোকা', 'খানকি', 'মাগি', 'হারামি', 'শালা',
  'শুয়োর', 'কুত্তা', 'বেইমান', 'চোদা', 'চুদি', 'বোকাচুদা',
];

const bannedRegex = new RegExp(
  '\\b(' + BANNED_WORDS.map(w => w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|') + ')\\b',
  'gi'
);

// =============================================================================
// HELPERS
// =============================================================================

function checkSpam(senderId, content) {
  const now = Date.now();

  // 1. Message too long
  if (content.length > SPAM_RULES.maxMessageLength) {
    return { blocked: true, reason: 'Message is too long (max 1000 characters).' };
  }

  // 2. Message too short / empty
  if (!content.trim()) {
    return { blocked: true, reason: 'Message cannot be empty.' };
  }

  // 3. Rate limit: max X messages per minute
  const userTimestamps = rateLimitStore.get(senderId) || [];
  const recentTimestamps = userTimestamps.filter(t => now - t < 60 * 1000);
  rateLimitStore.set(senderId, recentTimestamps);

  if (recentTimestamps.length >= SPAM_RULES.maxMessagesPerMinute) {
    return { blocked: true, reason: 'You are sending messages too fast. Please slow down.' };
  }

  // 4. Cooldown between messages
  const lastMsg = lastMessageStore.get(senderId);
  if (lastMsg && (now - lastMsg.time) < SPAM_RULES.minSecondsBetweenMessages * 1000) {
    return { blocked: true, reason: 'Please wait a moment before sending another message.' };
  }

  // 5. Duplicate detection
  if (lastMsg && lastMsg.content === content.trim() && (now - lastMsg.time) < SPAM_RULES.duplicateWindowSeconds * 1000) {
    return { blocked: true, reason: 'You just sent this message. Please do not repeat.' };
  }

  // 6. Hate speech / profanity filter
  const hasBannedWords = bannedRegex.test(content);
  if (hasBannedWords) {
    return { blocked: true, reason: 'Your message contains inappropriate language and was blocked.' };
  }

  // All clear — update stores
  recentTimestamps.push(now);
  rateLimitStore.set(senderId, recentTimestamps);
  lastMessageStore.set(senderId, { content: content.trim(), time: now });

  return { blocked: false };
}

// =============================================================================
// CONTROLLERS
// =============================================================================

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
    // Run spam & hate speech checks
    const spamCheck = checkSpam(senderId, content);
    if (spamCheck.blocked) {
      return res.status(429).json({ message: spamCheck.reason, blocked: true });
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
  }
 }
  catch (error) {
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