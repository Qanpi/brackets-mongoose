const { default: mongoose, SchemaTypes, Types } = require("mongoose");
const ObjectId = SchemaTypes.ObjectId;
const mongooseLeanVirtuals = require("mongoose-lean-virtuals");
const mongooseLeanGetters = require("mongoose-lean-getters");
// const {mergeWith} = require("lodash");

// function virtualGetter(property) {
//     return () => this.property.toString();
// }

// function virtualSetter(property) {
//     this.property = new Types.ObjectId(v);
// }


const ParticipantSchema = new mongoose.Schema(
    {
        name: String,
        group_id: {
            type: mongoose.SchemaTypes.ObjectId,
            get: v => v.toString(),
            // alias: "group_id",
        },

        tournament_id: {
            type: mongoose.SchemaTypes.ObjectId,
            get: v => v.toString(),
            index: true,
            // alias: "tournament_id"
        },
    },
    {
        // virtuals: {
        //     group_id: virtualProperty("group"),
        //     tournament_id: virtualProperty("tournament"),
        // },
        toJSON: { virtuals: true, getters: true },
        toObject: { virtuals: true, getters: true },
    }
);
ParticipantSchema.plugin(mongooseLeanVirtuals);
exports.ParticipantSchema = ParticipantSchema;
const ParticipantResultSchema = new mongoose.Schema(
    {
        forfeit: Boolean,
        name: String,
        position: Number,
        result: {
            type: String,
            enum: ["win", "draw", "loss"],
        },
        score: Number,
    },
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
            //lean queries
            parent_id: {
                get() {
                    if (this instanceof mongoose.Document)
                        return this.$parent()._id;

                    return mongooseLeanVirtuals.parent(this)._id;
                    // return "parent_id";
                    // return this.$parent()?._id;
                },
            },

            stage_id: {
                get() {
                    if (this instanceof mongoose.Document)
                        return this.$parent().stage_id;

                    return mongooseLeanVirtuals.parent(this).stage_id;
                    // return "stage_id";
                    // return this.$parent().stage; //FIXME: not typesafe because circular ref
                },
            },
        },
        toJSON: { virtuals: true },
        toObject: { virtuals: true },
    }
);
exports.MatchGameSchema = MatchGameSchema;
const MatchSchema = new mongoose.Schema(
    {
        child_count: {
            type: Number,
        },
        group_id: {
            type: ObjectId,
            get: (v) => {
                return v.toString();
            }
        },
        number: Number,
        opponent1: ParticipantResultSchema,
        opponent2: ParticipantResultSchema,
        round_id: {
            type: ObjectId,
            get: (v) => {
                return v.toString();
            }
        },
        stage_id: {
            type: ObjectId,
            get: v => v.toString(),
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
        // virtuals: {
        //     group_id: virtualProperty("group"),
        //     stage_id: virtualProperty("stage"),
        //     round_id: virtualProperty("round"),
        // },
        toJSON: { virtuals: true, getters: true },
        toObject: { virtuals: true, getters: true },
    }
);
MatchSchema.plugin(mongooseLeanVirtuals);
MatchSchema.plugin(mongooseLeanGetters);

exports.MatchSchema = MatchSchema;
const StageSchema = new mongoose.Schema(
    {
        name: String,
        number: Number,
        tournament_id: {
            type: ObjectId,
            alias: "division",
            get: (v) => v.toString()
        },
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
    {
        virtuals: {
            // tournament_id: virtualProperty("tournament"),
        },
        toJSON: { virtuals: true, getters: true },
        toObject: { virtuals: true, getters: true },
    }
);

exports.StageSchema = StageSchema;

const RoundSchema = new mongoose.Schema(
    {
        group_id: {
            type: mongoose.SchemaTypes.ObjectId,
            get: v => v.toString(),
        },
        number: Number,
        stage_id: {
            type: mongoose.SchemaTypes.ObjectId,
            get: v => v.toString(),
        },
    },
    {
        virtuals: {
            // group_id: virtualProperty("group"),
            // stage_id: virtualProperty("stage"),
        },
        toJSON: { virtuals: true, getters: true },
        toObject: { virtuals: true, getters: true },
    }
);
const GroupSchema = new mongoose.Schema(
    {
        number: Number,
        stage_id: {
            type: mongoose.SchemaTypes.ObjectId,
            get: v => v.toString(),
        },
        options: {
            breakingCount: Number,
        },
    },
    {
        virtuals: {
            // stage_id: virtualProperty("stage"),
        },
        toObject: { virtuals: true, getters: true },
        toJSON: { virtuals: true, getters: true },
    }
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
        },
        toJSON: { virtuals: true },
        toObject: { virtuals: true },
    }
);
exports.TournamentSchema = TournamentSchema;
