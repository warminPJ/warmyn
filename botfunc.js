const { db, getLink, getDateDbUsers, updatedbUsers } = require('./db/dbUsers')
const { revokeUrl } = require('./remnawave');
const { Telegraf, Markup } = require('telegraf');
const { writeLogs } = require('./logs/logFunc');
const { discount, takeFixPrice } = require('./akciiEpt/discount')
const { checkOwnersId, safeEdit } = require('./helpers')
const { getdbDiscount } = require('./db/dbDiscount')

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
            ]
        ];

        if (checkOwnersId(ctx)) {
            buttons.push([Markup.button.callback('админка', 'admenet')])
        }
        return safeEdit(ctx, 'У вас ещё нет подписки, хотите приобрести?',
            Markup.inlineKeyboard(buttons)
        );
    }



    const tariffMap = {
        '1': 'Бимбимбамбам',
        '2': 'Бахбах',
        '3': 'Ограниченная(для оплаты)'
    };

    const rawTariff = dbUsers.nameTaryff;
    const lastNum = String(rawTariff).slice(-1);

    const nameTaryff = rawTariff === 'test'
        ? 'Тестовая подписка'
        : (tariffMap[lastNum] || '');

    if (!dbUsers?.userId) {
        return ctx.answerCbQuery('').catch(() => { })
    }

    //отображение меню если подписка закончилась и включилась временная
    if (dbUsers.notified1h === 2) {

        const buttons = [
            [
                Markup.button.callback('Купить подписку', 'rate')
            ], [
                Markup.button.callback('Обновить', 'back')
            ]]//поддержку бахнуть сюда

        if (checkOwnersId(ctx)) {
            buttons.push([Markup.button.callback('админка', 'admenet')])
        }

        return safeEdit(ctx, `
            Тариф: "${nameTaryff}"\n` +
            `Время истекло, купите новую, чтобы вернуть доступ\n` +
            `<b>Осталось дней для оплаты: ${daysLeft}</b>`, {
            parse_mode: 'HTML',
            ...Markup.inlineKeyboard(buttons)
        })
    }

    if (dbUsers.notified1h === 3) {

        const buttons = [
            [
                Markup.button.callback('Купить подписку', 'rate')
            ]]//поддержку бахнуть сюда

        if (checkOwnersId(ctx)) {
            buttons.push([Markup.button.callback('админка', 'admenet')])
        }

        return safeEdit(ctx,
            `Оплатите подписку, чтобы пользоваться Warmyn\n`, {
            parse_mode: 'HTML',
            ...Markup.inlineKeyboard(buttons)
        })
    }

    if (dbUsers.stop === 1) {
        const buttons = [[
            Markup.button.url('Инструкция', link.link),
            Markup.button.callback('Мои устройства', 'devices')
        ],
        [
            Markup.button.callback('Продлить подписку', 'rate')
        ],
        [
            Markup.button.callback('Перевыпустить ссылку', 'sub:rev')
        ],
        [
            { text: 'Скопировать ссылку', copy_text: { text: link.link } }
        ],
        [

            Markup.button.callback('Возобновить подписку', 'stop')
        ]]

        if (checkOwnersId(ctx)) {
            buttons.push([Markup.button.callback('админка', 'admenet')])
        }

        return safeEdit(ctx, `Ваша ссылка для подключения:\n${displayLink}\nТариф: "${nameTaryff}"\nДата истечения подписки: ${dateLeft} (${daysLeft} дн.)`, {
            parse_mode: 'HTML',
            ...Markup.inlineKeyboard(buttons)
        })
    }

    const buttons = [[
        Markup.button.url('Инструкция', link.link),
        Markup.button.callback('Мои устройства', 'devices')
    ],
    [
        Markup.button.callback('Продлить подписку', 'rate')
    ],
    [
        { text: 'Скопировать ссылку', copy_text: { text: link.link } }
    ],
    [
        Markup.button.callback('Перевыпустить ссылку', 'sub:rev')
    ],
    [

        Markup.button.callback('Приостановить подписку | раз в месяц', 'stop')
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


async function outputMsg(ctx, flag = 0) {
    if (flag === 1) {
        return await safeEdit(ctx, 'Выберите тариф:',
            Markup.inlineKeyboard([
                [
                    Markup.button.callback('Бимбимбамбам | ♾️ гб', 'plug')
                ], [
                    Markup.button.callback(`1 мес • ${takeFixPrice(ctx, 11)} руб`, 'taryff:11'),
                    Markup.button.callback(`3 мес • ${takeFixPrice(ctx, 31)} руб (-27%)`, 'taryff:31')
                ], [
                    Markup.button.callback(`6 мес • ${takeFixPrice(ctx, 61)} руб (-37%)`, 'taryff:61'),
                    Markup.button.callback(`12 мес • ${takeFixPrice(ctx, 91)} руб (-52%)`, 'taryff:91')
                ], [
                    Markup.button.callback(`Бахбах | ♾️ гб`, 'plug')
                ], [
                    Markup.button.callback(`1 мес • ${takeFixPrice(ctx, 12)} руб`, 'taryff:12'),
                    Markup.button.callback(`3 мес • ${takeFixPrice(ctx, 32)} руб (-27%)`, 'taryff:32')
                ], [
                    Markup.button.callback(`6 мес • ${takeFixPrice(ctx, 62)} руб (-37%)`, 'taryff:62'),
                    Markup.button.callback(`12 мес • ${takeFixPrice(ctx, 92)} руб (-52%)`, 'taryff:92')
                ], [
                    Markup.button.callback('Назад', 'back')
                ],
            ])
        )
    } else if (flag === 2) {
        const userId = ctx.from.id;
        console.log('ye')
        const dbDiscount = getdbDiscount(userId);
        if(!dbDiscount){
        return await safeEdit(ctx, 'Цены на тарифы:',
            Markup.inlineKeyboard([
                [
                    Markup.button.callback('Бимбимбамбам | ♾️ гб', 'plug')
                ], [
                    Markup.button.callback(`1 мес • ${takeFixPrice(ctx, 11)} руб`, 'chivo:1'),
                    Markup.button.callback(`3 мес • ${takeFixPrice(ctx, 31)} руб (-15%)`, 'chivo:2')
                ], [
                    Markup.button.callback(`6 мес • ${takeFixPrice(ctx, 61)} руб (-25%)`, 'chivo:3'),
                    Markup.button.callback(`12 мес • ${takeFixPrice(ctx, 91)} руб (-40%)`, 'chivo:4')
                ], [
                    Markup.button.callback(`Бахбах | ♾️ гб`, 'plug')
                ], [
                    Markup.button.callback(`1 мес • ${takeFixPrice(ctx, 12)} руб`, 'chivo:1'),
                    Markup.button.callback(`3 мес • ${takeFixPrice(ctx, 32)} руб (-15%)`, 'chivo:2')
                ], [
                    Markup.button.callback(`6 мес • ${takeFixPrice(ctx, 62)} руб (-25%)`, 'chivo:3'),
                    Markup.button.callback(`12 мес • ${takeFixPrice(ctx, 92)} руб (-40%)`, 'chivo:4')
                ], [
                    Markup.button.callback('Назад', 'back')
                ],
            ])
        )}else{
        return await safeEdit(ctx, 'Цены на тарифы:',
            Markup.inlineKeyboard([
                [
                    Markup.button.callback('Бимбимбамбам | ♾️ гб', 'plug')
                ], [
                    Markup.button.callback(`1 мес • ${takeFixPrice(ctx, 11)} руб`, 'chivo:1'),
                    Markup.button.callback(`3 мес • ${takeFixPrice(ctx, 31)} руб (-27%)`, 'chivo:2')
                ], [
                    Markup.button.callback(`6 мес • ${takeFixPrice(ctx, 61)} руб (-37%)`, 'chivo:3'),
                    Markup.button.callback(`12 мес • ${takeFixPrice(ctx, 91)} руб (-52%)`, 'chivo:4')
                ], [
                    Markup.button.callback(`Бахбах | ♾️ гб`, 'plug')
                ], [
                    Markup.button.callback(`1 мес • ${takeFixPrice(ctx, 12)} руб`, 'chivo:1'),
                    Markup.button.callback(`3 мес • ${takeFixPrice(ctx, 32)} руб (-27%)`, 'chivo:2')
                ], [
                    Markup.button.callback(`6 мес • ${takeFixPrice(ctx, 62)} руб (-37%)`, 'chivo:3'),
                    Markup.button.callback(`12 мес • ${takeFixPrice(ctx, 92)} руб (-52%)`, 'chivo:4')
                ], [
                    Markup.button.callback('Назад', 'back')
                ],
            ])
        )}
    } else {
        return await safeEdit(ctx, 'Выберите тариф:',
            Markup.inlineKeyboard([
                [
                    Markup.button.callback('Бимбимбамбам | ♾️ гб', 'plug')
                ], [
                    Markup.button.callback(`1 мес • ${takeFixPrice(ctx, 11)} руб`, 'taryff:11'),
                    Markup.button.callback(`3 мес • ${takeFixPrice(ctx, 31)} руб (-15%)`, 'taryff:31')
                ], [
                    Markup.button.callback(`6 мес • ${takeFixPrice(ctx, 61)} руб (-25%)`, 'taryff:61'),
                    Markup.button.callback(`12 мес • ${takeFixPrice(ctx, 91)} руб (-40%)`, 'taryff:91')
                ], [
                    Markup.button.callback(`Бахбах | ♾️ гб`, 'plug')
                ], [
                    Markup.button.callback(`1 мес • ${takeFixPrice(ctx, 12)} руб`, 'taryff:12'),
                    Markup.button.callback(`3 мес • ${takeFixPrice(ctx, 32)} руб (-15%)`, 'taryff:32')
                ], [
                    Markup.button.callback(`6 мес • ${takeFixPrice(ctx, 62)} руб (-25%)`, 'taryff:62'),
                    Markup.button.callback(`12 мес • ${takeFixPrice(ctx, 92)} руб (-40%)`, 'taryff:92')
                ], [
                    Markup.button.callback('Назад', 'back')
                ],
            ])
        )
    }
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
    return safeEdit(ctx,'Та самая крутая админка:',
        Markup.inlineKeyboard([
            [
                Markup.button.callback('касттариф', 'custTarryf')
            ],
            [
                Markup.button.callback('Назад', 'back')
            ],
            [
                Markup.button.callback('вкл/выкл пребай', 'setupDiscount')
            ],
            [
                Markup.button.callback('добавить рефку', 'addRef')
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
    makeCtx,
    outputMsg
}