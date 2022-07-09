const Patient = require('../models/patient.js');
const Record = require('../models/record.js');
const Clinician = require('../models/clinician.js');
const { ConnectionPoolClosedEvent } = require('mongodb');
const bcrypt = require('bcryptjs')

//Update the record of patient according to the type and id
const updateRecord = async (req, res, next) => {
    try {
        const patient_id = req.user._id;
        const type = req.params.type;

        //find the record of today
        const record = await Record.findOne({ patientId: patient_id, date: new Date().toLocaleDateString("en-AU", { "timeZone": "Australia/Melbourne" }) });
        //update the record according to the form the user submit
        record.data[type].status = "recorded";
        record.data[type].value = req.body.addData;
        record.data[type].comment = req.body.addComment;
        record.data[type].date = new Date().toLocaleString("en-AU", { "timeZone": "Australia/Melbourne" });
        //save the record to the database
        await record.save();
        res.redirect('/patient/homepage');
    } catch (err) {
        return next(err);
    }
};

//If there is no record for today, create a new record.
async function initialRecord(patient_id) {
    try {
        //get the patient and the record of that day.
        const patient = await Patient.findOne({ _id: patient_id });
        const record = await Record.findOne({ patientId: patient._id, date: new Date().toLocaleDateString("en-AU", { "timeZone": "Australia/Melbourne" }) });
        const register_date = patient.register_date;
        //If no record was find, create a new record.
        if (record == null) {
            const newRecord = new Record({
                patientId: patient_id,
                date: new Date().toLocaleDateString("en-AU", { "timeZone": "Australia/Melbourne" }),
            })
            if (!patient.required_data.glucose) {
                newRecord.data.glucose.status = "Not required";
            }
            if (!patient.required_data.weight) {
                newRecord.data.weight.status = "Not required";
            }
            if (!patient.required_data.exercise) {
                newRecord.data.exercise.status = "Not required";
            }
            if (!patient.required_data.insulin) {
                newRecord.data.insulin.status = "Not required";
            }
            await newRecord.save();
            patient.records.push({ record_id: newRecord._id });
            await patient.save();

            //Create records for unlogged days
            var flag = true;
            var i = 1
            while (flag) {
                const previous = new Date(new Date().getTime() - (i * 24 * 60 * 60 * 1000)).toLocaleDateString("en-AU", { "timeZone": "Australia/Melbourne" })
                if (compareDate(previous, register_date) < 0) {
                    break;
                }
                const check = await Record.findOne({ patientId: patient_id, date: previous });
                if (check == null) {
                    const uncreated = new Record({
                        patientId: patient_id,
                        date: previous
                    })
                    if (!patient.required_data.glucose) {
                        uncreated.data.glucose.status = "Not required";
                    }
                    if (!patient.required_data.weight) {
                        uncreated.data.weight.status = "Not required";
                    }
                    if (!patient.required_data.exercise) {
                        uncreated.data.exercise.status = "Not required";
                    }
                    if (!patient.required_data.insulin) {
                        uncreated.data.insulin.status = "Not required";
                    }
                    await uncreated.save();
                    patient.records.push({ record_id: uncreated._id });
                    await patient.save();
                    i = i + 1;
                } else {
                    flag = false;
                }
            }

        } else {
        }
    } catch (err) {
        console.log(err);
    }
};

//Render the homepage of the patient
const renderHomePage = async (req, res, next) => {
    try {
        //get all informatiion that need in the homepage
        const id = req.user._id;
        await initialRecord(id);
        const patient = await Patient.findOne({ _id: id }).lean();
        const clinician = await Clinician.findById(patient.clinician).lean();
        const date = new Date().toLocaleDateString("en-AU", { "timeZone": "Australia/Melbourne" });
        const today = await Record.findOne({ date: date, patientId: id }).lean();

        //Get recent 7 days records, if there is no record for that day, insert null.
        const recent7 = [];
        for (let i = 0; i < 7; i++) {
            const recent7date = new Date(new Date().getTime() - (i * 24 * 60 * 60 * 1000)).toLocaleDateString("en-AU", { "timeZone": "Australia/Melbourne" });
            const newRecord = await Record.findOne({ date: recent7date, patientId: id }).lean();
            if (newRecord == null) {
                break;
            }
            recent7.push({
                // only record day and month
                date: recent7date.substring(0, 5),
                record: newRecord,
            });
        }
        sortByDate(recent7);

        const dataList = [];
        const dateList = [];
        const glucoseData = [];
        const weightData = [];
        const exerciseData = [];
        const insulinData = [];

        for (i in recent7) {
            glucoseData.push(recent7[i].record.data.glucose.value);
            weightData.push(recent7[i].record.data.weight.value);
            exerciseData.push(recent7[i].record.data.exercise.value);
            insulinData.push(recent7[i].record.data.insulin.value);
            dateList.push(recent7[i].date);
        }
        dataList.push(glucoseData);
        dataList.push(weightData);
        dataList.push(exerciseData);
        dataList.push(insulinData);
        //Render the homepage
        res.render("patient-homePage.hbs", {
            layout: 'patient.hbs', patient: patient, clinician: clinician, today: today,
            recent7: recent7, dataList: JSON.stringify(dataList), dateList: JSON.stringify(dateList)
        });
    } catch (err) {
        return next(err);
    }
}

// Sort the array by date
function sortByDate(recordList) {
    //insertion sort
    for (var i = 1; i < recordList.length; i++) {
        var temp = recordList[i];
        for (j = i - 1; j >= 0; j--) {
            if (compareByDate(temp, recordList[j]) > 0) {
                recordList[j + 1] = recordList[j]
            }
            else {
                break;
            }
        }
        recordList[j + 1] = temp;
    }
}

// Sort the array by date for record
function sortByDate2(recordList) {
    //insertion sort
    for (var i = 1; i < recordList.length; i++) {
        var temp = recordList[i];
        for (j = i - 1; j >= 0; j--) {
            if (compareByDate2(temp, recordList[j]) > 0) {
                recordList[j + 1] = recordList[j]
            }
            else {
                break;
            }
        }
        recordList[j + 1] = temp;
    }
}

// Compare date by date
function compareDate(date1, date2) {
    month1 = parseInt(date1.substring(3, 5));
    month2 = parseInt(date2.substring(3, 5));
    day1 = parseInt(date1.substring(0, 2));
    day2 = parseInt(date2.substring(0, 2));

    if (month1 < month2) {
        return -1;
    } else if (month1 == month2) {
        if (day1 < day2) {
            return -1;
        } if (day1 == day2) {
            return 0;
        } else {
            return 1;
        }
    } else {
        return 1;
    }

}

// Compare the date 
function compareByDate(record1, record2) {
    month1 = parseInt(record1.date.substring(3, 5));
    month2 = parseInt(record2.date.substring(3, 5));
    day1 = parseInt(record1.date.substring(0, 2));
    day2 = parseInt(record2.date.substring(0, 2));

    if (month1 < month2) {
        return -1;
    } else if (month1 == month2) {
        if (day1 < day2) {
            return -1;
        } if (day1 == day2) {
            return 0;
        } else {
            return 1;
        }
    } else {
        return 1;
    }
}

// Compare the date in another scenario
function compareByDate2(record1, record2) {
    month1 = parseInt(record1.record_id.date.substring(3, 5));
    month2 = parseInt(record2.record_id.date.substring(3, 5));
    day1 = parseInt(record1.record_id.date.substring(0, 2));
    day2 = parseInt(record2.record_id.date.substring(0, 2));

    if (month1 < month2) {
        return -1;
    } else if (month1 == month2) {
        if (day1 < day2) {
            return -1;
        } if (day1 == day2) {
            return 0;
        } else {
            return 1;
        }
    } else {
        return 1;
    }
}

//Render the page of the patient to add data
const renderAddPage = async (req, res, next) => {
    try {
        //find the patient and the record of the day
        const id = req.user._id;
        const patient = await Patient.findOne({ _id: id }).lean();
        const type = req.params.type;
        const record = await Record.findOne({ patientId: id, date: new Date().toLocaleDateString("en-AU", { "timeZone": "Australia/Melbourne" }) }).lean();

        //render the page for patient to record its data
        res.render("patient-addData.hbs", { layout: 'patient.hbs', type: type, record: record, patient: patient });
    } catch (err) {
        return next(err);
    }
}

//render more data hbs page
const renderMoreData = async (req, res) => {
    try {
        const id = req.user._id;
        const patient = await Patient.findOne({ _id: id }).populate({
            path: 'records',
            populate: {
                path: 'record_id',
                options: { lean: true }
            }
        }).lean();
        const records = patient.records;
        const recordList = [];
        for (i in records) {
            recordList.push(records[i]);
        }
        sortByDate2(recordList);
        res.render('patient-moredata.hbs', { layout: 'patient.hbs', record: recordList, patient: patient });
    } catch (err) {
        console.log(err);
    }
}

// Render the detail data page for each day
const renderdetail = async (req, res) => {
    try {
        const id = req.user._id;
        const patient = await Patient.findOne({ _id: id }).lean();
        const day = req.params.day;
        const month = req.params.month
        const year = req.params.year
        const date = day + "/" + month + "/" + year;
        const record = await Record.findOne({ patientId: id, date: date }).lean();
        res.render('patient-dataDetail.hbs', { layout: 'patient.hbs', record: record, patient: patient });
    } catch (err) {
        console.log(err);
    }
}

// Render the about me page
const renderAboutMe = async (req, res) => {
    try {
        const id = req.user._id;
        const patient = await Patient.findOne({ _id: id }).lean();
        const clinician = await Clinician.findById(patient.clinician).lean();
        res.render('patient-aboutme.hbs', { layout: 'patient.hbs', patient: patient, clinician: clinician });
    } catch (err) {
        console.log(err);
        return next(err);
    }
}

// It is used to change the password of the patient
const changePassword = async (req, res) => {
    try {
        const patientID = req.user._id;
        const patient = await Patient.findById(patientID);

        if (bcrypt.compareSync(req.body.oldPassword, patient.password)) {
            if (bcrypt.compareSync(req.body.password, patient.password)) {
                res.render('normal-changepass.hbs', { layout: 'patient.hbs', error: "New password cannot be the same as the old password" });
            } else {
                patient.password = req.body.password;
                await patient.save();
                res.redirect('/normal/logout');
            }
        }
        else {
            res.render('normal-changepass.hbs', { layout: 'patient.hbs', error: "Old passwords do not match" });
        }
    } catch (err) {
        console.log(err);
    }
}

// It is used to change the password when forget password and can not log in 
const forgetPassword = async (req, res) => {
    try {
        const patient = await Patient.findOne({ email: req.body.email.toLowerCase() });
        if (!patient) {
            res.render('normal-patientForgetpass.hbs', { error: 'Incorrect email address' });
        } else {
            patient.password = req.body.password;
            await patient.save();
            res.redirect('/patient/login');
        }

    } catch (err) {
        console.log(err);
    }
}

// Check whether the record is recorded
function checkRecorded(record) {
    var flag = false
    for (i in record.data) {
        if (record.data[i].status == "recorded") {
            flag = true;
            break;
        }
    }
    return flag;
}

// Calculate the engagement rate for the patient
async function calEngagement(patientId) {

    const records = (await Record.find({ patientId: patientId }).lean()).filter((record) => checkRecorded(record));
    const patient = await Patient.findById(patientId);
    const startDate = patient.register_date;
    var flag = true;
    var interval = 0;

    // Get the total number of days since the patient registered
    while (flag) {
        temp = new Date(new Date().getTime() - (interval * 24 * 60 * 60 * 1000)).toLocaleDateString("en-AU", { "timeZone": "Australia/Melbourne" });
        if (temp == startDate) {
            flag = false
        }
        interval += 1
    }

    // calculate the engagement rate
    patient.engagement = Math.round((records.length / interval).toFixed(2) * 100);
    await patient.save();
}


// Render the motivation page
const renderLeaderBoard = async (req, res) => {
    try {
        // Calculate the engagement rate for each patient
        const pre_patients = await Patient.find({}).lean();
        for (patient of pre_patients) {
            await calEngagement(patient._id);
        }

        // Get the patient data after calculating the engagement rate and sort by engagement rate
        const patients = await Patient.find({}).lean();
        const thisPatient = await Patient.findById(req.user._id).lean();
        var index = 0;
        const sorted = patients.sort((a, b) => { return (b.engagement - a.engagement) });

        // Get the rank of the patient
        for (patient of sorted) {
            if (patient._id.toString() == req.user._id.toString()) {
                break;
            }
            index += 1;
        }

        // Pass the data to the page
        const rank = index + 1;
        const first = sorted[0]
        const second = sorted[1]
        const third = sorted[2]
        const fourth = sorted[3]
        const fifth = sorted[4]
        res.render("patient-motivation.hbs", { layout: 'patient.hbs', patients: patients, thisPatient: thisPatient, rank: rank, first: first, second: second, third: third, fourth: fourth, fifth: fifth });
    } catch (err) {
        console.log(err);
    }
}

// Update the patient's profile
const updateAboutMe = async (req, res) => {
    try {
        const patient_id = req.user._id;
        const patient = await Patient.findById(patient_id);
        if (req.body.name != "") {
            patient.name = req.body.name;
        }
        if (req.body.height != "") {
            patient.height = req.body.height;
        }
        if (req.body.text != "") {
            patient.brief_bio = req.body.text;
        }
        await patient.save();
        res.redirect('/patient/aboutme');
    } catch (err) {
        console.log(err);
    }
}

// Change the theme of the patient
const updateMode = async (req, res) => {
    try {
        const patient_id = req.user._id;
        const patient = await Patient.findById(patient_id);
        if (req.body.check == 'on') {
            patient.darkmode = true;
        } else {
            patient.darkmode = false;
        }
        // patient.darkmode = true;
        await patient.save();
        res.redirect('/patient/aboutme');
    } catch (err) {
        console.log(err);
    }
}


// Search the records by date in more data page
const searchDate = async (req, res) => {
    try {

        if (req.body.month == "all" && req.body.year == "all") {
            return res.redirect('/patient/moreData');
        }

        const id = req.user._id;
        const patient = await Patient.findOne({ _id: id }).populate({
            path: 'records',
            populate: {
                path: 'record_id',
                options: { lean: true }
            }
        }).lean();
        const records = patient.records;
        const recordList = [];
        if (req.body.month != "all" && req.body.year === "all") {
            for (i in records) {
                if (records[i].record_id.date.substring(3, 5) === req.body.month) {
                    recordList.push(records[i]);
                }
            }
        } else if (req.body.month === "all" && req.body.year != "all") {
            for (i in records) {
                if (records[i].record_id.date.substring(6, 10) === req.body.year) {
                    recordList.push(records[i]);
                }
            }
        } else {
            for (i in records) {
                if (records[i].record_id.date.substring(3, 5) === req.body.month && records[i].record_id.date.substring(6, 10) === req.body.year) {
                    recordList.push(records[i]);
                }
            }
        }

        var month = '';
        switch (req.body.month) {
            case "01":
                month = "January";
                break;
            case "02":
                month = "February";
                break;
            case "03":
                month = "March";
                break;
            case "04":
                month = "April";
                break;
            case "05":
                month = "May";
                break;
            case "06":
                month = "June";
                break;
            case "07":
                month = "July";
                break;
            case "08":
                month = "August";
                break;
            case "09":
                month = "September";
                break;
            case "10":
                month = "October";
                break;
            case "11":
                month = "November";
                break;
            case "12":
                month = "December";
                break;
            default:
                month = "Month";
                break;
        }
        sortByDate2(recordList);
        res.render('patient-moredata.hbs', { layout: 'patient.hbs', record: recordList, patient: patient, month: month, year: req.body.year, input: req.body });
    } catch (err) {
        console.log(err);
    }
}

// Render the about diabetes page for the patient
const renderAboutDia = async (req, res) => {
    try {
        const id = req.user._id;
        const patient = await Patient.findOne({ _id: id }).lean();
        res.render("normal-aboutDia", { layout: 'patient.hbs', patient: patient });
    } catch (err) {
        console.log(err);
    }
}

// Render the about the website for the patient
const renderAboutWeb = async (req, res) => {
    try {
        const id = req.user._id;
        const patient = await Patient.findOne({ _id: id }).lean();
        res.render("normal-aboutWeb", { layout: 'patient.hbs', patient: patient });
    } catch (err) {
        console.log(err);
    }
}

module.exports = {
    renderAddPage,
    updateRecord,
    renderHomePage,
    renderMoreData,
    renderdetail,
    changePassword,
    forgetPassword,
    renderLeaderBoard,
    renderAboutMe,
    updateAboutMe,
    searchDate,
    updateMode,
    renderAboutDia,
    renderAboutWeb,
}