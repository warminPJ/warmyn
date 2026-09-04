const { db } = require('./dbUsers');
const { createTable, createdb, getInsertStmt } = require('../helpers');
const { writeLogs } = require('../logs/logFunc');
const { Markup } = require('telegraf');

const dbNameObj = [
    { name: 'subId', type: 'INTEGER', required: true },
    { name: 'hwid', type: 'TEXT', required: true },
    { name: 'device_model', type: 'TEXT' },
    { name: 'devicePlatform', type: 'TEXT' },
    { name: 'synced_at', type: 'TEXT', required: true }
];

createTable(db, 'devices', dbNameObj, ['PRIMARY KEY (subId, hwid)']);
createdb(db, 'devices', dbNameObj);

const insertDevices = getInsertStmt(db, 'devices', dbNameObj);

function createDevicesdb(userId, hwid, device_model, devicePlatform, synced_at) {
    return insertDevices.run({ subId: userId, hwid, device_model, devicePlatform, synced_at });
}
//удаление всех предыдущих устройств привязанных к конкретному subId
function deleteDevicesBySubId(subId) {
    if (!subId) return false;
    try {
        const info = db.prepare('DELETE FROM devices WHERE subId = ?').run(subId);
        return info.changes > 0;
    } catch (error) {
        console.error('Ошибка при удалении устройств из БД:', error);
        writeLogs(error, 'deleteDevicesBySubId');
        return false;
    }
}
// запись устройств пользователя с привязкой по subId с помощью цикла
function saveDevicesToDb(subId, devices) {
    deleteDevicesBySubId(subId)
    const insert = getInsertStmt(db, 'devices', dbNameObj, false);
    const now = new Date().toISOString();
    for (const d of devices) {
        insert.run({ subId, hwid: d.hwid, device_model: d.deviceModel || 'Неизвестная модель', devicePlatform: d.platform || 'Устройство', synced_at: now });
    }
}
//получение всей строки с subId
function getDatedbDevices(subId){
    return db.prepare(`SELECT * FROM devices WHERE subId = ?`).all(subId);
}

function getButtonsForUser(subId) {
    const rows = getDatedbDevices(subId);
    if (!rows.length) {
        return [[Markup.button.callback('Нет устройств', 'whyPressing')]];
    }

    return rows.map((row) => [
        Markup.button.callback(`${row.devicePlatform} => ${row.device_model}`, `dev_view:${row.hwid}`)
    ]);
}

module.exports = {
    createDevicesdb,
    deleteDevicesBySubId,
    saveDevicesToDb,
    getDatedbDevices,
    getButtonsForUser
};
