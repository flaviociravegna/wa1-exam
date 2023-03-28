import { Form, Button, Alert, Container, Row, Col } from 'react-bootstrap';
import { useNavigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { MdError } from "react-icons/md";
import validator from 'validator';
import './Login.css';

function LoginForm(props) {
    const navigate = useNavigate();
    const loginPageOpen = props.loginPageOpen;
    const setLoginPageOpen = props.setLoginPageOpen;
    const [username, setUsername] = useState('studente1@polito.it');
    const [password, setPassword] = useState('password');
    const errorMessage = props.errorMsg, setErrorMessage = props.setErrorMsg;

    const handleSubmit = (event) => {
        event.preventDefault();
        setErrorMessage('');
        const credentials = { username, password };

        if (username.trim() === '') {
            setErrorMessage("inserire un username (email)"); return;
        } else if (password === '') {
            setErrorMessage("inserire una password"); return;
        }

        if (!validator.isEmail(username.trim())) {
            setErrorMessage("l'username deve essere una e-mail");
            return;
        }

        props.login(credentials);
    };

    useEffect(() => {
        const setAsOpen = async () => {
            if (!loginPageOpen)
                setLoginPageOpen(true);
        };
        setAsOpen();
    }, [loginPageOpen, setLoginPageOpen]);

    // onSubmit is used in order to let the user press 'enter' key to submit the form data
    return (
        <div className="bg-light min-vh-100 wrapper">
            <Container id="formContainer">
                <Row>
                    <Col> <h1 id="loginTitle"> Login </h1> </Col>
                </Row>
                <Row>
                    <Col>
                        <Form onSubmit={handleSubmit}>
                            {errorMessage &&
                                <Alert variant='danger'>
                                    <MdError style={{ fontSize: "20pt", marginRight: "8px" }} /> <span style={{ verticalAlign: "middle" }}><b>Errore: </b><span> {errorMessage} </span> </span>
                                </Alert>}
                            <Form.Group controlId='username'>
                                <Form.Label className="lblForm"> Username </Form.Label>
                                <Form.Control value={username} onChange={ev => setUsername(ev.target.value)} />
                            </Form.Group>
                            <Form.Group controlId='password'>
                                <Form.Label className="lblForm"> Password </Form.Label>
                                <Form.Control type='password' value={password} onChange={ev => setPassword(ev.target.value)} />
                            </Form.Group>
                            <div id="btnWrapper">
                                <Button type='submit' id="btnSubmit"> Invia </Button>
                                <Button id="btnCancel" onClick={() => {
                                    setLoginPageOpen(false);
                                    setErrorMessage("");
                                    navigate('/');
                                }}> Torna alla home page </Button>
                            </div>
                        </Form>
                    </Col>
                </Row>
            </Container>
        </div >
    )
}

export { LoginForm };