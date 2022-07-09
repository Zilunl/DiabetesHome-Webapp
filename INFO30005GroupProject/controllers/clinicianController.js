const { redirect } = require('express/lib/response');
const res = require('express/lib/response');
const Clinician = require('../models/clinician.js');
const Patient = require('../models/patient.js');
const Record = require('../models/record.js');
const Note = require('../models/note.js');
const bcrypt = require('bcryptjs')

//used for rendering previous note page
const renderPrevNotes = async (req, res) => {
    const id = req.params.id;
    const notes = await Note.find({ patientId: id });

    const noteList = [];
    for (i in notes) {
        noteList.push({
            timeStamp: notes[i].timeStamp,
            subject: notes[i].subject,
            content: notes[i].content,
        });
    }

    sortByTimeStamp(noteList);

    res.render('clinician-previousNote.hbs', { layout: 'clinician.hbs', notes: noteList });
}

// used for about me page when user change their bio
const saveClinicianBio = async (req, res) => {
    try {
        const clinician = await Clinician.findById(req.user._id.toString());
        clinician.brief_bio = req.body.brief_bio;
        await clinician.save();
        res.redirect('/clinician/aboutme');
    } catch (err) {
        console.log(err);
    }
}

// used in individual page when month and year are changed
const searchDate = async (req, res) => {
    try {
        //if user change month and year to default value
        if (req.body.month === "all" && req.body.year === "all") {
            return res.redirect('/clinician/individualData/' + req.params.id);
        }
        //populate patient and notes
        const patient = await Patient.findOne({ _id: req.params.id }).populate({
            path: 'records',
            populate: {
                path: 'record_id',
                options: { lean: true }
            }
        }).populate({
            path: 'clinician',
            options: { lean: true }
        }).populate({
            path: 'note',
            options: { lean: true },
            populate: {
                path: 'note_id',
                options: { lean: true }
            }
        }).lean();

        const records = patient.records;
        const recordList = [];
        //select chosen month and year and push into list
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
        //return a string for showing month
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

        sortByDate(recordList);

        const notes = patient.note;
        const noteList = [];
        for (i in notes) {
            noteList.push({
                timeStamp: notes[i].note_id.timeStamp,
                subject: notes[i].note_id.subject,
                content: notes[i].note_id.content,
            });
        }

        sortByTimeStamp(noteList);
        res.render('clinician-individualData.hbs', { layout: 'clinician.hbs', patient: patient, records: recordList, notes: noteList, input: req.body, month: month });
    } catch (err) {
        console.log(err);
    }
}

//used for saving a new note
const addNote = async (req, res) => {
    try {
        const SavePatient = await Patient.findById(req.params.id);
        const newNote = new Note({
            patientId: SavePatient._id,
            subject: req.body.subject,
            content: req.body.content,
            timeStamp: new Date().toLocaleString("en-AU", { "timeZone": "Australia/Melbourne" })
        });
        await newNote.save();

        SavePatient.note.push({ note_id: newNote._id });
        await SavePatient.save();

        res.redirect('/clinician/individualData/' + req.params.id);
    } catch (err) {
        console.log(err);
    }
}

//used for the search in comment page
const searchComment = async (req, res) => {
    try {
        if (req.body.patientName == '') {
            renderCommentList(req, res);
        } else {
            //update clinician viewed time to determine which comments are new updated
            const clinicianID = req.user._id.toString();
            const clinician = await Clinician.findById(clinicianID);
            const lastTime = clinician.lastTimeViewCommentList;
            clinician.lastTimeViewCommentList = new Date().toLocaleString("en-AU", { "timeZone": "Australia/Melbourne" });
            await clinician.save();

            const patients = (await Clinician.findById(clinicianID).populate({
                path: 'patients',
                populate: {
                    path: 'patient_id',
                    populate: {
                        path: 'records',
                        options: { lean: true },
                        populate: {
                            path: 'record_id',
                            options: { lean: true },
                        }
                    }
                }
            }).lean()).patients;

            var inputName = req.body.patientName.toLowerCase();

            const commentList = [];
            for (i in patients) {
                const patient = patients[i].patient_id;
                if (patient.first_name.toLowerCase().indexOf(inputName) != -1 || patient.last_name.toLowerCase().indexOf(inputName) != -1) {
                    for (j in patient.records) {
                        const record = patient.records[j].record_id;
                        //check if there is valid comment in four data
                        if (record.data.weight.comment != '') {
                            commentList.push({
                                timeStamp: record.data.weight.date,
                                comment: record.data.weight.comment,
                                patient_id: patient._id,
                                patientName: patient.first_name + " " + patient.last_name,
                                upper_bound: patient.bound.weight_upper,
                                lower_bound: patient.bound.weight_lower,
                                value: record.data.weight.value,
                                type: 'weight',
                                unit: 'kg',
                                photo: patient.photo
                            });
                        }
                        if (record.data.glucose.comment != '') {
                            commentList.push({
                                timeStamp: record.data.glucose.date,
                                comment: record.data.glucose.comment,
                                patient_id: patient._id,
                                patientName: patient.first_name + " " + patient.last_name,
                                upper_bound: patient.bound.glucose_upper,
                                lower_bound: patient.bound.glucose_lower,
                                value: record.data.glucose.value,
                                type: 'glucose',
                                unit: 'nmol/L',
                                photo: patient.photo
                            });
                        }
                        if (record.data.exercise.comment != '') {
                            commentList.push({
                                timeStamp: record.data.exercise.date,
                                comment: record.data.exercise.comment,
                                patient_id: patient._id,
                                patientName: patient.first_name + " " + patient.last_name,
                                upper_bound: patient.bound.exercise_upper,
                                lower_bound: patient.bound.exercise_lower,
                                value: record.data.exercise.value,
                                type: 'exercise',
                                unit: 'steps',
                                photo: patient.photo
                            });
                        }
                        if (record.data.insulin.comment != '') {
                            commentList.push({
                                timeStamp: record.data.insulin.date,
                                comment: record.data.insulin.comment,
                                patient_id: patient._id,
                                patientName: patient.first_name + " " + patient.last_name,
                                upper_bound: patient.bound.insulin_upper,
                                lower_bound: patient.bound.insulin_lower,
                                value: record.data.insulin.value,
                                type: 'insulin',
                                unit: 'doses',
                                photo: patient.photo
                            });
                        }
                    }
                }
            }
            sortByTimeStamp(commentList);
            for (i in commentList) {
                if (compareByTimeStamp(commentList[i].timeStamp, lastTime) <= 0) {
                    commentList[i].new = false;
                } else {
                    commentList[i].new = true;
                }
            }
            var msg = "";
            if (commentList.length == 0) {
                msg = "No comment found";
            }
            res.render('clinician-commentList.hbs', { layout: 'clinician.hbs', commentList: commentList, msg: msg });
        }

    } catch (err) {
        console.log(err);
    }
}

// used for clinician edit data page
const editPatientData = async (req, res) => {

    const missBoundError = 'Need to add upper and lower bound';
    const upperAndLowerError = 'Upper bound should be larger than or equal to lower bound'
    try {
        const patient = await Patient.findById(req.params.id);
        const todayRecord = await Record.findOne({ patientId: patient._id, date: new Date().toLocaleString("en-AU", { "timeZone": "Australia/Melbourne" }) });
        const patientData = await Patient.findById(req.params.id).lean();

        if (req.body.weight_check == 'on') {
            patient.required_data.weight = true;
            //check input valid or not  
            if (req.body.weight_upper != '' && req.body.weight_lower != '') {
                if (parseInt(req.body.weight_upper) >= parseInt(req.body.weight_lower)) {
                    patient.bound.weight_upper = req.body.weight_upper;
                    patient.bound.weight_lower = req.body.weight_lower;
                } else {
                    return res.render('clinician-editData.hbs', { layout: 'clinician.hbs', error: upperAndLowerError + 'for weight', input: req.body, patientId: patientData._id });
                }
            } else {
                return res.render('clinician-editData.hbs', { layout: 'clinician.hbs', error: missBoundError + 'for weight', input: req.body, patientId: patientData._id });
            }
        } else {
            todayRecord.data.weight.status = "Not required";
            patient.required_data.weight = false;
        }

        if (req.body.exercise_check == 'on') {
            patient.required_data.exercise = true;
            //check input valid or not  
            if (req.body.exercise_upper != '' && req.body.exercise_lower != '') {
                if (parseInt(req.body.exercise_upper) >= parseInt(req.body.exercise_lower)) {
                    patient.bound.exercise_upper = req.body.exercise_upper;
                    patient.bound.exercise_lower = req.body.exercise_lower;
                } else {
                    return res.render('clinician-editData.hbs', { layout: 'clinician.hbs', error: upperAndLowerError + 'for exercise', input: req.body, patientId: patientData._id });
                }
            } else {
                return res.render('clinician-editData.hbs', { layout: 'clinician.hbs', error: missBoundError + 'for exercise', input: req.body, patientId: patientData._id });
            }
        } else {
            todayRecord.data.exercise.status = "Not required";
            patient.required_data.exercise = false;
        }

        if (req.body.insulin_check == 'on') {
            patient.required_data.insulin = true;
            //check input valid or not  
            if (req.body.insulin_upper != '' && req.body.insulin_lower != '') {
                if (parseInt(req.body.insulin_upper) >= parseInt(req.body.insulin_lower)) {
                    patient.bound.insulin_upper = req.body.insulin_upper;
                    patient.bound.insulin_lower = req.body.insulin_lower;
                } else {
                    return res.render('clinician-editData.hbs', { layout: 'clinician.hbs', error: upperAndLowerError + 'for insulin', input: req.body, patientId: patientData._id });
                }
            } else {
                return res.render('clinician-editData.hbs', { layout: 'clinician.hbs', error: missBoundError + 'for insulin', input: req.body, patientId: patientData._id });
            }
        } else {
            todayRecord.data.insulin.status = "Not required";
            patient.required_data.insulin = false;
        }

        if (req.body.glucose_check == 'on') {
            patient.required_data.glucose = true;
            //check input valid or not  
            if (req.body.glucose_upper != '' && req.body.glucose_lower != '') {
                if (parseInt(req.body.glucose_upper) >= parseInt(req.body.glucose_lower)) {
                    patient.bound.glucose_upper = req.body.glucose_upper;
                    patient.bound.glucose_lower = req.body.glucose_lower;
                } else {
                    return res.render('clinician-editData.hbs', { layout: 'clinician.hbs', error: upperAndLowerError + 'for glucose', input: req.body, patientId: patientData._id });
                }
            } else {
                return res.render('clinician-editData.hbs', { layout: 'clinician.hbs', error: missBoundError + 'for glucose', input: req.body, patientId: patientData._id });
            }
        } else {
            todayRecord.data.glucose.status = "Not required";
            patient.required_data.glucose = false;
        }

        await patient.save();

        res.redirect('/clinician/individualData/' + patientData._id);
    } catch (err) {
        console.log(err);
    }
}

//used for clinician to add new patient
const addNewPatient = async (req, res) => {

    const missBoundError = 'Error: Need to add upper and lower bound';
    const upperAndLowerError = 'Error: Upper bound should be larger than or equal to lower bound'
    const passwordConfirmError = 'Error: Password and confirm password do not match';
    const mailExistError = 'Error: Email already exists';

    if (req.body.password.length < 8) {
        return res.render('clinician-newPatient.hbs', { layout: 'clinician.hbs', error: 'Password must be at least 8 characters long', input: req.body });
    }

    const clinicianID = req.user._id.toString();

    //check if the email is registered
    const patient = await Patient.findOne({ email: req.body.email.toLowerCase() });
    if (!patient) {
        if (req.body.password == req.body.confirm_password) {
            try {
                const patient = new Patient({
                    first_name: req.body.first_name,
                    last_name: req.body.last_name,
                    email: req.body.email.toLowerCase(),
                    password: req.body.password,
                    screen_name: req.body.first_name,
                    yearofbirth: req.body.yearofbirth,
                    height: req.body.height,
                    brief_bio: req.body.brief_bio,
                    engagement: 0,
                    photo: false,

                    clinician: clinicianID,
                    register_date: (new Date).toLocaleDateString("en-AU", { "timeZone": "Australia/Melbourne" }),
                });


                if (req.body.weight_check == 'on') {
                    patient.required_data.weight = true;
                    //check input valid or not  
                    if (req.body.weight_upper != '' && req.body.weight_lower != '') {
                        if (parseInt(req.body.weight_upper) >= parseInt(req.body.weight_lower)) {
                            patient.bound.weight_upper = req.body.weight_upper;
                            patient.bound.weight_lower = req.body.weight_lower;
                        } else {
                            return res.render('clinician-newPatient.hbs', { layout: 'clinician.hbs', error: upperAndLowerError + ' for weight', input: req.body });
                        }
                    } else {
                        return res.render('clinician-newPatient.hbs', { layout: 'clinician.hbs', error: missBoundError + ' for weight', input: req.body });
                    }
                } else {
                    patient.required_data.weight = false;
                }

                if (req.body.exercise_check == 'on') {
                    patient.required_data.exercise = true;
                    //check input valid or not  
                    if (req.body.exercise_upper != '' && req.body.exercise_lower != '') {
                        if (parseInt(req.body.exercise_upper) >= parseInt(req.body.exercise_lower)) {
                            patient.bound.exercise_upper = req.body.exercise_upper;
                            patient.bound.exercise_lower = req.body.exercise_lower;
                        } else {
                            return res.render('clinician-newPatient.hbs', { layout: 'clinician.hbs', error: upperAndLowerError + ' for exercise', input: req.body });
                        }
                    } else {
                        return res.render('clinician-newPatient.hbs', { layout: 'clinician.hbs', error: missBoundError + ' for exercise', input: req.body });
                    }
                } else {
                    patient.required_data.exercise = false;
                }

                if (req.body.insulin_check == 'on') {
                    patient.required_data.insulin = true;
                    //check input valid or not  
                    if (req.body.insulin_upper != '' && req.body.insulin_lower != '') {
                        if (parseInt(req.body.insulin_upper) >= parseInt(req.body.insulin_lower)) {
                            patient.bound.insulin_upper = req.body.insulin_upper;
                            patient.bound.insulin_lower = req.body.insulin_lower;
                        } else {
                            return res.render('clinician-newPatient.hbs', { layout: 'clinician.hbs', error: upperAndLowerError + ' for insulin', input: req.body });
                        }
                    } else {
                        return res.render('clinician-newPatient.hbs', { layout: 'clinician.hbs', error: missBoundError + ' for insulin', input: req.body });
                    }
                } else {
                    patient.required_data.insulin = false;
                }

                if (req.body.glucose_check == 'on') {
                    patient.required_data.glucose = true;
                    //check input valid or not  
                    if (req.body.glucose_upper != '' && req.body.glucose_lower != '') {
                        if (parseInt(req.body.glucose_upper) >= parseInt(req.body.glucose_lower)) {
                            patient.bound.glucose_upper = req.body.glucose_upper;
                            patient.bound.glucose_lower = req.body.glucose_lower;
                        } else {
                            return res.render('clinician-newPatient.hbs', { layout: 'clinician.hbs', error: upperAndLowerError + ' for glucose', input: req.body });
                        }
                    } else {
                        return res.render('clinician-newPatient.hbs', { layout: 'clinician.hbs', error: missBoundError + ' for glucose', input: req.body });
                    }
                } else {
                    patient.required_data.glucose = false;
                }

                await patient.save();
                //bind patient to clinician
                const clinician = await Clinician.findById(clinicianID);
                clinician.patients.push({
                    patient_id: patient._id,
                });
                await clinician.save();
                console.log("Patient added");
                res.redirect('/clinician/dashboard');
            } catch (err) {
                console.log(err);
            }
        } else {
            return res.render('clinician-newPatient.hbs', { layout: 'clinician.hbs', error: passwordConfirmError, input: req.body });
        }
    } else {
        return res.render('clinician-newPatient.hbs', { layout: 'clinician.hbs', error: mailExistError, input: req.body });
    }
}

//render about me hbs page 
const renderClinicianData = async (req, res) => {
    try {
        const clinicianID = req.user._id.toString();
        const clinician = await Clinician.findById(clinicianID).lean();
        res.render('clinician-aboutme.hbs', { layout: 'clinician.hbs', clinician: clinician });
    } catch (err) {
        res.status(400);
        res.send("error happened when rendering clinician data");
    }
}

//render comment list page 
const renderCommentList = async (req, res) => {
    try {
        const clinicianID = req.user._id.toString();
        const clinician = await Clinician.findById(clinicianID);
        const lastTime = clinician.lastTimeViewCommentList;
        clinician.lastTimeViewCommentList = new Date().toLocaleString("en-AU", { "timeZone": "Australia/Melbourne" });
        await clinician.save();
        const patients = (await Clinician.findById(clinicianID).populate({
            path: 'patients',
            populate: {
                path: 'patient_id',
                populate: {
                    path: 'records',
                    options: { lean: true },
                    populate: {
                        path: 'record_id',
                        options: { lean: true },
                    }
                }
            }
        }).lean()).patients;

        const commentList = [];
        for (i in patients) {
            const patient = patients[i].patient_id;
            for (j in patient.records) {
                const record = patient.records[j].record_id;
                if (record.data.weight.comment != '') {

                    commentList.push({
                        timeStamp: record.data.weight.date,
                        comment: record.data.weight.comment,
                        patient_id: patient._id,
                        patientName: patient.first_name + " " + patient.last_name,
                        upper_bound: patient.bound.weight_upper,
                        lower_bound: patient.bound.weight_lower,
                        value: record.data.weight.value,
                        type: 'weight',
                        unit: 'kg',
                        photo: patient.photo
                    });
                }
                if (record.data.glucose.comment != '') {
                    commentList.push({
                        timeStamp: record.data.glucose.date,
                        comment: record.data.glucose.comment,
                        patient_id: patient._id,
                        patientName: patient.first_name + " " + patient.last_name,
                        upper_bound: patient.bound.glucose_upper,
                        lower_bound: patient.bound.glucose_lower,
                        value: record.data.glucose.value,
                        type: 'glucose',
                        unit: 'nmol/L',
                        photo: patient.photo
                    });
                }
                if (record.data.exercise.comment != '') {
                    commentList.push({
                        timeStamp: record.data.exercise.date,
                        comment: record.data.exercise.comment,
                        patient_id: patient._id,
                        patientName: patient.first_name + " " + patient.last_name,
                        upper_bound: patient.bound.exercise_upper,
                        lower_bound: patient.bound.exercise_lower,
                        value: record.data.exercise.value,
                        type: 'exercise',
                        unit: 'steps',
                        photo: patient.photo
                    });
                }
                if (record.data.insulin.comment != '') {
                    commentList.push({
                        timeStamp: record.data.insulin.date,
                        comment: record.data.insulin.comment,
                        patient_id: patient._id,
                        patientName: patient.first_name + " " + patient.last_name,
                        upper_bound: patient.bound.insulin_upper,
                        lower_bound: patient.bound.insulin_lower,
                        value: record.data.insulin.value,
                        type: 'insulin',
                        unit: 'doses',
                        photo: patient.photo
                    });
                }
            }
        }
        sortByTimeStamp(commentList);
        for (i in commentList) {
            if (compareByTimeStamp(commentList[i].timeStamp, lastTime) <= 0) {
                commentList[i].new = false;
            } else {
                commentList[i].new = true;
            }
        }
        res.render('clinician-commentList.hbs', { layout: 'clinician.hbs', commentList: commentList });
    } catch (err) {
        res.status(400);
        res.send("error happened when rendering commentList page");
    }
}

//used to sort a List when time is in timeStamp format
function sortByTimeStamp(List) {

    //insertion sort
    for (var i = 1; i < List.length; i++) {
        var temp = List[i];
        for (j = i - 1; j >= 0; j--) {
            if (compareByTimeStamp(temp.timeStamp, List[j].timeStamp) > 0) {
                List[j + 1] = List[j]
            }
            else {
                break;
            }
        }
        List[j + 1] = temp;
    }
}

// compare two timestamp
function compareByTimeStamp(timeStamp1, timeStamp2) {
    month1 = parseInt(timeStamp1.substring(3, 5));
    month2 = parseInt(timeStamp2.substring(3, 5));
    day1 = parseInt(timeStamp1.substring(0, 2));
    day2 = parseInt(timeStamp2.substring(0, 2));
    year1 = parseInt(timeStamp1.substring(6, 10));
    year2 = parseInt(timeStamp2.substring(6, 10));
    //if the hour is 1 digit number add a 0 before the string
    if (timeStamp1.length == 22) {
        timeStamp1 = "0" + timeStamp1
    }
    hour1 = parseInt(timeStamp1.substring(12, 14));
    minute1 = parseInt(timeStamp1.substring(15, 17));
    second1 = parseInt(timeStamp1.substring(18, 20));
    unit1 = timeStamp1.substring(21, 23);
    //if the hour is 1 digit number add a 0 before the string
    if (timeStamp2.length == 22) {
        timeStamp2 = "0" + timeStamp2
    }
    hour2 = parseInt(timeStamp2.substring(12, 14));
    minute2 = parseInt(timeStamp2.substring(15, 17));
    second2 = parseInt(timeStamp2.substring(18, 20));
    unit2 = timeStamp2.substring(21, 23);

    //transform the time to 24 hour format
    if (unit1 == "pm") {
        hour1 = hour1 + 12;
    }
    if (unit2 == "pm") {
        hour2 = hour2 + 12;
    }
    //check if the timeStamp1 is not initialized
    if (timeStamp1 == null) {
        return -1;
    } else if (timeStamp2 == null) {
        return 1;
    }
    //compare the timeStamp
    if (year1 < year2) {
        return -1;
    }
    else if (year1 == year2) {
        if (month1 < month2) {
            return -1;
        }
        else if (month1 == month2) {
            if (day1 < day2) {
                return -1;
            }
            else if (day1 == day2) {
                if (hour1 < hour2) {
                    return -1;
                }
                else if (hour1 == hour2) {
                    if (minute1 < minute2) {
                        return -1;
                    }
                    else if (minute1 == minute2) {
                        if (second1 < second2) {
                            return -1;
                        }
                        else if (second1 == second2) {
                            return 0;
                        }
                    }
                }
            }
        }
    }
    return 1;
}

//render NewPatient hbs page
const renderNewPatient = async (req, res) => {
    try {
        clinicianID = req.user._id.toString();
        const clinician = await Clinician.findById(clinicianID).lean();

        res.render('clinician-newPatient.hbs', { layout: 'clinician.hbs', clinician: clinician });
    } catch (err) {
        console.log(err);
    }
}

//render clinician edit data page
const renderClinicianEditData = async (req, res) => {
    try {
        const patient = await Patient.findById(req.params.id).lean();

        res.render('clinician-editData.hbs', { layout: 'clinician.hbs', patient: patient, patientId: patient._id });
    } catch (err) {
        console.log(err);
    }
}

//render individual patient hbs page
const renderPatientData = async (req, res) => {
    try {
        const patient = await Patient.findOne({ _id: req.params.id }).populate({
            path: 'records',
            populate: {
                path: 'record_id',
                options: { lean: true }
            }
        }).populate({
            path: 'clinician',
            options: { lean: true }
        }).populate({
            path: 'note',
            options: { lean: true },
            populate: {
                path: 'note_id',
                options: { lean: true }
            }
        }).lean();
        const records = patient.records;
        const recordList = [];
        for (i in records) {
            recordList.push(records[i]);
        }
        sortByDate(recordList);


        const notes = patient.note;
        const noteList = [];
        for (i in notes) {
            noteList.push({
                timeStamp: notes[i].note_id.timeStamp,
                subject: notes[i].note_id.subject,
                content: notes[i].note_id.content,
            });
        }

        sortByTimeStamp(noteList);
        res.render('clinician-individualData.hbs', { layout: 'clinician.hbs', patient: patient, records: recordList, notes: noteList });
    } catch (err) {
        console.log(err);
    }
}

//sort a list when date is in date format
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

//compare two record's date
function compareByDate(record1, record2) {
    month1 = parseInt(record1.record_id.date.substring(3, 5));
    month2 = parseInt(record2.record_id.date.substring(3, 5));
    day1 = parseInt(record1.record_id.date.substring(0, 2));
    day2 = parseInt(record2.record_id.date.substring(0, 2));
    year1 = parseInt(record1.record_id.date.substring(6, 10));
    year2 = parseInt(record2.record_id.date.substring(6, 10));

    if (year1 < year2) {
        return -1;
    }
    else if (year1 == year2) {
        if (month1 < month2) {
            return -1;
        } else if (month1 == month2) {
            if (day1 < day2) {
                return -1;
            } if (day1 == day2) {
                return 0;
            }
        }
    }
    return 1;
}

//used to save support message
const saveSupportMsg = async (req, res) => {
    try {
        const patient = await Patient.findById(req.params.id);
        patient.support_message = req.body.support_message;
        await patient.save();
        res.redirect('/clinician/individualData/' + req.params.id);
    } catch (err) {
        console.log(err);
    }

}

//render the clinician dashboard hbs page
const renderDashboard = async (req, res) => {
    try {
        const clinicianID = req.user._id.toString();
        const allPatient = (await Clinician.findById(clinicianID).populate({
            path: 'patients',
            options: { lean: true }
        }).lean()).patients;
        for (i in allPatient) {
            patient = allPatient[i];
            await initialRecord(patient.patient_id.toString());
        }

        //get clinician's patients and populate their information
        const patients = (await Clinician.findById(clinicianID).populate({
            path: 'patients',
            options: { lean: true },
            populate: {
                path: 'patient_id',
                options: { lean: true },
                populate: {
                    path: 'records',
                    options: { lean: true },
                    populate: {
                        path: 'record_id',
                        options: { lean: true },
                    }
                }
            }
        }).lean()).patients;

        // put needed data into an array to be passed to the hbs page
        const patientList = [];
        for (i in patients) {
            const patient = patients[i].patient_id;
            for (j in patient.records) {
                const record = patient.records[j].record_id;
                if (record.date == (new Date()).toLocaleDateString("en-AU", { "timeZone": "Australia/Melbourne" })) {
                    patientList.push({
                        patient_id: patient._id,
                        first_name: patient.first_name,
                        last_name: patient.last_name,
                        bound: patient.bound,
                        today_record: record,
                    });
                }
            }
        }

        res.render('clinician-dashboard.hbs', { layout: 'clinician.hbs', patientList: patientList });

    } catch (err) {
        console.log(err);
    }
}

// everytime when clinician logs in, this function will be called to make sure there at least every patient has a record for today
async function initialRecord(patient_id) {
    try {
        const patient = await Patient.findById(patient_id);
        register_date = patient.register_date;
        const record = await Record.findOne({ patientId: patient._id, date: (new Date()).toLocaleDateString("en-AU", { "timeZone": "Australia/Melbourne" }) });

        if (record == null) {
            const newRecord = new Record({
                patientId: patient._id,
                date: (new Date()).toLocaleDateString("en-AU", { "timeZone": "Australia/Melbourne" }),
            });
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
            console.log("record already exists");
        }

    } catch (err) {
        console.log(err);
    }
}

// search the dashboard by patient name
const searchDashboard = async (req, res) => {
    try {
        if (req.body.patientName == '') {
            renderDashboard(req, res);
        } else {
            const clinicianID = req.user._id.toString();

            const patients = (await Clinician.findById(clinicianID).populate({
                path: 'patients',
                populate: {
                    path: 'patient_id',
                    populate: {
                        path: 'records',
                        options: { lean: true },
                        populate: {
                            path: 'record_id',
                            options: { lean: true },
                        }
                    }
                }
            }).lean()).patients;

            var inputName = req.body.patientName.toLowerCase();
            const patientList = []

            for (i in patients) {
                const patient = patients[i].patient_id;

                if (patient.first_name.toLowerCase().indexOf(inputName) != -1 || patient.last_name.toLowerCase().indexOf(inputName) != -1) {
                    for (j in patient.records) {
                        const record = patient.records[j].record_id;
                        if (record.date == (new Date()).toLocaleDateString("en-AU", { "timeZone": "Australia/Melbourne" })) {
                            patientList.push({
                                patient_id: patient._id,
                                first_name: patient.first_name,
                                last_name: patient.last_name,
                                bound: patient.bound,
                                today_record: record,
                            });
                        }
                    }
                }
            }

            var msg = "";
            if (patientList.length == 0) {
                msg = "No patient found";
            }

            res.render('clinician-dashboard.hbs', { layout: 'clinician.hbs', patientList: patientList, msg: msg });
        }
    } catch (err) {
        console.log(err);
    }
}

//test function used for adding records
async function addRecords(req, res) {
    const patient = await Patient.findById("6263f5d7ef996dcc6dbf10af");
    const newRecord = new Record({
        patientId: "6263f5d7ef996dcc6dbf10af",
        data: {
            glucose: {
                status: "unrecorded",
                value: 0,
            },
            weight: {
                status: "unrecorded",
                value: 0,
            },
            exercise: {
                status: "unrecorded",
                value: 0,
            },
            insulin: {
                status: "unrecorded",
                value: 0,
            },
        },
        date: "06/05/2022"
    });
    await newRecord.save();
    patient.records.push({ record_id: newRecord._id });
    await patient.save();
}

//used for change password page
const changePassword = async (req, res) => {
    try {
        const clinicianID = req.user._id.toString();
        const clinician = await Clinician.findById(clinicianID);
        if (bcrypt.compareSync(req.body.oldPassword, clinician.password)) {
            if (bcrypt.compareSync(req.body.password, clinician.password)) {
                res.render('normal-changepass.hbs', { layout: 'clinician.hbs', error: "New password cannot be the same as the old password" });
            } else {
                clinician.password = req.body.password;
                await clinician.save();
                res.redirect('/normal/logout');
            }
        }
        else {
            res.render('normal-changepass.hbs', { layout: 'clinician.hbs', error: "Old passwords do not match" });
        }
    } catch (err) {
        console.log(err);
    }
}

//this method is used to compare two dates
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

// used for forget password page
const forgetPassword = async (req, res) => {
    try {
        const clinician = await Clinician.findOne({ email: req.body.email.toLowerCase() });
        if (!clinician) {
            res.render('normal-clinicianForgetpass.hbs', { error: 'Incorrect email address' });
        } else {
            clinician.password = req.body.password;
            await clinician.save();
            res.redirect('/clinician/login');
        }

    } catch (err) {
        console.log(err);
    }
}

module.exports = {
    renderDashboard,
    searchDashboard,
    renderClinicianData,
    addNewPatient,
    renderPatientData,
    renderClinicianEditData,
    renderNewPatient,
    editPatientData,
    saveSupportMsg,
    renderCommentList,
    searchComment,
    addNote,
    searchDate,
    saveClinicianBio,
    changePassword,
    forgetPassword,
    renderPrevNotes,
}
