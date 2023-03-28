import Accordion from 'react-bootstrap/Accordion';
import ListGroup from 'react-bootstrap/ListGroup';
import { MdAddBox } from "react-icons/md";
import { CgCloseR } from "react-icons/cg";
import './CourseRow.css';

function CourseRow(props) {
    const isStudyPlanTable = props.isStudyPlanTable;

    function DropDownDetails(p) {
        return (
            <Accordion>
                <Accordion.Item eventKey={p.codice}>
                    <Accordion.Header> <span> Dettagli </span> </Accordion.Header>
                    <Accordion.Body>
                        <ListGroup variant="flush">
                            <ListGroup.Item><IncompatibleText /></ListGroup.Item>
                            <ListGroup.Item><PropedeuticText /></ListGroup.Item>
                        </ListGroup>
                    </Accordion.Body>
                </Accordion.Item>
            </Accordion>
        );
    }

    function IncompatibleText() {
        return (props.incomp.length !== 0 ? <span> Incompatibile con: <IncompatibileVectorDisplay /> </span> : <span> Nessun corso incompatibile </span>);
    }

    function IncompatibileVectorDisplay() {
        let text = "";
        props.incomp.forEach((code) => text = text + code + ", ");
        text = text.slice(0, -2);      // remove last 2 characters
        return (<span> {text} </span>);
    }

    function PropedeuticText() {
        return (props.proped !== null ? <span> Propedeutico: {props.proped}</span> : <span> Nessun corso propedeutico </span>)
    }

    // Change row color adding dynamically css custom class
    return (
        <tr className={props.color}>
            <td className="align-middle" style={{ fontWeight: "bold", textAlign: "center" }}>{props.codice}</td>
            <td className="align-middle">{props.nome}</td>
            <td className="align-middle" style={{ textAlign: "center" }}>{props.crediti}</td>
            {isStudyPlanTable === false && <td className="align-middle">{props.selectedby} {props.selectedby !== 1 ? <span> studenti </span> : <span> studente </span>}</td>}
            {isStudyPlanTable === false && <td className="align-middle" style={{ textAlign: "center" }}>{props.maxstudenti}</td>}
            <td className="align-middle">
                <div style={{ display: 'flex', justifyContent: 'center', margin: '0' }}>
                    <DropDownDetails codice={props.codice} />
                </div>
            </td>
            {props.studyPlanExists &&
                <td className="align-middle">
                    <div style={{ display: 'flex', justifyContent: 'center' }}>
                        <span style={{ fontSize: '30px', cursor: "pointer", textAlign: "center" }}>
                            {isStudyPlanTable === false ? <MdAddBox onClick={() => props.addSelectedCourse(props.codice)} /> : <CgCloseR onClick={() => props.removeSelectedCourse(props.codice)} />}
                        </span>
                    </div>
                </td>}
        </tr>
    );
}

export { CourseRow };