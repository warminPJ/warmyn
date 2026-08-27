const fs = require('fs');
const path = require('path');

const LOG_FILE = path.join(__dirname, 'errors.log');
const SENSITIVE_KEYS = ['authorization', 'token', 'password', 'secret', 'apikey', 'api_key', 'privatekey'];

function safeStringify(obj, maxDepth = 4) {
    const seen = new WeakSet();

    function replacer(key, value) {
        if (SENSITIVE_KEYS.some(k => key.toLowerCase().includes(k))) {
            return '[REDACTED]';
        }
        if (typeof value === 'object' && value !== null) {
            if (seen.has(value)) return '[Circular]';
            seen.add(value);
        }
        return value;
    }

    try {
        return JSON.stringify(obj, replacer, 2);
    } catch (e) {
        return `[Не удалось сериализовать: ${e.message}]`;
    }
}

function redactUrl(url) {
    if (!url || typeof url !== 'string') return url;
    return url.replace(/([?&][^=&]*(?:token|key|secret|auth)[^=&]*=)[^&]+/gi, '$1[REDACTED]');
}

function writeLogs(error, contex = '') {
    try {
        const timeLog = new Date().toLocaleString('ru-RU');
        let logMessage = `\n==================== ОШИБКА ====================\n`;
        logMessage += `Контекст: ${contex}\n`;
        logMessage += `Время: ${timeLog}\n\n`;

        if (!error) {
            logMessage += `Ошибка передана как пустое значение (${error === null ? 'null' : typeof error})\n`;
            fs.appendFileSync(LOG_FILE, logMessage, 'utf8');
            return;
        }

        logMessage += `Тип: ${error.name || 'Unknown Error'}\n`;
        logMessage += `Сообщение: ${error.message || String(error)}\n\n`;

        // HTTP-ошибки (axios/fetch)
        if (error.response) {
            const r = error.response;
            logMessage += `--- HTTP ---\n`;
            logMessage += `Статус: ${r.status} (${r.statusText || ''})\n`;
            logMessage += `URL: ${redactUrl(r.config?.url)}\n`;
            logMessage += `Метод: ${r.config?.method}\n`;
            if (r.config?.data) logMessage += `Тело запроса: ${safeStringify(r.config.data)}\n`;
            if (r.data) logMessage += `Ответ сервера: ${safeStringify(r.data)}\n`;
            logMessage += '\n';
        } else if (error.request) {
            // запрос ушёл, ответа не было (таймаут, обрыв соединения)
            logMessage += `--- HTTP (нет ответа от сервера) ---\n`;
            logMessage += `URL: ${redactUrl(error.config?.url)}\n`;
            logMessage += `Код: ${error.code || 'не указан'}\n\n`;
        }

        // Ошибки Telegram Bot API
        if (error.description) {
            logMessage += `--- Telegram API ---\n`;
            logMessage += `Описание: ${error.description}\n`;
            logMessage += `Код: ${error.error_code || 'не указан'}\n`;
            if (error.retry_after) logMessage += `Retry after: ${error.retry_after}s\n`;
            logMessage += '\n';
        }

        // Ошибки БД / системные ошибки Node (ECONNREFUSED и т.п. тоже сюда попадут — это нормально)
        if (error.code) {
            logMessage += `--- Код ошибки ---\n`;
            logMessage += `Code: ${error.code}\n`;
            if (error.errno) logMessage += `Errno: ${error.errno}\n`;
            if (error.sqlMessage) logMessage += `SQL: ${error.sqlMessage}\n`;
            logMessage += '\n';
        }

        logMessage += `--- Стек вызовов ---\n${error.stack || 'недоступен'}\n`;
        logMessage += `=================================================\n`;

        fs.appendFileSync(LOG_FILE, logMessage, 'utf8');
    } catch (fsErr) {
        // логгер не должен уронить вызывающий код ни при каких обстоятельствах
        console.error('❌ writeLogs упал:', fsErr.message);
        console.error('Исходная ошибка (не залогирована):', error?.message || error);
    }
}
module.exports = {
    writeLogs
}