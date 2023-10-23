const mongoose = require("mongoose");
const Schema = mongoose.Schema;


const EnquirySchema = new Schema(
    {
        firstName: {
            type: String,
            required: true,
        },
        lastName: {
            type: String,
            required: true,
        },
        email: {
            type: String,
            required: true,
        },
        message: {
            type: String,
            required: true,
        },

    },
    { timestamps: true }
);



const Enquiry = mongoose.model("enquiry", EnquirySchema);

module.exports = Enquiry;
