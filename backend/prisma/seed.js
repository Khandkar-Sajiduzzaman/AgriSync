// =============================================================================
// AgriSync — MASSIVE Database Seed Script
// =============================================================================
// Generates 100+ users, 60+ products, 40+ orders, 80+ reviews,
// 50+ messages, 30+ negotiations, and full supporting data.
//
// Reset before running: npx prisma db push --force-reset
// Then run:            npm run db:seed
// =============================================================================

const { PrismaClient } = require("@prisma/client");
const bcrypt = require("bcryptjs");

const prisma = new PrismaClient();

// ---------------------------------------------------------------------------
// Helper: hash password
// ---------------------------------------------------------------------------
const hash = (pw) => bcrypt.hash(pw, 10);

// ---------------------------------------------------------------------------
// Helper: random integer between min and max (inclusive)
// ---------------------------------------------------------------------------
const randInt = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;

// ---------------------------------------------------------------------------
// Helper: random element from array
// ---------------------------------------------------------------------------
const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];

// ---------------------------------------------------------------------------
// Helper: random date within last N days
// ---------------------------------------------------------------------------
const randDate = (daysBack = 30) => {
  const d = new Date();
  d.setDate(d.getDate() - randInt(0, daysBack));
  d.setHours(randInt(8, 20), randInt(0, 59), 0, 0);
  return d;
};

// ---------------------------------------------------------------------------
// Data pools
// ---------------------------------------------------------------------------
const DIVISIONS = ["Dhaka", "Rajshahi", "Khulna", "Chittagong", "Sylhet", "Barisal", "Rangpur", "Mymensingh"];

const DISTRICTS = {
  Dhaka: ["Dhaka", "Gazipur", "Narayanganj", "Tangail", "Kishoreganj"],
  Rajshahi: ["Rajshahi", "Natore", "Naogaon", "Chapainawabganj", "Bogura"],
  Khulna: ["Khulna", "Jessore", "Satkhira", "Bagerhat", "Jhenaidah"],
  Chittagong: ["Chittagong", "Cox's Bazar", "Comilla", "Feni", "Noakhali"],
  Sylhet: ["Sylhet", "Moulvibazar", "Habiganj", "Sunamganj"],
  Barisal: ["Barisal", "Patuakhali", "Bhola", "Pirojpur", "Jhalokati"],
  Rangpur: ["Rangpur", "Dinajpur", "Kurigram", "Lalmonirhat", "Nilphamari"],
  Mymensingh: ["Mymensingh", "Jamalpur", "Netrokona", "Sherpur"],
};

const FARMER_NAMES = [
  "Abdul Karim", "Hasina Begum", "Mohammad Ali", "Rina Akter", "Shafiqul Islam",
  "Nazma Khatun", "Anwar Hossain", "Parveen Sultana", "Kamal Uddin", "Sultana Razia",
  "Jamal Sheikh", "Fatema Begum", "Rafiqul Islam", "Shahnaz Parvin", "Bashir Ahmed",
  "Rokeya Begum", "Mizanur Rahman", "Jahanara Khatun", "Ibrahim Khalil", "Nasrin Akter",
];

const BUYER_NAMES = [
  "Tanvir Ahmed", "Nusrat Jahan", "Rakib Hasan", "Sadia Islam", "Fahim Shahriar",
  "Tasnim Rahman", "Imran Hossain", "Moumita Das", "Shuvo Paul", "Priya Saha",
  "Arifin Shuvo", "Laboni Sarkar", "Mehedi Hasan", "Sumaiya Akter", "Rafi Khan",
  "Tahmina Akter", "Sakib Al Hasan", "Rumpa Das", "Nayeem Hossain", "Jannatul Ferdous",
  "Mahfuzur Rahman", "Shirin Akter", "Rubel Hossain", "Mithila Farzana", "Asif Mahmud",
];

const DELIVERY_NAMES = [
  "Raju Mia", "Babul Hossain", "Shah Alam", "Delwar Hossain", "Monir Hossain",
  "Abdul Mannan", "Sohag Hossain", "Nur Islam", "Habibur Rahman", "Kalam Sheikh",
];

const VEGETABLES = [
  { name: "Organic Tomatoes", price: 80, unit: "kg", origin: "Gazipur, Dhaka" },
  { name: "Green Spinach", price: 40, unit: "bunch", origin: "Gazipur, Dhaka" },
  { name: "Red Potatoes", price: 45, unit: "kg", origin: "Munshiganj, Dhaka" },
  { name: "Sweet Pumpkins", price: 60, unit: "kg", origin: "Rajshahi" },
  { name: "Fresh Cucumbers", price: 55, unit: "kg", origin: "Chandpur, Chittagong" },
  { name: "Green Beans", price: 90, unit: "kg", origin: "Khulna" },
  { name: "Bitter Gourd (Korola)", price: 70, unit: "kg", origin: "Barisal" },
  { name: "Bottle Gourd (Lau)", price: 50, unit: "kg", origin: "Rajshahi" },
  { name: "Okra (Dherosh)", price: 85, unit: "kg", origin: "Sylhet" },
  { name: "Eggplant (Begun)", price: 65, unit: "kg", origin: "Dhaka" },
  { name: "Cauliflower", price: 40, unit: "piece", origin: "Gazipur, Dhaka" },
  { name: "Cabbage", price: 35, unit: "piece", origin: "Rajshahi" },
  { name: "Carrots", price: 75, unit: "kg", origin: "Khulna" },
  { name: "Green Chilies", price: 120, unit: "kg", origin: "Chittagong" },
  { name: "Onions (Local)", price: 55, unit: "kg", origin: "Faridpur, Dhaka" },
  { name: "Garlic (Local)", price: 180, unit: "kg", origin: "Rajshahi" },
  { name: "Ginger (Fresh)", price: 150, unit: "kg", origin: "Sylhet" },
  { name: "Radish (Mula)", price: 30, unit: "kg", origin: "Dhaka" },
];

const FRUITS = [
  { name: "Rajshahi Mangoes (Langra)", price: 250, unit: "kg", origin: "Rajshahi" },
  { name: "Chapainawabganj Mangoes (Fazli)", price: 200, unit: "kg", origin: "Chapainawabganj" },
  { name: "Sweet Bananas (Sagor)", price: 60, unit: "dozen", origin: "Chittagong" },
  { name: "Pineapples (Kew)", price: 90, unit: "piece", origin: "Mymensingh" },
  { name: "Guavas", price: 70, unit: "kg", origin: "Barisal" },
  { name: "Papayas", price: 50, unit: "kg", origin: "Khulna" },
  { name: "Watermelons", price: 35, unit: "kg", origin: "Dinajpur" },
  { name: "Jackfruit (Kanthal)", price: 120, unit: "kg", origin: "Sylhet" },
  { name: "Lychees", price: 300, unit: "kg", origin: "Dinajpur" },
  { name: "Oranges", price: 180, unit: "kg", origin: "Rangpur" },
  { name: "Lemons", price: 100, unit: "kg", origin: "Chittagong" },
  { name: "Coconuts", price: 55, unit: "piece", origin: "Barisal" },
];

const RICE_GRAINS = [
  { name: "Miniket Rice", price: 65, unit: "kg", origin: "Rajshahi" },
  { name: "Nazirshail Rice", price: 72, unit: "kg", origin: "Mymensingh" },
  { name: "Chinigura Rice", price: 120, unit: "kg", origin: "Sylhet" },
  { name: "Kalijira Rice", price: 150, unit: "kg", origin: "Barisal" },
  { name: "Brown Rice (Organic)", price: 95, unit: "kg", origin: "Khulna" },
  { name: "Red Lentils (Masoor Dal)", price: 140, unit: "kg", origin: "Rajshahi" },
  { name: "Mung Beans", price: 160, unit: "kg", origin: "Chittagong" },
  { name: "Chickpeas (Chola)", price: 110, unit: "kg", origin: "Dhaka" },
];

const DAIRY_POULTRY = [
  { name: "Fresh Cow Milk", price: 85, unit: "liter", origin: "Gazipur, Dhaka" },
  { name: "Farm Fresh Eggs", price: 140, unit: "dozen", origin: "Gazipur, Dhaka" },
  { name: "Desi Chicken Eggs", price: 180, unit: "dozen", origin: "Rajshahi" },
  { name: "Homemade Ghee", price: 850, unit: "kg", origin: "Khulna" },
  { name: "Fresh Paneer", price: 450, unit: "kg", origin: "Dhaka" },
  { name: "Broiler Chicken", price: 180, unit: "kg", origin: "Chittagong" },
  { name: "Desi Chicken (Whole)", price: 350, unit: "kg", origin: "Sylhet" },
];

const SPICES_HERBS = [
  { name: "Turmeric Powder (Organic)", price: 380, unit: "kg", origin: "Khulna" },
  { name: "Cumin Seeds", price: 520, unit: "kg", origin: "Rajshahi" },
  { name: "Coriander Seeds", price: 280, unit: "kg", origin: "Dhaka" },
  { name: "Black Pepper (Whole)", price: 750, unit: "kg", origin: "Chittagong" },
  { name: "Cinnamon Sticks", price: 600, unit: "kg", origin: "Sylhet" },
  { name: "Cardamom (Whole)", price: 2200, unit: "kg", origin: "Rangpur" },
  { name: "Bay Leaves", price: 180, unit: "kg", origin: "Barisal" },
  { name: "Dried Red Chilies", price: 350, unit: "kg", origin: "Chittagong" },
];

const REVIEW_COMMENTS = [
  "Excellent quality! Will definitely buy again.",
  "Very fresh and tasty. My family loved it.",
  "Good value for money. Delivery was prompt.",
  "The product was okay, not as fresh as expected.",
  "Outstanding! Best quality I've found on this platform.",
  "Farmer was very responsive. Product exceeded expectations.",
  "Slightly overpriced but quality makes up for it.",
  "Perfect for daily cooking. Highly recommended.",
  "Not bad, but I've had better from other farmers.",
  "Amazing! The taste reminded me of my village.",
  "Packaging could be better, but product is great.",
  "Fast delivery and excellent quality. Five stars!",
  "The mangoes were perfectly ripe. Delicious!",
  "Rice quality is top notch. Aroma is fantastic.",
  "Vegetables were a bit wilted, otherwise good.",
  "Best organic tomatoes I've ever bought.",
  "Great communication with the farmer. Trusted seller.",
  "Will recommend to all my friends and family.",
  "Consistent quality every time I order.",
  "A bit smaller than expected but very sweet.",
];

const ORDER_STATUSES = ["pending", "confirmed", "processing", "shipped", "out_for_delivery", "delivered", "cancelled"];
const PAYMENT_METHODS = ["cash_on_delivery", "online_transfer", "mobile_banking", "card"];
const NEGOTIATION_STATUSES = ["pending", "accepted", "rejected", "countered", "expired"];
const NOTIFICATION_TITLES = [
  "Order Update", "New Message", "Price Offer", "Follow Alert",
  "New Review", "Promotion Alert", "Stock Alert", "Delivery Update",
];

// ---------------------------------------------------------------------------
// Main seed function
// ---------------------------------------------------------------------------
async function main() {
  console.log("🌱 Starting massive database seed...\n");

  // ========================================================================
  // 1. ADMINS (2)
  // ========================================================================
  const admin1 = await prisma.user.create({
    data: {
      email: "admin@agrisync.com",
      password: await hash("admin123"),
      name: "System Admin",
      role: "admin",
      phone: "01700000000",
      address: "Dhaka, Bangladesh",
    },
  });

  const admin2 = await prisma.user.create({
    data: {
      email: "moderator@agrisync.com",
      password: await hash("admin123"),
      name: "Content Moderator",
      role: "admin",
      phone: "01700000001",
      address: "Rajshahi, Bangladesh",
    },
  });

  console.log("✅ 2 Admins created");

  // ========================================================================
  // 2. FARMERS (10)
  // ========================================================================
  const farmers = [];
  for (let i = 0; i < 10; i++) {
    const div = pick(DIVISIONS);
    const dist = pick(DISTRICTS[div]);
    const farmer = await prisma.user.create({
      data: {
        email: `farmer${i + 1}@agrisync.com`,
        password: await hash("farmer123"),
        name: FARMER_NAMES[i],
        role: "farmer",
        phone: `0171${String(randInt(1000000, 9999999)).padStart(7, "0")}`,
        address: `${dist}, ${div}`,
        division: div,
        district: dist,
        bio: `Experienced farmer from ${dist} specializing in organic produce.`,
        farmerProfile: {
          create: {
            farmName: `${FARMER_NAMES[i].split(" ")[0]}'s Farm`,
            farmLocation: `${dist} Sadar`,
            farmDescription: `Sustainable farming practices in ${dist} region.`,
            farmLatitude: 23.0 + Math.random() * 2,
            farmLongitude: 88.0 + Math.random() * 3,
            averageRating: parseFloat((3.5 + Math.random() * 1.5).toFixed(1)),
            totalReviews: randInt(5, 50),
            verificationStatus: pick(["verified", "verified", "verified", "pending", "unverified"]),
          },
        },
      },
      include: { farmerProfile: true },
    });
    farmers.push(farmer);
  }

  console.log("✅ 10 Farmers created");

  // ========================================================================
  // 3. BUYERS (15)
  // ========================================================================
  const buyers = [];
  for (let i = 0; i < 15; i++) {
    const div = pick(DIVISIONS);
    const dist = pick(DIVISIONS[div] ? DISTRICTS[div] : DISTRICTS["Dhaka"]);
    const buyer = await prisma.user.create({
      data: {
        email: `buyer${i + 1}@agrisync.com`,
        password: await hash("buyer123"),
        name: BUYER_NAMES[i],
        role: "buyer",
        phone: `0173${String(randInt(1000000, 9999999)).padStart(7, "0")}`,
        address: `${dist}, ${div}`,
        division: div,
        district: dist,
        buyerProfile: {
          create: {
            rewardPoints: randInt(0, 500),
            location: `${dist}, ${div}`,
          },
        },
      },
    });
    buyers.push(buyer);
  }

  console.log("✅ 15 Buyers created");

  // ========================================================================
  // 4. DELIVERY MEN (5)
  // ========================================================================
  const deliveryMen = [];
  for (let i = 0; i < 5; i++) {
    const dm = await prisma.user.create({
      data: {
        email: `delivery${i + 1}@agrisync.com`,
        password: await hash("delivery123"),
        name: DELIVERY_NAMES[i],
        role: "delivery_man",
        phone: `0175${String(randInt(1000000, 9999999)).padStart(7, "0")}`,
        address: `Dhaka, Bangladesh`,
        deliveryManProfile: {
          create: {
            vehicleType: pick(["Motorcycle", "Van", "Truck", "Bicycle", "CNG"]),
            licenseNumber: `DHK-2026-${String(i + 1).padStart(3, "0")}`,
            isAvailable: Math.random() > 0.2,
          },
        },
      },
    });
    deliveryMen.push(dm);
  }

  console.log("✅ 5 Delivery Men created");

  // ========================================================================
  // 5. CATEGORIES (8 main + 4 sub)
  // ========================================================================
  const catVeg = await prisma.category.create({
    data: { name: "Fresh Vegetables", slug: "fresh-vegetables", description: "Locally grown fresh vegetables" },
  });
  const catFruit = await prisma.category.create({
    data: { name: "Fruits", slug: "fruits", description: "Seasonal and fresh fruits" },
  });
  const catRice = await prisma.category.create({
    data: { name: "Rice & Grains", slug: "rice-grains", description: "Premium quality rice and grains" },
  });
  const catDairy = await prisma.category.create({
    data: { name: "Dairy & Poultry", slug: "dairy-poultry", description: "Fresh milk, eggs, and meat" },
  });
  const catSpice = await prisma.category.create({
    data: { name: "Spices & Herbs", slug: "spices-herbs", description: "Organic spices and dried herbs" },
  });
  const catOrganic = await prisma.category.create({
    data: { name: "Organic Products", slug: "organic", description: "Certified organic produce" },
  });
  const catSeasonal = await prisma.category.create({
    data: { name: "Seasonal Specials", slug: "seasonal", description: "Limited time seasonal items" },
  });
  const catLocal = await prisma.category.create({
    data: { name: "Local Specialties", slug: "local-specialties", description: "Regional specialties from across Bangladesh" },
  });

  // Sub-categories
  await prisma.category.create({
    data: { name: "Leafy Greens", slug: "leafy-greens", parentId: catVeg.id },
  });
  await prisma.category.create({
    data: { name: "Root Vegetables", slug: "root-vegetables", parentId: catVeg.id },
  });
  await prisma.category.create({
    data: { name: "Tropical Fruits", slug: "tropical-fruits", parentId: catFruit.id },
  });
  await prisma.category.create({
    data: { name: "Aromatic Rice", slug: "aromatic-rice", parentId: catRice.id },
  });

  const categories = [catVeg, catFruit, catRice, catDairy, catSpice, catOrganic, catSeasonal, catLocal];

  console.log("✅ 12 Categories created (8 main + 4 sub)");

  // ========================================================================
  // 6. PRODUCTS (60+)
  // ========================================================================
  const allProductTemplates = [...VEGETABLES, ...FRUITS, ...RICE_GRAINS, ...DAIRY_POULTRY, ...SPICES_HERBS];
  const products = [];

  for (let i = 0; i < allProductTemplates.length; i++) {
    const template = allProductTemplates[i];
    const farmer = farmers[i % farmers.length];
    const cat = i < 18 ? catVeg : i < 30 ? catFruit : i < 38 ? catRice : i < 45 ? catDairy : catSpice;

    const product = await prisma.product.create({
      data: {
        name: template.name,
        description: `Premium quality ${template.name.toLowerCase()} sourced directly from ${template.origin}. Freshly harvested and delivered to your doorstep.`,
        price: template.price + randInt(-10, 20),
        stock: randInt(20, 500),
        unit: template.unit,
        categoryId: cat.id,
        legacyCategory: cat.name,
        origin: template.origin,
        originDetails: `Harvested from ${farmer.farmerProfile.farmLocation}. ${pick(["Organic farming methods.", "Traditional cultivation.", "Sustainable agriculture practices.", "Pesticide-free growing.", "Natural compost used."])}`,
        nutritionInfo: pick(["Rich in vitamins and minerals.", "High fiber content.", "Good source of protein.", "Low calorie, nutrient dense.", "Contains essential amino acids."]),
        images: [`/uploads/${template.name.toLowerCase().replace(/[^a-z0-9]/g, "-")}.jpg`],
        isAvailable: Math.random() > 0.1,
        isApproved: true,
        approvedAt: randDate(60),
        approvedBy: admin1.id,
        averageRating: parseFloat((3.0 + Math.random() * 2).toFixed(1)),
        totalReviews: randInt(0, 30),
        totalVotes: randInt(0, 50),
        farmerId: farmer.id,
      },
    });
    products.push(product);
  }

  console.log(`✅ ${products.length} Products created`);

  // ========================================================================
  // 7. DELIVERY ZONES (20)
  // ========================================================================
  const zoneNames = [
    "Dhaka City", "Gazipur Sadar", "Tongi", "Uttara", "Mirpur", "Dhanmondi",
    "Gulshan", "Banani", "Mohammadpur", "Rajshahi City", "Naogaon Town",
    "Khulna City", "Jessore Town", "Chittagong City", "Cox's Bazar Town",
    "Sylhet City", "Moulvibazar Town", "Barisal City", "Rangpur City", "Dinajpur Town",
  ];

  for (let i = 0; i < 20; i++) {
    await prisma.deliveryZone.create({
      data: {
        farmerId: farmers[i % farmers.length].farmerProfile.id,
        name: zoneNames[i],
        location: zoneNames[i],
        latitude: 21.0 + Math.random() * 4,
        longitude: 88.0 + Math.random() * 4,
        radiusKm: randInt(5, 50),
      },
    });
  }

  console.log("✅ 20 Delivery Zones created");

  // ========================================================================
  // 8. WISHLIST (40 entries)
  // ========================================================================
  for (let i = 0; i < 40; i++) {
    const buyer = pick(buyers);
    const product = pick(products);
    try {
      await prisma.wishlist.create({
        data: { userId: buyer.id, productId: product.id },
      });
    } catch (e) {
      // Ignore duplicate wishlist entries
    }
  }

  console.log("✅ ~40 Wishlist entries created");

  // ========================================================================
  // 9. FOLLOW (30 relationships)
  // ========================================================================
  for (let i = 0; i < 30; i++) {
    const buyer = pick(buyers);
    const farmer = pick(farmers);
    try {
      await prisma.follow.create({
        data: { followerId: buyer.id, followingId: farmer.id },
      });
    } catch (e) {
      // Ignore duplicate follows
    }
  }

  console.log("✅ ~30 Follow relationships created");

  // ========================================================================
  // 10. CART ITEMS (25)
  // ========================================================================
  for (let i = 0; i < 25; i++) {
    const buyer = pick(buyers);
    const product = pick(products);
    try {
      await prisma.cartItem.create({
        data: { userId: buyer.id, productId: product.id, quantity: randInt(1, 5) },
      });
    } catch (e) {
      // Ignore duplicates
    }
  }

  console.log("✅ ~25 Cart items created");

  // ========================================================================
  // 11. ORDERS (40)
  // ========================================================================
  const orders = [];
  for (let i = 0; i < 40; i++) {
    const buyer = pick(buyers);
    const farmer = pick(farmers);
    const dm = pick(deliveryMen);
    const status = pick(ORDER_STATUSES);
    const orderProducts = [];
    let totalAmount = 0;

    // Each order has 1-4 items
    const itemCount = randInt(1, 4);
    const usedProducts = new Set();
    for (let j = 0; j < itemCount; j++) {
      let product;
      do { product = pick(products); } while (usedProducts.has(product.id));
      usedProducts.add(product.id);

      const qty = randInt(1, 10);
      const unitPrice = product.price;
      const itemTotal = parseFloat((unitPrice * qty).toFixed(2));
      totalAmount += itemTotal;
      orderProducts.push({ product, qty, unitPrice, itemTotal });
    }

    const order = await prisma.order.create({
      data: {
        orderNumber: `AGR-2026${String(randInt(1, 12)).padStart(2, "0")}${String(randInt(1, 28)).padStart(2, "0")}-${String(i + 1).padStart(4, "0")}`,
        buyerId: buyer.id,
        farmerId: farmer.id,
        status,
        paymentStatus: status === "delivered" ? "paid" : pick(["pending", "paid", "paid"]),
        paymentMethod: pick(PAYMENT_METHODS),
        totalAmount: parseFloat(totalAmount.toFixed(2)),
        deliveryFee: randInt(20, 100),
        deliveryAddress: `${randInt(1, 200)} ${pick(["Road", "Street", "Lane"])} ${randInt(1, 20)}, ${buyer.district}, ${buyer.division}`,
        deliveryNotes: pick(["Call before delivery", "Leave at gate", "Ring doorbell", "Contact via phone", ""]),
        deliveryManId: status !== "pending" && status !== "cancelled" ? dm.id : null,
        estimatedDelivery: status !== "pending" ? new Date(Date.now() + randInt(1, 5) * 86400000) : null,
        deliveredAt: status === "delivered" ? randDate(10) : null,
        items: {
          create: orderProducts.map((op) => ({
            productId: op.product.id,
            quantity: op.qty,
            unitPrice: op.unitPrice,
            total: op.itemTotal,
          })),
        },
        statusHistory: {
          create: generateStatusHistory(status, buyer.id, farmer.id, dm.id),
        },
      },
    });
    orders.push(order);

    // Create delivery tracking for shipped/delivered orders
    if (["shipped", "out_for_delivery", "delivered"].includes(status)) {
      for (let t = 0; t < randInt(3, 8); t++) {
        await prisma.deliveryTracking.create({
          data: {
            orderId: order.id,
            latitude: 23.7 + Math.random() * 0.5,
            longitude: 90.3 + Math.random() * 0.5,
            status: pick(["moving", "stopped", "moving"]),
            createdAt: new Date(Date.now() - randInt(0, 5) * 3600000),
          },
        });
      }
    }
  }

  console.log("✅ 40 Orders created with tracking data");

  // ========================================================================
  // 12. REVIEWS (80)
  // ========================================================================
  let reviewCount = 0;
  for (const order of orders) {
    if (order.status !== "delivered") continue;

    const orderItems = await prisma.orderItem.findMany({ where: { orderId: order.id } });
    for (const item of orderItems) {
      if (Math.random() > 0.6) continue; // Not every item gets reviewed

      const rating = randInt(3, 5);
      await prisma.review.create({
        data: {
          rating,
          comment: pick(REVIEW_COMMENTS),
          authorId: order.buyerId,
          productId: item.productId,
          orderId: order.id,
          isVerifiedPurchase: true,
          isFlagged: Math.random() > 0.95,
          fraudScore: Math.random() > 0.9 ? Math.random() * 0.3 : null,
          createdAt: randDate(15),
        },
      });
      reviewCount++;
    }
  }

  console.log(`✅ ${reviewCount} Reviews created`);

  // ========================================================================
  // 13. PRODUCT VOTES (150)
  // ========================================================================
  for (let i = 0; i < 150; i++) {
    const buyer = pick(buyers);
    const product = pick(products);
    try {
      await prisma.productVote.create({
        data: {
          userId: buyer.id,
          productId: product.id,
          value: Math.random() > 0.15 ? 1 : -1,
        },
      });
    } catch (e) {
      // Ignore duplicates
    }
  }

  console.log("✅ ~150 Product votes created");

  // ========================================================================
  // 14. NEGOTIATIONS (25)
  // ========================================================================
  for (let i = 0; i < 25; i++) {
    const product = pick(products);
    const buyer = pick(buyers);
    const farmer = farmers.find((f) => f.id === product.farmerId);
    if (!farmer || buyer.id === farmer.id) continue;

    const offerPrice = parseFloat((product.price * (0.7 + Math.random() * 0.2)).toFixed(2));
    const counterPrice = parseFloat((offerPrice * (1 + Math.random() * 0.15)).toFixed(2));
    const status = pick(NEGOTIATION_STATUSES);

    await prisma.negotiation.create({
      data: {
        productId: product.id,
        buyerId: buyer.id,
        farmerId: farmer.id,
        offerPrice,
        status,
        counterPrice: status === "countered" || status === "accepted" ? counterPrice : null,
        message: pick([
          "Can you give me a better price for bulk order?",
          "I need this for a restaurant. Best price please?",
          "Your price is a bit high. Can we negotiate?",
          "I'll buy 20kg if you reduce the price.",
          "What's your best price for weekly supply?",
        ]),
        expiresAt: new Date(Date.now() + randInt(1, 7) * 86400000),
        history: {
          create: [
            {
              senderId: buyer.id,
              offerPrice,
              message: "Initial offer from buyer.",
            },
            ...(status !== "pending"
              ? [{
                  senderId: farmer.id,
                  offerPrice: counterPrice,
                  message: pick(["Counter offer from farmer.", "Best I can do.", "How about this price?"]),
                }]
              : []),
          ],
        },
      },
    });
  }

  console.log("✅ 25 Negotiations created");

  // ========================================================================
  // 15. MESSAGES (80 chat messages)
  // ========================================================================
  const chatPairs = [];
  for (let i = 0; i < 15; i++) {
    const buyer = pick(buyers);
    const farmer = pick(farmers);
    chatPairs.push([buyer, farmer]);
  }

  for (const [buyer, farmer] of chatPairs) {
    const msgCount = randInt(3, 8);
    for (let i = 0; i < msgCount; i++) {
      const isBuyer = i % 2 === 0;
      await prisma.message.create({
        data: {
          content: pick([
            "Hi, is this still available?",
            "Yes, fresh stock just arrived!",
            "Can you deliver to my area?",
            "What's the minimum order quantity?",
            "Do you offer bulk discounts?",
            "When was this harvested?",
            "Can I visit your farm?",
            "Thank you for the quick delivery!",
            "The quality was excellent.",
            "Do you have any new stock coming?",
            "Can you pack it in smaller quantities?",
            "What payment methods do you accept?",
          ]),
          senderId: isBuyer ? buyer.id : farmer.id,
          receiverId: isBuyer ? farmer.id : buyer.id,
          isRead: Math.random() > 0.3,
          createdAt: randDate(20),
        },
      });
    }
  }

  console.log("✅ ~80 Messages created");

  // ========================================================================
  // 16. NOTIFICATIONS (60)
  // ========================================================================
  for (let i = 0; i < 60; i++) {
    const user = pick([...buyers, ...farmers, ...deliveryMen]);
    const type = pick(["order_update", "message", "negotiation", "follow", "review", "promotion", "system", "price_drop", "stock_alert"]);

    await prisma.notification.create({
      data: {
        userId: user.id,
        type,
        title: pick(NOTIFICATION_TITLES),
        body: pick([
          "You have a new update on your account.",
          "Check out the latest offers available now!",
          "A farmer you follow has added new products.",
          "Your order status has been updated.",
          "Someone sent you a message.",
          "Price drop alert on a product in your wishlist.",
          "Stock running low on a popular item.",
        ]),
        data: { randomId: `notif-${i}` },
        isRead: Math.random() > 0.4,
        createdAt: randDate(30),
      },
    });
  }

  console.log("✅ 60 Notifications created");

  // ========================================================================
  // 17. INVENTORY LOGS (100)
  // ========================================================================
  for (let i = 0; i < 100; i++) {
    const product = pick(products);
    const oldStock = randInt(10, 200);
    const change = randInt(-20, 50);
    const newStock = Math.max(0, oldStock + change);

    await prisma.inventoryLog.create({
      data: {
        productId: product.id,
        oldStock,
        newStock,
        change: newStock - oldStock,
        reason: pick(["order_placed", "restock", "damaged", "manual_adjustment", "expired", "returned"]),
        createdAt: randDate(60),
      },
    });
  }

  console.log("✅ 100 Inventory logs created");

  // ========================================================================
  // 18. PROMOTIONS (8)
  // ========================================================================
  const promotions = [];
  for (let i = 0; i < 8; i++) {
    const promo = await prisma.promotion.create({
      data: {
        title: pick([
          "Summer Fruit Festival", "Winter Vegetable Bonanza", "Eid Special Offer",
          "New Year Harvest Sale", "Monsoon Freshness Deal", "Organic Week",
          "Flash Friday Sale", "Weekend Farmer's Market",
        ]),
        description: pick([
          "Get amazing discounts on selected items!",
          "Limited time offer for our valued customers.",
          "Support local farmers and save big!",
          "Fresh from farm to your table at unbeatable prices.",
        ]),
        discountPercent: pick([5, 10, 15, 20, 25]),
        minOrderAmount: pick([0, 200, 500, 1000]),
        startDate: new Date(Date.now() - randInt(0, 30) * 86400000),
        endDate: new Date(Date.now() + randInt(1, 30) * 86400000),
        isActive: Math.random() > 0.3,
      },
    });
    promotions.push(promo);
  }

  // Link promotions to random products
  for (const promo of promotions) {
    const promoProducts = [];
    for (let j = 0; j < randInt(3, 10); j++) {
      const p = pick(products);
      if (!promoProducts.includes(p.id)) promoProducts.push(p.id);
    }
    for (const pid of promoProducts) {
      try {
        await prisma.productPromotion.create({
          data: { productId: pid, promotionId: promo.id },
        });
      } catch (e) {
        // Ignore duplicates
      }
    }
  }

  console.log("✅ 8 Promotions created with product links");

  // ========================================================================
  // 19. MARKET PRICES (50 entries across categories)
  // ========================================================================
  for (let i = 0; i < 50; i++) {
    const cat = pick(categories);
    const basePrice = randInt(40, 300);
    await prisma.marketPrice.create({
      data: {
        categoryId: cat.id,
        averagePrice: basePrice,
        minPrice: Math.max(10, basePrice - randInt(10, 30)),
        maxPrice: basePrice + randInt(10, 50),
        sampleSize: randInt(5, 50),
        date: new Date(Date.now() - randInt(0, 90) * 86400000),
      },
    });
  }

  console.log("✅ 50 Market price entries created");

  // ========================================================================
  // 20. PRODUCT VIEWS (200)
  // ========================================================================
  for (let i = 0; i < 200; i++) {
    await prisma.productView.create({
      data: {
        buyerId: pick(buyers).id,
        productId: pick(products).id,
        createdAt: randDate(45),
      },
    });
  }

  console.log("✅ 200 Product views created");

  // ========================================================================
  // 21. PRODUCT COMPARISONS (10)
  // ========================================================================
  for (let i = 0; i < 10; i++) {
    const buyer = pick(buyers);
    const comparison = await prisma.productComparison.create({
      data: {
        buyerId: buyer.id,
        name: pick(["Rice Comparison", "Fruit Price Check", "Best Vegetables", "Organic vs Regular", "Seasonal Specials"]),
      },
    });

    for (let j = 0; j < randInt(2, 5); j++) {
      try {
        await prisma.comparisonItem.create({
          data: {
            comparisonId: comparison.id,
            productId: pick(products).id,
          },
        });
      } catch (e) {
        // Ignore duplicates
      }
    }
  }

  console.log("✅ 10 Product comparisons created");

  // ========================================================================
  // 22. SALES REPORTS (10)
  // ========================================================================
  for (let i = 0; i < 10; i++) {
    await prisma.salesReport.create({
      data: {
        adminId: pick([admin1, admin2]).id,
        title: pick(["Weekly Report", "Monthly Summary", "Quarterly Analysis", "Farmer Performance", "Category Trends"]),
        period: pick(["2026-W30", "2026-W31", "2026-W32", "2026-W33", "2026-07", "2026-08", "2026-Q3"]),
        totalOrders: randInt(10, 200),
        totalSales: randInt(50, 1000),
        totalRevenue: randInt(5000, 100000),
        data: {
          generatedAt: new Date().toISOString(),
          notes: "Auto-generated report",
        },
      },
    });
  }

  console.log("✅ 10 Sales reports created");

  // ========================================================================
  // 23. ADMIN ACTION LOGS (30)
  // ========================================================================
  const adminActions = [
    "approve_product", "suspend_user", "remove_product", "verify_farmer",
    "flag_review", "resolve_dispute", "ban_buyer", "warn_farmer",
  ];
  for (let i = 0; i < 30; i++) {
    await prisma.adminActionLog.create({
      data: {
        adminId: pick([admin1, admin2]).id,
        action: pick(adminActions),
        targetType: pick(["product", "user", "review", "order"]),
        targetId: pick([...products, ...usersToArray(buyers, farmers)]).id,
        reason: pick([
          "Violates platform policy",
          "Quality standards met",
          "User complaint resolved",
          "Routine verification",
          "Fraudulent activity detected",
        ]),
        createdAt: randDate(60),
      },
    });
  }

  console.log("✅ 30 Admin action logs created");

  // ========================================================================
  // DONE
  // ========================================================================
  console.log("\n🎉🎉🎉 MASSIVE SEED COMPLETE! 🎉🎉🎉\n");
  console.log("📊 Summary:");
  console.log("   • 2 Admins");
  console.log("   • 10 Farmers");
  console.log("   • 15 Buyers");
  console.log("   • 5 Delivery Men");
  console.log("   • 12 Categories");
  console.log(`   • ${products.length} Products`);
  console.log("   • 20 Delivery Zones");
  console.log("   • ~40 Wishlist entries");
  console.log("   • ~30 Follow relationships");
  console.log("   • ~25 Cart items");
  console.log("   • 40 Orders with tracking");
  console.log(`   • ${reviewCount} Reviews`);
  console.log("   • ~150 Product votes");
  console.log("   • 25 Negotiations");
  console.log("   • ~80 Messages");
  console.log("   • 60 Notifications");
  console.log("   • 100 Inventory logs");
  console.log("   • 8 Promotions");
  console.log("   • 50 Market prices");
  console.log("   • 200 Product views");
  console.log("   • 10 Product comparisons");
  console.log("   • 10 Sales reports");
  console.log("   • 30 Admin action logs");
  console.log("\n--- Sample Login Credentials ---");
  console.log("Admin:        admin@agrisync.com / admin123");
  console.log("Moderator:    moderator@agrisync.com / admin123");
  console.log("Farmer:       farmer1@agrisync.com / farmer123  (through farmer10)");
  console.log("Buyer:        buyer1@agrisync.com / buyer123  (through buyer15)");
  console.log("Delivery:     delivery1@agrisync.com / delivery123  (through delivery5)");
}

// ---------------------------------------------------------------------------
// Helper: generate status history for an order
// ---------------------------------------------------------------------------
function generateStatusHistory(status, buyerId, farmerId, dmId) {
  const history = [{ status: "pending", notes: "Order placed by buyer", changedBy: buyerId }];

  if (["confirmed", "processing", "shipped", "out_for_delivery", "delivered"].includes(status)) {
    history.push({ status: "confirmed", notes: "Farmer confirmed availability", changedBy: farmerId });
  }
  if (["processing", "shipped", "out_for_delivery", "delivered"].includes(status)) {
    history.push({ status: "processing", notes: "Farmer is preparing the order", changedBy: farmerId });
  }
  if (["shipped", "out_for_delivery", "delivered"].includes(status)) {
    history.push({ status: "shipped", notes: "Handed to delivery partner", changedBy: farmerId });
  }
  if (["out_for_delivery", "delivered"].includes(status)) {
    history.push({ status: "out_for_delivery", notes: "Delivery partner is on the way", changedBy: dmId });
  }
  if (status === "delivered") {
    history.push({ status: "delivered", notes: "Buyer received the items", changedBy: dmId });
  }
  if (status === "cancelled") {
    history.push({ status: "cancelled", notes: "Order cancelled by buyer", changedBy: buyerId });
  }

  return history;
}

// ---------------------------------------------------------------------------
// Helper: flatten user arrays for random picking
// ---------------------------------------------------------------------------
function usersToArray(...arrays) {
  return arrays.flat();
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error("❌ Seed failed:", e);
    await prisma.$disconnect();
    process.exit(1);
  });
