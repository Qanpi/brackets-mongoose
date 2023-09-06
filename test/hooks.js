const { default: mongoose, SchemaTypes } = require("mongoose");
const { default: MongooseForBrackets } = require("../dist/src/index");
const { BracketsManager } = require("brackets-manager");
const { MongoMemoryServer } = require("mongodb-memory-server");
const { TournamentSchema } = require("./models");
const { ParticipantSchema } = require("./models");
const { MatchSchema } = require("./models");
// require("dotenv").config();

exports.mochaHooks = {
    beforeAll: async function () {
        const mongod = await MongoMemoryServer.create();

        await mongoose.connect(mongod.getUri(), {
            ignoreUndefined: true,
        });

        // console.log(await Tournament.find({}).exec());
        // await Tournament.create({name: "Mock Tournament"});
        await mongoose.model("Tournament", TournamentSchema);
        await mongoose.model("Participant", ParticipantSchema);
        await mongoose.model("Match", MatchSchema);

        global.storage = new MongooseForBrackets(mongoose);
        global.manager = new BracketsManager(global.storage, true);

        console.log("Succesfully setup the database.");
    },
    afterAll: async function () {
        return await mongoose.disconnect();
    },
};
