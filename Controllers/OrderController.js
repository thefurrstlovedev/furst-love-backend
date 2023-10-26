const Order = require("../Models/OrderModel");

module.exports = {
  //* Get all orders of single user
  getUserOrders: async (req, res, next) => {
    try {
      const orders = await Order.find({ user_id: req.user._id })
        .populate("orderItems.product", "name")
        .lean();
      if (orders.length > 0) {
        orders.forEach((e) => {
          delete e.__v;
        });
      }
      console.log(orders);

      res.send(orders);
    } catch (error) {
      next(error);
    }
  },
  //* Get all orders
  getAllOrders: async (req, res, next) => {
    try {
      const orders = await Order.find()
        .populate("orderItems.product", "name")
        .lean();

      console.log(orders);
      res.send(orders);
    } catch (error) {
      next(error);
    }
  },

  //* Get details of single order
  getOrderDetails: async (req, res, next) => {
    try {
      console.log("This ran");
      const order = await Order.findOne({ _id: req.params.id })
        .populate("orderItems.product", "name")
        .lean();
      if (order != null) {
        delete order.__v;
      }
      console.log(order);
      res.send(order);
    } catch (error) {
      next(error);
    }
  },

  //* Update order status
  updateOrderStatus: async (req, res, next) => {
    try {
      if (req.body.status === 3) {
        const order = await Order.findOneAndUpdate(
          { _id: req.body.id },
          {
            $set: {
              orderStatus: req.body.orderStatus,
              deliveredAt: new Date(),
            },
          },
          { new: true }
        );

        res.send(order);
      } else {
        const order = await Order.findOneAndUpdate(
          { _id: req.body.id },
          {
            $set: {
              orderStatus: req.body.orderStatus,
            },
          },
          { new: true }
        );
        res.send(order);
      }
    } catch (error) {
      next(error);
    }
  },
};
