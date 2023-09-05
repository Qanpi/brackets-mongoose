const { default: mongoose } = require("mongoose");
require("dotenv").config();

exports.mochaHooks = {
    beforeAll: async function () {
        try {
            await mongoose.connect(
                process.env["MONGODB_CONNECTION_STRING"],
                {
                    ignoreUndefined: true,
                }
            );
        } catch (err) {
            console.error(err);
        }
        console.log("Succesfully established a connection with the database.");
    },
    afterAll: async function () {
        return await mongoose.disconnect();
    },
};
