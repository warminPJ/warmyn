const Datebase = require('better-sqlite3');
const { Markup } = require('telegraf');
const {db} = require('./dbUsers')

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

//получение строки по source
function getdbAd(source) {
    return getUserAd.get(source)
}

function createRef(sourse, sumUser = 0, resultLink, name = 'not') {
    //первоначальное создание в админке
    ad.run(sourse, sumUser, resultLink, name)
}


//апдейт
function updatedbAd(set, where, par1, par2) {
    const res = db.prepare(`UPDATE ad SET ${set} = ? WHERE ${where} = ?`).run(par1, par2)
    return res;
}

const deleteRefQuery = db.prepare('DELETE FROM ad WHERE source = ?');

function deleteRef(source) {
    return deleteRefQuery.run(source);
}
//создание кнопок с рефкам 
function createRefButtons() {
    //получение списка реф - колво перешедших
    const dateInBase = db.prepare('SELECT source, sumUser FROM ad').all();


    const keyboard = [];
    if(dateInBase){
    for (const item of dateInBase) {
        const btn = Markup.button.callback(item.name, `ref:${item.source}`)

        //оборачиваем кнопку в массив
        const row = [btn]

        keyboard.push(row);
    }}

    keyboard.push([
        Markup.button.callback('Назад', 'back')
    ])
    return keyboard
}

module.exports = {
    getdbAd,
    updatedbAd,
    createRef,
    mapCreateRef,
    createRefButtons,
    deleteRef
}