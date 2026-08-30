const { Composer, Markup } = require('telegraf');
const composer = new Composer();
const { checkOwner, pendingMessage } = require('../botfunc')
const { safeDelete, safeEdit } = require('../helpers')
const { writeLogs } = require('../logs/logFunc');
const { defLinkTgBot } = process.env
const { db } = require('../db/dbUsers')
const { taryffUsers, addUserId, numTaryff, priceTaryffFunc, clearMap } = require('../userIdOzu')
const { takeFixPrice } = require('../akciiEpt/discount')
const { tariffRecord } = require('../db/dbCustTaryff')

composer.action('custTarryf', checkOwner, async (ctx) => {
    const userId = ctx.from.id;
    await safeDelete(ctx);

    const messageId = await safeEdit(ctx, 'Введите айди пользователя для каста его тарифа:', Markup.forceReply())

    if (!messageId) return ctx.answerCbQuery('Не в этот раз');

    ctx.answerCbQuery('в постель)');
    //запись айди соо в map
    pendingMessage.set(userId, messageId?.message_id)
    return
})



composer.on('text', checkOwner, async (ctx, next) => {
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

        addUserId(userId, userIdTar);

        return await safeEdit(ctx, 'Чо менять?',
            Markup.inlineKeyboard([
                [
                    Markup.button.callback('Бимбимбамбам | ♾️ гб | 3 устр', 'plug')
                ], [
                    Markup.button.callback(`1 мес • ${takeFixPrice(userIdTar, 11)} руб`, 'editTaryff:11'),
                    Markup.button.callback(`3 мес • ${takeFixPrice(userIdTar, 31)} руб `, 'editTaryff:31')
                ], [
                    Markup.button.callback(`6 мес • ${takeFixPrice(userIdTar, 61)} руб `, 'editTaryff:61'),
                    Markup.button.callback(`12 мес • ${takeFixPrice(userIdTar, 91)} руб `, 'editTaryff:91')
                ], [
                    Markup.button.callback(`Бахбах | ♾️ гб | 10 устр`, 'plug')
                ], [
                    Markup.button.callback(`1 мес • ${takeFixPrice(userIdTar, 12)} руб`, 'editTaryff:12'),
                    Markup.button.callback(`3 мес • ${takeFixPrice(userIdTar, 32)} руб `, 'editTaryff:32')
                ], [
                    Markup.button.callback(`6 мес • ${takeFixPrice(userIdTar, 62)} руб `, 'editTaryff:62'),
                    Markup.button.callback(`12 мес • ${takeFixPrice(userIdTar, 92)} руб `, 'editTaryff:92')
                ], [
                    Markup.button.callback('Назад', 'admenet')
                ],
            ])
        )
    }

    if (replyTo && replyTo.text === 'Введите сумму на тариф для указанного айди:') {
        await safeDelete(ctx)

        //получение айди соо 'Введите айди пользователя для каста его тарифа:'
        const idDeleteMessage = pendingMessage.get(userId)

        //удаление соо 'Введите айди пользователя для каста его тарифа:'
        await safeDelete(ctx, idDeleteMessage, userId);

        pendingMessage.delete(userId)//очистка map

        const price = Number(ctx.message.text);
        priceTaryffFunc(userId, price);
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

        await tariffRecord(userIdTar, tariffPrice, numberTaryff);

        console.log('касттариф записан в базу данных');

        safeEdit(ctx, 'Дело в шляпе', Markup.inlineKeyboard([
            Markup.button.callback('Назад', 'backTheTaryff')
        ]))
    }
    return next()
})


composer.action(/^editTaryff:(.+)$/, checkOwner, async (ctx) => {
    const userId = ctx.from.id;
    const num = ctx.match[1]
    //запись в временный обьект номер тарифа
    const res = numTaryff(userId, num);
    if(res === 0) return ctx.answerCbQuery('не в этот раз')
    ctx.answerCbQuery();
    safeDelete(ctx);
    const messageId = await safeEdit(ctx, 'Введите сумму на тариф для указанного айди:',
        Markup.forceReply()
    )
    //запись айди соо в map
    pendingMessage.set(userId, messageId.message_id)
})



module.exports = composer;