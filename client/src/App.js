import 'bootstrap/dist/css/bootstrap.min.css';
import './App.css';
import { BrowserRouter as Router, Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import { useState, useEffect } from 'react';

/****** Additional imports ******/
import { BsDownload } from 'react-icons/bs';
import { CourseNavbar } from './components/CourseNavbar/CourseNavbar.js'
import { CourseList } from './components/CourseList/CourseList.js'
import { LoginForm } from './components/Login/Login';
import API from './API.js';

function App() {
  return (
    <Router>
      <App2 />
    </Router>
  )
}

function App2() {
  const navigate = useNavigate();
  const [loggedIn, setLoggedIn] = useState(false);
  const [user, setUser] = useState({});
  const [mode, setMode] = useState("");
  const [limits, setLimits] = useState({});

  const [errorMsg, setErrorMsg] = useState("");

  const [courses, setCourses] = useState([]);
  const [selectedCourses, setSelectedCourses] = useState([]);
  const [totCrediti, setTotCrediti] = useState(0);

  const [loginPageOpen, setLoginPageOpen] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const [checkedAuthN, setCheckedAuthN] = useState(false);
  const [studyPlanExists, setStudyPlanExists] = useState(false);

  /****************************** Use Effects ******************************/
  // Check if the user is already logged in (executed only once when the app mounts)
  useEffect(() => {
    const checkAuth = async () => {
      try {
        const stud = await API.getUserInfo();
        setLoggedIn(true);
        setUser(stud);

        if (stud.fulltime === 1 || stud.fulltime === 0) {
          const corsi = await API.getAllCourses();
          const SP = await API.getStudyPlanCourses();
          const crediti = SP.map(cod => corsi.find(elem => elem.codice === cod).crediti).reduce((partialSum, a) => partialSum + a, 0);

          setMode(stud.fulltime ? "fulltime" : "parttime");
          setStudyPlanExists(true);
          setSelectedCourses(SP.sort((a, b) => { return corsi.find((course) => course.codice === a).nome > corsi.find((course) => course.codice === b).nome ? 1 : -1; }));
          setTotCrediti(crediti);
          setCourses(corsi.sort((a, b) => { return (a.nome >= b.nome) ? 1 : -1; }));
          setLimits(stud.fulltime ? { min: 60, max: 80 } : { min: 20, max: 40 });
          setInitialLoading(false);     // We don't need to update again the course list, since we've already called the API
        }
      } catch (err) {
        // An user can be not logged in when the app starts, so an error message is not needed
        setLoggedIn(false);
      } finally {
        setCheckedAuthN(true);
      }
    };
    checkAuth();
  }, []);

  // First of all, when the page is loading, update the courses list (if the check of authentication has already been done)
  useEffect(() => {
    if (initialLoading && checkedAuthN) {
      API.getAllCourses()
        .then((corsi) => setCourses(corsi.sort((a, b) => { return (a.nome >= b.nome) ? 1 : -1; })))
        .catch((err) => setErrorMsg(err))
    }
  }, [initialLoading, checkedAuthN])

  // Set the state "initialLoading" to false ONLY when the courses are updated (it may take a bit to update the state)
  useEffect(() => {
    if (courses.length > 0)
      setInitialLoading(false);
  }, [initialLoading, courses.length])

  /**********************************************************************************/

  const doLogIn = (credentials) => {
    API.logIn(credentials)
      .then(user => {
        setErrorMsg("");
        setUser(user);
        setLoggedIn(true);
        setLoginPageOpen(false);

        // If the student has already defined a study plan (user.fullti.me can only be [-1, 0, 1])
        if (user.fulltime === 1 || user.fulltime === 0) {
          API.getStudyPlanCourses().then((SP) => {
            const crediti = SP
              .map(cod => courses.find(elem => elem.codice === cod).crediti)
              .reduce((partialSum, a) => partialSum + a, 0);

            setMode(user.fulltime ? "fulltime" : "parttime");
            setLimits(user.fulltime ? { min: 60, max: 80 } : { min: 20, max: 40 }); // Set the max/min credits
            setStudyPlanExists(true);
            setSelectedCourses(SP.sort((a, b) => { return courses.find((course) => course.codice === a).nome > courses.find((course) => course.codice === b).nome ? 1 : -1; }));
            setTotCrediti(crediti);
          });
        } else {
          setMode("");
          setLimits({});
          setStudyPlanExists(false);
          setSelectedCourses([]);
          setTotCrediti(0);
        }

        navigate('/studenthome');
      }).catch(err => setErrorMsg(err))
  }

  const doLogOut = async () => {
    await API.logOut();
    const basicCourses = await API.getAllCourses();
    setCourses(basicCourses.sort((a, b) => { return (a.nome >= b.nome) ? 1 : -1; }));

    setMode("");
    setLimits({});
    setStudyPlanExists(false);
    setSelectedCourses([]);
    setTotCrediti(0);
    setErrorMsg("");
    setLoggedIn(false);
    setUser({});
    navigate('/');
  }

  /****************************************************************************************/

  return (
    <>
      <CourseNavbar loggedIn={loggedIn} logout={doLogOut} user={user} loginPageOpen={loginPageOpen} />
      <Routes>
        <Route path='/' element={initialLoading ? <LoadingMessage /> : (loggedIn ? <Navigate to='/studenthome' /> : <CourseList courses={courses} />)} />
        <Route path='/studenthome' element={<CourseList
          initialLoading={initialLoading} setInitialLoading={setInitialLoading}
          loggedIn={loggedIn} loginPageOpen={loginPageOpen}
          courses={courses} setCourses={setCourses}
          selectedCourses={selectedCourses} setSelectedCourses={setSelectedCourses}
          errorMsg={errorMsg} setErrorMsg={setErrorMsg}
          studyPlanExists={studyPlanExists} setStudyPlanExists={setStudyPlanExists}
          mode={mode} setMode={setMode}
          totCrediti={totCrediti} setTotCrediti={setTotCrediti}
          limits={limits} setLimits={setLimits} setUser={setUser}
        />} />
        <Route path='/login' element={loggedIn ? <Navigate to='/studenthome' /> : <LoginForm loginPageOpen={loginPageOpen} setLoginPageOpen={setLoginPageOpen} login={doLogIn} errorMsg={errorMsg} setErrorMsg={setErrorMsg} />} />
        <Route path="*" element={loggedIn ? <Navigate to='/studenthome' /> : <Navigate to="/" />} />
      </Routes>
    </>
  );
}

function LoadingMessage() {
  return (
    <div className='row justify-content-center'>
      <div className='col-md-4'></div>
      <div className='col-md-4' style={{ padding: "30px", fontSize: '27px', textAlign: "center", marginTop: "40px", border: "2px solid rgb(100, 100, 100)", borderRadius: "4px" }}>
        <BsDownload /> <span style={{ marginLeft: "25px", marginRight: "25px" }}> Caricamento... </span> <BsDownload />
      </div>
      <div className='col-md-4'></div>
    </div>
  )
}

export default App;