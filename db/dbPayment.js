const Datebase = require('better-sqlite3');
const db = new Datebase('base.db');

//база с историей всех операций(денежных, смертельных)
db.exec(`CREATE TABLE IF NOT EXISTS payment (paymentId TEXT PRIMARY KEY, userId TEXT, maxGB INTEGER, subTime INTEGER, status TEXT DEFAULT 'pending', createdAt INTEGER, nameTaryff TEXT, hwidDeviceLimit INTEGER)`)
const insertPayment = db.prepare('INSERT OR REPLACE INTO payment (paymentId, userId, maxGB, subTime, createdAt, nameTaryff, hwidDeviceLimit) VALUES (?, ?, ?, ?, ?, ?, ?)');

function createPayment(paymentId, userId, maxGb, subTime, nameTaryff, hwidDeviceLimit) {
    const log = insertPayment.run(paymentId, userId, maxGb, subTime, new Date(Date.now()).toLocaleString('ru-RU'), nameTaryff, hwidDeviceLimit);
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