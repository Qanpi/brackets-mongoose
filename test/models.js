const { default: mongoose, SchemaTypes } = require("mongoose");
const ObjectId = SchemaTypes.ObjectId;

const ParticipantSchema = new mongoose.Schema(
    {
        group: {
            type: mongoose.SchemaTypes.ObjectId,
        },

        tournament: {
            type: mongoose.SchemaTypes.ObjectId,
            alias: "tournament_id",
            index: true,
        },
    },
    {
        toJSON: { virtuals: true },
        toObject: { virtuals: true },
    }
);
exports.ParticipantSchema = ParticipantSchema;
const ParticipantResultSchema = new mongoose.Schema(
    {
        forfeit: Boolean,
        name: String,
        id: {
            type: ObjectId,
        },
        position: Number,
        result: {
            type: String,
            enum: ["win", "draw", "loss"],
        },
        score: Number,
    },
    { _id: false }
);
exports.ParticipantResultSchema = ParticipantResultSchema;
const MatchGameSchema = new mongoose.Schema(
    {
        number: Number,
        opponent1: ParticipantResultSchema,
        opponent2: ParticipantResultSchema,
        status: {
            type: Number,
        },
    },
    {
        virtuals: {
            parent_id: {
                get() {
                    return this.$parent()?._id;
                },
            },

            stage_id: {
                get() {
                    return this.$parent().stage; //FIXME: not typesafe because circular ref
                },
            },
        },
        toJSON: { virtuals: true },
        toObject: { virtuals: true },
    }
);
exports.MatchGameSchema = MatchGameSchema;
const GroupSchema = new mongoose.Schema(
    {
        number: Number,
        stage: {
            type: mongoose.SchemaTypes.ObjectId,
            alias: "stage_id",
        },
        options: {
            breakingCount: Number,
        },
    },
    {
        toObject: { virtuals: true },
        toJSON: { virtuals: true },
    }
);
const MatchSchema = new mongoose.Schema(
    {
        childCount: {
            type: Number,
            alias: "child_count",
        },
        group: {
            type: ObjectId,
            alias: "group_id",
        },
        number: Number,
        opponent1: ParticipantResultSchema,
        opponent2: ParticipantResultSchema,
        round: {
            type: ObjectId,
            alias: "round_id",
        },
        stage: {
            type: ObjectId,
            alias: "stage_id",
        },
        status: {
            type: Number,
        },
        games: [MatchGameSchema],
        // team1: {
        //     team: {
        //         type: mongoose.SchemaTypes.ObjectId,
        //         ref: collections.teams.id
        //     },
        //     scored: {type: Number}
        // },
        // team2: {
        //     team: {
        //         type: mongoose.SchemaTypes.ObjectId,
        //         ref: collections.teams.id
        //     },
        //     scored: {type: Number}
        // },
    },
    {
        statics: {
            translateAliases: (data) => {
                data = data.toObject();

                data.childCount = data["child_count"];
                data.group = data["group_id"];
                data.round = data["round_id"];
                data.stage = data["stage_id"];

                mergeWith(
                    data,
                    data.opponent1,
                    (_objValue, srcValue, key, object) => {
                        const flatKey = "opponent1." + key;
                        object[flatKey] = srcValue;
                        delete object[key];
                    }
                );

                return data;
            },
        },
        toJSON: { virtuals: true },
        toObject: { virtuals: true },
    }
);
exports.MatchSchema = MatchSchema;
const StageSchema = new mongoose.Schema(
    {
        name: String,
        number: Number,
        settings: {
            size: Number,
            seedOrdering: {
                type: [String],
                enum: [
                    "natural",
                    "reverse",
                    "half_shift",
                    "reverse_half_shift",
                    "pair_flip",
                    "inner_outer",
                    "groups.effort_balanced",
                    "groups.seed_optimized",
                    "groups.bracket_optimized",
                ],
            },
            balanceByes: Boolean,
            consolationFinal: Boolean,
            grandFinal: {
                type: String,
                enum: ["none", "simple", "double"],
            },
            groupCount: Number,
            manualGrouping: [[Number]],
            matchesChildCount: Number,
            roundRobinMode: {
                type: String,
                enum: ["simple", "double"],
            },
            skipFirstRound: Boolean,
        },
        type: {
            type: String,
            enum: ["round_robin", "single_elimination", "double_elimination"],
        },
    },
    { toJSON: { virtuals: true }, toObject: { virtuals: true } }
);

StageSchema.virtual("tournament_id").get(function () {
    return this.parent()._id;
});
exports.StageSchema = StageSchema;
const RoundSchema = new mongoose.Schema(
    {
        group: {
            type: mongoose.SchemaTypes.ObjectId,
            alias: "group_id",
        },
        number: Number,
        stage: {
            type: mongoose.SchemaTypes.ObjectId,
            alias: "stage_id",
        },
    },
    { toJSON: { virtuals: true }, toObject: { virtuals: true } }
);

const TournamentSchema = new mongoose.Schema(
    {
        groups: [GroupSchema],
        stages: [StageSchema],
        rounds: [RoundSchema],
    },
    {
        statics: {
            findCurrent: async function () {
                return await this.findOne({});
            },

            translateSubAliases(subdoc, obj) {
                switch (subdoc) {
                    case "group":
                        if (obj.stage_id) {
                            obj.stage = new ObjectId(obj.stage_id);
                            delete obj.stage_id;
                        }
                        break;
                    case "stage":
                        if (obj.tournament_id)
                            obj.tournament_id = new ObjectId(obj.tournament_id);

                        break;
                    case "round":
                        if (obj.group_id) {
                            obj.group = new ObjectId(obj.group_id);
                            delete obj.group_id;
                        }
                        if (obj.stage_id) {
                            obj.stage = new ObjectId(obj.stage_id);
                            delete obj.stage_id;
                        }
                        break;
                    default:
                        throw new RangeError(
                            f`Subdocument ${subdoc} not recognized by the subalias translation method.`
                        );
                }
                return obj;
            },
        },
        toJSON: { virtuals: true },
        toObject: { virtuals: true },
    }
);
exports.TournamentSchema = TournamentSchema;
