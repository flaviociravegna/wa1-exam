'use strict';

const sqlite = require('sqlite3');
const db = new sqlite.Database('pianostudi.sqlite', (err) => { if (err) throw err; });  // open the database

// GET all courses
exports.getAllCourses = () => {
    return new Promise((resolve, reject) => {
        db.all('SELECT * FROM corsi', [], (err, rows) => {
            if (err)
                reject(err);
            else {
                const courses = rows.map((c) => ({
                    codice: c.codice,
                    nome: c.nome,
                    crediti: c.crediti,
                    maxstudenti: c.maxStudenti,
                    proped: c.codiceCorsoPropedeutico
                }));
                resolve(courses);
            }
        });
    });
};

// GET all courses not compatible with the code passed as parameter
exports.getCoursesNotCompatible = (codice) => {
    return new Promise((resolve, reject) => {
        db.all('SELECT * FROM [corso-non-compatibile-con] WHERE codice = ? OR codiceNonCompatibile = ?', [codice, codice], (err, rows) => {
            if (err)
                reject(err);
            else {
                const courses = [];
                rows.forEach((row) => {
                    if (row.codice === codice)
                        courses.push(row.codiceNonCompatibile);
                    else if (row.codiceNonCompatibile === codice)
                        courses.push(row.codice);
                });

                resolve(courses);
            }
        });
    });
};

exports.getStudyPlanCourses = (id) => {
    return new Promise((resolve, reject) => {
        db.all('SELECT codiceCorso AS codice FROM [studente-seleziona-corso] WHERE idStudente = ?', [id], (err, rows) => {
            if (err)
                reject(err);
            else {
                const courses = [];
                rows.forEach((row) => { courses.push(row.codice); });
                resolve(courses);
            }
        });
    });
}

exports.updateStudyPlanCourses = (id, selectedCourses) => {
    return new Promise((resolve, reject) => {
        // Put a placeholder for each course in order to do multiple inserts at once
        let parameters = [];
        selectedCourses.forEach((courseID) => { parameters.push(id); parameters.push(courseID); });
        const placeholders = selectedCourses.map(() => '(?, ?)').join(',');
        const sql = 'INSERT INTO [studente-seleziona-corso] (idStudente, codiceCorso) VALUES ' + placeholders;
        db.run(sql, parameters, (err) => {
            if (err)
                reject(err);
            else
                resolve("ok");
        });
    });
}

exports.deleteStudyPlanCourses = (id) => {
    return new Promise((resolve, reject) => {
        db.all('DELETE FROM [studente-seleziona-corso] WHERE idStudente = ?', [id], (err, rows) => {
            if (err)
                reject(err);
            else
                resolve("ok");
        });
    });
}

// GET the number of students that selected the course identified by the code passed as parameter
exports.getCourseStudentsCount = (codice) => {
    return new Promise((resolve, reject) => {
        db.get('SELECT COUNT(*) as num FROM [studente-seleziona-corso] WHERE codiceCorso = ?', [codice], (err, row) => {
            if (err)
                reject(err);
            else
                resolve(row.num);
        });
    });
};