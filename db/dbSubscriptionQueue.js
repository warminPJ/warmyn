const { db } = require('./dbUsers');
const { createTable, createdb, getInsertStmt } = require('../helpers');
const { writeLogs } = require('../logs/logFunc');
const { Markup } = require('telegraf');
const { create } = require('axios');

const dbNameObj = [
    { name: 'userId', type: 'INTEGER', required: true },
    { name: 'uuid', type: 'TEXT', required: true },
    { name: 'nameTaryff', type: 'TEXT' },
    { name: 'createdAt', type: 'TEXT' },
    { name: 'subTime', type: 'INTEGER' },
    { name: 'maxGB', type: 'INTEGER' },
    { name: 'hwidDeviceLimit', type: 'INTEGER' }
];

createTable(db, 'subscritionQueue', dbNameObj);
createdb(db, 'subscritionQueue', dbNameObj);

const subscritionQueue = getInsertStmt(db, 'subscritionQueue', dbNameObj);
function createSubscritionQueue(userId, uuid, nameTaryff, createdAt, maxGB, subTime, hwidDeviceLimit) {
    return subscritionQueue.run({ userId, uuid, nameTaryff, createdAt, maxGB, subTime, hwidDeviceLimit })
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
    return subscritionQueue.run({ userId, uuid, nameTaryff, createdAt: now, subTime, maxGB, hwidDeviceLimit });
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