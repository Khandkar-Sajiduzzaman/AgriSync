const prisma = require('../config/db');

async function resetAllRatings() {
  const products = await prisma.product.findMany({
    select: { id: true, farmerId: true },
  });

  for (const product of products) {
    const reviews = await prisma.review.findMany({
      where: { productId: product.id, isFlagged: false },
    });

    const avg = reviews.length > 0
      ? reviews.reduce((s, r) => s + r.rating, 0) / reviews.length
      : 0;

    await prisma.product.update({
      where: { id: product.id },
      data: {
        averageRating: parseFloat(avg.toFixed(2)),
        totalReviews: reviews.length,
      },
    });

    // Also fix farmer profile
    const farmerProducts = await prisma.product.findMany({
      where: { farmerId: product.farmerId },
      select: { averageRating: true, totalReviews: true },
    });

    const totalReviews = farmerProducts.reduce((s, p) => s + p.totalReviews, 0);
    const weighted = farmerProducts.reduce((s, p) => s + p.averageRating * p.totalReviews, 0);
    const farmerAvg = totalReviews > 0 ? weighted / totalReviews : 0;

    await prisma.farmerProfile.update({
      where: { userId: product.farmerId },
      data: {
        averageRating: parseFloat(farmerAvg.toFixed(2)),
        totalReviews: totalReviews,
      },
    });

    console.log(`Reset product ${product.id}: avg=${avg.toFixed(1)}, count=${reviews.length}`);
  }

  console.log('Done! All ratings reset.');
  process.exit(0);
}

resetAllRatings().catch((e) => {
  console.error(e);
  process.exit(1);
});