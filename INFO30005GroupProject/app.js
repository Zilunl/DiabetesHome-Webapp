// Import handlebars
const exphbs = require('express-handlebars');
const flash = require('express-flash')
const session = require('express-session')

// Import express
const express = require('express');
// Set your app up as an express app
const app = express();

//connect to database
require('./models/db');

Patient = require('./models/patient');
Record = require('./models/record');
Clinician = require('./models/clinician');
Note = require('./models/note')

//Routers
const patientRouter = require('./routes/patientRouter.js');
const normalRouter = require('./routes/normalRouter.js');
const clinicianRouter = require('./routes/clinicianRouter.js');

// configure Handlebars
app.engine(
    'hbs',
    exphbs.engine({
        defaultLayout: 'normal',
        extname: 'hbs',
        helpers: require("./public/js/helpers.js").helpers,
    })
);

// set Handlebars view engine
app.set('view engine', 'hbs');

app.use(express.static('public'));
app.use(express.static('public/static'));

// Set up to handle POST requests
app.use(flash());
app.use(express.json()); // needed if POST data is in JSON format
app.use(express.urlencoded({ extended: false })); // only needed for URL-encoded input

// Track authenticated users through login sessions
app.use(
    session({
        secret: process.env.SESSION_SECRET || 'keyboard cat',
        name: 'weballgood',
        saveUninitialized: false,
        resave: false,
        proxy: process.env.NODE_ENV === 'production', // to work on Heroku
        cookie: {
            sameSite: 'strict',
            httpOnly: true,
            secure: app.get('env') === 'production'
        },
    })
)

if (app.get('env') === 'production') {
    app.set('trust proxy', 1);
}

// Initialise Passport.js
const passport = require('./passport')
app.use(passport.authenticate('session'))

app.use('/normal', normalRouter);
app.use('/patient', patientRouter);
app.use('/clinician', clinicianRouter);

app.all('*', (req, res) => {  // 'default' route to catch user errors
    res.status(404).render('normal-error', { errorCode: '404', message: 'That route is invalid.' })
})

// Tells the app to listen on port 3000 and logs that information to the console. 
app.listen(process.env.PORT || 3000, () => {
    console.log('Diabetes app listening on port 3000!');
});