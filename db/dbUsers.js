const Datebase = require('better-sqlite3');
const db = new Datebase('base.db');
//создание базы данных пользователей, основная
db.exec('CREATE TABLE IF NOT EXISTS users (userId TEXT PRIMARY KEY, subTime INTEGER, maxGB INTEGER, money REAL, subId TEXT, link TEXT, uuid TEXT, username TEXT, nameTaryff TEXT, notified1h INTEGER DEFAULT 0, demotaryff INTEGER DEFAULT 0)');
const stmt = db.prepare('INSERT OR REPLACE INTO users (userId, subTime, maxGB, money, subId, link, uuid, username, nameTaryff, notified1h, demoTaryff) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)');

function createSubdb(userId, subTime, maxGB, money, subId, link, uuid, username, nameTaryff, notified1h = 0, demotaryff = 0) {
    const log = stmt.run(Math.floor(userId), subTime, maxGB, money, Math.floor(subId), link, uuid, username, nameTaryff, notified1h, demotaryff);
}
//осторожно т.к может быть sql инъекция, не давать ввод пользователю
//обновление тарифов выполняет функция tarryffRecord а эта функция впринципе для обновления этой базы
function updatedbUsers(set, where, par1, par2) {
    const res = db.prepare(`UPDATE users SET ${set} = ? WHERE ${where} = ?`).run(par1, par2)
    return res;
}

function getLink(userId) {
    if (db.prepare('SELECT link FROM users WHERE userId = ?').get(userId)?.link) {
        const link = db.prepare('SELECT link FROM users WHERE userId = ?').get(userId)?.link || 'вашей ссылки нету :(';
        return {
            link: link,
            status: true
        }
    }
    else {
        const link = 'вашей ссылки нету :(';
        return {
            link: link,
            status: false
        }
    }
}
// получение всей строки с пользователем
function getDateDbUsers(userId) {
    return db.prepare('SELECT * FROM users WHERE userId = ?').get(userId);
}

module.exports = {
    getLink,
    createSubdb,
    db,
    getDateDbUsers,
    updatedbUsers
}