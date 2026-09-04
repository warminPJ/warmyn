const { db } = require('./dbUsers');
const { createTable, createdb, getColumnNames, getUpsertStmt } = require('../helpers');

const TARIFF_KEYS = ['taryff11', 'taryff31', 'taryff61', 'taryff91', 'taryff12', 'taryff32', 'taryff62', 'taryff92'];

const dbNameObj = [
    { name: 'userIdTar', type: 'TEXT', required: true, primaryKey: true },
    ...TARIFF_KEYS.map(name => ({ name, type: 'INTEGER', default: 0 }))
];

createTable(db, 'custTaryff', dbNameObj);
createdb(db, 'custTaryff', dbNameObj);


// запись кастом тарифа в базу
function tariffRecord(userIdTar, price, numberTaryff) {


    console.log(numberTaryff)

    const nameColumn = `taryff${Number(numberTaryff)}`;
    const tariffColumns = getColumnNames(dbNameObj);
    
    if (!tariffColumns.includes(nameColumn)) {
        throw new Error(`Неизвестный тариф: ${nameColumn}`);
    }
    const updateTariff = getUpsertStmt(db, 'custTaryff', dbNameObj, 'userIdTar', nameColumn);
    const res = updateTariff.run({ userIdTar, [nameColumn]: price });
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