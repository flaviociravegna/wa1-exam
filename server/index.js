'use strict';

const express = require('express');
const morgan = require('morgan'); // logging middleware
const { check, validationResult } = require('express-validator'); // validation middleware
const dao = require('./modules/dao'); // module for accessing the DB
const userDao = require('./modules/user-dao'); // module for accessing the users in the DB

const passport = require('passport'); // auth middleware
const LocalStrategy = require('passport-local').Strategy; // username and password for login
const session = require('express-session'); // enable sessions
const cors = require('cors');

const PORT = 3001;
const app = new express();
const corsOptions = {
  origin: 'http://localhost:3000',
  credentials: true
};

/***************** Set up Passport *****************/
// set up the "username and password" login strategy
// by setting a function to verify username and password
passport.use(new LocalStrategy(
  function (username, password, done) {
    userDao.getUser(username, password).then((user) => {
      if (!user)
        return done(null, false, { error: 'username e/o password non corretti.' });

      return done(null, user);
    })
  }
));

// serialize and de-serialize the user (user object <-> session)
// we serialize the user id and we store it in the session: the session is very small in this way
passport.serializeUser((user, done) => { done(null, user.id); });

// starting from the data in the session, we extract the current (logged-in) user
passport.deserializeUser((id, done) => {
  userDao.getUserById(id)
    .then(user => { done(null, user); })
    .catch(err => { done(err, null); });
});

/************************************************** */

app.use(morgan('dev'));
app.use(express.json());
app.use(cors(corsOptions));   // NB: Usare solo per sviluppo e per l'esame! Altrimenti indicare dominio
app.listen(PORT, () => console.log(`Server listening at http://localhost:${PORT}/`));

// custom middleware: check if a given request is coming from an authenticated user
const isLoggedIn = (req, res, next) => {
  if (req.isAuthenticated())
    return next();

  return res.status(401).json({ error: 'not authenticated' });
}

// set up the session
app.use(session({
  secret: 'a secret sentence not to share with anybody and anywhere, used to sign the session ID cookie',
  resave: false,
  saveUninitialized: false
}));

// Init passport
app.use(passport.initialize());
app.use(passport.session());

/******************************************************************************************/
/******************************************************************************************/
/******************************************************************************************/

// Get list of all courses (not protected)
app.get('/api/courses', async (req, res) => {
  try {
    let coursesList = await dao.getAllCourses();
    for (let c of coursesList) {
      c.incomp = await dao.getCoursesNotCompatible(c.codice);
      c.selectedby = await dao.getCourseStudentsCount(c.codice);
    }

    return res.status(200).json(coursesList);
  } catch (err) {
    return res.status(500).json({ error: "internal Server Error -> " + err });
  }
});

// Get list of study plan courses
app.get('/api/courses/studyplan', isLoggedIn, async (req, res) => {
  try {
    const coursesList = await dao.getStudyPlanCourses(req.user.id);
    return res.status(200).json(coursesList);
  } catch (err) {
    return res.status(500).json({ error: "internal Server Error -> " + err });
  }
});


/**
 * the following app.post and app.put are doing basically the same task. But, to be consistent with the 
 * HTTP REST Methods, the POST is called if the study plan does not already exists
 */

// Save the study plan
app.post('/api/courses/studyplan', isLoggedIn,
  [check('selectedCourses').notEmpty().isArray(),
  check('selectedCourses.*').notEmpty().isString().isLength({ min: 7, max: 7 }),
  check('isFulltime').notEmpty().isInt({ min: 0, max: 1 })],
  (req, res) => { studyPlanHandler(req, res); }
);

// Update the study plan
app.put('/api/courses/studyplan', isLoggedIn,
  [check('selectedCourses').notEmpty().isArray(),
  check('selectedCourses.*').notEmpty().isString().isLength({ min: 7, max: 7 }),
  check('isFulltime').notEmpty().isInt({ min: 0, max: 1 })],
  (req, res) => { studyPlanHandler(req, res); }
);

const studyPlanHandler = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty())
      return res.status(422).json({ error: errors.array() });

    const user_from_db = await userDao.getUserById(req.user.id);
    if (req.method === "PUT" && user_from_db.fulltime === -1)
      return res.status(422).json({ error: "Il piano studi non esiste, impossibile modificarlo" });
    else if (req.method === "POST" && user_from_db.fulltime !== -1)
      return res.status(422).json({ error: "Impossibile inserire un secondo piano studi oltre a quello già esistente" });

    // First, check if the selected courses exists
    const courses = await dao.getAllCourses();
    const courses_IDs = courses.map(course => course.codice);
    for (const courseCode of req.body.selectedCourses)
      if (!courses_IDs.includes(courseCode))
        return res.status(422).json({ error: "The course with code '" + courseCode + "' does not exists in the database" });

    // Check if the number of students booked for each course is correct
    let errorMsg = "";
    const old_study_plan = await dao.getStudyPlanCourses(req.user.id);

    // Check duplicated
    for (const courseCode of req.body.selectedCourses) {
      const count = req.body.selectedCourses.reduce((tot, code) => (code === courseCode ? tot + 1 : tot), 0);
      if (count > 1)
        return res.status(422).json({ error: "Alcuni corsi sono inseriti più volte nel piano studi" });
    }

    // Check students count for each selected course
    // Only the courses that are "new" (not already present in the study plan) should be checked, because if they are present, their quantity is ok
    const coursesFiltered = courses.filter(c => (req.body.selectedCourses.includes(c.codice)) && !old_study_plan.includes(c.codice));
    for (const course of coursesFiltered) {
      const num_stud = await dao.getCourseStudentsCount(course.codice);
      if (course.maxstudenti && course.maxstudenti <= num_stud)
        errorMsg += "Il corso '" + course.codice + " - " + course.nome + "' ha già raggiunto il massimo numero di studenti. Rimuoverlo dal piano.\n";
    }

    // Check if the propedeutic courses needed are in the study plan
    req.body.selectedCourses.forEach((courseCode) => {
      const course_proped_code = courses.find(elem => elem.codice === courseCode).proped;
      if (course_proped_code && !req.body.selectedCourses.includes(course_proped_code))
        errorMsg += "Il corso propedeutico '" + course_proped_code + " - " + courses.find(c => c.codice === course_proped_code).nome + "' non è presente nel piano studi\n";
    });

    // Check incompatibles
    for (const courseCode of req.body.selectedCourses) {                           // For each selected course
      const incompatible_courses = await dao.getCoursesNotCompatible(courseCode);  // get the incompatible courses
      incompatible_courses.forEach(code => {
        if (req.body.selectedCourses.includes(code))                               // Check, for each of them, if there is a incom. course in the selected ones
          errorMsg += 'Il corso "' + courseCode + " - " + courses.find(c => c.codice === courseCode).nome + ' è incompatibile con il corso "' + code + '"\n';
      });
    }

    // Check if the total number of credits is in the range
    let totCFU = 0;
    const min = req.body.isFulltime ? 60 : 20, max = req.body.isFulltime ? 80 : 40;

    req.body.selectedCourses.forEach((courseCode) => {
      totCFU += courses.find(elem => elem.codice === courseCode).crediti;
    });

    if (totCFU < min || totCFU > max)
      errorMsg += "Il numero di crediti totali non rispetta i limiti imposti dalla modalità selezionata";

    if (errorMsg !== "")
      return res.status(422).json({ error: errorMsg });

    await dao.deleteStudyPlanCourses(req.user.id);
    await dao.updateStudyPlanCourses(req.user.id, req.body.selectedCourses);
    await userDao.updateUserFulltime(req.user.id, req.body.isFulltime);

    res.status(200).end();
  } catch (err) {
    res.status(503).json({ error: `database error while updating the study plan` });
  }
}

// Delete study plan
app.delete('/api/courses/studyplan', isLoggedIn, async (req, res) => {
  try {
    await dao.deleteStudyPlanCourses(req.user.id);    // If the user is logged in means it exists
    await userDao.updateUserFulltime(req.user.id, -1);
    return res.status(200).end();
  } catch (err) {
    return res.status(503).json({ error: err });
  }
});

/***************** Users APIs *****************/

// Login
app.post('/api/sessions',
  check("username").notEmpty().trim().isEmail(),
  check("password").notEmpty().isString(),
  function (req, res, next) {
    const errors = validationResult(req);
    if (!errors.isEmpty())
      return res.status(500).end();

    passport.authenticate('local', (err, user, info) => {
      if (err)
        return next(err);

      if (!user)
        return res.status(401).json(info);

      // success, perform the login
      req.login(user, (err) => {
        if (err)
          return next(err);

        // req.user contains the authenticated user, we send all the user info back
        return res.status(200).json(req.user);
      });
    })(req, res, next);
  });

// Logout
app.delete('/api/sessions/current', (req, res) => {
  req.logout(() => { res.end(); });
});

// check whether the user is logged in or not
app.get('/api/sessions/current', (req, res) => {
  if (req.isAuthenticated())
    res.status(200).json(req.user);
  else
    res.status(401).send({ error: 'not authenticated' });;
});