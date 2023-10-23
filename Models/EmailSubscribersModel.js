const mongoose = require("mongoose");
const Schema = mongoose.Schema;


const EmailSubscriberSchema = new Schema(
    {
        email: {
            type: String,
            required: true,
        },
    },
    { timestamps: true }
);



const EmailSubscriber = mongoose.model("emailSubscriber", EmailSubscriberSchema);

module.exports = EmailSubscriber;
