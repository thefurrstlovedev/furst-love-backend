const Cart = require("../Models/CartModel");
const Coupon = require("../Models/CouponModel");
const Order = require("../Models/OrderModel");
const createError = require("http-errors");
const { checkoutValidation } = require("../Validators/AddressSchemaValidation");
const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY);

module.exports = {
  checkout: async (req, res, next) => {
    try {
      const { couponId } = req.body;

      let availableDiscount = 0;

      if (couponId) {
        const doesExists = await Coupon.findOne({ coupon: couponId });
        const isCouponUsed = await Order.findOne({
          couponId: couponId,
          user: req.user._id,
        }).lean();
        if (
          doesExists != null &&
          doesExists.isEnabled === true &&
          !isCouponUsed
        ) {
          availableDiscount = doesExists.discount;
        }
      }

      const cart = await Cart.aggregate([
        {
          $match: {
            _id: req.user._id,
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
                $multiply: ["$cartItems.quantity", "$cartItems.product.weight"],
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

            cartDiscountAmount: {
              $sum: "$cartItems.itemTotalDiscountAmount",
            },
            cartTotalWeight: {
              $sum: "$cartItems.itemTotalWeight",
            },
            cartOriginalAmount: {
              $sum: "$cartItems.itemOriginalAmount",
            },
            cartTotalAmount: {
              $sum: "$cartItems.itemTotalAmount",
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
            "cartItems.itemTotalWeight": 1,
            "cartItems.itemTotalDiscountAmount": 1,
            "cartItems.itemOriginalAmount": 1,
            "cartItems.itemTotalAmount": 1,
            cartTotalWeight: 1,
            cartDiscountAmount: 1,
            cartOriginalAmount: 1,
            cartTotalAmount: 1,
          },
        },
      ]);

      if (cart.length > 0) {
        let cartTotalAmount = cart[0].cartTotalAmount;

        if (availableDiscount > 0) {
          const discountAmount = (availableDiscount * cartTotalAmount) / 100;
          cartTotalAmount -= discountAmount;
          cart[0].cartDiscountAmount += discountAmount;
          cart[0].cartDiscountAmount = cart[0].cartDiscountAmount.toFixed(2);
          cart[0].couponApplied = true;
        } else {
          cart[0].couponApplied = false;
        }
        cart[0].cartTotalAmount = cartTotalAmount;
        cart[0].taxRate = 16;
        const taxRate = 0.16;
        const taxAmount = cart[0].cartTotalAmount * taxRate;
        cart[0].taxAmount = taxAmount.toFixed(2);
        cart[0].totalPayable = (cart[0].cartTotalAmount + taxAmount).toFixed(2);
        // if (
        //   req.user.addresses[0].country.toString().toLowerCase() != "luxembourg"
        // ) {
        //   const shippingRate = 10.65;
        //   if (cart[0].cartTotalWeight > 1) {
        //     const shippingCharges = Math.round(
        //       cart[0].cartTotalWeight * shippingRate
        //     );
        //     cart[0].shippingCharges = shippingCharges;
        //     cart[0].totalPayable = Math.round(
        //       cart[0].totalPayable + shippingCharges
        //     );
        //   } else {
        //     const shippingCharges = Math.round(1 * shippingRate);
        //     cart[0].shippingCharges = shippingCharges;
        //     cart[0].totalPayable = Math.round(
        //       cart[0].totalPayable + shippingCharges
        //     );
        //   }
        // } else {
        //   cart[0].shippingCharges = 0;
        // }
        cart[0].shippingCharges = 0;
        const searchedCustomer = await stripe.customers.search({
          query: `metadata['userId']:'${req.user._id.toString()}'`,
        });

        let customerObj = null;

        if (searchedCustomer["data"].length > 0) {
          console.log("Returning Customer");
          customerObj = searchedCustomer["data"][0];
        } else {
          console.log("Creating New stripe customer");
          const customer = await stripe.customers.create({
            metadata: {
              userId: req.user._id.toString(),
            },
          });
          customerObj = customer;
        }

        if (customerObj != null) {
          const paymentIntent = await stripe.paymentIntents.create({
            amount: Math.round(cart[0].totalPayable * 100),
            currency: "eur",
            automatic_payment_methods: {
              enabled: true,
            },
            receipt_email: req.user.email,
            customer: customerObj["id"],
            metadata: {
              email: req.user.email,
              orderDiscountAmount: cart[0].cartDiscountAmount,
              orderTotalWeight: cart[0].cartTotalWeight,
              orderOriginalAmount: cart[0].cartOriginalAmount,
              orderTotalAmount: cart[0].cartTotalAmount,
              couponApplied: cart[0].couponApplied,
              taxRate: cart[0].taxRate,
              taxAmount: cart[0].taxAmount,
              totalPayable: cart[0].totalPayable,
              couponId: couponId,
              shippingCharges: cart[0].shippingCharges,
            },
          });

          res.send({
            clientSecret: paymentIntent.client_secret,
          });
        } else {
          throw createError.NotAcceptable("Unable to create stripe customer");
        }
      } else {
        throw createError.NotAcceptable("Cart is empty!");
      }
    } catch (error) {
      console.log(error);
      if (error.isJoi == true) error.status = 422;
      next(error);
    }
  },

  config: async (req, res, next) => {
    try {
      if (req.user.addresses.length === 0) {
        throw createError.NotAcceptable(
          "Oops\nPlease add default shipping address in account page"
        );
      } else {
        res.send({
          publishableKey: process.env.STRIPE_PUBLISHABLE_KEY,
        });
      }
    } catch (error) {
      if (error.isJoi == true) error.status = 422;
      next(error);
    }
  },

  sessionConfig: async (req, res, next) => {
    try {
      res.send({
        publishableKey: process.env.STRIPE_PUBLISHABLE_KEY,
      });
    } catch (error) {
      if (error.isJoi == true) error.status = 422;
      next(error);
    }
  },

  sessionCheckout: async (req, res, next) => {
    try {
      const validated = await checkoutValidation.validateAsync(req.body);
      const { couponId } = req.body;

      let availableDiscount = 0;

      if (couponId) {
        const doesExists = await Coupon.findOne({ coupon: couponId });

        if (doesExists != null && doesExists.isEnabled === true) {
          availableDiscount = doesExists.discount;
        }
      }

      const cart = await Cart.aggregate([
        {
          $match: {
            sid: validated.sid,
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
                $multiply: ["$cartItems.quantity", "$cartItems.product.weight"],
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

            cartDiscountAmount: {
              $sum: "$cartItems.itemTotalDiscountAmount",
            },
            cartTotalWeight: {
              $sum: "$cartItems.itemTotalWeight",
            },
            cartOriginalAmount: {
              $sum: "$cartItems.itemOriginalAmount",
            },
            cartTotalAmount: {
              $sum: "$cartItems.itemTotalAmount",
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
            "cartItems.itemTotalWeight": 1,
            "cartItems.itemTotalDiscountAmount": 1,
            "cartItems.itemOriginalAmount": 1,
            "cartItems.itemTotalAmount": 1,
            cartTotalWeight: 1,
            cartDiscountAmount: 1,
            cartOriginalAmount: 1,
            cartTotalAmount: 1,
          },
        },
      ]);

      if (cart.length > 0) {
        let cartTotalAmount = cart[0].cartTotalAmount;

        if (availableDiscount > 0) {
          const discountAmount = (availableDiscount * cartTotalAmount) / 100;
          cartTotalAmount -= discountAmount;
          cart[0].cartDiscountAmount += discountAmount;
          cart[0].cartDiscountAmount = cart[0].cartDiscountAmount.toFixed(2);
          cart[0].couponApplied = true;
        } else {
          cart[0].couponApplied = false;
        }
        cart[0].cartTotalAmount = cartTotalAmount;
        cart[0].taxRate = 16;
        const taxRate = 0.16;
        const taxAmount = cart[0].cartTotalAmount * taxRate;
        cart[0].taxAmount = taxAmount.toFixed(2);
        cart[0].totalPayable = (cart[0].cartTotalAmount + taxAmount).toFixed(2);
        // if (
        //   req.user.addresses[0].country.toString().toLowerCase() != "luxembourg"
        // ) {
        //   const shippingRate = 10.65;
        //   if (cart[0].cartTotalWeight > 1) {
        //     const shippingCharges = Math.round(
        //       cart[0].cartTotalWeight * shippingRate
        //     );
        //     cart[0].shippingCharges = shippingCharges;
        //     cart[0].totalPayable = Math.round(
        //       cart[0].totalPayable + shippingCharges
        //     );
        //   } else {
        //     const shippingCharges = Math.round(1 * shippingRate);
        //     cart[0].shippingCharges = shippingCharges;
        //     cart[0].totalPayable = Math.round(
        //       cart[0].totalPayable + shippingCharges
        //     );
        //   }
        // } else {
        //   cart[0].shippingCharges = 0;
        // }
        cart[0].shippingCharges = 0;

        let customerObj = null;

        console.log("Creating New stripe customer");
        const customer = await stripe.customers.create({
          metadata: {
            userId: validated.sid,
          },
        });
        customerObj = customer;

        if (customerObj != null) {
          const paymentIntent = await stripe.paymentIntents.create({
            amount: Math.round(cart[0].totalPayable * 100),
            currency: "eur",
            automatic_payment_methods: {
              enabled: true,
            },
            receipt_email: validated.email,
            customer: customerObj["id"],
            metadata: {
              email: validated.email,
              orderDiscountAmount: cart[0].cartDiscountAmount,
              orderTotalWeight: cart[0].cartTotalWeight,
              orderOriginalAmount: cart[0].cartOriginalAmount,
              orderTotalAmount: cart[0].cartTotalAmount,
              couponApplied: cart[0].couponApplied,
              taxRate: cart[0].taxRate,
              taxAmount: cart[0].taxAmount,
              totalPayable: cart[0].totalPayable,
              couponId: couponId,
              shippingCharges: cart[0].shippingCharges,
              session: true,
              name: validated.address.name,
              contact: validated.address.contact,
              pincode: validated.address.pincode,
              state: validated.address.state,
              city: validated.address.city,
              houseInfo: validated.address.houseInfo,
              streetName: validated.address.streetName,
              country: validated.address.country,
            },
          });

          res.send({
            clientSecret: paymentIntent.client_secret,
          });
        } else {
          throw createError.NotAcceptable("Unable to create stripe customer");
        }
      } else {
        throw createError.NotAcceptable("Cart is empty!");
      }
    } catch (error) {
      console.log(error);
      if (error.isJoi == true) error.status = 422;
      next(error);
    }
  },
};
