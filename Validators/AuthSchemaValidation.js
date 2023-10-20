const joi = require("@hapi/joi");

const authSchema = joi.object({
  email: joi.string().email().lowercase().required(),
  password: joi.string().min(4).required(),
});

const resetPasswordSchema = joi.object({
  email: joi.string().email().lowercase().required(),
});

const registerSchema = joi.object({
  email: joi.string().email().lowercase().required(),
  password: joi.string().min(4).required(),
  name: joi.string().required(),
  contact: joi.string().required(),
});

const registerAdminSchema = joi.object({
  email: joi.string().email().lowercase().required(),
  password: joi.string().min(4).required(),
  name: joi.string().required(),
  contact: joi.string().required(),
  roles: joi.array().items(joi.string().required()),
});

module.exports = {
  authSchema,
  registerSchema,
  registerAdminSchema,
  resetPasswordSchema,
};
