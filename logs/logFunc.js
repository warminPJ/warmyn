const fs = require('fs');
const path = require('path');
const { json } = require('stream/consumers');

function writeLogs(error, contex = '') {
    const timeLog = new Date(Date.now()).toLocaleString('ru-RU')

    const errorInfo = error?.stack || error?.message || JSON.stringify(error);

    const logMessage = `${contex} в ${timeLog}\n` +
    `Ошибка: ${errorInfo}\n` +
    '------------------------------\n\n'

    try{
        fs.appendFileSync(path.join(__dirname, 'errors.log'), logMessage, 'utf8')
    }catch(fsErr){
        console.error(`Не удалось создать лог ошибки: ${fsErr}`)
    }
}
module.exports = {
    writeLogs
}