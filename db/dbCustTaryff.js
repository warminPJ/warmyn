const Datebase = require('better-sqlite3');
const db = new Datebase('base.db');

// база с кастомными тарифами
db.exec(`CREATE TABLE IF NOT EXISTS custTaryff (userIdTar TEXT PRIMARY KEY, taryff1 INTEGER DEFAULT 0, taryff2 INTEGER DEFAULT 0)`);
const custTaryff = db.prepare(`INSERT OR REPLACE INTO custTaryff (userIdTar, taryff1, taryff2) VALUES (?, ?, ?)`)
// запись кастом тарифа в базу
function tariffRecord(userIdTar, price, numberTaryff) {
    const colIndex = Number(numberTaryff);
    console.log(numberTaryff)

    if (![1, 2].includes(colIndex)) throw new Error('Invalid tariff index');
    const nameColumn = `taryff${Number(numberTaryff)}`
    const res = db.prepare(`INSERT INTO custTaryff(userIdTar, ${nameColumn})
        VALUES(?, ?)
        ON CONFLICT(userIdTar)
        DO UPDATE SET ${nameColumn} = excluded.${nameColumn}`).run(userIdTar, price);
    console.log('каст тариф был записан в базу данных')
    return res;
}
//получение строки с каст тарифами по айди
function getDatedbCustPrice(userId) {
    return db.prepare('SELECT * FROM custTaryff WHERE userIdTar = ?').get(userId)
}

module.exports = {
    tariffRecord,
    getDatedbCustPrice,
}