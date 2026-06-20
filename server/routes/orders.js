const { Orders } = require("../models/orders");
const express = require("express");

const router = express.Router();

router.get(`/sales`, async (req, res) => {
  try {
    const yearQuery = req.query.year ? parseInt(req.query.year) : new Date().getFullYear();

    const ordersList = await Orders.find();

    let totalSales = 0;
    const monthlySales = [
      { month: "JAN", sale: 0 }, { month: "FEB", sale: 0 },
      { month: "MAR", sale: 0 }, { month: "APR", sale: 0 },
      { month: "MAY", sale: 0 }, { month: "JUN", sale: 0 },
      { month: "JUL", sale: 0 }, { month: "AUG", sale: 0 },
      { month: "SEP", sale: 0 }, { month: "OCT", sale: 0 },
      { month: "NOV", sale: 0 }, { month: "DEC", sale: 0 },
    ];

    ordersList.forEach(order => {
      const orderDate = new Date(order.date);
      if (orderDate.getFullYear() === yearQuery) {
        const month = orderDate.getMonth(); // 0-11
        const amount = parseInt(order.amount);
        
        if (!isNaN(amount)) {
          monthlySales[month].sale += amount;
          totalSales += amount;
        }
      }
    });

    return res.status(200).json({
      totalSales: totalSales,
      monthlySales: monthlySales,
    });
  } catch (error) {
    console.error("Error fetching sales data:", error);
    res.status(500).json({ message: "Failed to fetch sales data", error: error.message });
  }
});

router.get(`/`, async (req, res) => {
  try {
    const ordersList = await Orders.find(req.query);

    if (!ordersList) {
      res.status(500).json({ success: false });
    }

    return res.status(200).json(ordersList);
  } catch (error) {
    res.status(500).json({ success: false });
  }
});

router.get("/:id", async (req, res) => {
  const order = await Orders.findById(req.params.id);

  if (!order) {
    res
      .status(500)
      .json({ message: "The order with the given ID was not found." });
  }
  return res.status(200).send(order);
});

router.get(`/get/count`, async (req, res) => {
  const orderCount = await Orders.countDocuments();
  console.log("orders");

  if (!orderCount) {
    res.status(500).json({ success: false });
  } else {
    res.send({
      orderCount: orderCount,
    });
  }
});



router.post("/create", async (req, res) => {
  try {
    let order = new Orders({
      name: req.body.name,
      phoneNumber: req.body.phoneNumber,
      address: req.body.address,
      pincode: req.body.pincode,
      amount: req.body.amount,
      email: req.body.email,
      userid: req.body.userid,
      products: req.body.products,
      date: req.body.date,
    });

    order = await order.save();

    res.status(201).json(order);

  } catch (error) {
    console.error("Error creating order:", error);
    res.status(500).json({ message: "Failed to create order", error: error.message });
  }
});

router.delete("/:id", async (req, res) => {
  const deletedOrder = await Orders.findByIdAndDelete(req.params.id);

  if (!deletedOrder) {
    res.status(404).json({
      message: "Order not found!",
      success: false,
    });
  }

  res.status(200).json({
    success: true,
    message: "Order Deleted!",
  });
});

router.put("/:id", async (req, res) => {
  const order = await Orders.findByIdAndUpdate(
    req.params.id,
    {
      name: req.body.name,
      phoneNumber: req.body.phoneNumber,
      address: req.body.address,
      pincode: req.body.pincode,
      amount: req.body.amount,
      paymentIntentId: req.body.paymentIntentId,
      email: req.body.email,
      userid: req.body.userid,
      products: req.body.products,
      status: req.body.status,
    },
    { new: true }
  );

  if (!order) {
    return res.status(500).json({
      message: "Order cannot be updated!",
      success: false,
    });
  }

  res.send(order);
});

module.exports = router;
