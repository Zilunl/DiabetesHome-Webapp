const mongoose = require('mongoose');
const bcrypt = require('bcryptjs')

const schema = new mongoose.Schema({
    first_name: { type: String, required: true, trim: true },
    last_name: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    screen_name: { type: String, required: true },
    yearofbirth: { type: String, required: true },
    height: { type: Number, required: true },
    records: [{
        record_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Record' }
    }],
    brief_bio: { type: String },
    engagement: { type: Number, required: true },
    photo: { type: Boolean },
    support_message: { type: String },
    clinician: { type: mongoose.Schema.Types.ObjectId, ref: 'Clinician' },
    required_data: {
        glucose: { type: Boolean, required: true },
        weight: { type: Boolean, required: true },
        exercise: { type: Boolean, required: true },
        insulin: { type: Boolean, required: true }
    },
    bound: {
        glucose_upper: { type: Number, required: true, default: -1 },
        glucose_lower: { type: Number, required: true, default: -1 },
        weight_upper: { type: Number, required: true, default: -1 },
        weight_lower: { type: Number, required: true, default: -1 },
        exercise_upper: { type: Number, required: true, default: -1 },
        exercise_lower: { type: Number, required: true, default: -1 },
        insulin_upper: { type: Number, required: true, default: -1 },
        insulin_lower: { type: Number, required: true, default: -1 }
    },
    note: [{
        note_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Note' }
    }],
    register_date: { type: String, required: true },
    darkmode: { type: Boolean, required: true, default: false }
}, { versionKey: false })

// Password comparison function
schema.methods.verifyPassword = function (password, callback) {
    bcrypt.compare(password, this.password, (err, valid) => {
        callback(err, valid)
    })
}

// Password salt factor
const SALT_FACTOR = 10

// Hash password before saving
schema.pre('save', function save(next) {
    const user = this
    if (!user.isModified('password')) {
        return next()
    }

    bcrypt.hash(user.password, SALT_FACTOR, (err, hash) => {
        if (err) {
            return next(err)
        }
        user.password = hash
        next()
    })
})

//Create collection patients in mongodb
const Patient = mongoose.model('Patient', schema);
module.exports = Patient;