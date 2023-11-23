const joi = require("@hapi/joi");

const createCartItem = joi.object({
  sid: joi.any(),
  quantity: joi.number().required(),
  product: joi.string().required(),
  size: joi.string().required(),
  petCount: joi.number().required(),
  petImages: joi.array().items(joi.string()).required(),
  color: joi.string().required(),
});

module.exports = {
  createCartItem,
};
