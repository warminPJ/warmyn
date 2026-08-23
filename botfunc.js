const { db, getLink, getDateDbUsers, updatedbUsers } = require('./db/dbUsers')
const { revokeUrl } = require('./remnawave');
const { Telegraf, Markup } = require('telegraf');
const { writeLogs } = require('./logs/logFunc');
const { discount } = require('./akciiEpt/discount')
const { checkOwnersId, safeEdit } = require('./helpers')

const pendingMessage = new Map();

async function getMenu(ctx) {

    const userId = ctx.from.id;
    const subTimeUser = db.prepare('SELECT subTime FROM users WHERE userId = ?').get(userId)?.subTime || 0;
    const expireAt = subTimeUser ? new Date(subTimeUser) : null;
    const daysLeft = expireAt ? Math.max(0, Math.ceil((expireAt - Date.now()) / 1000 / 60 / 60 / 24)) : 0;
    const dateLeft = expireAt ? expireAt.toLocaleDateString('ru-RU') : 'Нет подписки';

    //фулл строка с данными пользователя из users
    const dbUsers = await getDateDbUsers(userId)

    if (discount(ctx)) {
        return
    }

    if (ctx.match[1] === 'rev') {
        const userId = ctx.from.id;
        const newUrl = await revokeUrl(dbUsers.uuid);

        if (!newUrl) {
            if (ctx.callbackQuery) await ctx.answerCbQuery('Произошла ошибка, попробуйте позже')
            return
        }

        await updatedbUsers('link', 'userId', newUrl, userId);

        if (ctx.callbackQuery) await ctx.answerCbQuery('Ссылка успешно перевыпустилась')
    }

    const user = db.prepare('SELECT userId FROM users WHERE userId = ?').get(userId);
    const link = getLink(userId)
    const displayLink = (link.status === false) ? link.link : `<pre><code>${link.link}</code></pre>`
    if (!user) {

        const buttons = [
            [
                Markup.button.callback('Тарифы', 'rate')
            ],
            [
                Markup.button.callback('Попробовать бесплатно', 'watchDemo')
            ],
            [
                Markup.button.callback('test', 'discount')
            ]
        ];

        if (checkOwnersId(ctx)) {
            buttons.push([Markup.button.callback('админка', 'admenet')])
        }
        return safeEdit(ctx, 'У вас ещё нет подписки, хотите приобрести?',
            Markup.inlineKeyboard(buttons)
        );
    }

    //запись в переменную имени тарифа пользователя
    let nameTaryff = ''
    if (dbUsers.nameTaryff === 'taryff1') {
        nameTaryff = 'Бимбимбамбам';
    } else if (dbUsers.nameTaryff === 'taryff2') {
        nameTaryff = 'Бахбах'
    } else if (dbUsers.nameTaryff === 'test') {
        nameTaryff = 'Тестовая подписка'
    }

    if (!dbUsers?.userId) {
        return ctx.answerCbQuery('').catch(() => { })
    }

    //отображение меню если подписка закончилась
    if (dbUsers.notified1h === 2) {

        const buttons = [
            [
                Markup.button.callback('Купить подписку', 'rate')
            ]]//поддержку барнуть сюда

        if (checkOwnersId(ctx)) {
            buttons.push([Markup.button.callback('админка', 'admenet')])
        }

        return safeEdit(ctx, `
            Тариф: "${nameTaryff}"\n` +
            `Время подписки истекло, купите новую, чтобы вернуть доступ`, {
            parse_mode: 'HTML',
            ...Markup.inlineKeyboard(buttons)
        })
    }


    const buttons = [[
        Markup.button.callback('Мои устройства', 'devices')
    ],
    [
        Markup.button.callback('Перевыпустить ссылку', 'sub:rev')
    ],
    [
        { text: 'Скопировать ссылку', copy_text: { text: link.link } }
    ],
    [
        Markup.button.callback('Продлить подписку', 'rate')
    ],
    [
        Markup.button.url('Инструкция', link.link)
    ]]

    if (checkOwnersId(ctx)) {
        buttons.push([Markup.button.callback('админка', 'admenet')])
    }

    return safeEdit(ctx, `Ваша ссылка для подключения:\n${displayLink}\nТариф: "${nameTaryff}"\nДата истечения подписки: ${dateLeft} (${daysLeft} дн.)`, {
        parse_mode: 'HTML',
        ...Markup.inlineKeyboard(buttons)
    }
    );
}


function priceComparison(userId, numTarryf) {
    const column = `taryff${numTarryf}`;
    const row = db.prepare(`SELECT ${column} AS price FROM custTaryff WHERE userId = ?`).get(userId);
    return Number(row?.price) || 0;
}

async function checkOwner(ctx, next) {
    if (!checkOwnersId(ctx)) {
        if (ctx.callbackQuery) {
            return ctx.answerCbQuery('не')
        }
        return ctx.reply('неа');
    }
    return next()
}

function openMenuAdmin(ctx) {
    return ctx.editMessageText('Та самая крутая админка:',
        Markup.inlineKeyboard([
            [
                Markup.button.callback('касттариф', 'custTarryf')
            ],
            [
                Markup.button.callback('Назад', 'back')
            ],
            [
                Markup.button.callback('вкл/выкл пребай', 'setupDiscount')
            ]
        ])
    )
}

function makeCtx(bot, chatId) {
    return {
        bot,
        telegram: bot.telegram,
        chat: { id: chatId },
        from: { id: chatId },
        callbackQuery: null,
        reply: (text, extra) => bot.telegram.sendMessage(chatId, text, extra),
        replyWithPhoto: (photo, extra) => bot.telegram.sendPhoto(chatId, photo, extra),
        deleteMessage: (messageId) => bot.telegram.deleteMessage(chatId, messageId),
        editMessageText: (messageId, text, extra) =>
            bot.telegram.editMessageText(chatId, messageId, null, text, extra)
    }
}

async function checkExistence(userId) {

}

module.exports = {
    getMenu,
    priceComparison,
    checkOwner,
    openMenuAdmin,
    checkOwnersId,
    pendingMessage,
    makeCtx
}