const prisma = require("../config/db");

// Helper to grant token
const getBkashToken = async () => {
  const response = await fetch(
    `${process.env.BKASH_BASE_URL}/tokenized/checkout/token/grant`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        username: process.env.BKASH_USERNAME,
        password: process.env.BKASH_PASSWORD,
      },
      body: JSON.stringify({
        app_key: process.env.BKASH_APP_KEY,
        app_secret: process.env.BKASH_APP_SECRET,
      }),
    },
  );
  const data = await response.json();
  return data.id_token;
};

const createBkashPayment = async (req, res) => {
  try {
    const { orderId } = req.body;
    const order = await prisma.order.findUnique({ where: { id: orderId } });

    if (!order) return res.status(404).json({ message: "Order not found" });

    const id_token = await getBkashToken();

    // Create Payment Request
    const createRes = await fetch(
      `${process.env.BKASH_BASE_URL}/tokenized/checkout/create`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: id_token,
          "X-APP-Key": process.env.BKASH_APP_KEY,
        },
        body: JSON.stringify({
          mode: "0011",
          payerReference: order.buyerId,
          callbackURL: `http://localhost:5000/api/payment/bkash/callback`,
          amount: order.totalAmount.toString(),
          currency: "BDT",
          intent: "sale",
          merchantInvoiceNumber: order.orderNumber,
        }),
      },
    );

    const data = await createRes.json();

    if (data.statusCode && data.statusCode !== "0000") {
      return res.status(400).json({ message: data.statusMessage });
    }

    res.json({ bkashURL: data.bkashURL });
  } catch (error) {
    res.status(500).json({ message: "Failed to create bKash payment" });
  }
};

const bkashCallback = async (req, res) => {
  const { paymentID, status } = req.query;

  if (status === "success") {
    try {
      const id_token = await getBkashToken();

      // Execute Payment
      const executeRes = await fetch(
        `${process.env.BKASH_BASE_URL}/tokenized/checkout/execute`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: id_token,
            "X-APP-Key": process.env.BKASH_APP_KEY,
          },
          body: JSON.stringify({ paymentID }),
        },
      );

      const data = await executeRes.json();

      if (data.statusCode === "0000") {
        await prisma.order.update({
          where: { orderNumber: data.merchantInvoiceNumber },
          data: { paymentStatus: "paid" },
        });

        const order = await prisma.order.findUnique({
          where: { orderNumber: data.merchantInvoiceNumber },
        });
        return res.redirect(`http://localhost:5173/orders/${order.id}`);
      } else {
        return res.redirect(`http://localhost:5173/orders?payment=failed`);
      }
    } catch (error) {
      return res.redirect(`http://localhost:5173/orders?payment=failed`);
    }
  } else {
    return res.redirect(`http://localhost:5173/orders?payment=${status}`);
  }
};

module.exports = { createBkashPayment, bkashCallback };
