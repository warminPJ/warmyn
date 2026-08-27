const cron = require('node-cron');
const { db, updatedbUsers, getDateDbUsers } = require('./db/dbUsers');
const { Markup } = require('telegraf');
const { writeLogs } = require('./logs/logFunc');
const { getDateDbSubscritionQueue, deleteSubscritionQueue } = require('./db/dbSubscriptionQueue');
const { updateTimeGbTrafficTaryff, takeEmergencyTaryff } = require('./remnawave');
const { makeCtx } = require('./botfunc')
const { safeDelete, safeEdit } = require('./helpers')

const pendingMessage = new Map()

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
            //увед об окончании и включения аварийного режима
            const userToNotifyEnd = db.prepare(`
                SELECT * FROM users
                WHERE subTime <= ?
                AND notified1h = 1`).all(now)
            for (const user of userToNotifyEnd) {
                const userId = user.userId;
                const dbUser = getDateDbUsers(userId)
                if (userId) {
                    //эта хуйня обьект, аккуратнее если чото тут пишешь
                    const queue = getDateDbSubscritionQueue(userId)

                    //проверка если нету очереди
                    if (!queue || queue.length === 0) {

                        //кастом ctx перейди глянь если хз чо это, тут нет контекста
                        const ctxCustom = makeCtx(bot, userId);
                        const messageId = pendingMessage.get(userId)

                        //удаление соо уведа за час до окончания
                        safeDelete(ctxCustom, messageId, userId);

                        const expuredAt = 60 * 1000/*7 дней */ + Date.now()
                        const expired_at = new Date(expuredAt).toISOString()
                        console.log(expired_at)

                        updatedbUsers('subTime', 'userId', expuredAt, userId);//обновление времени в базе

                        const maxGB = 200 * 1024 * 1024 //200 мб
                        updatedbUsers('maxGB', 'userId', maxGB, userId);//обновление гб в базе

                        updatedbUsers('nameTaryff', 'userId', 'taryff3', userId)//обновление названия тарифа в базе
                        takeEmergencyTaryff(dbUser.uuid, expired_at, maxGB);

                        //очистка map
                        pendingMessage.delete(userId)

                        await bot.telegram.sendMessage(userId, '**Ваша подписка закончилась!** Оплатите следующую чтобы оставаться на связи\nСейчас вам доступна подписка на 200 мб сроком на 7 дней',
                            {
                                parse_mode: 'Markdown',
                                ...Markup.inlineKeyboard([[
                                    Markup.button.callback('Купить подписку', 'rate')
                                ],
                                [
                                    Markup.button.callback('Позже', 'back')
                                ]])
                            })
                        db.prepare('UPDATE users SET notified1h = 2 WHERE userId = ?').run(userId)
                        return
                    } else {
                        //если есть подписка в очереди
                        //активация подписки из очереди
                        transferFromQueue(userId)
                    }
                }

            }

            //логика если закончилась 7 дневная подписка на оплату
            const userToNotifyLastEnd = db.prepare(`
                SELECT * FROM users
                WHERE subTime <= ?
                AND notified1h = 2`).all(now)
            for (const user of userToNotifyLastEnd) {
                const userId = user.userId
                if (userId) {
                    //Эта хуйня обьект аккуратнее с ним
                    const queue = getDateDbSubscritionQueue(userId);
                    //если нету очереди
                    if (!queue || queue.length === 0) {

                        await bot.telegram.sendMessage(userId, '**Ваша подписка на 7 дней для оплаты истекла** \nОплатите чтобы оставаться на связи',
                            {
                                parse_mode: 'Markdown',
                                ...Markup.inlineKeyboard([[
                                    Markup.button.callback('Купить подписку', 'rate')
                                ],
                                [
                                    Markup.button.callback('Ок', 'back')
                                ]])
                            })
                        db.prepare('UPDATE users SET notified1h = 3 WHERE userId = ?').run(userId)
                        //допиши логику с 3 в базе обозачающей окончательный обрыв всех тарифов
                        return
                    } else {
                        //если есть подписка в очереди
                        transferFromQueue(userId)
                    }
                }
            }
            console.log('cron во')
        } catch (error) {
            writeLogs(error, 'cron');
            console.error('ошибка крон', error);
        }
    })
}

async function stopReset() {

    cron.schedule('0 0 1 * *', async () => {
        try {
            console.log('Ежемесячный сброс лимита на приостановку');
            const result = db.prepare(`
            UPDATE users 
            SET stopQuantity = 0 
            WHERE stopQuantity != 0
        `).run();
            console.log(`лимиты успешно сброшены у ${result.changes}`)
        }
        catch (er) {
            console.error(er);
            writeLogs(er, 'stopReset')
        }
    })
}

async function transferFromQueue(userId) {

    //новое колво гб
    const dbSubscritionQueueobj = getDateDbSubscritionQueue(userId);
    const dbSubscritionQueue = dbSubscritionQueueobj[0]
    console.log('обьект:', dbSubscritionQueue);
    const newMaxGB = dbSubscritionQueue.maxGB;
    updatedbUsers('maxGB', 'userId', newMaxGB, userId)

    //время в миллисекундах - dbSubscritionQueue.subTime хранит длительность подписки
    const newSubTime = dbSubscritionQueue.subTime + Date.now();
    updatedbUsers('subTime', 'userId', newSubTime, userId);

    const newTaryff = dbSubscritionQueue.nameTaryff
    updatedbUsers('nameTaryff', 'userId', newTaryff, userId)

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

module.exports = {
    cronCheck,
    stopReset
}