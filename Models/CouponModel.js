const mongoose = require("mongoose");
const Schema = mongoose.Schema;
var idValidator = require("mongoose-id-validator");

const CouponSchema = new Schema(
  {
    coupon: {
      type: String,
      required: true,
    },
    discount: {
      type: Number,
      required: true,
    },
    isEnabled: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: true }
);

CouponSchema.plugin(idValidator);

const Coupon = mongoose.model("coupon", CouponSchema);

module.exports = Coupon;
