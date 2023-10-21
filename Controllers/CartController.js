const Cart = require("../Models/CartModel");
const Coupon = require("../Models/CouponModel");
const createError = require("http-errors");
const { createCartItem } = require("../Validators/CartValidation");
const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY);

module.exports = {
  //* Used to create user cart or if already exists then push new Item to it
  createCart: async (req, res, next) => {
    try {
      const validatedCartItem = await createCartItem.validateAsync(req.body);
      const cart = await Cart.findOneAndUpdate(
        { _id: req.user._id },
        {
          $push: {
            cartItems: [
              {
                quantity: validatedCartItem.quantity,
                product: validatedCartItem.product,
                size: validatedCartItem.size,
                petCount: validatedCartItem.petCount,
                petImages: validatedCartItem.petImages,
                color: validatedCartItem.color,
              },
            ],
          },
        },
        { upsert: true, new: true }
      );

      res.status(201).json({
        success: true,
        message: "Item added to cart",
      });
    } catch (error) {
      if (error.isJoi == true) error.status = 422;
      next(error);
    }
  },

  //* Used to get user cart
  getCart: async (req, res, next) => {
    try {
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
            "cartItems.petCount": 1,
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
          cart[0].cartDiscountAmount = Math.round(cart[0].cartDiscountAmount);
          cart[0].couponApplied = true;
        } else {
          cart[0].couponApplied = false;
        }
        cart[0].cartTotalAmount = cartTotalAmount;
        cart[0].taxRate = 16;
        const taxRate = 0.16;
        const taxAmount = cart[0].cartTotalAmount * taxRate;
        cart[0].taxAmount = Math.round(taxAmount);
        cart[0].totalPayable = Math.round(cart[0].cartTotalAmount + taxAmount);
        if (
          req.user.addresses.length <= 0 ||
          req.user.addresses[0].country.toString().toLowerCase() != "luxembourg"
        ) {
          const shippingRate = 10.65;
          if (cart[0].cartTotalWeight > 1) {
            const shippingCharges = Math.round(
              cart[0].cartTotalWeight * shippingRate
            );
            cart[0].shippingCharges = shippingCharges;
            cart[0].totalPayable = Math.round(
              cart[0].totalPayable + shippingCharges
            );
          } else {
            const shippingCharges = Math.round(1 * shippingRate);
            cart[0].shippingCharges = shippingCharges;
            cart[0].totalPayable = Math.round(
              cart[0].totalPayable + shippingCharges
            );
          }
        } else {
          cart[0].shippingCharges = 0;
        }

        res.json(cart);
      } else {
        res.json([]);
      }
    } catch (error) {
      if (error.isJoi == true) error.status = 422;
      next(error);
    }
  },

  getCartItemCount: async (req, res, next) => {
    try {
      const cart = await Cart.findOne({ _id: req.user._id });
      if (cart) {
        res.send({
          cartItems: cart.cartItems.length,
        });
      } else {
        res.send({
          cartItems: 0,
        });
      }
    } catch (error) {
      if (error.isJoi == true) error.status = 422;
      next(error);
    }
  },

  //* Used to remove item from cart
  removeFromCart: async (req, res, next) => {
    try {
      const cart = await Cart.findByIdAndUpdate(
        { _id: req.user._id },
        {
          $pull: {
            cartItems: { _id: req.params.id },
          },
        },
        { new: true }
      );

      if (cart) {
        if (cart.cartItems.length === 0) {
          await Cart.findByIdAndDelete(cart._id);
          res.status(202).json({
            status: true,
            message: "Item removed",
          });
        } else {
          res.status(202).json({
            status: true,
            message: "Item removed",
          });
        }
      } else {
        throw createError.NotFound("Cart is already empty");
      }
    } catch (error) {
      if (error.isJoi == true) error.status = 422;
      next(error);
    }
  },

  updateCartItemCount: async (req, res, next) => {
    try {
      const cart = await Cart.findOneAndUpdate(
        {
          _id: req.user._id,
          "cartItems._id": req.params.id,
        },
        {
          $inc: {
            "cartItems.$.quantity": req.params.quantity,
          },
        },
        { new: true }
      );
      if (!cart) throw createError.NotFound("Cart is empty");
      res.json({
        status: true,
        message: "Item quantity updated",
      });
    } catch (error) {
      if (error.isJoi == true) error.status = 422;
      next(error);
    }
  },
};
