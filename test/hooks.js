const { default: mongoose } = require("mongoose");
const { default: MongooseForBrackets } = require("../dist/src/index");
const { BracketsManager } = require("brackets-manager");
require("dotenv").config();

exports.mochaHooks = {
    beforeAll: async function () {
        await mongoose.connect(
            process.env["MONGODB_CONNECTION_STRING"],
            {
                ignoreUndefined: true,
            });

        // console.log(await Tournament.find({}).exec());
        // await Tournament.create({name: "Mock Tournament"});

        global.storage = new MongooseForBrackets(mongoose);
        global.manager = new BracketsManager(global.storage, true);

        console.log("Succesfully setup the database.");
    },
    afterAll: async function () {
        return await mongoose.disconnect();
    },
};
