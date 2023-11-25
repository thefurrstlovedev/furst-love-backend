const Coupon = require("../Models/CouponModel");
const { couponSchema } = require("../Validators/CouponSchemaValidation");
const createError = require("http-errors");

module.exports = {
  insertCoupon: async (req, res, next) => {
    try {
      //Used to validate incoming request first according to schema we provide
      const validated = await couponSchema.validateAsync(req.body);

      //Used to check if email already exists in db
      const doesExists = await Coupon.findOne({ coupon: validated.coupon });

      //Breaks block if email exists
      if (doesExists)
        throw createError.Conflict(
          `${validated.coupon} is already been registered`
        );

      const coupon = new Coupon(validated);
      const savedCoupan = await coupon.save();
      res.send({
        status: true,
        message: "Registered Successfully!",
      });
    } catch (error) {
      if (error.isJoi == true) error.status = 422;
      next(error);
    }
  },

  getAllCoupons: async (req, res, next) => {
    try {
      const coupons = await Coupon.find();
      res.send(coupons);
    } catch (error) {
      if (error.isJoi == true) error.status = 422;
      next(error);
    }
  },
  deleteCoupon: async (req, res, next) => {
    try {
      await Coupon.deleteOne({ _id: req.params.id });
      res.send({
        status: true,
        message: "Coupon deleted",
      });
    } catch (error) {
      if (error.isJoi == true) error.status = 422;
      next(error);
    }
  },
};
