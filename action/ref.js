const { Composer, Markup } = require('telegraf');
const composer = new Composer();
const { checkOwner, pendingMessage } = require('../botfunc')
const { safeDelete, safeEdit } = require('../helpers')
const { createRef, mapCreateRef, createRefButtons, deleteRef, getdbAd } = require('../db/dbRef')
const { writeLogs } = require('../logs/logFunc');
const { defLinkTgBot } = process.env
const { db } = require('../db/dbUsers')

composer.action('refka', checkOwner, async (ctx) => {
    safeEdit(ctx, 'настройки refki:', Markup.inlineKeyboard([
        [
            Markup.button.callback('стата + ссылки', 'stateRef')
        ],
        [
            Markup.button.callback('добавить реф', 'addRef')
        ],
        [
            Markup.button.callback('удалить имеющиеся', 'ref:Edit')
        ]
    ]))
})


composer.action('stateRef', checkOwner, async (ctx) => {
    const state = db.prepare('SELECT name, sumUser, resultLink FROM ad').all();

    let stateMsg = '' 
    for (const item of state) {
        stateMsg += `${item.name}: ${item.sumUser}\n${item.resultLink}\n`
    }
    safeEdit(ctx, `Стата по рефкам:\n${stateMsg}`, Markup.inlineKeyboard([
        [
            Markup.button.callback('Назад', 'admenet')
        ]
    ]))
})

composer.action('addRef', checkOwner, async (ctx) => {
    const userId = ctx.from.id
    ctx.answerCbQuery();

    safeDelete(ctx)

    const messageId = await safeEdit(ctx, 'Введите реферальное значение которое нужно добавить:',
        Markup.forceReply()
    )

    //запись айди соо в map
    pendingMessage.set(userId, messageId.message_id)
})

composer.on('text', checkOwner, async (ctx) => {
    const userId = ctx.from.id;
    const replyTo = ctx.message.reply_to_message;

    if (replyTo && replyTo.text === 'Введите реферальное значение которое нужно добавить:') {
        await safeDelete(ctx)

        //получение айди соо 'Введите реферальное значение которое нужно добавить:'
        const idDeleteMessage = pendingMessage.get(userId)

        //удаление соо 'Введите реферальное значение которое нужно добавить:'
        await safeDelete(ctx, idDeleteMessage, userId);

        pendingMessage.delete(userId)//очистка map

        //рефка от адменет
        const ref = ctx.message.text.trim();

        //создание рефки в базе
        const resLink = `${defLinkTgBot}?start=${encodeURIComponent(ref)}`;

        //создание рефки без нейма(он дальше) в map()
        mapCreateRef.set(userId, {
            source: ref,
            sumUser: 0,
            resultLink: resLink,
            name: 'no'
        })

        safeEdit(ctx, 'Введите имя для этой рефки(понятное, можно на русском)',
            Markup.forceReply()
        )
    }
    if (replyTo && replyTo.text === 'Введите имя для этой рефки(понятное, можно на русском)') {
        const name = ctx.message.text.trim();
        const draft = mapCreateRef.get(userId);

        if (draft) {

            draft.name = name;

            //запись в базу рефки
            createRef(draft.source, draft.sumUser, draft.resultLink, draft.name)

            //вывод обьекта
            const log = JSON.stringify(draft)
            console.log(log)

            safeEdit(ctx, 'Дело в шляпе' + `\nРефка успешно добавлена: ${draft.resultLink}`, Markup.inlineKeyboard([
                Markup.button.callback('Назад', 'back')
            ]))
            mapCreateRef.delete(userId)//очистка map

        }
    }
})

composer.action(/^ref:(.+)$/, (ctx) => {
    const ref = ctx.match[1];
    console.log(ref)
    if (ref !== 'Edit') {
        console.log(ref);
        const logDeleteRef = getdbAd(ref)

        //логи какую рефку удалили
        writeLogs('удаление рефки', JSON.stringify(logDeleteRef), 1)

        //удаление рефки
        deleteRef(ref);
        ctx.answerCbQuery('Успешно!')
    }

    const btn = createRefButtons()
    safeEdit(ctx, 'Какую удалить?', Markup.inlineKeyboard(btn))
})

module.exports = composer;