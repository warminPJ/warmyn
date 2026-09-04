const Datebase = require('better-sqlite3');
const db = new Datebase('base.db');
const { createTable, createdb, getInsertStmt } = require('../helpers')
//создание базы данных пользователей, основная

const dbNameObj = [
    { name: 'userId', type: 'TEXT', required: true, primaryKey: true },
    { name: 'subTime', type: 'INTEGER', required: true },
    { name: 'maxGB', type: 'INTEGER', required: true },
    { name: 'subId', type: 'TEXT', required: true },
    { name: 'link', type: 'TEXT', required: true },
    { name: 'uuid', type: 'TEXT', required: true },
    { name: 'username', type: 'TEXT', required: true },
    { name: 'nameTaryff', type: 'TEXT', required: true },
    { name: 'notified1h', type: 'INTEGER', default: 0 },
    { name: 'demotaryff', type: 'INTEGER', default: 0 },
    { name: 'stop', type: 'INTEGER', default: 0 },
    { name: 'stopTime', type: 'INTEGER', default: 0 },
    { name: 'stopQuantity', type: 'INTEGER', default: 0 },
    { name: 'hwidDeviceLimit', type: 'INTEGER', required: true }
];//required и transform пока не используются


createTable(db, 'users', dbNameObj);
createdb(db, 'users', dbNameObj)





function createSubdb(data) {
    for (const field of dbNameObj) {
        if (field.required && data[field.name] === undefined) {
            throw new Error(`createSubdb: отсутствует обязательное поле "${field.name}"`);
        }
    }

    const presentFields = dbNameObj.filter(f => data[f.name] !== undefined);
    const columns = presentFields.map(f => f.name);

    const params = {};
    for (const field of presentFields) {
        let value = data[field.name];
        if (field.transform) value = field.transform(value);
        params[field.name] = value;
    }

    const stmt = getInsertStmt(db, 'users', presentFields);
    return stmt.run(params);
}


//осторожно т.к может быть sql инъекция, не давать ввод пользователю
//обновление тарифов выполняет функция tarryffRecord а эта функция впринципе для обновления этой базы
function updatedbUsers(set, where, par1, par2) {
    const res = db.prepare(`UPDATE users SET ${set} = ? WHERE ${where} = ?`).run(par1, par2)
    return res;
}

function getLink(userId) {
    const user = db.prepare('SELECT link FROM users WHERE userId = ?').get(userId);
    if (user?.link) {
        const link = user.link;
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
function getGenerateNumUser() {
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