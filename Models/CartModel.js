const mongoose = require("mongoose");
const Schema = mongoose.Schema;
var idValidator = require("mongoose-id-validator");
const CartSchema = new mongoose.Schema(
  {
    cartItems: [
      {
        quantity: { type: Number, required: true },
        product: { type: Schema.Types.ObjectId, ref: "product" },
        size: {
          type: String,
          required: true,
        },
        petCount: {
          type: String,
          required: true,
        },
        petImages: {
          type: [String],
          required: true,
        },
        color: {
          type: String,
        },
      },
    ],
    _id: {
      type: Schema.Types.ObjectId,
      required: true,
    },
  },
  { timestamps: true }
);

CartSchema.plugin(idValidator);

const Cart = mongoose.model("cart", CartSchema);

module.exports = Cart;
