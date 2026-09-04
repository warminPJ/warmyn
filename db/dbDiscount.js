const { db } = require('./dbUsers');
const { createTable, createdb, getInsertStmt } = require('../helpers');
const { writeLogs } = require('../logs/logFunc');
const { Markup } = require('telegraf');


const dbNameObj = [
    { name: 'userId', type: 'INTEGER', required: true, primaryKey: true },
    { name: 'username', type: 'TEXT' },
    { name: 'discountPercent', type: 'INTEGER', default: 20 },
    { name: 'isNotified', type: 'INTEGER', default: 0 },
    { name: 'isUsed', type: 'INTEGER', default: 0 },
    { name: 'source', type: 'TEXT' },
    { name: 'maxLimit', type: 'INTEGER', default: 6 },
    { name: 'createdAt', type: 'INTEGER', default: 0 }
];

createTable(db, 'discount', dbNameObj);
createdb(db, 'discount', dbNameObj);

const discount = getInsertStmt(db, 'discount', dbNameObj.filter(column =>
    ['userId', 'username', 'discountPercent', 'isNotified', 'isUsed', 'source', 'maxLimit'].includes(column.name)
));

function createDiscountdb(userId, username, discountPercent = 20, source) {
    return discount.run({ userId, username, discountPercent, isNotified: 0, isUsed: 0, source, maxLimit: 6 });
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