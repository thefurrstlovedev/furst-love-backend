const mongoose = require("mongoose");
const Schema = mongoose.Schema;
var idValidator = require("mongoose-id-validator");

const ReviewSchema = new Schema(
  {
    user: {
      type: Schema.Types.ObjectId,
      ref: "user",
      required: true,
    },
    productId: {
      type: Schema.Types.ObjectId,
      ref: "product",
      required: true,
    },

    images: {
      type: [String],
    },

    name: {
      type: String,
      required: true,
    },
    rating: {
      type: Number,
      required: true,
    },
    comment: {
      type: String,
      required: true,
    },
  },
  { timestamps: true }
);

ReviewSchema.plugin(idValidator);

const Review = mongoose.model("review", ReviewSchema);

module.exports = Review;
