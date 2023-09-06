const { default: mongoose, SchemaTypes } = require("mongoose");
const { MongoMemoryServer } = require("mongodb-memory-server");
const { TournamentSchema } = require("./models");
const { ParticipantSchema } = require("./models");
const { MatchSchema } = require("./models");
// require("dotenv").config();

exports.mochaGlobalSetup = async function () {
    const mongod = await MongoMemoryServer.create();

    await mongoose.connect(mongod.getUri(), {
        ignoreUndefined: true,
    });

    // console.log(await Tournament.find({}).exec());
    // await Tournament.create({name: "Mock Tournament"});
    await mongoose.model("Tournament", TournamentSchema);
    await mongoose.model("Participant", ParticipantSchema);
    await mongoose.model("Match", MatchSchema);

    console.log("Succesfully setup the database.");
};

exports.mochaGlobalTeardown = async function () {
    await mongoose.disconnect();
    console.log("Server has disconnected.");
};
