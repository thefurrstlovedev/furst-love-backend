const joi = require("@hapi/joi");

const insertProductSchema = joi.object({
  name: joi.string().required(),
  description: joi.string().required(),
  discount: joi.number(),
  prices: joi.array().items(joi.number().required()).required(),
  availableColors: joi.array().items(joi.string().required()),
  adultSizes: joi.array().items(joi.string().required()), // adultSize are not considered for frames and canvas
  kidSizes: joi.array().items(joi.string().required()), // kidSizes are not considered for frames and canvas
  images: joi.array().items(joi.string().required()).required(),
  showpieceSizes: joi.array().items(joi.string().required()),
  isShowpiece: joi.boolean().required(),
});

module.exports = {
  insertProductSchema,
};
