import { CourseTable } from '../CourseTable/CourseTable.js';
import { Button, Form, Alert } from 'react-bootstrap';
import { useState } from 'react';
import { MdError } from "react-icons/md";
import { GrUpdate } from "react-icons/gr";
import API from '../../API.js';
import './CourseList.css';

function CourseList(props) {
    const [showMenu, setShowMenu] = useState(false);
    const [successMsg, setSuccessMsg] = useState("");
    const [isTheServerProcessing, setIsTheServerProcessing] = useState(false);
    const selectedCourses = props.selectedCourses, setSelectedCourses = props.setSelectedCourses;
    const errorMsg = props.errorMsg, setErrorMsg = props.setErrorMsg;
    const mode = props.mode, setMode = props.setMode;
    const totCrediti = props.totCrediti, setTotCrediti = props.setTotCrediti;
    const courses = props.courses, setCourses = props.setCourses;

    /******************************** Checks *************************************************/

    const CheckIncomp = (courseCodeToCheck) => {
        const coursesList = courses.find(elem => elem.codice === courseCodeToCheck).incomp;
        for (const courseCode of coursesList)
            if (selectedCourses.includes(courseCode))
                return false;
        return true;
    }

    const CheckRemoveProped = (codeToBeRemoved) => {
        // Check every selected course and, for each of them, look if its proped. course code is the same as
        // the one that the user wants to remove
        for (const c of selectedCourses) {
            const temp_course = courses.find((course) => course.codice === c);
            if (temp_course.proped === codeToBeRemoved)
                return temp_course.codice;
        }
        return "";
    }

    const CheckProped = (newCourseCode, arrayToScan) => {
        const propedCourseCode = courses.find((c) => c.codice === newCourseCode).proped;
        return propedCourseCode !== null && arrayToScan.includes(propedCourseCode) === false;
    }

    /*************************************************************************/

    const addSelectedCourse = (newCourseCode) => {
        const courseFromList = courses.find((c) => c.codice === newCourseCode);
        const courseCFU = courseFromList.crediti;

        if (totCrediti === props.limits.max)
            setErrorMsg("Inserimento non consentito: non è possibile aggiungere ulteriori esami poichè si è raggiunto il limite di " + props.limits.max + " crediti");
        else if (courseCFU + totCrediti > props.limits.max)
            setErrorMsg("Inserimento non consentito poichè eccede il limite di " + props.limits.max + " crediti");
        else if (selectedCourses.find((code) => code === newCourseCode) !== undefined)
            setErrorMsg("Inserimento non consentito: corso già presente nel piano di studi corrente");
        else if (courseFromList.maxstudenti !== null && courseFromList.maxstudenti < courseFromList.selectedby + 1)
            setErrorMsg("Inserimento non consentito: il corso ha già raggiunto il numero massimo di studenti");
        else {
            if (!CheckIncomp(newCourseCode)) // Look for incompatible courses in the study plan
                setErrorMsg("Inserimento non consentito: corsi incompatibili nel piano di studi corrente");
            else if (CheckProped(newCourseCode, selectedCourses))
                setErrorMsg("Inserimento non consentito: corso propedeutico richiesto");
            else {
                const newTotCrediti = totCrediti + courseFromList.crediti;
                const newSelectedCoursesArray = selectedCourses.concat(newCourseCode);
                setTotCrediti(newTotCrediti);

                // First concat the new value, then return the sorted array
                setSelectedCourses(() =>
                    newSelectedCoursesArray.sort((a, b) => {
                        return courses.find((course) => course.codice === a).nome > courses.find((course) => course.codice === b).nome ? 1 : -1;
                    })
                );

                setCourses(corsi => corsi.map(c => c.codice === newCourseCode ? { ...c, selectedby: c.selectedby + 1 } : c));

                setErrorMsg("");
                setSuccessMsg("");
            }
        }
    }

    const removeSelectedCourse = (oldCourseCode) => {
        const courseCodeAssociated = CheckRemoveProped(oldCourseCode);
        if (courseCodeAssociated !== "")
            setErrorMsg('Rimozione non consentita: non è possibile rimuovere un corso propedeutico al corso "' + courseCodeAssociated + '"');
        else {
            const newTotCrediti = totCrediti - courses.find((c) => c.codice === oldCourseCode).crediti;
            const newSelectedCoursesArray = selectedCourses.filter(sc => sc !== oldCourseCode);

            setTotCrediti(newTotCrediti);
            setSelectedCourses(newSelectedCoursesArray);
            setCourses(corsi => corsi.map(c => c.codice === oldCourseCode ? { ...c, selectedby: c.selectedby - 1 } : c));

            setErrorMsg("");
            setSuccessMsg("");
        }
    }

    // Create a study plan
    const handleSubmit = (event) => {
        event.preventDefault();
        if (!(mode === "fulltime" || mode === "parttime"))
            setErrorMsg("Modalità non valida");
        else {
            setErrorMsg("");
            props.setStudyPlanExists(true);
            props.setLimits(mode === "fulltime" ? { min: 60, max: 80 } : { min: 20, max: 40 });
            props.setUser(old => ({ ...old, fulltime: mode === "fulltime" ? 1 : 0 }));
            setShowMenu(false);
        }
    };

    /****************************** Button onClick handlers ****************************** */

    const saveStudyPlan = async () => {
        let old_study_plan, updated = false;

        try {
            setIsTheServerProcessing(true);
            old_study_plan = await API.getStudyPlanCourses();
            await API.saveStudyPlan(selectedCourses, old_study_plan.length > 0 ? true : false, mode === "fulltime" ? 1 : 0);
            updated = true;

            props.setStudyPlanExists(true);

            const user_data = await API.getUserInfo();
            const courses_from_db = await API.getAllCourses();
            const planCourses = await API.getStudyPlanCourses();

            courses_from_db.sort((a, b) => { return (a.nome >= b.nome) ? 1 : -1; });
            planCourses.sort((a, b) => { return courses_from_db.find((course) => course.codice === a).nome > courses_from_db.find((course) => course.codice === b).nome ? 1 : -1; });

            props.setUser(user_data);
            setCourses(courses_from_db);
            setSelectedCourses(planCourses);

            setErrorMsg("");
            setSuccessMsg("Piano salvato con successo");
        } catch (err) {
            setErrorMsg(err);

            if (!updated) {     // If the error is on the update, not on getting the courses
                const courses_without_curr_plan = await API.getAllCourses();
                old_study_plan = await API.getStudyPlanCourses();

                // If the course has been added (it's not present in the old plan), increase the quantity
                // If it's present in the old one but not in the current, decrease the quantity
                // Otherwise, return the value as is
                setCourses(courses_without_curr_plan
                    .map(c => {
                        return selectedCourses.includes(c.codice) && !old_study_plan.includes(c.codice) ? { ...c, selectedby: c.selectedby + 1 }
                            : (!selectedCourses.includes(c.codice) && old_study_plan.includes(c.codice) ? { ...c, selectedby: c.selectedby - 1 } : c);
                    }).sort((a, b) => { return (a.nome >= b.nome) ? 1 : -1; }));
            }
        } finally { setIsTheServerProcessing(false); }
    }

    const removePlanUpdates = async () => {
        try {
            setIsTheServerProcessing(true);
            const planCourses = await API.getStudyPlanCourses();
            const corsi = await API.getAllCourses();

            planCourses.sort((a, b) => { return corsi.find((course) => course.codice === a).nome > corsi.find((course) => course.codice === b).nome ? 1 : -1; });
            corsi.sort((a, b) => { return (a.nome >= b.nome) ? 1 : -1; });

            setIsTheServerProcessing(false);
            setErrorMsg("");
            setSelectedCourses(planCourses);
            setCourses(corsi);
            props.setTotCrediti(planCourses
                .map(cod => corsi.find(elem => elem.codice === cod).crediti)
                .reduce((partialSum, a) => partialSum + a, 0));
            setSuccessMsg("Piano ripristinato con successo");
        } catch (err) { setErrorMsg(err) }
    }

    const deletePlan = async () => {
        try {
            setIsTheServerProcessing(true);
            await API.deleteStudyPlan();
            const user_data = await API.getUserInfo();

            setIsTheServerProcessing(false);
            setMode("");
            setErrorMsg("");
            setSelectedCourses([]);
            props.setUser(user_data);
            props.setTotCrediti(0);
            props.setStudyPlanExists(false);
            props.setInitialLoading(true);
            setSuccessMsg("Piano cancellato con successo");
        } catch (err) { setErrorMsg(err) }
    }

    /****************************************************************************************/
    /********************************** Components ******************************************/
    /****************************************************************************************/

    const StartCreateStudyPlan = () => { return (<Button id="btnCreateStudyPlan" onClick={() => { setShowMenu(true); setSuccessMsg(""); }}> Crea Piano Studi </Button>); }
    const CreateStudyPlanMenu = () => {
        return (
            <div className="col my-4">
                <Form id="menuForm" onSubmit={handleSubmit}>
                    <Form.Group>
                        <Form.Select aria-label="Modalità" value={mode} onChange={event => setMode(event.target.value)}>
                            <option>Seleziona la modalità...</option>
                            <option value="fulltime">Full-time</option>
                            <option value="parttime">Part-time</option>
                        </Form.Select>
                    </Form.Group>
                    <div id="btnWrapperMenu">
                        <Button type='submit' id="btnConfirm"> Conferma </Button>
                        <Button id="btnBack" onClick={() => setShowMenu(false)}> Annulla </Button>
                    </div>
                </Form>
            </div>
        );
    }

    /****************************************************************************/

    return (
        <div className="container-fluid">
            <div className="row justify-content-center">
                <div className="col my-2">
                    <h1 id="table_header"> Corsi disponibili </h1>
                </div>
            </div>
            <div className="row justify-content-center">
                <div className='col'>
                    <CourseTable isStudyPlanTable={false} courses={courses} setCourses={setCourses}
                        limits={props.limits} totCrediti={totCrediti} studyPlanExists={props.studyPlanExists}
                        selectedCourses={selectedCourses} addSelectedCourse={addSelectedCourse}
                        CheckProped={CheckProped} CheckIncomp={CheckIncomp} loggedIn={props.loggedIn} />
                </div>
            </div>

            {props.loggedIn && !props.studyPlanExists && !showMenu &&
                <div className="row justify-content-center">
                    <div className="col my-4"></div>
                    <div className="col my-4">
                        <StartCreateStudyPlan />
                    </div>
                    <div className="col my-4"></div>
                </div>
            }

            {props.loggedIn && !props.studyPlanExists && showMenu &&
                <div>
                    <div className="row justify-content-center">
                        <div className="col my-2">
                            <h1 id="table_header"> Crea Piano Studi </h1>
                        </div>
                    </div>
                    <div className="row justify-content-center">
                        <div className="col my-4"></div>
                        <CreateStudyPlanMenu />
                        <div className="col my-4"></div>
                    </div>
                </div>
            }

            {props.loggedIn && props.studyPlanExists && !showMenu &&
                <div className="row justify-content-center">
                    <div className="col-10">
                        <div> Le righe evidenziate in <b style={{ color: "blue" }}> blu </b> indicano corsi non inseribili poichè necessitano dapprima un corso propedeutico nel piano studi </div>
                        <div> Le righe evidenziate in <b style={{ color: "red" }}> rosso </b> indicano corsi non inseribili poichè violano dei vincoli di incompatibilità con corsi già presenti nel piano studi </div>
                        <div> Le righe evidenziate in <b style={{ color: "rgb(225, 225, 0)" }}> giallo </b> indicano corsi non inseribili poichè farebbero eccedere il numero massimo di crediti consentito </div>
                        <div> Le righe evidenziate in <b style={{ color: "orange" }}> arancione </b> indicano corsi non inseribili poichè hanno già raggiunto il numero massimo di studenti consentito </div>
                    </div>
                </div>
            }

            {props.loggedIn && props.studyPlanExists && !showMenu &&
                <>
                    <div className="row justify-content-center">
                        <div className="col my-2">
                            <h1 id="table_header"> Piano Studi </h1>
                        </div>
                    </div>
                    <div className="row">
                        <div className='col-1'></div>
                        <div className="col-3">
                            <span> Opzione <b> {mode === "fulltime" ? "Full-time" : "Part-time"} </b></span>
                        </div>
                    </div>
                    <div className="row">
                        <div className='col-md-1'></div>
                        <div className="col-md-3">
                            <span> Crediti minimi: <b>{props.limits.min}</b>,
                                Crediti massimi: <b>{props.limits.max}</b></span>
                        </div>
                    </div>
                    <div className="row">
                        <div className='col-md-1'></div>
                        <div className="col-md-2" style={{ marginBottom: "20px" }}>
                            <span> Crediti attuali: <b style={{ color: (props.totCrediti >= props.limits.min && props.totCrediti <= props.limits.max ? "black" : "red") }}>{totCrediti}</b></span>
                        </div>
                    </div>
                </>
            }
            {props.loginPageOpen === false &&
                <>
                    <CourseListError errorMsg={errorMsg} setErrorMsg={setErrorMsg} />
                    <CourseListSuccess successMsg={successMsg} setSuccessMsg={setSuccessMsg} />
                    <CourseListWaiting isTheServerProcessing={isTheServerProcessing} />
                </>
            }
            {props.loggedIn && props.studyPlanExists && !showMenu &&
                <>
                    <div className="row justify-content-center">
                        <div className='col'>
                            <CourseTable courses={courses} studyPlanExists={props.studyPlanExists} isStudyPlanTable={true} selectedCourses={selectedCourses} removeSelectedCourse={removeSelectedCourse} />
                        </div>
                    </div>
                    <div className="row justify-content-center my-2">
                        <div id="btnWrapperMenu2" className='col-md-6'>
                            <Button id="btnCancellaPiano" onClick={deletePlan}> Cancella piano studi </Button>
                            <Button id="btnAnnullaModifichePiano" onClick={removePlanUpdates}> Annulla modifiche </Button>
                            {props.totCrediti >= props.limits.min && props.totCrediti <= props.limits.max &&
                                <Button id="btnConfermaPiano" onClick={saveStudyPlan}> Salva piano studi </Button>
                            }
                        </div>
                    </div>
                </>
            }
        </div>
    );
}

function CourseListWaiting(props) {
    return (
        props.isTheServerProcessing &&
        <div className="row justify-content-center">
            <div className="col-md-7">
                <Alert variant='info'>
                    <GrUpdate style={{ fontSize: "20pt", marginRight: "12px" }} /> <span> Elaborando i dati... </span>
                </Alert>
            </div>
        </div>
    );
}

function CourseListError(props) {
    return (
        props.errorMsg !== "" &&
        <div className="row justify-content-center">
            <div className="col-md-7">
                <Alert variant='danger' onClose={() => props.setErrorMsg("")} dismissible>
                    <MdError style={{ fontSize: "20pt", marginRight: "8px" }} /> <span style={{ verticalAlign: "middle" }}><b>Errore: </b><span> {props.errorMsg} </span> </span>
                </Alert>
            </div>
        </div >
    );
}

function CourseListSuccess(props) {
    return (
        props.successMsg !== "" &&
        <div className="row justify-content-center">
            <div className="col-md-7">
                <Alert variant='success' onClose={() => props.setSuccessMsg("")} dismissible>
                    <span> {props.successMsg} </span>
                </Alert>
            </div>
        </div>
    );
}

export { CourseList };