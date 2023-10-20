const joi = require("@hapi/joi");

const ReviewSchema = joi.object({
  productId: joi.string().required(),
  rating: joi.number().required(),
  comment: joi.string().required(),
  images: joi.array().items(joi.string()),
});
module.exports = {
  ReviewSchema,
};
