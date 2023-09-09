const mongoose = require("mongoose");
const ObjectId = mongoose.Types.ObjectId;

const IncrementSchema = mongoose.Schema({
    model: {
        type: String,
        required: true,
        index: {unique: true}
    },
    idx: {
        type: Number,
        default: 0,
    },
    latest: {
        type: ObjectId,
    }
});

exports.default = mongoose.model("Increment", IncrementSchema);
