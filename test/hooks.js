const { default: mongoose } = require("mongoose");
const { MongoMemoryServer } = require("mongodb-memory-server");
const { TournamentSchema } = require("./models");
const { ParticipantSchema } = require("./models");
const { MatchSchema } = require("./models");
const { default: MongooseForBrackets } = require("../dist/index");
const { BracketsManager } = require("brackets-manager");
// require("dotenv").config();

exports.mochaGlobalSetup = async function () {
    const mongod = await MongoMemoryServer.create();

    await mongoose.connect(mongod.getUri(), {
        ignoreUndefined: true,
    });

    // console.log(await Tournament.find({}).exec());
    await mongoose.model("Tournament", TournamentSchema);
    await mongoose.model("Participant", ParticipantSchema);
    await mongoose.model("Match", MatchSchema);

    console.log("Succesfully setup the database.");
};

exports.mochaGlobalTeardown = async function () {
    await mongoose.disconnect();
    console.log("Server has disconnected.");
};

exports.mochaHooks = {
    beforeAll: function() {
        this.storage = new MongooseForBrackets(mongoose);
        this.manager = new BracketsManager(this.storage, true);
    },
    beforeEach: async function() {
        const Tournament = mongoose.model("Tournament");
        await Tournament.create({name: "Mock Tournament"});
    },
    afterEach: async function() {
        await this.storage.reset();
    }
};
