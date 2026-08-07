const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function runTests() {
  console.log('=== AgriSync Backend Health Check ===\n');
  
  // 1. Connection
  const userCount = await prisma.user.count();
  console.log('✅ DB Connected | Users:', userCount);
  
  // 2. Count all tables
  const counts = await Promise.all([
    prisma.product.count().then(c => console.log('✅ Products:', c)),
    prisma.order.count().then(c => console.log('✅ Orders:', c)),
    prisma.review.count().then(c => console.log('✅ Reviews:', c)),
    prisma.message.count().then(c => console.log('✅ Messages:', c)),
    prisma.notification.count().then(c => console.log('✅ Notifications:', c)),
    prisma.negotiation.count().then(c => console.log('✅ Negotiations:', c)),
    prisma.inventoryLog.count().then(c => console.log('✅ Inventory Logs:', c)),
    prisma.promotion.count().then(c => console.log('✅ Promotions:', c)),
  ]);
  
  // 3. Sample data check
  const sampleUser = await prisma.user.findFirst({ where: { role: 'farmer' } });
  console.log('\n📋 Sample Farmer:', sampleUser?.name, '|', sampleUser?.email);
  
  const sampleProduct = await prisma.product.findFirst();
  console.log('📋 Sample Product:', sampleProduct?.name, '| Tk', sampleProduct?.price);
  
  console.log('\n🎉 All systems operational!');
  await prisma.$disconnect();
}

runTests().catch(e => {
  console.error('❌ Test failed:', e.message);
  process.exit(1);
});