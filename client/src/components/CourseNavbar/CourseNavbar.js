import { Navbar, Container, NavbarBrand, Button } from 'react-bootstrap';
import { useNavigate } from 'react-router-dom';
import { GiBookmark } from 'react-icons/gi';
import { MdArrowForwardIos } from 'react-icons/md';
import './CourseNavbar.css';

function CourseNavbar(props) {
    const navigate = useNavigate();
    const loggedIn = props.loggedIn;
    const loginPageOpen = props.loginPageOpen;

    return (
        <Navbar className="courseNavbarTop" variant="dark" >
            <Container fluid>
                <NavbarBrand> <GiBookmark style={{ fontSize: '23px' }} /> <span className='titleNavbarTop'> Piano degli studi </span> </NavbarBrand>
                <NavbarBrand>
                    {loggedIn && <span style={{ fontSize: '20px', marginRight: '45px', fontStyle: "italic" }}> {props.user.username} </span>}
                </NavbarBrand>
                <NavbarBrand>
                    {loginPageOpen ? <span></span> :
                        <span>
                            {(loggedIn ?
                                <Button variant="outline-secondary" className='logInOutNavbar' onClick={() => props.logout()} ><span> LOGOUT <MdArrowForwardIos style={{ marginLeft: '8px', marginTop: "2px", fontSize: "11pt" }} /> </span></Button>
                                : <Button variant="outline-secondary" className='logInOutNavbar' onClick={() => navigate('/login')} ><span> LOGIN <MdArrowForwardIos style={{ marginLeft: '8px', marginTop: "2px", fontSize: "11pt" }} /> </span></Button>)}
                        </span>}
                </NavbarBrand>
            </Container>
        </Navbar >);
}

export { CourseNavbar };