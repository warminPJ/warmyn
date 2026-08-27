const Datebase = require('better-sqlite3');
const db = new Datebase('base.db');

db.exec(`CREATE TABLE IF NOT EXISTS ad (
    source TEXT PRIMARY KEY,
    sumUser INTEGER,
    resultLink TEXT,
    name TEXT DEFAULT 'not',
    createdAt INTEGER DEFAULT CURRENT_TIMESTAMP
)`);

const mapCreateRef = new Map()

const ad = db.prepare('INSERT OR REPLACE INTO ad (source, sumUser, resultLink, name) VALUES (?, ?, ?, ?)')

const getUserAd = db.prepare('SELECT * FROM ad WHERE source = ?');

function getdbAd(source) {
    return getUserAd.get(source)
}

function createRef(sourse, sumUser = 0, resultLink, name = 'not') {
    //первоначальное создание в админке
    ad.run(sourse, sumUser, resultLink, name)
}

function createAd(source, sumUser) {
    return ad.run(source, sumUser);
}

//апдейт
function updatedbAd(set, where, par1, par2) {
    const res = db.prepare(`UPDATE ad SET ${set} = ? WHERE ${where} = ?`).run(par1, par2)
    return res;
}

module.exports = {
    createAd,
    getdbAd,
    updatedbAd,
    createRef,
    mapCreateRef
}