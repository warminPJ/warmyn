const { db } = require('./dbUsers');
const { createTable, createdb, getInsertStmt } = require('../helpers');

//база с историей всех операций(денежных, смертельных)
const dbNameObj = [
    { name: 'paymentId', type: 'TEXT', required: true, primaryKey: true },
    { name: 'userId', type: 'TEXT' },
    { name: 'maxGB', type: 'INTEGER' },
    { name: 'subTime', type: 'INTEGER' },
    { name: 'status', type: 'TEXT', default: 'pending' },
    { name: 'createdAt', type: 'TEXT' },
    { name: 'nameTaryff', type: 'TEXT' },
    { name: 'hwidDeviceLimit', type: 'INTEGER' }
];

createTable(db, 'payment', dbNameObj);
createdb(db, 'payment', dbNameObj);
const insertPayment = getInsertStmt(db, 'payment', dbNameObj.filter(column => column.name !== 'status'));

function createPayment(paymentId, userId, maxGb, subTime, nameTaryff, hwidDeviceLimit) {
    return insertPayment.run({ paymentId, userId, maxGB: maxGb, subTime, nameTaryff, hwidDeviceLimit, createdAt: new Date(Date.now()).toLocaleString('ru-RU') });
}

function dontTouch(paymentId) {
    return db.prepare('SELECT * FROM payment WHERE paymentId = ?').get(paymentId);
}

function markPaymentDone(paymentId) {
    const res = db.prepare(`UPDATE payment SET status = 'succeeded' WHERE paymentId = ? AND status = 'pending'`).run(paymentId);
    return res.changes > 0;
}
function markPaymentError(paymentId) {
    const res = db.prepare(`UPDATE payment SET status = 'error' WHERE paymentId = ? `).run(paymentId);
    return res.changes > 0
}

module.exports = {
    createPayment,
    dontTouch,
    markPaymentDone,
    markPaymentError,
    
}