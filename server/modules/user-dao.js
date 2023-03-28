'use strict';

const sqlite = require('sqlite3');
const crypto = require('crypto');
const db = new sqlite.Database('pianostudi.sqlite', (err) => { if (err) throw err; });

exports.getUserById = (id) => {
    return new Promise((resolve, reject) => {
        db.get('SELECT * FROM studenti WHERE id = ?', [id], (err, row) => {
            if (err)
                reject(err);

            if (row === undefined)
                resolve({ error: 'Student not found.' });
            else {
                const user = { id: row.id, username: row.username, fulltime: row.fulltime };
                resolve(user);
            }
        });
    });
};

exports.getUser = (username, password) => {
    return new Promise((resolve, reject) => {
        db.get('SELECT * FROM studenti WHERE username = ?', [username], (err, row) => {
            if (err)
                reject(err);

            if (row === undefined)
                resolve(false);
            else {
                const user = { id: row.id, username: row.username, fulltime: row.fulltime };
                const salt = row.salt;
                crypto.scrypt(password, salt, 32, (err, hashedPassword) => {
                    if (err) reject(err);

                    const passwordHex = Buffer.from(row.password, 'hex');
                    if (!crypto.timingSafeEqual(passwordHex, hashedPassword))
                        resolve(false);
                    else
                        resolve(user);
                });
            }
        });
    });
};

exports.updateUserFulltime = (id, isFulltime) => {
    return new Promise((resolve, reject) => {
        db.run('UPDATE studenti SET fulltime = ? WHERE id = ?', [isFulltime, id], (err) => {
            if (err)
                reject(err);
            else
                resolve("ok");
        });
    });
}