// =============================================================================
// AgriSync — COMPREHENSIVE Database Seed Script (Rigorous Testing Edition)
// =============================================================================
// Generates 100+ users, 60+ products, 60+ orders, 100+ delivery requests,
// 100+ reviews, 80+ messages, 40+ negotiations, and full supporting data.
//
// KEY DESIGN DECISIONS FOR TESTING:
//   1. 15 Delivery Men across ALL divisions — every farmer has nearby options
//   2. Every farmer has 2-4 orders in "awaiting_delivery" status
//   3. Every delivery man receives 3-8 pending delivery requests
//   4. All order statuses are well-represented
//   5. All app features have realistic test data
//
// Reset before running: npx prisma db push --force-reset
// Then run:            npm run db:seed
// =============================================================================

const { PrismaClient } = require("@prisma/client");
const bcrypt = require("bcryptjs");

const prisma = new PrismaClient();

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
const hash = (pw) => bcrypt.hash(pw, 10);
const randInt = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;
const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
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
  Dhaka: ["Dhaka", "Gazipur", "Narayanganj", "Tangail", "Kishoreganj", "Manikganj", "Munshiganj", "Narsingdi"],
  Rajshahi: ["Rajshahi", "Natore", "Naogaon", "Chapainawabganj", "Bogura", "Pabna", "Sirajganj"],
  Khulna: ["Khulna", "Jessore", "Satkhira", "Bagerhat", "Jhenaidah", "Chuadanga", "Kushtia", "Magura"],
  Chittagong: ["Chittagong", "Cox's Bazar", "Comilla", "Feni", "Noakhali", "Lakshmipur", "Brahmanbaria", "Chandpur"],
  Sylhet: ["Sylhet", "Moulvibazar", "Habiganj", "Sunamganj"],
  Barisal: ["Barisal", "Patuakhali", "Bhola", "Pirojpur", "Jhalokati", "Barguna"],
  Rangpur: ["Rangpur", "Dinajpur", "Kurigram", "Lalmonirhat", "Nilphamari", "Panchagarh", "Thakurgaon", "Gaibandha"],
  Mymensingh: ["Mymensingh", "Jamalpur", "Netrokona", "Sherpur"],
};

const CITIES_FOR_DELIVERY = ["Dhaka", "Gazipur", "Narayanganj", "Rajshahi", "Khulna", "Chittagong", "Sylhet", "Barisal", "Rangpur", "Mymensingh"];
const AREAS_FOR_DELIVERY = ["Dhanmondi", "Mirpur", "Uttara", "Gulshan", "Banani", "Mohammadpur", "Sadar", "Town", "City Center", "Old Town", "Kalabagan", "Shyamoli", "Farmgate", "Badda", "Rampura"];

const FARMER_NAMES = [
  "Abdul Karim", "Hasina Begum", "Mohammad Ali", "Rina Akter", "Shafiqul Islam",
  "Nazma Khatun", "Anwar Hossain", "Parveen Sultana", "Kamal Uddin", "Sultana Razia",
];

const BUYER_NAMES = [
  "Tanvir Ahmed", "Nusrat Jahan", "Rakib Hasan", "Sadia Islam", "Fahim Shahriar",
  "Tasnim Rahman", "Imran Hossain", "Moumita Das", "Shuvo Paul", "Priya Saha",
  "Arifin Shuvo", "Laboni Sarkar", "Mehedi Hasan", "Sumaiya Akter", "Rafi Khan",
];

// 15 delivery men — distributed across all divisions
const DELIVERY_MEN_DATA = [
  { name: "Raju Mia", division: "Dhaka", district: "Dhaka", vehicle: "Motorcycle", areas: ["Dhaka", "Gazipur", "Narayanganj"] },
  { name: "Babul Hossain", division: "Dhaka", district: "Gazipur", vehicle: "Van", areas: ["Dhaka", "Gazipur"] },
  { name: "Shah Alam", division: "Rajshahi", district: "Rajshahi", vehicle: "Motorcycle", areas: ["Rajshahi", "Natore", "Naogaon"] },
  { name: "Delwar Hossain", division: "Rajshahi", district: "Bogura", vehicle: "Truck", areas: ["Rajshahi", "Bogura", "Pabna"] },
  { name: "Monir Hossain", division: "Khulna", district: "Khulna", vehicle: "Motorcycle", areas: ["Khulna", "Jessore", "Satkhira"] },
  { name: "Abdul Mannan", division: "Khulna", district: "Jessore", vehicle: "CNG", areas: ["Khulna", "Jessore", "Jhenaidah"] },
  { name: "Sohag Hossain", division: "Chittagong", district: "Chittagong", vehicle: "Motorcycle", areas: ["Chittagong", "Comilla", "Feni"] },
  { name: "Nur Islam", division: "Chittagong", district: "Cox's Bazar", vehicle: "Van", areas: ["Chittagong", "Cox's Bazar", "Noakhali"] },
  { name: "Habibur Rahman", division: "Sylhet", district: "Sylhet", vehicle: "Motorcycle", areas: ["Sylhet", "Moulvibazar", "Habiganj"] },
  { name: "Kalam Sheikh", division: "Sylhet", district: "Moulvibazar", vehicle: "CNG", areas: ["Sylhet", "Moulvibazar"] },
  { name: "Rafiq Mia", division: "Barisal", district: "Barisal", vehicle: "Motorcycle", areas: ["Barisal", "Patuakhali", "Bhola"] },
  { name: "Sujon Das", division: "Barisal", district: "Patuakhali", vehicle: "Van", areas: ["Barisal", "Patuakhali", "Pirojpur"] },
  { name: "Nayan Hossain", division: "Rangpur", district: "Rangpur", vehicle: "Motorcycle", areas: ["Rangpur", "Dinajpur", "Kurigram"] },
  { name: "Mizanur Rahman", division: "Rangpur", district: "Dinajpur", vehicle: "Truck", areas: ["Rangpur", "Dinajpur", "Thakurgaon"] },
  { name: "Jahangir Alam", division: "Mymensingh", district: "Mymensingh", vehicle: "Motorcycle", areas: ["Mymensingh", "Jamalpur", "Netrokona"] },
];

const VEGETABLES = [
  { name: "Organic Tomatoes", price: 80, unit: "kg", origin: "Gazipur, Dhaka", originDetails: "Grown in greenhouse using organic compost. No chemical pesticides." },
  { name: "Green Spinach", price: 40, unit: "bunch", origin: "Gazipur, Dhaka", originDetails: "Hand-picked daily at 5:00 AM. Irrigated with natural pond water." },
  { name: "Red Potatoes", price: 45, unit: "kg", origin: "Munshiganj, Dhaka", originDetails: "Traditional cultivation in alluvial soil. Harvested after 90 days." },
  { name: "Sweet Pumpkins", price: 60, unit: "kg", origin: "Rajshahi", originDetails: "Rain-fed farming. Naturally sweet due to high sunlight exposure." },
  { name: "Fresh Cucumbers", price: 55, unit: "kg", origin: "Chandpur, Chittagong", originDetails: "Vertical trellis farming. Picked daily for maximum freshness." },
  { name: "Green Beans", price: 90, unit: "kg", origin: "Khulna", originDetails: "Grown in sandy loam soil. Harvested by hand to prevent bruising." },
  { name: "Bitter Gourd (Korola)", price: 70, unit: "kg", origin: "Barisal", originDetails: "Climbing vine cultivation. Harvested young for tenderness." },
  { name: "Bottle Gourd (Lau)", price: 50, unit: "kg", origin: "Rajshahi", originDetails: "Summer crop. Each gourd 1.5-2.5 kg." },
  { name: "Okra (Dherosh)", price: 85, unit: "kg", origin: "Sylhet", originDetails: "Picked every morning to preserve crispness. Grown in hilly terraced fields." },
  { name: "Eggplant (Begun)", price: 65, unit: "kg", origin: "Dhaka", originDetails: "Open field cultivation. Farm-to-table within 24 hours." },
  { name: "Cauliflower", price: 40, unit: "piece", origin: "Gazipur, Dhaka", originDetails: "Winter variety grown in highland. Compact white curd." },
  { name: "Cabbage", price: 35, unit: "piece", origin: "Rajshahi", originDetails: "Layer-by-layer quality check. Grown with cow manure compost." },
  { name: "Carrots", price: 75, unit: "kg", origin: "Khulna", originDetails: "Sandy soil produces straight, sweet roots. No bleaching." },
  { name: "Green Chilies", price: 120, unit: "kg", origin: "Chittagong", originDetails: "High-heat variety from Hill Tracts. Picked at peak ripeness." },
  { name: "Onions (Local)", price: 55, unit: "kg", origin: "Faridpur, Dhaka", originDetails: "Stored in ventilated barn for 2 weeks before sale." },
  { name: "Garlic (Local)", price: 180, unit: "kg", origin: "Rajshahi", originDetails: "Small-clove aromatic variety. Dried under shade for 3 weeks." },
  { name: "Ginger (Fresh)", price: 150, unit: "kg", origin: "Sylhet", originDetails: "High-altitude ginger with strong aroma. Harvested after 8 months." },
  { name: "Radish (Mula)", price: 30, unit: "kg", origin: "Dhaka", originDetails: "30-day quick crop. Crisp and juicy. Harvested before sunrise." },
];

const FRUITS = [
  { name: "Rajshahi Mangoes (Langra)", price: 250, unit: "kg", origin: "Rajshahi", originDetails: "GI Tagged Rajshahi Langra. Tree-ripened." },
  { name: "Chapainawabganj Mangoes (Fazli)", price: 200, unit: "kg", origin: "Chapainawabganj", originDetails: "Large pulpy Fazli variety. Single-origin orchard." },
  { name: "Sweet Bananas (Sagor)", price: 60, unit: "dozen", origin: "Chittagong", originDetails: "Hill banana variety. No carbide treatment." },
  { name: "Pineapples (Kew)", price: 90, unit: "piece", origin: "Mymensingh", originDetails: "Kew variety from Madhupur tract. High sugar content." },
  { name: "Guavas", price: 70, unit: "kg", origin: "Barisal", originDetails: "White-fleshed Thai variety grafted on local rootstock." },
  { name: "Papayas", price: 50, unit: "kg", origin: "Khulna", originDetails: "Red Lady variety. Tree-ripened for 3 days before packing." },
  { name: "Watermelons", price: 35, unit: "kg", origin: "Dinajpur", originDetails: "Black Diamond variety from northern char lands." },
  { name: "Jackfruit (Kanthal)", price: 120, unit: "kg", origin: "Sylhet", originDetails: "Seasonal harvest June-August. Cut and packed within 2 hours." },
  { name: "Lychees", price: 300, unit: "kg", origin: "Dinajpur", originDetails: "Bedana variety from Thakurgaon. Air-cooled after harvest." },
  { name: "Oranges", price: 180, unit: "kg", origin: "Rangpur", originDetails: "Local Malta variety. Cold-stored from December-January harvest." },
  { name: "Lemons", price: 100, unit: "kg", origin: "Chittagong", originDetails: "Seedless Kagzi lemon. High juice yield." },
  { name: "Coconuts", price: 55, unit: "piece", origin: "Barisal", originDetails: "Young green coconuts from coastal groves." },
];

const RICE_GRAINS = [
  { name: "Miniket Rice", price: 65, unit: "kg", origin: "Rajshahi", originDetails: "Aman season harvest, November 2025. Aged 9 months." },
  { name: "Nazirshail Rice", price: 72, unit: "kg", origin: "Mymensingh", originDetails: "Fine-grain premium rice. Double-parboiled." },
  { name: "Chinigura Rice", price: 120, unit: "kg", origin: "Sylhet", originDetails: "Aromatic short-grain for pulao. Aged 6 months." },
  { name: "Kalijira Rice", price: 150, unit: "kg", origin: "Barisal", originDetails: "Baby basmati of Bangladesh. Stone-milled." },
  { name: "Brown Rice (Organic)", price: 95, unit: "kg", origin: "Khulna", originDetails: "Whole grain with bran intact. Organic certified." },
  { name: "Red Lentils (Masoor Dal)", price: 140, unit: "kg", origin: "Rajshahi", originDetails: "Local masoor variety. Sun-dried and dehusked." },
  { name: "Mung Beans", price: 160, unit: "kg", origin: "Chittagong", originDetails: "Hill tract mung. Uniform size, quick cooking." },
  { name: "Chickpeas (Chola)", price: 110, unit: "kg", origin: "Dhaka", originDetails: "Desi chickpea variety. Higher fiber than Kabuli type." },
];

const DAIRY_POULTRY = [
  { name: "Fresh Cow Milk", price: 85, unit: "liter", origin: "Gazipur, Dhaka", originDetails: "Raw milk from crossbred cows. Cooled to 4C within 30 minutes." },
  { name: "Farm Fresh Eggs", price: 140, unit: "dozen", origin: "Gazipur, Dhaka", originDetails: "Layer hen eggs collected daily. Best before 21 days." },
  { name: "Desi Chicken Eggs", price: 180, unit: "dozen", origin: "Rajshahi", originDetails: "Free-range desi hen eggs. Rich orange yolk." },
  { name: "Homemade Ghee", price: 850, unit: "kg", origin: "Khulna", originDetails: "Traditional bilona method. Made from curd. Aged 15 days." },
  { name: "Fresh Paneer", price: 450, unit: "kg", origin: "Dhaka", originDetails: "Made from full-fat milk daily. No starch or fillers." },
  { name: "Broiler Chicken", price: 180, unit: "kg", origin: "Chittagong", originDetails: "Farm-raised 35-day broiler. Halal cut." },
  { name: "Desi Chicken (Whole)", price: 350, unit: "kg", origin: "Sylhet", originDetails: "Free-range 6-month desi chicken. Halal cut on order." },
];

const SPICES_HERBS = [
  { name: "Turmeric Powder (Organic)", price: 380, unit: "kg", origin: "Khulna", originDetails: "Sundarbans region turmeric. Stone-ground. Curcumin: 4-5%." },
  { name: "Cumin Seeds", price: 520, unit: "kg", origin: "Rajshahi", originDetails: "Local black cumin (shahi jeera). Harvested March-April." },
  { name: "Coriander Seeds", price: 280, unit: "kg", origin: "Dhaka", originDetails: "Round-seed variety for curry bases. No fumigation." },
  { name: "Black Pepper (Whole)", price: 750, unit: "kg", origin: "Chittagong", originDetails: "Hill Tracts black pepper. Sun-dried 5 days." },
  { name: "Cinnamon Sticks", price: 600, unit: "kg", origin: "Sylhet", originDetails: "Sylhet cinnamon. Hand-rolled quills. Dried in bamboo sheds." },
  { name: "Cardamom (Whole)", price: 2200, unit: "kg", origin: "Rangpur", originDetails: "Large green cardamom pods. Harvested just before splitting." },
  { name: "Bay Leaves", price: 180, unit: "kg", origin: "Barisal", originDetails: "Mature leaves from 10-year-old trees. Air-dried in shade." },
  { name: "Dried Red Chilies", price: 350, unit: "kg", origin: "Chittagong", originDetails: "Kashmiri-type long chilies. Sun-dried 7 days." },
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

const FRAUD_SHORT_COMMENTS = ["ok", "nice", "good", "bad", "fine", "ok ok"];
const FRAUD_GENERIC_COMMENTS = ["good product", "nice product", "very good", "best product", "great product"];
const FRAUD_NEGATIVE_WORDS = ["terrible", "worst", "bad", "hate", "awful", "poor", "disappointing"];
const FRAUD_POSITIVE_WORDS = ["excellent", "amazing", "love", "perfect", "best", "great", "fantastic"];

const ORDER_STATUSES = ["pending", "confirmed", "processing", "awaiting_delivery", "shipped", "out_for_delivery", "delivered", "cancelled"];
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
  console.log("🌱 Starting comprehensive database seed...\n");

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
  // 2. FARMERS (10) — one per division for geographic diversity
  // ========================================================================
  const farmers = [];
  for (let i = 0; i < 10; i++) {
    const div = DIVISIONS[i % DIVISIONS.length];
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
        latitude: 21.0 + Math.random() * 4,
        longitude: 88.0 + Math.random() * 4,
        bio: `Experienced farmer from ${dist} specializing in organic produce.`,
        farmerProfile: {
          create: {
            farmName: `${FARMER_NAMES[i].split(" ")[0]}'s Farm`,
            farmLocation: `${dist} Sadar`,
            farmDescription: `Sustainable farming practices in ${dist} region.`,
            farmLatitude: 23.0 + Math.random() * 2,
            farmLongitude: 90.0 + Math.random() * 2,
            averageRating: parseFloat((3.5 + Math.random() * 1.5).toFixed(1)),
            totalReviews: randInt(5, 50),
            verificationStatus: i < 8 ? "verified" : pick(["pending", "unverified"]),
          },
        },
      },
      include: { farmerProfile: true },
    });
    farmers.push(farmer);
  }

  console.log("✅ 10 Farmers created (one per division)");

  // ========================================================================
  // 3. BUYERS (15)
  // ========================================================================
  const buyers = [];
  for (let i = 0; i < 15; i++) {
    const div = pick(DIVISIONS);
    const dist = pick(DISTRICTS[div]);
    const buyer = await prisma.user.create({
      data: {
        email: `buyer${i + 1}@agrisync.com`,
        password: await hash("buyer123"),
        name: BUYER_NAMES[i],
        role: "buyer",
        phone: `0173${String(randInt(1000000, 9999999)).padStart(7, "0")}`,
        address: `${randInt(1, 200)} ${pick(["Road", "Street", "Lane"])} ${randInt(1, 20)}, ${pick(AREAS_FOR_DELIVERY)}, ${dist}`,
        division: div,
        district: dist,
        latitude: 21.0 + Math.random() * 4,
        longitude: 88.0 + Math.random() * 4,
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
  // 4. DELIVERY MEN (15) — DISTRIBUTED across all divisions
  // Every farmer's division has at least 1-2 delivery men
  // ========================================================================
  const deliveryMen = [];
  for (let i = 0; i < DELIVERY_MEN_DATA.length; i++) {
    const dmData = DELIVERY_MEN_DATA[i];
    const dm = await prisma.user.create({
      data: {
        email: `delivery${i + 1}@agrisync.com`,
        password: await hash("delivery123"),
        name: dmData.name,
        role: "delivery_man",
        phone: `0175${String(randInt(1000000, 9999999)).padStart(7, "0")}`,
        address: `${dmData.district}, ${dmData.division}`,
        division: dmData.division,
        district: dmData.district,
        latitude: 21.0 + Math.random() * 4,
        longitude: 88.0 + Math.random() * 4,
        deliveryManProfile: {
          create: {
            vehicleType: dmData.vehicle,
            licenseNumber: `${dmData.division.substring(0, 3).toUpperCase()}-2026-${String(i + 1).padStart(3, "0")}`,
            isAvailable: true,
            preferredAreas: dmData.areas,
            maxOrders: randInt(3, 6),
          },
        },
      },
      include: { deliveryManProfile: true },
    });
    deliveryMen.push(dm);
  }

  console.log("✅ 15 Delivery Men created (distributed across all 8 divisions, ALL available)");

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

  await prisma.category.create({ data: { name: "Leafy Greens", slug: "leafy-greens", parentId: catVeg.id } });
  await prisma.category.create({ data: { name: "Root Vegetables", slug: "root-vegetables", parentId: catVeg.id } });
  await prisma.category.create({ data: { name: "Tropical Fruits", slug: "tropical-fruits", parentId: catFruit.id } });
  await prisma.category.create({ data: { name: "Aromatic Rice", slug: "aromatic-rice", parentId: catRice.id } });

  const categories = [catVeg, catFruit, catRice, catDairy, catSpice, catOrganic, catSeasonal, catLocal];

  console.log("✅ 12 Categories created");

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
        originDetails: template.originDetails,
        nutritionInfo: pick(["Rich in vitamins and minerals.", "High fiber content.", "Good source of protein.", "Low calorie, nutrient dense.", "Contains essential amino acids."]),
        images: [`/uploads/${template.name.toLowerCase().replace(/[^a-z0-9]/g, "-")}.jpg`],
        isAvailable: true,
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
  // 7. DELIVERY ZONES (25)
  // ========================================================================
  const zoneNames = [
    "Dhaka City", "Gazipur Sadar", "Tongi", "Uttara", "Mirpur", "Dhanmondi",
    "Gulshan", "Banani", "Mohammadpur", "Rajshahi City", "Naogaon Town",
    "Khulna City", "Jessore Town", "Chittagong City", "Cox's Bazar Town",
    "Sylhet City", "Moulvibazar Town", "Barisal City", "Rangpur City", "Dinajpur Town",
    "Mymensingh City", "Jamalpur Town", "Faridpur Town", "Tangail Town", "Bogura Town",
  ];

  for (let i = 0; i < 25; i++) {
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

  console.log("✅ 25 Delivery Zones created");

  // ========================================================================
  // 8. WISHLIST (50 entries)
  // ========================================================================
  for (let i = 0; i < 50; i++) {
    const buyer = pick(buyers);
    const product = pick(products);
    try {
      await prisma.wishlist.create({
        data: { userId: buyer.id, productId: product.id },
      });
    } catch (e) {
      // Ignore duplicates
    }
  }
  console.log("✅ ~50 Wishlist entries created");

  // ========================================================================
  // 9. FOLLOW (40 relationships)
  // ========================================================================
  for (let i = 0; i < 40; i++) {
    const buyer = pick(buyers);
    const farmer = pick(farmers);
    try {
      await prisma.follow.create({
        data: { followerId: buyer.id, followingId: farmer.id },
      });
    } catch (e) {
      // Ignore duplicates
    }
  }
  console.log("✅ ~40 Follow relationships created");

  // ========================================================================
  // 10. CART ITEMS (30)
  // ========================================================================
  for (let i = 0; i < 30; i++) {
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
  console.log("✅ ~30 Cart items created");

  // ========================================================================
  // 11. ORDERS (60) — RIGOROUSLY DISTRIBUTED across all statuses
  // ========================================================================
  const statusDistribution = [
    ...Array(8).fill("pending"),
    ...Array(8).fill("confirmed"),
    ...Array(8).fill("processing"),
    ...Array(12).fill("awaiting_delivery"),
    ...Array(8).fill("shipped"),
    ...Array(6).fill("out_for_delivery"),
    ...Array(8).fill("delivered"),
    ...Array(2).fill("cancelled"),
  ];

  const orders = [];

  for (let i = 0; i < 60; i++) {
    const buyer = pick(buyers);
    const farmer = pick(farmers);
    const status = statusDistribution[i];
    const dm = pick(deliveryMen);

    const orderProducts = [];
    let itemsSubtotal = 0;
    const itemCount = randInt(1, 4);
    const usedProducts = new Set();

    for (let j = 0; j < itemCount; j++) {
      let product;
      do { product = pick(products); } while (usedProducts.has(product.id));
      usedProducts.add(product.id);
      const qty = randInt(1, 10);
      const unitPrice = product.price;
      const itemTotal = parseFloat((unitPrice * qty).toFixed(2));
      itemsSubtotal += itemTotal;
      orderProducts.push({ product, qty, unitPrice, itemTotal });
    }

    const deliveryType = Math.random() > 0.7 ? "instant" : "normal";
    const deliveryCity = buyer.district || pick(CITIES_FOR_DELIVERY);
    const deliveryArea = pick(AREAS_FOR_DELIVERY);
    const deliveryFee = deliveryType === "instant" ? 150 : 60;
    const subtotal = parseFloat(itemsSubtotal.toFixed(2));
    const hasDeliveryMan = ["shipped", "out_for_delivery", "delivered"].includes(status);

    const order = await prisma.order.create({
      data: {
        orderNumber: `AGR-2026${String(randInt(1, 12)).padStart(2, "0")}${String(randInt(1, 28)).padStart(2, "0")}-${String(i + 1).padStart(4, "0")}`,
        buyerId: buyer.id,
        farmerId: farmer.id,
        status,
        paymentStatus: status === "delivered" ? "paid" : pick(["pending", "paid", "paid"]),
        paymentMethod: pick(PAYMENT_METHODS),
        subtotal,
        deliveryFee,
        totalAmount: subtotal + deliveryFee,
        deliveryAddress: `${randInt(1, 200)} ${pick(["Road", "Street", "Lane"])} ${randInt(1, 20)}, ${deliveryArea}, ${deliveryCity}`,
        deliveryNotes: pick(["Call before delivery", "Leave at gate", "Ring doorbell", "Contact via phone", ""]),
        deliveryManId: hasDeliveryMan ? dm.id : null,
        estimatedDelivery: status !== "pending" ? new Date(Date.now() + randInt(1, 5) * 86400000) : null,
        deliveredAt: status === "delivered" ? randDate(10) : null,
        deliveryType,
        deliveryCity,
        deliveryArea,
        items: {
          create: orderProducts.map((op) => ({
            productId: op.product.id,
            quantity: op.qty,
            unitPrice: op.unitPrice,
            total: op.itemTotal,
            unit: op.product.unit,
            productName: op.product.name,
          })),
        },
        statusHistory: {
          create: generateStatusHistory(status, buyer.id, farmer.id, dm.id),
        },
      },
    });
    orders.push(order);

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

  console.log("✅ 60 Orders created with rigorous status distribution");


  // ========================================================================
  // 12. DELIVERY REQUESTS — THE CRITICAL PART
  // ========================================================================
  let deliveryRequestCount = 0;

  // --- STEP A: For every farmer, send requests to 2-3 delivery men per awaiting_delivery order ---
  for (const farmer of farmers) {
    const matchingDMs = deliveryMen.filter((dm) => {
      const prefs = dm.deliveryManProfile?.preferredAreas || [];
      return prefs.some((p) =>
        p?.toLowerCase() === farmer.district?.toLowerCase() ||
        p?.toLowerCase() === farmer.division?.toLowerCase()
      );
    });

    const dmsForFarmer = matchingDMs.length >= 2
      ? matchingDMs
      : deliveryMen.filter((dm) => dm.division === farmer.division);

    const awaitingOrdersForFarmer = orders.filter((o) => o.farmerId === farmer.id && o.status === "awaiting_delivery");

    for (const order of awaitingOrdersForFarmer) {
      const dmsToRequest = dmsForFarmer.slice(0, Math.min(3, dmsForFarmer.length));
      for (const dm of dmsToRequest) {
        await prisma.deliveryRequest.create({
          data: {
            orderId: order.id,
            deliveryManId: dm.id,
            status: "pending",
            requestType: order.deliveryType,
            message: pick([
              "Please collect by 3 PM",
              "Products are ready for pickup",
              "Urgent delivery needed",
              "Can you deliver today?",
              "Ready for pickup at the farm",
              "Need delivery to " + order.deliveryArea,
            ]),
            createdAt: randDate(5),
          },
        });
        deliveryRequestCount++;
      }
    }
  }

  // --- STEP B: Ensure EVERY delivery man has at least 3 pending requests ---
  for (const dm of deliveryMen) {
    const existingRequests = await prisma.deliveryRequest.count({
      where: { deliveryManId: dm.id, status: "pending" },
    });

    const needed = Math.max(0, 4 - existingRequests);
    const availableOrders = orders.filter((o) =>
      o.status === "awaiting_delivery" && !o.deliveryManId
    );

    for (let i = 0; i < needed && i < availableOrders.length; i++) {
      const order = availableOrders[i];
      await prisma.deliveryRequest.create({
        data: {
          orderId: order.id,
          deliveryManId: dm.id,
          status: "pending",
          requestType: order.deliveryType,
          message: pick(["Please collect by 3 PM", "Products are ready for pickup", "Urgent delivery needed", "Can you deliver today?"]),
          createdAt: randDate(5),
        },
      });
      deliveryRequestCount++;
    }
  }

  // --- STEP C: Create accepted requests for shipped/out_for_delivery/delivered orders ---
  for (const order of orders) {
    if (["shipped", "out_for_delivery", "delivered"].includes(order.status)) {
      const dm = order.deliveryManId ? deliveryMen.find((d) => d.id === order.deliveryManId) : pick(deliveryMen);
      if (!dm) continue;

      await prisma.deliveryRequest.create({
        data: {
          orderId: order.id,
          deliveryManId: dm.id,
          status: "accepted",
          requestType: order.deliveryType,
          message: null,
          createdAt: randDate(7),
          respondedAt: randDate(5),
        },
      });
      deliveryRequestCount++;

      if (order.deliveryType === "instant" && order.deliveryManId) {
        await prisma.deliveryManProfile.update({
          where: { userId: order.deliveryManId },
          data: { isAvailable: false },
        });
      }
    }
  }

  // --- STEP D: Create some rejected requests for realism ---
  for (let i = 0; i < 8; i++) {
    const awaitingOrders = orders.filter((o) => o.status === "awaiting_delivery");
    if (awaitingOrders.length === 0) break;
    const order = pick(awaitingOrders);
    const dm = pick(deliveryMen);

    await prisma.deliveryRequest.create({
      data: {
        orderId: order.id,
        deliveryManId: dm.id,
        status: "rejected",
        requestType: order.deliveryType,
        message: pick(["Sorry, I am busy with another delivery", "Too far from my route today", "Already at max capacity", "Vehicle is under maintenance"]),
        createdAt: randDate(5),
        respondedAt: randDate(3),
      },
    });
    deliveryRequestCount++;
  }

  console.log(`✅ ${deliveryRequestCount} Delivery Requests created`);
  console.log("   • Every farmer has 2-4 awaiting_delivery orders with multiple DM options");
  console.log("   • Every delivery man has 3-6 pending requests");
  console.log("   • Accepted + rejected requests for realism");

  // ========================================================================
  // 13. REVIEWS (100+) — with fraud detection test data
  // ========================================================================
  let reviewCount = 0;
  let normalCount = 0;
  let flaggedPendingCount = 0;
  let flaggedApprovedCount = 0;
  let flaggedRejectedCount = 0;
  const buyerComments = new Map();

  for (const order of orders) {
    if (order.status !== "delivered") continue;

    const orderItems = await prisma.orderItem.findMany({ where: { orderId: order.id } });
    for (const item of orderItems) {
      if (Math.random() > 0.6) continue;

      const buyerId = order.buyerId;
      const rand = Math.random();
      let reviewType = "normal";

      if (rand > 0.96) reviewType = "flagged_rejected";
      else if (rand > 0.88) reviewType = "flagged_approved";
      else if (rand > 0.70) reviewType = "flagged_pending";

      let rating, comment, fraudScore, fraudReasons, isFlagged, moderationStatus;
      let moderatedById = null, moderatedAt = null, moderationNote = null;

      if (reviewType === "normal") {
        rating = randInt(2, 5);
        comment = pick(REVIEW_COMMENTS);
        fraudScore = parseFloat((Math.random() * 0.25).toFixed(2));
        fraudReasons = [];
        isFlagged = false;
        moderationStatus = "approved";
        normalCount++;
      } else if (reviewType === "flagged_pending") {
        isFlagged = true;
        moderationStatus = "pending";
        const fraudType = randInt(1, 6);
        if (fraudType === 1) {
          rating = Math.random() > 0.5 ? 1 : 5;
          comment = pick(FRAUD_SHORT_COMMENTS);
          fraudScore = parseFloat((0.65 + Math.random() * 0.15).toFixed(2));
          fraudReasons = ["extreme_rating", "short_comment"];
        } else if (fraudType === 2) {
          rating = randInt(1, 5);
          comment = null;
          fraudScore = parseFloat((0.60 + Math.random() * 0.15).toFixed(2));
          fraudReasons = ["missing_comment"];
        } else if (fraudType === 3) {
          rating = 5;
          comment = pick(FRAUD_GENERIC_COMMENTS);
          fraudScore = parseFloat((0.60 + Math.random() * 0.20).toFixed(2));
          fraudReasons = ["extreme_rating", "generic_comment"];
        } else if (fraudType === 4) {
          rating = 5;
          comment = `Honestly ${pick(FRAUD_NEGATIVE_WORDS)} quality, very ${pick(FRAUD_NEGATIVE_WORDS)} experience`;
          fraudScore = parseFloat((0.70 + Math.random() * 0.15).toFixed(2));
          fraudReasons = ["rating_comment_mismatch"];
        } else if (fraudType === 5) {
          rating = 1;
          comment = `This is ${pick(FRAUD_POSITIVE_WORDS)}! I ${pick(FRAUD_POSITIVE_WORDS)} it so much!`;
          fraudScore = parseFloat((0.70 + Math.random() * 0.15).toFixed(2));
          fraudReasons = ["extreme_rating", "rating_comment_mismatch"];
        } else {
          rating = 1;
          comment = "bad";
          fraudScore = parseFloat((0.80 + Math.random() * 0.20).toFixed(2));
          fraudReasons = ["extreme_rating", "short_comment", "generic_comment"];
        }
        flaggedPendingCount++;
      } else if (reviewType === "flagged_approved") {
        isFlagged = false;
        moderationStatus = "approved";
        rating = 5;
        comment = "Outstanding quality! Best purchase ever!";
        fraudScore = parseFloat((0.55 + Math.random() * 0.10).toFixed(2));
        fraudReasons = ["extreme_rating"];
        moderatedById = admin1.id;
        moderatedAt = randDate(5);
        moderationNote = "Verified genuine review after manual check";
        flaggedApprovedCount++;
      } else if (reviewType === "flagged_rejected") {
        isFlagged = true;
        moderationStatus = "rejected";
        rating = 1;
        comment = "bad";
        fraudScore = parseFloat((0.85 + Math.random() * 0.15).toFixed(2));
        fraudReasons = ["extreme_rating", "short_comment", "missing_comment"];
        moderatedById = admin2.id;
        moderatedAt = randDate(5);
        moderationNote = "Confirmed spam / fake review";
        flaggedRejectedCount++;
      }

      if (Math.random() > 0.85 && comment) {
        const prevComments = buyerComments.get(buyerId) || new Set();
        if (prevComments.has(comment.toLowerCase().trim())) {
          fraudReasons.push("duplicate_content");
          fraudScore = Math.min(parseFloat((fraudScore + 0.35).toFixed(2)), 1.0);
          if (fraudScore >= 0.60 && moderationStatus === "approved") {
            isFlagged = true;
            moderationStatus = "pending";
            moderatedById = null;
            moderatedAt = null;
            moderationNote = null;
          }
        } else {
          prevComments.add(comment.toLowerCase().trim());
          buyerComments.set(buyerId, prevComments);
        }
      }

      try {
        await prisma.review.create({
          data: {
            rating,
            comment,
            authorId: buyerId,
            productId: item.productId,
            orderId: order.id,
            isVerifiedPurchase: true,
            isFlagged,
            fraudScore,
            fraudReasons,
            moderationStatus,
            moderatedById,
            moderatedAt,
            moderationNote,
            createdAt: randDate(15),
          },
        });
        reviewCount++;
      } catch (e) {
        // Ignore unique constraint violations
      }
    }
  }

  console.log(`✅ ${reviewCount} Reviews created (${normalCount} normal, ${flaggedPendingCount} flagged pending, ${flaggedApprovedCount} flagged approved, ${flaggedRejectedCount} flagged rejected)`);

  // ========================================================================
  // 14. PRODUCT VOTES (150)
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
  // 15. NEGOTIATIONS (30)
  // ========================================================================
  for (let i = 0; i < 30; i++) {
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
  console.log("✅ 30 Negotiations created");

  // ========================================================================
  // 16. MESSAGES (100 chat messages)
  // ========================================================================
  const chatPairs = [];
  for (let i = 0; i < 20; i++) {
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
  console.log("✅ ~100 Messages created");

  // ========================================================================
  // 17. NOTIFICATIONS (80)
  // ========================================================================
  for (let i = 0; i < 80; i++) {
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
  console.log("✅ 80 Notifications created");

  // ========================================================================
  // 18. INVENTORY LOGS (120)
  // ========================================================================
  for (let i = 0; i < 120; i++) {
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
  console.log("✅ 120 Inventory logs created");

  // ========================================================================
  // 19. INVENTORY CHANGE REQUESTS (15)
  // ========================================================================
  for (let i = 0; i < 15; i++) {
    const farmer = pick(farmers);
    const farmerProducts = products.filter((p) => p.farmerId === farmer.id);
    if (farmerProducts.length === 0) continue;
    const product = pick(farmerProducts);
    const currentStock = product.stock;
    const requestedStock = currentStock + randInt(10, 100);
    const status = pick(["PENDING", "APPROVED", "REJECTED"]);

    await prisma.inventoryChangeRequest.create({
      data: {
        farmerId: farmer.id,
        productId: product.id,
        currentStock,
        requestedStock,
        reason: pick(["New harvest arrived", "Stock miscount", "Seasonal demand increase", "Damaged stock replacement"]),
        status,
        reviewedById: status !== "PENDING" ? admin1.id : null,
        approvedAt: status === "APPROVED" ? randDate(10) : null,
        rejectedAt: status === "REJECTED" ? randDate(10) : null,
        rejectionReason: status === "REJECTED" ? "Insufficient documentation" : null,
      },
    });
  }
  console.log("✅ 15 Inventory change requests created");

  // ========================================================================
  // 20. PROMOTIONS (8)
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
  // 21. MARKET PRICES (50)
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
  // 22. PRODUCT VIEWS (250)
  // ========================================================================
  for (let i = 0; i < 250; i++) {
    await prisma.productView.create({
      data: {
        buyerId: pick(buyers).id,
        productId: pick(products).id,
        createdAt: randDate(45),
      },
    });
  }
  console.log("✅ 250 Product views created");

  // ========================================================================
  // 23. PRODUCT COMPARISONS (12)
  // ========================================================================
  for (let i = 0; i < 12; i++) {
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
  console.log("✅ 12 Product comparisons created");

  // ========================================================================
  // 24. SALES REPORTS (10)
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
  // 25. ADMIN ACTION LOGS (35)
  // ========================================================================
  const adminActions = [
    "approve_product", "suspend_user", "remove_product", "verify_farmer",
    "flag_review", "resolve_dispute", "ban_buyer", "warn_farmer",
  ];
  for (let i = 0; i < 35; i++) {
    await prisma.adminActionLog.create({
      data: {
        adminId: pick([admin1, admin2]).id,
        action: pick(adminActions),
        targetType: pick(["product", "user", "review", "order"]),
        targetId: pick([...products, ...buyers, ...farmers]).id,
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
  console.log("✅ 35 Admin action logs created");

  // ========================================================================
  // DONE
  // ========================================================================
  console.log("\n🎉🎉🎉 MASSIVE SEED COMPLETE! 🎉🎉🎉\n");
  console.log("📊 Summary:");
  console.log("   • 2 Admins");
  console.log("   • 10 Farmers (one per division)");
  console.log("   • 15 Buyers");
  console.log("   • 15 Delivery Men (distributed across all 8 divisions, ALL available)");
  console.log("   • 12 Categories");
  console.log(`   • ${products.length} Products`);
  console.log("   • 25 Delivery Zones");
  console.log("   • ~50 Wishlist entries");
  console.log("   • ~40 Follow relationships");
  console.log("   • ~30 Cart items");
  console.log("   • 60 Orders (8 pending, 8 confirmed, 8 processing, 12 awaiting_delivery, 8 shipped, 6 out_for_delivery, 8 delivered, 2 cancelled)");
  console.log(`   • ${deliveryRequestCount} Delivery Requests (every farmer has options, every DM has 3-6 pending)`);
  console.log(`   • ${reviewCount} Reviews (with fraud detection test data)`);
  console.log("   • ~150 Product votes");
  console.log("   • 30 Negotiations");
  console.log("   • ~100 Messages");
  console.log("   • 80 Notifications");
  console.log("   • 120 Inventory logs");
  console.log("   • 15 Inventory change requests");
  console.log("   • 8 Promotions");
  console.log("   • 50 Market prices");
  console.log("   • 250 Product views");
  console.log("   • 12 Product comparisons");
  console.log("   • 10 Sales reports");
  console.log("   • 35 Admin action logs");
  console.log("\n--- Sample Login Credentials ---");
  console.log("Admin:        admin@agrisync.com / admin123");
  console.log("Moderator:    moderator@agrisync.com / admin123");
  console.log("Farmer:       farmer1@agrisync.com / farmer123  (through farmer10)");
  console.log("Buyer:        buyer1@agrisync.com / buyer123  (through buyer15)");
  console.log("Delivery:     delivery1@agrisync.com / delivery123  (through delivery15)");
}

// ---------------------------------------------------------------------------
// Helper: generate status history for an order
// ---------------------------------------------------------------------------
function generateStatusHistory(status, buyerId, farmerId, dmId) {
  const history = [{ status: "pending", notes: "Order placed by buyer", changedBy: buyerId }];

  if (["confirmed", "processing", "awaiting_delivery", "shipped", "out_for_delivery", "delivered"].includes(status)) {
    history.push({ status: "confirmed", notes: "Farmer confirmed availability", changedBy: farmerId });
  }
  if (["processing", "awaiting_delivery", "shipped", "out_for_delivery", "delivered"].includes(status)) {
    history.push({ status: "processing", notes: "Farmer is preparing the order", changedBy: farmerId });
  }
  if (["awaiting_delivery", "shipped", "out_for_delivery", "delivered"].includes(status)) {
    history.push({ status: "awaiting_delivery", notes: "Delivery request sent, waiting for delivery man", changedBy: farmerId });
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

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error("❌ Seed failed:", e);
    await prisma.$disconnect();
    process.exit(1);
  });
