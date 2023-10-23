const Enquiry = require("../Models/EnquiryModel");
const createError = require("http-errors");
const { enquirySchema } = require("../Validators/EnquirySchemaValidation");



module.exports = {
    equire: async (req, res, next) => {
        try {
            //Used to validate incoming request first according to schema we provide
            const validated = await enquirySchema.validateAsync(req.body)


            const enquiry = new Enquiry(validated);
            const savedEnquiry = await enquiry.save();
            res.send({
                status: true,
                message: "Thanks for contacting us!",
            });


        } catch (error) {
            if (error.isJoi == true) error.status = 422;
            next(error);
        }
    },

    getAllEnquiries: async (req, res, next) => {
        try {
            const enquiries = await Enquiry.find();
            res.send(enquiries);
        } catch (error) {
            if (error.isJoi == true) error.status = 422;
            next(error);
        }
    },
};
