const passport = require('passport')
const express = require('express')

const patientRouter = express.Router()
const patientController = require('../controllers/patientController.js')

// Authentication middleware
const isAuthenticated = (req, res, next) => {
    if (!req.isAuthenticated() || req.user.screen_name === undefined) {
        return res.redirect('/patient/login')
    }
    return next();
}

// Unauthentication middleware
const unAuthenticated = (req, res, next) => {
    if (req.isAuthenticated() && req.user.screen_name !== undefined) {
        return res.redirect('homepage');
    } else if (req.isAuthenticated() && req.user.screen_name === undefined) {
        return res.redirect('/clinician/dashboard');
    }
    return next();
}

// Login page (with failure message displayed upon login failure)
patientRouter.get('/login', unAuthenticated, (req, res) => {
    res.render('normal-patientLogin', { flash: req.flash('error'), title: 'Login' })
})

// Handle login
patientRouter.post('/login',
    passport.authenticate('patient-login', {
        successRedirect: '/patient/homepage', failureRedirect: '/patient/login', failureFlash: true
    })
)

patientRouter.get('/forgetpass', unAuthenticated, (req, res) => res.render("normal-patientForgetpass"));
patientRouter.post('/forgetpass', unAuthenticated, (req, res) => patientController.forgetPassword(req, res))
patientRouter.get('/homepage', isAuthenticated, patientController.renderHomePage);
patientRouter.get('/addData/:type', isAuthenticated, patientController.renderAddPage);
patientRouter.post('/addData/:type', isAuthenticated, patientController.updateRecord);
patientRouter.get('/moredata', isAuthenticated, patientController.renderMoreData);
patientRouter.post('/moredata', isAuthenticated, patientController.searchDate);
patientRouter.get('/aboutDiabetes', isAuthenticated, patientController.renderAboutDia)
patientRouter.get('/aboutThisWeb', isAuthenticated, patientController.renderAboutWeb)
patientRouter.get('/detaildata/:day/:month/:year', isAuthenticated, patientController.renderdetail);
patientRouter.get('/changepass', isAuthenticated, (req, res) => res.render("normal-changepass", { layout: 'patient.hbs' }));
patientRouter.post('/changepass', isAuthenticated, (req, res) => patientController.changePassword(req, res))
patientRouter.get('/aboutme', isAuthenticated, patientController.renderAboutMe);
patientRouter.post('/aboutme', isAuthenticated, patientController.updateAboutMe);
patientRouter.post('/aboutme/mode', isAuthenticated, patientController.updateMode);
patientRouter.get('/motivation', isAuthenticated, patientController.renderLeaderBoard);

module.exports = patientRouter