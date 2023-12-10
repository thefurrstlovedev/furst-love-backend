const express = require("express");
const morgan = require("morgan");
const Cart = require("./Models/CartModel");
const User = require("./Models/UserModel");
const Order = require("./Models/OrderModel");
const ObjectId = require("mongoose").Types.ObjectId;
const uuid = require("uuid");
const createError = require("http-errors");
require("dotenv").config();
require("./Helpers/initMongodb");
const cron = require("node-cron");
const { verifyAccessToken } = require("./Helpers/jwtHelper");
const cors = require("cors");
const AuthRoute = require("./Routes/AuthRoute");
const ProductRoute = require("./Routes/ProductRoute");
const CartRoute = require("./Routes/CartRoute");
const CouponRoute = require("./Routes/CouponRoute");
const CheckoutRoute = require("./Routes/CheckoutRoute");
const OrderRoute = require("./Routes/OrderRoute");
const EmailSubcriptionRoute = require("./Routes/EmailSubscriptionRoute");
const EnquiryRoute = require("./Routes/EnquiryRoute");
const { generateInvoice, sendInvoice } = require("./Helpers/pdfHelper");
const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY);
const app = express();
app.use(morgan("dev")); // Used for logging all request in console

app.use("/webhook", express.raw({ type: "*/*" }));

app.use(express.json()); // Used to handle json data in request body
app.use(express.urlencoded({ extended: true })); // Used to handle form data in request

app.use(
  cors({
    origin: "*",
  })
);

cron.schedule(
  "0 5 * * *",
  () => {
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

    // Remove cart items older than one day for guests
    Cart.deleteMany(
      { sid: { $ne: null }, createdAt: { $lt: oneDayAgo } },
      () => {
        console.log("Guest carts cleaned up.");
      }
    );
  },
  {
    scheduled: true,
    timezone: "Asia/Kolkata",
  }
);

app.post(
  "/webhook",
  express.raw({ type: "application/json" }),
  async (req, res) => {
    const sig = req.headers["stripe-signature"];

    let event;

    try {
      event = stripe.webhooks.constructEvent(
        req.body,
        sig,
        process.env.ENDPOINT_SECRET
      );
    } catch (err) {
      res.status(400).send(`Webhook Error: ${err.message}`);
      return;
    }

    switch (event.type) {
      case "payment_intent.created":
        const paymentIntentCreated = event.data.object;
        console.log(`Payment Intent Created ${paymentIntentCreated["id"]}`);
        break;

      case "payment_intent.succeeded":
        const paymentIntentSucceeded = event.data.object;
        stripe.customers
          .retrieve(paymentIntentSucceeded.customer)
          .then(async (customer) => {
            console.log(`Here comes the 💰💰💰💰💰💰`);

            if (paymentIntentSucceeded.metadata.session === "true") {
              console.log("session found it must be a session user");

              const cart = await Cart.aggregate([
                {
                  $match: {
                    sid: customer.metadata.userId,
                  },
                },
                {
                  $unwind: "$cartItems",
                },
                {
                  $lookup: {
                    from: "products",
                    localField: "cartItems.product",
                    foreignField: "_id",
                    as: "cartItems.product",
                  },
                },
                {
                  $unwind: "$cartItems.product",
                },
                {
                  $addFields: {
                    "cartItems.petCount": { $toInt: "$cartItems.petCount" }, // Subtract 1 from petCount
                  },
                },

                {
                  $addFields: {
                    "cartItems.itemTotalDiscountAmount": {
                      $cond: {
                        if: {
                          $gt: ["$cartItems.product.discount", 0],
                        },
                        then: {
                          $multiply: [
                            "$cartItems.quantity",
                            {
                              $divide: [
                                {
                                  $multiply: [
                                    {
                                      $arrayElemAt: [
                                        "$cartItems.product.prices",
                                        {
                                          $subtract: ["$cartItems.petCount", 1],
                                        },
                                      ],
                                    },
                                    "$cartItems.product.discount",
                                  ],
                                },
                                100,
                              ],
                            },
                          ],
                        },
                        else: 0,
                      },
                    },
                    "cartItems.itemOriginalAmount": {
                      $sum: {
                        $multiply: [
                          "$cartItems.quantity",
                          {
                            $arrayElemAt: [
                              "$cartItems.product.prices",
                              {
                                $subtract: ["$cartItems.petCount", 1],
                              },
                            ],
                          },
                        ],
                      },
                    },
                    "cartItems.itemTotalWeight": {
                      $sum: {
                        $multiply: [
                          "$cartItems.quantity",
                          "$cartItems.product.weight",
                        ],
                      },
                    },
                  },
                },
                {
                  $addFields: {
                    "cartItems.itemTotalAmount": {
                      $subtract: [
                        "$cartItems.itemOriginalAmount",
                        "$cartItems.itemTotalDiscountAmount",
                      ],
                    },
                  },
                },
                {
                  $group: {
                    _id: "$_id",
                    cartItems: {
                      $push: "$cartItems",
                    },
                  },
                },
                {
                  $project: {
                    "cartItems.quantity": 1,
                    "cartItems._id": 1,
                    "cartItems.product._id": 1,
                    "cartItems.product.name": 1,
                    "cartItems.product.discount": 1,
                    "cartItems.product.images": 1,
                    "cartItems.size": 1,
                    "cartItems.petCount": 1,
                    "cartItems.petImages": 1,
                    "cartItems.color": 1,
                    "cartItems.itemTotalWeight": 1,
                    "cartItems.itemTotalDiscountAmount": 1,
                    "cartItems.itemOriginalAmount": 1,
                    "cartItems.itemTotalAmount": 1,
                  },
                },
              ]);
              const currentDate = new Date();
              const year = currentDate.getFullYear();
              const month = currentDate.getMonth() + 1;
              const day = currentDate.getDate();
              const hour = currentDate.getHours();
              const minute = currentDate.getMinutes();
              const second = currentDate.getSeconds();
              const milliseconds = currentDate.getMilliseconds();
              const uniqueId = uuid.v4().substring(0, 8);
              const numericUuid = uniqueId
                .split("-")
                .map((hex) => parseInt(hex, 16))
                .join("");
              const receipt = `${year}${month}${day}-${hour}${minute}${second}-${milliseconds}-${numericUuid}`;

              let order = new Order();

              order.receipt = receipt;
              order.orderItems = cart[0].cartItems;
              order.user = customer.metadata.userId;
              order.transactionId = paymentIntentSucceeded.id;
              order.couponApplied =
                paymentIntentSucceeded.metadata.couponApplied;
              order.couponId = paymentIntentSucceeded.metadata.couponId;
              order.orderDiscountAmount =
                paymentIntentSucceeded.metadata.orderDiscountAmount;

              order.orderTotalWeight =
                paymentIntentSucceeded.metadata.orderTotalWeight;

              order.orderOriginalAmount =
                paymentIntentSucceeded.metadata.orderOriginalAmount;

              order.orderTotalAmount =
                paymentIntentSucceeded.metadata.orderTotalAmount;

              order.taxRate = paymentIntentSucceeded.metadata.taxRate;
              order.taxAmount = paymentIntentSucceeded.metadata.taxAmount;
              order.totalPayable = paymentIntentSucceeded.metadata.totalPayable;
              order.shippingCharges =
                paymentIntentSucceeded.metadata.shippingCharges;

              order.shippingInfo = {
                email: paymentIntentSucceeded.metadata.email,
                name: paymentIntentSucceeded.metadata.name,
                contact: paymentIntentSucceeded.metadata.contact,
                pincode: paymentIntentSucceeded.metadata.pincode,
                state: paymentIntentSucceeded.metadata.state,
                city: paymentIntentSucceeded.metadata.city,
                houseInfo: paymentIntentSucceeded.metadata.houseInfo,
                streetName: paymentIntentSucceeded.metadata.streetName,
                country: paymentIntentSucceeded.metadata.country,
              };

              const savedOrder = await order.save();
              await Cart.deleteOne({ sid: customer.metadata.userId });
              const { path, orderId, email, customerName } =
                await generateInvoice(savedOrder.receipt);
              await sendInvoice(path, orderId, email, customerName);
            } else {
              console.log("Address not found it must be a logged in user");
              const localUser = await User.findOne({
                _id: customer.metadata.userId,
              });

              const cart = await Cart.aggregate([
                {
                  $match: {
                    _id: ObjectId(customer.metadata.userId),
                  },
                },
                {
                  $unwind: "$cartItems",
                },
                {
                  $lookup: {
                    from: "products",
                    localField: "cartItems.product",
                    foreignField: "_id",
                    as: "cartItems.product",
                  },
                },
                {
                  $unwind: "$cartItems.product",
                },
                {
                  $addFields: {
                    "cartItems.petCount": { $toInt: "$cartItems.petCount" }, // Subtract 1 from petCount
                  },
                },

                {
                  $addFields: {
                    "cartItems.itemTotalDiscountAmount": {
                      $cond: {
                        if: {
                          $gt: ["$cartItems.product.discount", 0],
                        },
                        then: {
                          $multiply: [
                            "$cartItems.quantity",
                            {
                              $divide: [
                                {
                                  $multiply: [
                                    {
                                      $arrayElemAt: [
                                        "$cartItems.product.prices",
                                        {
                                          $subtract: ["$cartItems.petCount", 1],
                                        },
                                      ],
                                    },
                                    "$cartItems.product.discount",
                                  ],
                                },
                                100,
                              ],
                            },
                          ],
                        },
                        else: 0,
                      },
                    },
                    "cartItems.itemOriginalAmount": {
                      $sum: {
                        $multiply: [
                          "$cartItems.quantity",
                          {
                            $arrayElemAt: [
                              "$cartItems.product.prices",
                              {
                                $subtract: ["$cartItems.petCount", 1],
                              },
                            ],
                          },
                        ],
                      },
                    },
                    "cartItems.itemTotalWeight": {
                      $sum: {
                        $multiply: [
                          "$cartItems.quantity",
                          "$cartItems.product.weight",
                        ],
                      },
                    },
                  },
                },
                {
                  $addFields: {
                    "cartItems.itemTotalAmount": {
                      $subtract: [
                        "$cartItems.itemOriginalAmount",
                        "$cartItems.itemTotalDiscountAmount",
                      ],
                    },
                  },
                },
                {
                  $group: {
                    _id: "$_id",
                    cartItems: {
                      $push: "$cartItems",
                    },
                  },
                },
                {
                  $project: {
                    "cartItems.quantity": 1,
                    "cartItems._id": 1,
                    "cartItems.product._id": 1,
                    "cartItems.product.name": 1,
                    "cartItems.product.discount": 1,
                    "cartItems.product.images": 1,
                    "cartItems.size": 1,
                    "cartItems.petCount": 1,
                    "cartItems.petImages": 1,
                    "cartItems.color": 1,
                    "cartItems.itemTotalWeight": 1,
                    "cartItems.itemTotalDiscountAmount": 1,
                    "cartItems.itemOriginalAmount": 1,
                    "cartItems.itemTotalAmount": 1,
                  },
                },
              ]);
              const currentDate = new Date();
              const year = currentDate.getFullYear();
              const month = currentDate.getMonth() + 1;
              const day = currentDate.getDate();
              const hour = currentDate.getHours();
              const minute = currentDate.getMinutes();
              const second = currentDate.getSeconds();
              const milliseconds = currentDate.getMilliseconds();
              const uniqueId = uuid.v4().substring(0, 8);
              const numericUuid = uniqueId
                .split("-")
                .map((hex) => parseInt(hex, 16))
                .join("");
              const receipt = `${year}${month}${day}-${hour}${minute}${second}-${milliseconds}-${numericUuid}`;

              let order = new Order();

              order.receipt = receipt;
              order.orderItems = cart[0].cartItems;
              order.user = customer.metadata.userId;
              order.transactionId = paymentIntentSucceeded.id;
              order.couponApplied =
                paymentIntentSucceeded.metadata.couponApplied;
              order.couponId = paymentIntentSucceeded.metadata.couponId;
              order.orderDiscountAmount =
                paymentIntentSucceeded.metadata.orderDiscountAmount;

              order.orderTotalWeight =
                paymentIntentSucceeded.metadata.orderTotalWeight;

              order.orderOriginalAmount =
                paymentIntentSucceeded.metadata.orderOriginalAmount;

              order.orderTotalAmount =
                paymentIntentSucceeded.metadata.orderTotalAmount;

              order.taxRate = paymentIntentSucceeded.metadata.taxRate;
              order.taxAmount = paymentIntentSucceeded.metadata.taxAmount;
              order.totalPayable = paymentIntentSucceeded.metadata.totalPayable;
              order.shippingCharges =
                paymentIntentSucceeded.metadata.shippingCharges;

              order.shippingInfo = {
                email: localUser.email,
                name: localUser.addresses[0].name,
                contact: localUser.addresses[0].contact,
                pincode: localUser.addresses[0].pincode,
                state: localUser.addresses[0].state,
                city: localUser.addresses[0].city,
                houseInfo: localUser.addresses[0].houseInfo,
                streetName: localUser.addresses[0].streetName,
                country: localUser.addresses[0].country,
              };

              const savedOrder = await order.save();
              await Cart.deleteOne({ _id: localUser._id });
              const { path, orderId, email, customerName } =
                await generateInvoice(savedOrder.receipt);
              await sendInvoice(path, orderId, email, customerName);
            }
          })
          .catch((err) => console.log(err.message));
        break;

      default:
        console.log(`Unhandled event type ${event.type}`);
    }

    res.send().end();
  }
);

app.get("/health", async (req, res, next) => {
  res.send("🚀🚀 I'm flyingg!!! 🚀🚀");
});

app.use("/api/v1/auth", AuthRoute); // Mapping all routes definded under AuthRoute to /auth

app.use("/api/v1/product", ProductRoute); // Mapping all routes definded under ProductRoute to /product

app.use("/api/v1/cart", CartRoute);

app.use("/api/v1/coupon", CouponRoute);
app.use("/api/v1/buy", CheckoutRoute);

app.use("/api/v1/order", [verifyAccessToken], OrderRoute);
app.use("/api/v1/subscribe", EmailSubcriptionRoute);
app.use("/api/v1/enquire", EnquiryRoute);

app.use(async (req, res, next) => {
  next(createError.NotFound("This route does not exists"));
});

app.use((err, req, res, next) => {
  res.status(err.status || 500);
  res.send({
    error: {
      status: err.status || 500,
      message: err.message,
    },
  });
});

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`Server is running on ${PORT}`);
});
