const EmailSubscriber = require("../Models/EmailSubscribersModel");
const createError = require("http-errors");
const joi = require("@hapi/joi");


module.exports = {
    subscribeToEmail: async (req, res, next) => {
        try {
            //Used to validate incoming request first according to schema we provide
            const validated = await joi.object({
                email: joi.string().email().lowercase().required(),
            }).validateAsync(req.body)

            //Used to check if email already exists in db
            const doesExists = await EmailSubscriber.findOne({ email: validated.email });

            //Breaks block if email exists
            if (doesExists) {
                res.send({
                    status: true,
                    message: "Thanks for subscribing!",
                });
            }
            else {
                const emailSubscriber = new EmailSubscriber(validated);
                const savedEmailSubscriber = await emailSubscriber.save();
                res.send({
                    status: true,
                    message: "Thanks for subscribing!",
                });
            }

        } catch (error) {
            if (error.isJoi == true) error.status = 422;
            next(error);
        }
    },

    getAllEmailSubscribers: async (req, res, next) => {
        try {
            const subscribers = await EmailSubscriber.find();
            res.send(subscribers);
        } catch (error) {
            if (error.isJoi == true) error.status = 422;
            next(error);
        }
    },
};
