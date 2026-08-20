const Datebase = require('better-sqlite3');
const db = new Datebase('base.db');
const { writeLogs } = require('../logs/logFunc');
const { Markup } = require('telegraf');


db.exec(`CREATE TABLE IF NOT EXISTS discount (
    userId INTEGER NOT NULL PRIMARY KEY,
    username TEXT,
    discountPercent INTEGER DEFAULT 20,
    isNotified INTEGER DEFAULT 0,
    isUsed INTEGER DEFAULT 0,
    source TEXT,
    createdAt INTEGER DEFAULT CURRENT_TIMESTAMP
)`);

const discount = db.prepare('INSERT OR REPLACE INTO discount (userId, username, discountPercent, isNotified, isUsed, source) VALUES (?, ?, ?, ?, ?, ?)')

function createDiscountdb(userId, username, discountPercent = 20, source) {
    return discount.run(userId, username, discountPercent, 0, 0, source);
}

const getUserDiscount = db.prepare('SELECT * FROM discount WHERE userId = ?');
function getdbDiscount(userId){
    return getUserDiscount.get(userId)
}

module.exports = {
    createDiscountdb,
    getdbDiscount
}