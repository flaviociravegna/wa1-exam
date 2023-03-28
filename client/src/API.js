import { Course } from './components/Course/Course.js';
const APIURL = new URL('http://localhost:3001/api/');

async function getAllCourses() {
    const response = await fetch(new URL('courses', APIURL));
    const coursesJSON = await response.json();

    if (response.ok)
        return coursesJSON.map((c) => new Course(
            c.codice, c.nome, c.crediti, c.selectedby !== undefined ? c.selectedby : 0,
            c.maxstudenti, c.incomp, c.proped, "black"
        ));
    else
        throw coursesJSON;
}

/*********************************************************/

async function getStudyPlanCourses() {
    const response = await fetch(new URL('courses/studyplan', APIURL), { credentials: 'include' });
    const coursesJSON = await response.json();

    if (response.ok)
        return coursesJSON;
    else
        throw coursesJSON;
}

async function saveStudyPlan(selectedCourses, alreadyExists, isFulltime) {
    const response = await fetch(new URL('courses/studyplan', APIURL), {
        method: alreadyExists ? 'PUT' : 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ selectedCourses: selectedCourses, isFulltime: isFulltime })
    });

    if (!response.ok) {
        const errorMsg = await response.json();
        throw errorMsg.error;
    }
}

async function deleteStudyPlan() {
    const response = await fetch(new URL('courses/studyplan', APIURL), {
        method: 'DELETE',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' }
    });

    if (!response.ok) {
        const errorMsg = await response.json();
        throw errorMsg.error;
    }
}

/***********************************************************/

async function logIn(credentials) {
    let response = await fetch(new URL('sessions', APIURL), {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json', },
        body: JSON.stringify(credentials),
    });

    if (response.ok) {
        const user = await response.json();
        return user;
    } else {
        const errDetail = await response.json();
        throw errDetail.error;
    }
}

async function logOut() {
    await fetch(new URL('sessions/current', APIURL), { method: 'DELETE', credentials: 'include' });
}

async function getUserInfo() {
    const response = await fetch(new URL('sessions/current', APIURL), { credentials: 'include' });
    const userInfo = await response.json();
    if (response.ok)
        return userInfo;
    else
        throw userInfo;
}

const API = { getAllCourses, logIn, logOut, getUserInfo, getStudyPlanCourses, deleteStudyPlan, saveStudyPlan };
export default API;