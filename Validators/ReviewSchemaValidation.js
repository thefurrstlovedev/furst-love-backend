const joi = require("@hapi/joi");

const ReviewSchema = joi.object({
  product: joi.string().required(),
  rating: joi.number().required(),
  comment: joi.string().required(),
  name: joi.string().required(),
  images: joi.array().items(joi.string()).required(),
  message: joi.string(),
  location: joi.string(),
});
module.exports = {
  ReviewSchema,
};
