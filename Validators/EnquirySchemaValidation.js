const joi = require("@hapi/joi");

const enquirySchema = joi.object({
  email: joi.string().email().lowercase().required(),
  contact: joi.string().required(),
  firstName: joi.string().required(),
  lastName: joi.string().required(),
  message: joi.string().required(),
});

module.exports = {
  enquirySchema,
};
