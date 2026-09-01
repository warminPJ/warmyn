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
    maxLimit INTEGER DEFAULT 6,
    createdAt INTEGER DEFAULT CURRENT_TIMESTAMP
)`);//limit это 6 месяцев скидки

const discount = db.prepare('INSERT OR REPLACE INTO discount (userId, username, discountPercent, isNotified, isUsed, source, maxLimit) VALUES (?, ?, ?, ?, ?, ?, ?)')

function createDiscountdb(userId, username, discountPercent = 20, source) {
    return discount.run(userId, username, discountPercent, 0, 0, source, 6);
}

const getUserDiscount = db.prepare('SELECT * FROM discount WHERE userId = ?');

function getdbDiscount(userId) {
    return getUserDiscount.get(userId)
}

const getAll = db.prepare(`SELECT 
  COUNT(*) AS generalUser,
  COUNT(CASE WHEN isUsed = 1 THEN 1 END) AS number
FROM discount`)

//получение всей базы
function getInfoDate(){
    return getAll.get()
}

//апдейт базы
function updatedbDiscount(set, where, par1, par2) {
    db.prepare(`UPDATE discount SET ${set} = ? WHERE ${where} = ?`).run(par1, par2)
}

module.exports = {
    createDiscountdb,
    getdbDiscount,
    updatedbDiscount,
    getInfoDate
}