const Datebase = require('better-sqlite3');
const db = new Datebase('base.db');
const { writeLogs } = require('../logs/logFunc');
const { Markup } = require('telegraf');

db.exec(`CREATE TABLE IF NOT EXISTS devices (
    subId INTEGER NOT NULL,
    hwid TEXT NOT NULL,
    device_model TEXT,
    devicePlatform TEXT,
    synced_at TEXT NOT NULL,
    PRIMARY KEY (subId, hwid)
)`);

const insertDevices = db.prepare('INSERT OR REPLACE INTO devices (subId, hwid, device_model, devicePlatform, synced_at) VALUES (?, ?, ?, ?, ?)');

function createDevicesdb(userId, hwid, device_model, devicePlatform, synced_at) {
    return insertDevices.run(userId, hwid, device_model, devicePlatform, synced_at);
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
    const insert = db.prepare(`
        INSERT INTO devices (subId, hwid, device_model, devicePlatform, synced_at)
        VALUES(?, ?, ?, ?, ?)
        `);
    const now = new Date().toISOString();
    for (const d of devices) {
        insert.run(subId, d.hwid, d.deviceModel || 'Неизвестная модель', d.platform || 'Устройство', now)
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
