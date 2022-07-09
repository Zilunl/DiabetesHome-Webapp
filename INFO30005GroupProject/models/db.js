require("dotenv").config();
// connect to mongodb
const mongoose = require('mongoose');

mongoose.connect(process.env.MONGO_URL, {
    dbName: "weballgood"
})
    .then(() => console.log("Connected to mongodb"))
    .catch((err) => console.log(err, "Error connecting to mongodb"));

require('./clinician')
require('./patient')