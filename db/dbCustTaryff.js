const Datebase = require('better-sqlite3');
const db = new Datebase('base.db');

const TARIFF_KEYS = ['taryff11', 'taryff31', 'taryff61', 'taryff91', 'taryff12', 'taryff32', 'taryff62', 'taryff92'];

const columnsSQL = TARIFF_KEYS.map(key => `${key} INTEGER DEFAULT 0`).join(',\n');

// база с кастомными тарифами
db.exec(`CREATE TABLE IF NOT EXISTS custTaryff (
    userIdTar TEXT PRIMARY KEY,
    ${columnsSQL}
)`);


// запись кастом тарифа в базу
function tariffRecord(userIdTar, price, numberTaryff) {


    console.log(numberTaryff)

    const nameColumn = `taryff${Number(numberTaryff)}`
    
    if (!TARIFF_KEYS.includes(nameColumn)) {
        throw new Error(`Неизвестный тариф: ${nameColumn}`);
    }
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