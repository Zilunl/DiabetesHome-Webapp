const mongoose = require('mongoose');

const schema = new mongoose.Schema({
    patientId: { type: mongoose.Schema.Types.ObjectId, ref: 'Patient', required: true },
    subject: { type: String, required: true },
    content: { type: String, required: true },
    timeStamp: { type: String, required: true },
}, { versionKey: false })

// Create collection records in mongodb
const Note = mongoose.model('Note', schema);
module.exports = Note;