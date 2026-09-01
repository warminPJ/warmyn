const Datebase = require('better-sqlite3');
const db = new Datebase('base.db');
const { createdb } = require('../helpers')
//создание базы данных пользователей, основная

const dbNameObj = [
    { name: 'subTime', type: 'INTEGER' },
    { name: 'maxGB', type: 'INTEGER' },
    { name: 'subId', type: 'TEXT' },
    { name: 'link', type: 'TEXT' },
    { name: 'uuid', type: 'TEXT' },
    { name: 'username', type: 'TEXT' },
    { name: 'nameTaryff', type: 'TEXT' },
    { name: 'notified1h', type: 'INTEGER', default: 0 },
    { name: 'demotaryff', type: 'INTEGER', default: 0 },
    { name: 'stop', type: 'INTEGER', default: 0 },
    { name: 'stopTime', type: 'INTEGER', default: 0 },
    { name: 'stopQuantity', type: 'INTEGER', default: 0 },
    { name: 'hwidDeviceLimit', type: 'INTEGER' }
];

db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    userId TEXT PRIMARY KEY
  )
`);

createdb(db, 'users', dbNameObj)


const stmt = db.prepare(`
  INSERT OR REPLACE INTO users (
    userId, subTime, maxGB, subId, link, uuid, username, nameTaryff,
    notified1h, demotaryff, stop, stopTime, stopQuantity, hwidDeviceLimit
  ) VALUES (@userId, @subTime, @maxGB,
    @subId, @link, @uuid, @username, @nameTaryff,
    @notified1h, @demotaryff, @stop, @stopTime,
    @stopQuantity, @hwidDeviceLimit)
`);

function createSubdb({
    userId,
    subTime,
    maxGB,
    subId,
    link,
    uuid,
    username,
    nameTaryff,
    hwidDeviceLimit,
    notified1h = 0,
    demotaryff = 0,
    stop = 0,
    stopTime = 0,
    stopQuantity = 0 }) {
    const log = stmt.run({
        userId: Math.floor(userId),
        subTime,
        maxGB,
        subId: Math.floor(subId),
        link,
        uuid,
        username,
        nameTaryff,
        hwidDeviceLimit,
        notified1h,
        demotaryff,
        stop,
        stopTime,
        stopQuantity
    });
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
const getAllNum = db.prepare(`SELECT 
  COUNT(CASE WHEN notified1h <= 1 THEN 1 END) AS generalUser
FROM users`)

//получение колва людей впринципе
function getGenerateNumUser(){
    return getAllNum.get();
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
    updatedbUsers,
    getGenerateNumUser
}