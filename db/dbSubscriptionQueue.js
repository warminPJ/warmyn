const Datebase = require('better-sqlite3');
const db = new Datebase('base.db');
const { writeLogs } = require('../logs/logFunc');
const { Markup } = require('telegraf');
const { create } = require('axios');

db.exec(`CREATE TABLE IF NOT EXISTS subscritionQueue (
    userId INTEGER NOT NULL,
    uuid TEXT NOT NULL,
    nameTaryff TEXT,
    createdAt INTEGER,
    subTime INTEGER,
    maxGB INTEGER,
    hwidDeviceLimit INTEGER
)`);

const subscritionQueue = db.prepare('INSERT OR REPLACE INTO subscritionQueue (userId, uuid, nameTaryff, createdAt, subTime, maxGB, hwidDeviceLimit) VALUES (?, ?, ?, ?, ?, ?, ?)');
function createSubscritionQueue(userId, uuid, nameTaryff, createdAt, maxGB, subTime, hwidDeviceLimit) {
    return subscritionQueue.run(userId, uuid, nameTaryff, createdAt, maxGB, subTime, hwidDeviceLimit)
}
//получение всей строки
function getDateDbSubscritionQueue(userId) {
    return db.prepare('SELECT * FROM subscritionQueue WHERE userId = ?').all(userId);
}

function updatedbSubscritionQueue(set, where, par1, par2) {
    const res = db.prepare(`UPDATE subscritionQueue SET ${set} = ? WHERE ${where} = ?`).run(par1, par2)
    return res;
}

function addSubIndb(userId = 0, uuid, nameTaryff = '', subTime, maxGB = 0, hwidDeviceLimit) {
    console.log(`end ${new Date(subTime).toISOString()}`)

    const now = new Date(Date.now()).toISOString();
    const insert = db.prepare(`
        INSERT INTO subscritionQueue (userId, uuid, nameTaryff, createdAt, subTime, maxGB, hwidDeviceLimit)
        VALUES(?, ?, ?, ?, ?, ?, ?)
        `).run(userId, uuid, nameTaryff, now, subTime, maxGB, hwidDeviceLimit)
    return
}

function deleteSubscritionQueue(userId){
    const stmt = db.prepare('DELETE FROM subscritionQueue WHERE userId = ?')
    return stmt.run(userId)
}

module.exports = {
    addSubIndb,
    getDateDbSubscritionQueue,
    updatedbSubscritionQueue,
    deleteSubscritionQueue
}