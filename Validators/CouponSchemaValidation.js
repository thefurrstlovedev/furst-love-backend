const joi = require("@hapi/joi");

const couponSchema = joi.object({
  coupon: joi.string().required(),
  discount: joi.number().required(),
});

module.exports = {
  couponSchema,
};
