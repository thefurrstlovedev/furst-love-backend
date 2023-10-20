const User = require("../Models/UserModel");
const {
  authSchema,
  registerSchema,
  resetPasswordSchema,
  registerAdminSchema,
} = require("../Validators/AuthSchemaValidation");
const {
  createAddressSchema,
} = require("../Validators/AddressSchemaValidation");
const {
  signAccessToken,
  signRefreshToken,
  verifyRefreshToken,
} = require("../Helpers/jwtHelper");
const { sendPasswordResetEmail } = require("../Helpers/sendEmail");
const createError = require("http-errors");
const crypto = require("crypto");
const joi = require("@hapi/joi");
const ejs = require("ejs");

module.exports = {
  //* Register new user
  register: async (req, res, next) => {
    try {
      //Used to validate incoming request first according to schema we provide
      const validated = await registerSchema.validateAsync(req.body);

      //Used to check if email already exists in db
      const doesExists = await User.findOne({ email: validated.email });

      //Breaks block if email exists
      if (doesExists)
        throw createError.Conflict(
          `${validated.email} is already been registered`
        );

      const user = new User(validated);
      const savedUser = await user.save();
      res.send({
        status: true,
        message: "Registered Successfully!",
      });
    } catch (error) {
      if (error.isJoi == true) error.status = 422;
      next(error);
    }
  },

  //* Register new admin in system, this is Admin only API
  registerAdmin: async (req, res, next) => {
    try {
      //Used to validate incoming request first according to schema we provide
      const validated = await registerAdminSchema.validateAsync(req.body);

      //Used to check if email already exists in db
      const doesExists = await User.findOne({ email: validated.email });

      //Breaks block if email exists
      if (doesExists)
        throw createError.Conflict(
          `${validated.email} is already been registered`
        );
      const user = new User(validated);
      const savedUser = await user.save();
      res.send({
        status: true,
        message: "User registered with ADMIN privileges!",
      });
    } catch (error) {
      if (error.isJoi == true) error.status = 422;
      next(error);
    }
  },

  //* Login user by providing username and password and receive access & refresh token in return
  login: async (req, res, next) => {
    try {
      const validated = await authSchema.validateAsync(req.body);
      const user = await User.findOne({ email: validated.email });
      if (!user) throw createError.NotFound("User not registered");

      const isMatched = await user.isValidPassword(validated.password);

      if (!isMatched)
        throw createError.BadRequest("Username / password not valid");

      const accessToken = await signAccessToken(user.id);
      const refreshToken = await signRefreshToken(user.id);
      res.send({ accessToken, refreshToken });
    } catch (error) {
      if (error.isJoi == true)
        return next(createError.BadRequest("Username / password not valid"));
      next(error);
    }
  },

  //* Add new address to user addresses
  createAddress: async (req, res, next) => {
    try {
      //Used to validate incoming request first according to schema we provide
      const validatedAddress = await createAddressSchema.validateAsync(
        req.body
      );

      const updatedUser = await User.findByIdAndUpdate(
        { _id: req.user._id },
        {
          $push: {
            addresses: validatedAddress,
          },
        },
        { new: true }
      );

      res.send({
        status: true,
        message: "Address Added!",
      });
    } catch (error) {
      if (error.isJoi == true) error.status = 422;
      next(error);
    }
  },

  updateUser: async (req, res, next) => {
    try {
      const savedUser = await User.findOneAndUpdate(
        { email: req.user.email },
        {
          $set: req.body,
        }
      ).lean();
      if (!savedUser)
        throw createError.NotFound(`${req.body.email} is not registered`);
      res.json({
        status: true,
        message: `${savedUser.email} Profile Updated`,
        oldProfileImageLink: savedUser.profileImageUrl,
      });
    } catch (error) {
      if (error.isJoi == true) error.status = 422;
      next(error);
    }
  },

  //* This is used when accessToken is expired then user can input refreshToken of his and in return will receive newly generated accessToken & refreshToken
  refreshToken: async (req, res, next) => {
    try {
      const { refreshToken } = req.body;
      if (!refreshToken) throw createError.BadRequest();
      const userId = await verifyRefreshToken(refreshToken);
      const accessToken = await signAccessToken(userId);
      const newRefreshToken = await signRefreshToken(userId);
      res.send({ accessToken: accessToken, refreshToken: newRefreshToken });
    } catch (error) {
      next(error);
    }
  },

  //* Used to request OTP to reset the password once OTP is generated verifyToken & its expiration is added to user
  forgotPassword: async (req, res, next) => {
    try {
      //Used to validate incoming request first according to schema we provide
      const { email } = await resetPasswordSchema.validateAsync(req.body);

      //Used to check if email exists in db
      const user = await User.findOne({ email: email });

      //Breaks block if email doesn't exists
      if (!user) throw createError.NotFound(`${email} not registered`);

      const otp = crypto.randomInt(1000, 9999).toString();
      const resetPasswordToken = crypto
        .createHash("sha256")
        .update(otp)
        .digest("hex");
      const resetPasswordExpire = Date.now() + 15 * 60 * 1000;
      await User.findOneAndUpdate(
        { email },
        {
          $set: {
            verifyToken: resetPasswordToken,
            verifyTokenExpire: resetPasswordExpire,
          },
        }
      );

      const message = {
        otp: otp,
        name: user.name,
      };

      console.log(otp);
      res.json({
        status: true,
        message: `Email sent to ${user.email} successfully`,
      });
      // TODO : ENABLE EMAILING SERVICE BY UNCOMMENTING BELOW CODE
      // try {
      //   await sendPasswordResetEmail({
      //     email: user.email,
      //     subject: `Ecommerce Password Recovery`,
      //     message,
      //   });
      //   res.json({
      //     status: true,
      //     message: `Email sent to ${user.email} successfully`,
      //   });
      // } catch (error) {
      //   User.findOneAndUpdate(
      //     { email },
      //     {
      //       $set: {
      //         verifyToken: undefined,
      //         verifyTokenExpire: undefined,
      //       },
      //     }
      //   );
      //   return next(createError.InternalServerError(error.message));
      // }
    } catch (error) {
      if (error.isJoi == true) error.status = 422;
      next(error);
    }
  },

  //* Used to reset password by providing email, OTP received in email & new password. OTP is hashed first and then compared to User's verifyToken property then token expiration is checked & on successful check new password is saved
  resetPassword: async (req, res, next) => {
    try {
      const validated = await joi
        .object({
          email: joi.string().email().lowercase().required(),
          password: joi.string().min(4).required(),
          otp: joi.number().required(),
        })
        .validateAsync(req.body);

      const token = crypto
        .createHash("sha256")
        .update(validated.otp.toString())
        .digest("hex");
      const user = await User.findOne({
        email: validated.email,
      });

      if (!user)
        throw createError.NotFound(`${validated.email} is not registered`);

      if (user.verifyToken === token && user.verifyTokenExpire > Date.now()) {
        user.password = validated.password;
        user.verifyToken = undefined;
        user.verifyTokenExpire = undefined;
        await user.save();
        res.send({
          status: true,
          message: "Password changed",
        });
      } else {
        throw createError.BadRequest(
          "Reset password OTP is invalid or has been expired"
        );
      }
    } catch (error) {
      if (error.isJoi == true) error.status = 422;
      next(error);
    }
  },

  //* Used to get all users in system,this is Admin only fuction
  getAllUsers: async (req, res, next) => {
    try {
      const users = await User.find().lean();
      users.forEach(async (user) => {
        delete user.__v;
        delete user.password;
        delete user.verifyToken;
        delete user.verifyTokenExpire;
      });
      res.send(users);
    } catch (error) {
      if (error.isJoi == true) error.status = 422;
      next(error);
    }
  },
  //* Used to delete particular user from system,this is Admin only function
  deleteUser: async (req, res, next) => {
    try {
      const user = await User.findByIdAndDelete(req.param.id);
      res.send({
        status: "true",
        message: `${user.email} deleted !`,
      });
    } catch (error) {
      if (error.isJoi == true) error.status = 422;
      next(error);
    }
  },

  //* Used to verify OTP required for password reset
  verifyOTP: async (req, res, next) => {
    try {
      const validated = await joi
        .object({
          otp: joi.number().required(),
        })
        .validateAsync(req.body);

      const token = crypto
        .createHash("sha256")
        .update(validated.otp.toString())
        .digest("hex");
      const user = await User.findOne({
        verifyToken: token,
        verifyTokenExpire: { $gt: Date.now() },
      });

      if (!user)
        throw createError.BadRequest(
          "Reset password OTP is invalid or has been expired"
        );

      res.send({
        status: true,
        message: "OTP validated",
      });
    } catch (error) {
      if (error.isJoi == true) error.status = 422;
      next(error);
    }
  },

  getCurrentUser: async (req, res, next) => {
    try {
      const user = req.user;
      delete user.password;
      delete user.roles;
      delete user.verifyToken;
      delete user.verifyTokenExpire;
      res.json(user);
    } catch (error) {
      next(error);
    }
  },
};
