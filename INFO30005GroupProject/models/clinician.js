const mongoose = require('mongoose');
const bcrypt = require('bcryptjs')

const schema = new mongoose.Schema({
    first_name: { type: String, required: true, trim: true },
    last_name: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    yearofbirth: { type: String, required: true },
    patients: [{
        patient_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Patient' }
    }],
    brief_bio: { type: String },
    photo: { stype: Boolean },
    lastTimeViewCommentList: { type: String, default: null }
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

const Clinician = mongoose.model('Clinician', schema);
module.exports = Clinician;