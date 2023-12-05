const mongoose = require("mongoose");
const Schema = mongoose.Schema;
const bcrypt = require("bcrypt");
const crypto = require("crypto");

const UserSchema = new Schema(
  {
    email: {
      type: String,
      required: true,
      lowercase: true,
      unique: true,
    },
    password: {
      type: String,
      required: true,
    },
    name: {
      type: String,
      required: [true, "Name is required"],
    },
    petName: {
      type: String,
    },
    petDOB: {
      type: Date,
    },
    customerDOB: {
      type: Date,
    },
    promotionalConsent: {
      type: Boolean,
      required: true,
    },
    whatsappConsent: {
      type: Boolean,
      required: true,
    },
    contact: {
      type: String,

      required: [true, "Contact is required"],
    },
    addresses: {
      type: [
        {
          name: {
            type: String,
            required: true,
          },
          contact: {
            type: String,
            required: true,
          },
          pincode: {
            type: String,
            required: true,
          },
          state: {
            type: String,
            required: true,
          },
          city: {
            type: String,
            required: true,
          },

          houseInfo: {
            type: String,
            required: true,
          },
          streetName: {
            type: String,
            required: true,
          },
          country: {
            type: String,
            required: true,
          },
        },
      ],
      required: false,
    },
    roles: {
      type: Array,
      default: ["Customer"],
    },
    verifyToken: {
      type: String,
      default: "",
    },
    verifyTokenExpire: {
      type: Date,
    },
  },
  { timestamps: true }
);

// Called before saving user and is used to create hashed password
UserSchema.pre("save", async function (next) {
  try {
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(this.password, salt);
    this.password = hashedPassword;
    next();
  } catch (error) {
    next(error);
  }
});

UserSchema.methods.isValidPassword = async function (password) {
  try {
    return await bcrypt.compare(password, this.password);
  } catch (error) {
    throw error;
  }
};

const User = mongoose.model("user", UserSchema);

module.exports = User;
