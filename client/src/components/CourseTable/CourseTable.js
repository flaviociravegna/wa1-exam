import { Table } from 'react-bootstrap';
import { CourseRow } from '../CourseRow/CourseRow.js';
import './CourseTable.css';

function CourseTable(props) {
    const CheckProped = props.CheckProped, CheckIncomp = props.CheckIncomp;
    const courseFound = (codice) => { return props.courses.find((course) => course.codice === codice); };

    const GetRowColor = (course_code) => {
        if (!props.loggedIn || !props.studyPlanExists)
            return "black";

        const c = courseFound(course_code);
        if (!CheckIncomp(course_code) || props.selectedCourses.includes(course_code))
            return "red";
        else if (c.crediti + props.totCrediti > props.limits.max)
            return "yellow";
        else if (c.maxstudenti !== null && c.maxstudenti < c.selectedby + 1)
            return "orange";
        else if (CheckProped(course_code, props.selectedCourses))
            return "blue";
        else
            return "black";
    }

    const CreateThead = () => {
        return (
            < thead >
                <tr>
                    <th>Codice</th>
                    <th>Nome</th>
                    <th>Crediti</th>
                    {props.isStudyPlanTable === false && <th>Selezionato da</th>}
                    {props.isStudyPlanTable === false && <th>Max studenti</th>}
                    <th></th>
                    {props.studyPlanExists && <th></th>}
                </tr>
            </thead >
        );
    }

    const CreateStudyPlanTable = () => {
        const textcolor = "black";
        return (<>
            {props.selectedCourses.length > 0 ?
                <Table striped bordered hover className='courseTable'>
                    <CreateThead />
                    <tbody>
                        {props.selectedCourses.map((c) => <CourseRow
                            key={courseFound(c).codice}
                            codice={courseFound(c).codice}
                            nome={courseFound(c).nome}
                            crediti={courseFound(c).crediti}
                            selectedby={courseFound(c).selectedby}
                            maxstudenti={courseFound(c).maxstudenti}
                            incomp={courseFound(c).incomp}
                            proped={courseFound(c).proped}
                            studyPlanExists={props.studyPlanExists}
                            isStudyPlanTable={props.isStudyPlanTable}
                            selectedCourses={props.selectedCourses}
                            removeSelectedCourse={props.removeSelectedCourse}
                            color={textcolor}
                        />)}
                    </tbody>
                </Table> :
                <div className='row justify-content-center'>
                    <div className='col' style={{ fontStyle: "italic", textAlign: "center", color: "blue" }}> Clicca sull'apposito bottone nella lista per aggiungere un corso al piano studi  </div>
                </div>
            }
        </>
        );
    }

    const CreateCourseTable = () => {
        return (
            <Table striped bordered hover className='courseTable'>
                <CreateThead />
                <tbody>
                    {props.courses.map((c) => <CourseRow
                        key={c.codice}
                        codice={c.codice}
                        nome={c.nome}
                        crediti={c.crediti}
                        selectedby={c.selectedby}
                        maxstudenti={c.maxstudenti}
                        incomp={c.incomp}
                        proped={c.proped}
                        studyPlanExists={props.studyPlanExists}
                        isStudyPlanTable={props.isStudyPlanTable}
                        selectedCourses={props.selectedCourses}
                        addSelectedCourse={props.addSelectedCourse}
                        color={GetRowColor(c.codice)}
                    />)}
                </tbody>
            </Table>
        );
    }

    return (
        <>
            <div className='row'>
                <div className='col-md-1'></div>
                <div className='col-md-10'>
                    {props.isStudyPlanTable === true ? <CreateStudyPlanTable /> : <CreateCourseTable />}
                </div>
                <div className='col-md-1'></div>
            </div>
        </>
    );
}

export { CourseTable };