const User = require("../Models/UserModel");
const { Resend } = require("resend");
const resend = new Resend(process.env.RESEND_API_KEY);
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
const createError = require("http-errors");
const crypto = require("crypto");
const joi = require("@hapi/joi");

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


      try {
        const data = await resend.emails.send({
          from: "no-reply@transactional.thefurrstlove.com",
          to: [user.email],
          subject: "Password Reset",
          html: `<!-- Change values in [brackets] in the template and pass { {variables} } with API call -->
          <!-- Feel free to adjust it to your needs and delete all these comments-->
          <!-- Also adapt TXT version of this email -->
          <!DOCTYPE html>
          <html xmlns="http://www.w3.org/1999/xhtml">
          
          <head>
            <title></title>
            <!--[if !mso]><!-- -->
            <meta http-equiv="X-UA-Compatible" content="IE=edge">
            <!--<![endif]-->
            <meta http-equiv="Content-Type" content="text/html; charset=UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <style type="text/css">
              #outlook a {
                padding: 0;
              }
          
              .ReadMsgBody {
                width: 100%;
              }
          
              .ExternalClass {
                width: 100%;
              }
          
              .ExternalClass * {
                line-height: 100%;
              }
          
              body {
                margin: 0;
                padding: 0;
                -webkit-text-size-adjust: 100%;
                -ms-text-size-adjust: 100%;
              }
          
              table,
              td {
                border-collapse: collapse;
                mso-table-lspace: 0pt;
                mso-table-rspace: 0pt;
              }
          
            </style>
            <!--[if !mso]><!-->
            <style type="text/css">
              @media only screen and (max-width:480px) {
                @-ms-viewport {
                  width: 320px;
                }
                @viewport {
                  width: 320px;
                }
              }
            </style>
            <!--<![endif]-->
            <!--[if mso]><xml>  <o:OfficeDocumentSettings>    <o:AllowPNG/>    <o:PixelsPerInch>96</o:PixelsPerInch>  </o:OfficeDocumentSettings></xml><![endif]-->
            <!--[if lte mso 11]><style type="text/css">  .outlook-group-fix {    width:100% !important;  }</style><![endif]-->
            <!--[if !mso]><!-->
            <link href="https://fonts.googleapis.com/css2?family=Open+Sans:wght@400;600&display=swap" rel="stylesheet" type="text/css">
            <style type="text/css">
              @import url('https://fonts.googleapis.com/css2?family=Open+Sans:wght@400;600&display=swap');
            </style>
            <!--<![endif]-->
            <style type="text/css">
              @media only screen and (max-width:595px) {
                .container {
                  width: 100% !important;
                }
                .button {
                  display: block !important;
                  width: auto !important;
                }
              }
            </style>
          </head>
          
          <body style="font-family: 'Inter', sans-serif; background: #E5E5E5;">
            <table width="100%" cellspacing="0" cellpadding="0" border="0" align="center" bgcolor="#F6FAFB">
              <tbody>
                <tr>
                  <td valign="top" align="center">
                    <table class="container" width="600" cellspacing="0" cellpadding="0" border="0">
                      <tbody>
                        <tr>
                          <td style="padding:48px 0 30px 0; text-align: center; font-size: 14px; color: #4C83EE;">
                            <img src="https://mailsend-email-assets.mailtrap.io/xmc1j14ju90kh7lh1ndxkmriihd1.png" style="height: 100px;" alt="" class="img-fluid">
                          </td>
                        </tr>
                        <tr>
                          <td class="main-content" style="padding: 48px 30px 40px; color: #000000;" bgcolor="#ffffff">
                            <table width="100%" cellspacing="0" cellpadding="0" border="0">
                              <tbody>
                                <tr>
                                  <td style="padding: 0 0 24px 0; font-size: 18px; line-height: 150%; font-weight: bold; color: #000000; letter-spacing: 0.01em;">
                                    Hello! ${user.name} Forgot your password?
                                  </td>
                                </tr>
                                <tr>
                                  <td style="padding: 0 0 10px 0; font-size: 14px; line-height: 150%; font-weight: 400; color: #000000; letter-spacing: 0.01em;">
                                    We received a password reset request for your account: <span style="color: #4C83EE;">${user.email}</span>.
                                  </td>
                                </tr>
                                
                                
                                <tr>
                                  <td style="padding: 0 0 10px 0; font-size: 14px; line-height: 150%; font-weight: 400; color: #000000; letter-spacing: 0.01em;">
                                    The password reset OTP is <strong>${otp}</strong> is only valid for the next 15 minutes.
                                  </td>
                                </tr>
                                <tr>
                                  <td style="padding: 0 0 60px 0; font-size: 14px; line-height: 150%; font-weight: 400; color: #000000; letter-spacing: 0.01em;">
                                    If you didn’t request the password reset, please ignore this message.
                                  </td>
                                </tr>
                                <tr>
                                  <td style="padding: 0 0 16px;">
                                    <span style="display: block; width: 117px; border-bottom: 1px solid #8B949F;"></span>
                                  </td>
                                </tr>
                                <tr>
                                  <td style="font-size: 14px; line-height: 170%; font-weight: 400; color: #000000; letter-spacing: 0.01em;">
                                    Best regards, <br><strong>The Furrst Love</strong>
                                  </td>
                                </tr>
                              </tbody>
                            </table>
                          </td>
                        </tr>
                        <tr>
                          <td style="padding: 24px 0 48px; font-size: 0px;">
                            <!--[if mso | IE]>      <table role="presentation" border="0" cellpadding="0" cellspacing="0">        <tr>          <td style="vertical-align:top;width:300px;">      <![endif]-->
                            <div class="outlook-group-fix" style="padding: 0 0 20px 0; vertical-align: top; display: inline-block; text-align: center; width:100%;">
                              <span style="padding: 0; font-size: 11px; line-height: 15px; font-weight: normal; color: #8B949F;"><strong>Dattaram Gawde - The Furrst Love</strong><br/>7 Rue Jean-Pierre Bierman , Valerie 4, 1268, Luxembourg
                              </div>
                            </div>
                            <!--[if mso | IE]>      </td></tr></table>      <![endif]-->
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </td>
                </tr>
              </tbody>
            </table>
          </body>
          </html>
          `,
        });

        res.json({
          status: true,
          message: `Email sent to ${user.email} successfully`,
        });

      } catch (error) {
        await User.findOneAndUpdate(
          { email },
          {
            $set: {
              verifyToken: undefined,
              verifyTokenExpire: undefined,
            },
          }
        );
        return next(createError.InternalServerError(error.message));
      }





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
