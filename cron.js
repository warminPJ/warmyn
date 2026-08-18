const cron = require('node-cron');
const { db, updatedbUsers } = require('./db/dbUsers');
const { Markup } = require('telegraf');
const { writeLogs } = require('./logs/logFunc');
const { getDateDbSubscritionQueue, deleteSubscritionQueue } = require('./db/dbSubscriptionQueue');
const { updateTimeGbTrafficTaryff } = require('./remnawave');
const { pendingMessage, safeDelete, makeCtx } = require('./botfunc')

//ctx тут без контекста тоесть используется чисто для импорта функций а не получения инфы
async function cronCheck(bot) {

    cron.schedule('*/20 * * * * *', async () => {
        const now = Date.now()
        //время через час
        const inOneHour = now + 60 * 60 * 1000
        try {
            const usersToNotify = db.prepare(`
        SELECT * FROM users
        WHERE subTime <= ?
        AND subTime > ? 
        AND notified1h = 0`).all(inOneHour, now);
            //увед за час
            for (const user of usersToNotify) {
                const userId = user.userId;
                console.log(userId, 'aaaaaaaaaaa')
                const queue = getDateDbSubscritionQueue(user.userId)
                if (!queue || queue.length === 0) {
                    if (userId) {
                        const messageId = await bot.telegram.sendMessage(user.userId, '**Ваша подписка закончится через час!** Продлите её, чтобы не потерять доступ',
                            {
                                parse_mode: 'Markdown',
                                ...Markup.inlineKeyboard([
                                    Markup.button.callback('Продлить подписку', 'rate')
                                ])
                            })
                        db.prepare('UPDATE users SET notified1h = 1 WHERE userId = ?').run(userId)
                        //запись айди соо для удаления в map
                        pendingMessage.set(userId, messageId.message_id)
                        console.log(messageId)
                        return
                    }
                }

                if (userId) {
                    db.prepare('UPDATE users SET notified1h = 1 WHERE userId = ?').run(user.userId)
                }

            }
            //увед об окончании
            const userToNotifyEnd = db.prepare(`
                SELECT * FROM users
                WHERE subTime <= ?
                AND notified1h = 1`).all(now)
            for (const user of userToNotifyEnd) {
                const userId = user.userId;
                console.log(`userId ${userId}!`);
                if (userId) {
                    //эта хуйня обьект, аккуратнее если чото тут пишешь
                    const queue = await getDateDbSubscritionQueue(userId)

                    //проверка если нету очереди
                    if (!queue || queue.length === 0) {

                        //кастом ctx перейди глянь если хз чо это, тут нет контекста
                        const ctxCustom = makeCtx(bot, userId);
                        const messageId = pendingMessage.get(userId)

                        //удаление соо уведа за час до окончания
                        safeDelete(ctxCustom, messageId, userId);

                        //очистка map
                        pendingMessage.delete(userId)

                        await bot.telegram.sendMessage(userId, '**Ваша подписка закончилась!** Оплатите следующую чтобы оставаться на связи',
                            {
                                parse_mode: 'Markdown',
                                ...Markup.inlineKeyboard([
                                    Markup.button.callback('Купить подписку', 'rate')
                                ])
                            })
                        db.prepare('UPDATE users SET notified1h = 2 WHERE userId = ?').run(userId)
                        return
                    }
                    //если есть
                    //активация подписки из очереди
                    //новое колво гб
                    const dbSubscritionQueueobj = await getDateDbSubscritionQueue(userId);
                    const dbSubscritionQueue = dbSubscritionQueueobj[0]
                    console.log('обьект:', dbSubscritionQueue);
                    const newMaxGB = dbSubscritionQueue.maxGB;
                    await updatedbUsers('maxGB', 'userId', newMaxGB, userId)

                    //время в миллисекундах - dbSubscritionQueue.subTime хранит длительность подписки
                    const newSubTime = dbSubscritionQueue.subTime + Date.now();
                    await updatedbUsers('subTime', 'userId', newSubTime, userId);
                    const newTaryff = dbSubscritionQueue.nameTaryff
                    await updatedbUsers('nameTaryff', 'userId', newTaryff, userId)

                    //обновление в панеле
                    updateTimeGbTrafficTaryff(userId);

                    //чистка после активации
                    deleteSubscritionQueue(userId);

                    //очистка map
                    pendingMessage.delete(userId)
                    await bot.telegram.sendMessage(userId, '**Ваш новый тариф был активирован!** Спасибо что остаётесь с нами',
                        {
                            parse_mode: 'Markdown',
                            ...Markup.inlineKeyboard([
                                Markup.button.callback('Главное меню', 'back')
                            ])
                        })
                    db.prepare('UPDATE users SET notified1h = 0 WHERE userId = ?').run(userId)
                }
            }

            console.log('cron во')
        } catch (error) {
            writeLogs(error, 'cron');
            console.error('ошибка крон', error);
        }
    })
}

module.exports = { cronCheck }