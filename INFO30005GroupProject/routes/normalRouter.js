const express = require("express");
const normalRouter = express.Router();


// Authentication middleware
const isAuthenticated = (req, res, next) => {
    if (!req.isAuthenticated()) {
        return res.redirect('/normal/landingPage');
    }
    return next();
}

// Unauthentication middleware
const unAuthenticated = (req, res, next) => {
    if (req.isAuthenticated()) {
        if (req.user.screen_name === undefined) {
            return res.redirect('/clinician/dashboard');
        } else {
            return res.redirect('/patient/homepage');
        }
    }
    return next();
}

normalRouter.get('/landingPage', unAuthenticated, (req, res) => res.render("normal-landingPage"));
normalRouter.get('/aboutDiabetes', unAuthenticated, (req, res) => res.render("normal-aboutDia"));
normalRouter.get('/aboutThisWeb', unAuthenticated, (req, res) => res.render("normal-aboutWeb"));
normalRouter.get('/logout', isAuthenticated, (req, res) => {
    req.logout()
    res.redirect("/normal/landingPage")
});

module.exports = normalRouter