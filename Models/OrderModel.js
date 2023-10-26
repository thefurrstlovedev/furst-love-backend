const mongoose = require("mongoose");
const Schema = mongoose.Schema;
var idValidator = require("mongoose-id-validator");
const OrderSchema = new mongoose.Schema(
  {
    receipt: {
      type: String,
      required: true,
    },
    shippingInfo: {
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
    orderItems: [
      {
        quantity: { type: Number, required: true },
        product: { type: Schema.Types.ObjectId, ref: "product" },
        size: {
          type: String,
          required: true,
        },
        petCount: {
          type: Number,
          required: true,
        },
        petImages: {
          type: [String],
          required: true,
        },
        color: {
          type: String,
        },
        itemTotalWeight: {
          type: Number,
          required: true,
        },
        itemOriginalAmount: {
          type: Number,
          required: true,
        },
        itemTotalDiscountAmount: {
          type: Number,
          required: true,
        },
        itemTotalAmount: {
          type: Number,
          required: true,
        },
        isCancelled: {
          type: Boolean,
          default: false,
        },
      },
    ],
    user: {
      type: Schema.Types.ObjectId,
      ref: "user",
      required: true,
    },
    transactionId: {
      type: String,
      required: true,
    },
    orderStatus: {
      type: Number,
      required: true,
      default: 1,
    },
    couponApplied: {
      type: Boolean,
      required: true,
    },
    couponId: {
      type: String,
      default: "",
    },
    shippingCharges: {
      type: Number,
      required: true,
    },
    orderDiscountAmount: {
      type: Number,
      required: true,
    },
    orderTotalWeight: {
      type: Number,
      required: true,
    },
    orderOriginalAmount: {
      type: Number,
      required: true,
    },
    orderTotalAmount: {
      type: Number,
      required: true,
    },
    taxRate: {
      type: Number,
      required: true,
    },

    taxAmount: {
      type: Number,
      required: true,
    },
    totalPayable: {
      type: Number,
      required: true,
    },

    deliveredAt: { type: Date },
  },
  { timestamps: true }
);

OrderSchema.plugin(idValidator);

const Order = mongoose.model("order", OrderSchema);

module.exports = Order;

//* orderItemsTotalDiscount variable holds how much discount user got on current order bundle

//* orderItemsOriginalAmount variable holds original cost of order items excluding shipping charges & discount

//* orderTotalAmount refers to total payable amount by user after adding shipping charges
