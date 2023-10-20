const mongoose = require("mongoose");
const Schema = mongoose.Schema;
var idValidator = require("mongoose-id-validator");

const ProductSchema = new Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    description: {
      type: String,
      required: true,
    },
    discount: {
      type: Number,
      default: 0,
    },
    prices: {
      type: [Number],
      required: true,
    },
    availableColors: {
      type: [String],
      required: true,
    },
    weight: {
      type: Number,
      required: true,
    },
    adultSizes: {
      type: [String],
      required: true,
    },
    kidSizes: {
      type: [String],
      required: true,
    },
    showpeiceSizes: {
      type: [String],
      required: true,
    },
    images: {
      type: [String],
    },
    rating: {
      type: Number,
      default: 0,
    },
    numOfReviews: {
      type: Number,
      default: 0,
    },
    isAvailable: {
      type: Boolean,
      default: true,
    },

    isShowpiece: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true }
);

ProductSchema.plugin(idValidator);

const Product = mongoose.model("product", ProductSchema);

module.exports = Product;
