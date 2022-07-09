const mongoose = require('mongoose');

const schema = new mongoose.Schema({
    patientId: { type: mongoose.Schema.Types.ObjectId, ref: 'Patient', required: true },
    data: {
        glucose: {
            status: { type: String, enum: ["recorded", "unrecorded", "Not required"], default: "unrecorded" },
            value: { type: Number, default: 0 },
            comment: { type: String, default: "" },
            date: { type: String, default: null },
        },
        weight: {
            status: { type: String, enum: ["recorded", "unrecorded", "Not required"], default: "unrecorded" },
            value: { type: Number, default: 0 },
            comment: { type: String, default: "" },
            date: { type: String, default: null },
        },
        exercise: {
            status: { type: String, enum: ["recorded", "unrecorded", "Not required"], default: "unrecorded" },
            value: { type: Number, default: 0 },
            comment: { type: String, default: "" },
            date: { type: String, default: null },
        },
        insulin: {
            status: { type: String, enum: ["recorded", "unrecorded", "Not required"], default: "unrecorded" },
            value: { type: Number, default: 0 },
            comment: { type: String, default: "" },
            date: { type: String, default: null },
        }
    },
    date: { type: String, default: null, required: true },
}, { versionKey: false })

// Create collection records in mongodb
const Record = mongoose.model('Record', schema);
module.exports = Record;