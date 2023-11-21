const joi = require("@hapi/joi");

const createAddressSchema = joi.object({
  name: joi.string().required(),
  contact: joi.string().required(),
  pincode: joi.string().required(),
  state: joi.string().required(),
  city: joi.string().required(),
  houseInfo: joi.string().required(),
  streetName: joi.string().required(),
  country: joi.string().required(),
});

const checkoutValidation = joi.object({
  couponId: joi.string(),
  email: joi.string().required(),
  address: joi.object({
    name: joi.string().required(),
    contact: joi.string().required(),
    pincode: joi.string().required(),
    state: joi.string().required(),
    city: joi.string().required(),
    houseInfo: joi.string().required(),
    streetName: joi.string().required(),
    country: joi.string().required(),
  }),
});

module.exports = {
  createAddressSchema,
  checkoutValidation,
};
