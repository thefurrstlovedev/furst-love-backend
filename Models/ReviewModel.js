const mongoose = require("mongoose");
const Schema = mongoose.Schema;
var idValidator = require("mongoose-id-validator");

const ReviewSchema = new Schema(
  {
    product: {
      type: Schema.Types.ObjectId,
      ref: "product",
      required: true,
    },

    images: {
      type: [String],
      required: true,
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
    message: {
      type: String,
    },
    location: {
      type: String,
    },
  },
  { timestamps: true }
);

ReviewSchema.plugin(idValidator);

const Review = mongoose.model("review", ReviewSchema);

module.exports = Review;
