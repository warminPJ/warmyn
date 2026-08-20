require('dotenv').config();
const { Telegraf, Markup } = require('telegraf');
const { HttpsProxyAgent } = require('https-proxy-agent');
const { getMenu, persent, priceComparison, checkOwner, openMenuAdmin, pendingMessage } = require('./botfunc');
const { createPayment, dontTouch, markPaymentDone, markPaymentError } = require('./db/dbPayment')
const { tariffRecord, getDatedbCustPrice } = require('./db/dbCustTaryff')
const { getLink, createSubdb, db, getDateDbUsers, updatedbUsers } = require('./db/dbUsers')
const { pay, checkPayment } = require('./payments');
const { createRemnewaveUser, getHWIDDevices, revokeUrl, deletedDevice, updateTimeGbTrafficTaryff } = require('./remnawave')
const { taryffUsers, addUserId, numTaryff, priceTaryff, clearMap } = require('./userIdOzu')
const { writeLogs } = require('./logs/logFunc');
const { createDevicesdb, deleteDevicesBySubId, saveDevicesToDb, getButtonsForUser } = require('./db/dbUserDevices');
const { getDateDbSubscritionQueue, addSubIndb, updatedbSubscritionQueue } = require('./db/dbSubscriptionQueue')
const { domen, port, linkProxy, ShopId, SecretKey, botToken } = process.env
const agent = linkProxy ? new HttpsProxyAgent(`${linkProxy}`) : undefined;
const express = require('express');
const { cronCheck } = require('./cron');
const { safeDelete, safeEdit } = require('./helpers')
const { onoffDiscount } = require('./akciiEpt/discount')
const { createDiscountdb, getdbDiscount } = require('./db/dbDiscount')

//инициализация бота
const bot = new Telegraf(botToken, {
    telegram: { agent }
})


//тарифы чо
const priceTarryf1 = 100;
const priceTarryf2 = 250;
const maxGbTarryf1 = 100;
const maxGbTarryf2 = 300;
const userMap = new Map()

//обработка /start
bot.start(async (ctx) => {
    const userId = ctx.from.id;
    getMenu(ctx);
})

bot.action('test', async (ctx) => {
    ctx.answerCbQuery();
    const userId = ctx.from.id
    const uuid = getDateDbUsers(userId).uuid
    const res = await getHWIDDevices(uuid);
    console.log(JSON.stringify(res))//получаешь массив с устройствами, над придумать как делать кнопки и закреплять к каждой устройство и добавить удаление устройств
})

bot.command('id', async (ctx) => {
    const userId = ctx.from.id;
    return await safeEdit(ctx, `Ваш id: <code>${userId}</code>`, {
        parse_mode: 'HTML',
        ...Markup.inlineKeyboard([
            [
                Markup.button.callback('Назад', 'back')
            ]
        ])
    });
});

bot.action(/^sub(?::(.+))?$/, async (ctx) => {
    getMenu(ctx)
})

bot.action('watchDemo', async (ctx) => {
    const userId = ctx.from.id;
    const username = ctx.from.username
    const dbUsers = getDateDbUsers(userId);
    //проверка на использованность
    if (dbUsers?.demoTaryff === 0) {
        return ctx.answerCbQuery('Вы уже использовали пробный тариф').catch(() => { })
    }

    //добавление пользователя в панель
    const allTime = Date.now() + 259200000
    const expiredAt = new Date(allTime).toISOString() //сейчас + 3 дня
    const res = await createRemnewaveUser(userId, expiredAt, 10, username, null, 1, 'test');

    const link = getLink(userId).link

    const button = Markup.inlineKeyboard([[
        Markup.button.url('Инструкция', link)
    ],
    [
        { text: 'Скопировать ссылку', copy_text: { text: link } }
    ],
    [
        Markup.button.callback('Главное меню', 'back')
    ]])

    safeEdit(ctx, `Успешная активация пробного периода на 3 дня\n<b>Приятного пользования! </b>Ваша ссылка:\n<pre><code>${link}</code></pre>\n`, {
        parse_mode: 'HTML',
        ...button
    })
})

bot.action(/^devices(?::(.+):(.+))?$/, async (ctx) => {

    const userId = ctx.from.id;

    if (ctx.match[1] === 'hwid') {
        const hwid = ctx.match[2];
        const res = getDateDbUsers(userId);
        const uuid = res.uuid;
        const result = await deletedDevice(uuid, hwid);

        if (!result) {
            await ctx.answerCbQuery('Устройство не найдено или уже удалено!')
        }

        await ctx.answerCbQuery('Устройство успешно удалено!')
    }

    const res = getDateDbUsers(userId);
    const uuid = res.uuid;
    const subId = res.subId;
    const devices = await getHWIDDevices(uuid);
    console.log(devices)
    saveDevicesToDb(subId, devices.devices);
    const buttons = getButtonsForUser(subId);
    ctx.answerCbQuery();
    await safeEdit(ctx, 'Управление устройствами:', Markup.inlineKeyboard([
        ...buttons,
        [Markup.button.callback('Назад', 'back')]
    ]));
})

bot.action(/^dev_view:(.+)$/, (ctx) => {
    const hwid = ctx.match[1];

    safeEdit(ctx, 'Удалить устройство?', Markup.inlineKeyboard([
        [
            Markup.button.callback('Да', `devices:hwid:${hwid}`)
        ], [
            Markup.button.callback('Нет', 'devices')
        ]
    ]))
})

bot.action(/^true:(.+)$/, async (ctx) => {
    const hwid = ctx.match[1];
    const userId = ctx.from.id;
    const res = getDateDbUsers(userId);
    const uuid = res.uuid;
    const result = await deletedDevice(uuid, hwid);

    if (!result) {
        return await safeEdit(ctx, 'Устройство не найдено или уже удалено!', Markup.inlineKeyboard([
            [Markup.button.callback('Назад', 'devices')]
        ]));
    }

    return await safeEdit(ctx, 'Устройство успешно удалено!', Markup.inlineKeyboard([
        [Markup.button.callback('Назад', 'devices')]
    ]));
})

bot.action('rate', async (ctx) => {
    ctx.answerCbQuery();
    return await safeEdit(ctx, 'Выберите тариф:',
        Markup.inlineKeyboard([
            [
                Markup.button.callback('Звёзд с неба не хватает | 100 гб', 'tarryf1')
            ], [
                Markup.button.callback('И папе, и маме, и другу | 300 гб', 'tarryf2')
            ], [
                Markup.button.callback('Назад', 'back')
            ]
        ])
    )
})

bot.action('admenet', checkOwner, async (ctx) => {
    ctx.answerCbQuery();
    await openMenuAdmin(ctx)

})

bot.action('custTarryf', checkOwner, async (ctx) => {
    const userId = ctx.from.id;
    ctx.answerCbQuery('в постель)');
    await safeDelete(ctx);

    const messageId = await safeEdit(ctx, 'Введите айди пользователя для каста его тарифа:', Markup.forceReply())
    //запись айди соо в map
    pendingMessage.set(userId, messageId.message_id)
    return
})


bot.action('editTaryff1', checkOwner, async (ctx) => {
    const userId = ctx.from.id;
    //запись в временный обьект номер тарифа
    numTaryff(userId, 1);
    ctx.answerCbQuery();
    safeDelete(ctx)

    const messageId = await safeEdit(ctx, 'Введите сумму на тариф для указанного айди:',
        Markup.forceReply()
    )
    //запись айди соо в map
    pendingMessage.set(userId, messageId.message_id)
    return
})
bot.action('editTaryff2', checkOwner, async (ctx) => {
    const userId = ctx.from.id;
    //запись в временный обьект номер тарифа
    numTaryff(userId, 2);
    ctx.answerCbQuery();
    safeDelete(ctx);
    const messageId = await safeEdit(ctx, 'Введите сумму на тариф для указанного айди:',
        Markup.forceReply()
    )
    //запись айди соо в map
    pendingMessage.set(userId, messageId.message_id)
})

bot.on('text', checkOwner, async (ctx) => {
    const userId = ctx.from.id;
    const replyTo = ctx.message.reply_to_message;

    if (replyTo && replyTo.text === 'Введите айди пользователя для каста его тарифа:') {
        await safeDelete(ctx)

        //получение айди соо 'Введите айди пользователя для каста его тарифа:'
        const idDeleteMessage = pendingMessage.get(userId)
        //удаление соо 'Введите айди пользователя для каста его тарифа:'
        await safeDelete(ctx, idDeleteMessage, userId);
        pendingMessage.delete(userId)//очистка map

        const userIdTar = Number(ctx.message.text);
        //начало логики создание кастомного тарифа в базе
        await addUserId(userId, userIdTar);
        //получение айди соо для удаления
        await safeEdit(ctx, 'Выберите тариф цену которого поменять', Markup.inlineKeyboard([
            [
                Markup.button.callback('Звёзд с неба не хватает', 'editTaryff1')
            ],
            [
                Markup.button.callback('И папе, и маме, и другу', 'editTaryff2')
            ],
            [
                Markup.button.callback('Назад', 'backTheTaryff')
            ]
        ]))

    }
    if (replyTo && replyTo.text === 'Введите сумму на тариф для указанного айди:') {
        await safeDelete(ctx)

        //получение айди соо 'Введите айди пользователя для каста его тарифа:'
        const idDeleteMessage = pendingMessage.get(userId)
        //удаление соо 'Введите айди пользователя для каста его тарифа:'
        await safeDelete(ctx, idDeleteMessage, userId);
        pendingMessage.delete(userId)//очистка map

        const price = Number(ctx.message.text);
        await priceTaryff(userId, price);
        console.log('все данные для кастомизации тарифа переданы в временный массив');
        console.log(taryffUsers)
        const userData = taryffUsers.get(userId);
        if (!userData) {
            console.log('нету ссылки userData');
            return
        }
        const userIdTar = userData.userIdTar;
        const tariffPrice = userData.price;
        const numberTaryff = userData.numberTaryff;
        console.log(numberTaryff)
        await tariffRecord(userIdTar, tariffPrice, numberTaryff);
        console.log('касттариф записан в базу данных');
        safeEdit(ctx, 'Дело в шляпе', Markup.inlineKeyboard([
            Markup.button.callback('Назад', 'backTheTaryff')
        ]))
    }
})

bot.action('backTheTaryff', checkOwner, (ctx) => {
    const userId = ctx.from.id;
    //чиста временного массива с данными для кастомного тарифа
    clearMap(userId);;
    openMenuAdmin(ctx);
})

bot.action('tarryf1', async (ctx) => {
    let subTimeTarryf1 = 2678400000;//31 день, длительность подписки в мс (не абсолютное время)
    const userId = ctx.from.id;

    //кастомная цена
    const custPrice1 = getDatedbCustPrice(userId)?.taryff1

    //платёж епт               выбор если каст не равен 0 то выбирается он а если 0 то деф цена
    try {
        const payment = await pay(custPrice1 || priceTarryf1, ShopId, SecretKey);

        if (payment?.confirmation?.confirmation_url) {
            const paymenturl = payment.confirmation.confirmation_url
            const paymentId = payment.id;


            await createPayment(paymentId, userId, maxGbTarryf1, subTimeTarryf1, 'taryff1');

            const callbackData = `chk:${paymentId}`
            return await safeEdit(ctx, 'Ссылка на оплату подписки "Звёзд с неба не хватает" готова:',

                Markup.inlineKeyboard([
                    [
                        Markup.button.url('Перейти к оплате', paymenturl)
                    ],
                    [
                        Markup.button.callback('Проверить оплату', callbackData)
                    ]
                ])
            )
        } else {
            return await safeEdit(ctx, 'Произошла ошибка при создании ссылки на оплату, попробуйте позже',

                Markup.inlineKeyboard([
                    [
                        Markup.button.callback('Вернуться в меню', 'back')
                    ]
                ])
            )
        }
    } catch (error) {
        console.error('логика создания ссылки на оплату:', error);
        writeLogs(error, 'логика создания ссылки на оплату');
        return await safeEdit(ctx, 'Произошла ошибка. Попробуйте позже или обратитесь в поддержку',
            Markup.inlineKeyboard([[
                Markup.button.callback('Главное меню', 'back')
            ]]))

    }
})

bot.action('tarryf2', async (ctx) => {
    let subTimeTarryf2 = 2678400000;//31 день, длительность подписки в мс (не абсолютное время)
    const userId = ctx.from.id;
    //кастомная цена
    const custPrice2 = getDatedbCustPrice(userId)?.taryff2
    //платёж епт               выбор если каст не равен 0 то выбирается он а если 0 то деф цена
    try {
        const payment = await pay(custPrice2 || priceTarryf2, ShopId, SecretKey);

        ctx.answerCbQuery();

        if (payment?.confirmation?.confirmation_url) {
            const paymenturl = payment.confirmation.confirmation_url
            const paymentId = payment.id;

            await createPayment(paymentId, userId, maxGbTarryf2, subTimeTarryf2, 'taryff2');

            const callbackData = `chk:${paymentId}`
            return await safeEdit(ctx, 'Ссылка на оплату подписки "И папе, и маме, и другу" готова:',
                Markup.inlineKeyboard([
                    [
                        Markup.button.url('Перейти к оплате', paymenturl)
                    ],
                    [
                        Markup.button.callback('Проверить оплату', callbackData)
                    ]
                ])
            )
        } else {
            return await safeEdit(ctx, 'Произошла ошибка при создании ссылки на оплату, попробуйте позже.',
                Markup.inlineKeyboard([
                    [
                        Markup.button.callback('Вернуться в меню', 'back')
                    ]
                ])
            )
        }
    } catch (error) {
        console.error('логика создания ссылки на оплату:', error);
        writeLogs(error, 'логика создания ссылки на оплату');
        return await safeEdit(ctx, 'Произошла ошибка. Попробуйте позже или обратитесь в поддержку.', Markup.inlineKeyboard([[
            Markup.button.callback('Главное меню', 'back')
        ]]))
    }
})

bot.action(/^chk:(.+)/, async (ctx) => {
    const paymentId = ctx.match[1];
    const userId = ctx.from.id
    const username = ctx.from.username
    const dbPayment = dontTouch(paymentId);

    if (!dbPayment) {
        return ctx.answerCbQuery('Платёж не найден', { show_alert: true })
    }

    if (Number(dbPayment.userId) !== userId) {
        return ctx.answerCbQuery('Это не ваш платёж', { show_alert: true })
    }

    try {
        const response = await checkPayment(ShopId, SecretKey, paymentId);

        if (!response.ok) {
            return await ctx.answerCbQuery('Ошибка соединения с платёжной системой', { show_alert: true })
        }
        const payment = await response.json();

        //проверка на дабл клик и выдача подписки
        if (payment.status === 'succeeded') {
            //проверка если ли в базе пользователь
            if (markPaymentDone(paymentId)) {
                const dbUser = getDateDbUsers(userId);
                if (!dbUser) {
                    await ctx.answerCbQuery('Успешная оплата!');

                    //создание подписки в панеле
                    //dbPayment.subTime хранит длительность подписки в мс, поэтому абсолютное время окончания = Date.now() + dbPayment.subTime
                    const newExpireAt = Date.now() + dbPayment.subTime;
                    const resCreateRemnewaveUser = await createRemnewaveUser(userId, newExpireAt, dbPayment.maxGB, username, paymentId);
                    const nameTaryff = null
                    //запись пользователя в базу
                    if (resCreateRemnewaveUser === 'test') return
                    await createSubdb(userId, newExpireAt, dbPayment.maxGB, 0, resCreateRemnewaveUser.response.id, resCreateRemnewaveUser.response.subscriptionUrl, resCreateRemnewaveUser.response.uuid, username, dbPayment.nameTaryff)

                } else {
                    const taryff = dbUser.nameTaryff
                    const taryffPayment = dbPayment.nameTaryff
                    if (taryff === taryffPayment) {
                        //обновление максимального колва гб в базе
                        const newMaxGb = dbUser.maxGB + dbPayment.maxGB
                        //обновление в базе
                        await updatedbUsers('maxGB', 'userId', newMaxGb, userId)

                        //обновление времени до конца в базе
                        //dbPayment.subTime теперь хранит длительность подписки (не абсолютное время), поэтому используем её напрямую
                        const addedTime = dbPayment.subTime;
                        const leftTime = Math.max(Date.now(), dbUser.subTime || 0)
                        const newSubTime = addedTime + leftTime;
                        console.log(new Date(newSubTime).toISOString(), addedTime, leftTime)
                        //обновление в базе
                        await updatedbUsers('subTime', 'userId', newSubTime, userId)

                        //обновление в панельке
                        updateTimeGbTrafficTaryff(userId);
                        //включение уведомления за час до окончания подписки
                        updatedbUsers('notified1h', 'userId', 0, userId);
                    } else {
                        //логика если покупают подписку другого тарифа
                        //если в очереди уже есть подписка
                        const queueobj = getDateDbSubscritionQueue(userId)
                        console.log(queueobj)
                        if (queueobj && queueobj.length !== 0) {
                            const queue = queueobj[0]

                            //обновление времени
                            //dbPayment.subTime теперь хранит длительность подписки (не абсолютное время)
                            const durationToAdd = dbPayment.subTime
                            const newSubTime = queue.subTime + durationToAdd
                            const res = new Date(newSubTime).toISOString
                            console.log(res)
                            updatedbSubscritionQueue('subTime', 'userId', newSubTime, userId)

                            //обновление гб
                            const newMaxGB = queue.maxGB + dbPayment.maxGB
                            updatedbSubscritionQueue('maxGB', 'userId', newMaxGB, userId)

                        } else {
                            //если нет подписки в очереди
                            //если подписка уже закончилась
                            if (dbUser.notified1h === 2) {
                                //новое число гб из оплаты
                                const newMaxGb = dbPayment.maxGB
                                await updatedbUsers('maxGB', 'userId', newMaxGb, userId)

                                //новое время из оплаты
                                //dbPayment.subTime - длительность подписки, users.subTime хранит абсолютное время окончания
                                const newSubTime = Date.now() + dbPayment.subTime
                                await updatedbUsers('subTime', 'userId', newSubTime, userId)

                                //обновление названия тарифа
                                const newNameTaryff = dbPayment.nameTaryff;
                                await updatedbUsers('nameTaryff', 'userId', newNameTaryff, userId)

                                //включение уведомления
                                updatedbUsers('notified1h', 'userId', 0, userId);

                                //обновление в панельке
                                updateTimeGbTrafficTaryff(userId);

                            } else {
                                const subTime = dbPayment.subTime
                                addSubIndb(userId, dbUser.uuid, dbPayment.nameTaryff, subTime, dbPayment.maxGB);
                                //включение уведомления
                                updatedbUsers('notified1h', 'userId', 0, userId);
                            }
                        }
                    }
                }
                //ссылка эщкере
                const link = getLink(userId).link
                //клава выводящаяся типо
                const button = Markup.inlineKeyboard([[
                    Markup.button.url('Инструкция', link)
                ],
                [
                    { text: 'Скопировать ссылку', copy_text: { text: link } }
                ],
                [
                    Markup.button.callback('Главное меню', 'back')
                ]])

                safeEdit(ctx, `Успешно! Ваша ссылка: \n<pre><code>${link}</code></pre>\n<b>Спасибо! Тариф активируется как только закончится имеющийся</b>`, {
                    parse_mode: 'HTML',
                    ...button
                })

            } else {
                await ctx.answerCbQuery('Платёж уже оплачен!', { show_alert: false })
            }

        } else if (payment.status === 'pending') {
            await ctx.answerCbQuery('Платёж ещё не обработан. Попробуйте вновь через пару секунд.')
        } else if (payment.status === 'canceled') {
            await ctx.answerCbQuery('Платёж отменён.')
            return await safeEdit(ctx, 'Срок действия данной ссылки истёк',
                Markup.inlineKeyboard([
                    [
                        Markup.button.callback('Меню', 'back')
                    ]
                ])
            )
        }
    } catch (error) {
        await safeEdit(ctx, 'Произошла ошибка. Если деньги списались, обратитесь в поддержку.', Markup.inlineKeyboard([[
            Markup.button.callback('Главное меню', 'back')
            // добавить кнопку поддержки
        ]]))
        markPaymentError(paymentId);
        console.error('Ошибка при проведении оплаты:', error);
        await ctx.answerCbQuery('Произошла ошибка при обработке запроса.', { show_alert: true });
        writeLogs(error, 'проверка оплаты:');

    }
})

bot.action('discount', async (ctx) => {
    const userId = ctx.from.id;
    const username = ctx.from.username

    const dbDiscount = await getdbDiscount(userId)
    console.log(dbDiscount)
    if(!dbDiscount){
    await createDiscountdb(userId, username, 20, 'test')
    await ctx.answerCbQuery('Успешно!', {
        show_alert: true
    })
    return
}
    ctx.answerCbQuery('Ну всё, всё, не кликай, ты уже добавлен')
})

bot.action('setupDiscount', checkOwner, (ctx) => {
    safeEdit(ctx, 'включить или выключить',
        Markup.inlineKeyboard([
            [
                Markup.button.callback('on','onoff:on')
            ],
            [
                Markup.button.callback('off','onoff:off')
            ],
            [
                Markup.button.callback('Назад', 'back')
            ]
            
        ]))
})

bot.action(/^onoff:(.+)/, checkOwner, (ctx) => {
    const res = ctx.match[1]

    onoffDiscount(res)
    ctx.answerCbQuery('успешно', { show_alert: true })
})

bot.action('whyPressing', (ctx) => {
    ctx.answerCbQuery('Что ты ожидаешь?')
})

bot.action('back', (ctx) => {
    ctx.answerCbQuery();
    getMenu(ctx)
})

process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'))

bot.telegram.setMyCommands([
    { command: 'start', description: 'Вперёд Warmyn!' },
    { command: 'id', description: 'Мой Id?' }
])
//проверка заканчивающихся подписок
cronCheck(bot);

bot.launch()

console.log('бот запущен');
