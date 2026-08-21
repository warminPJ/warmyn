const { writeLogs } = require('./logs/logFunc')
const idOwner = (process.env.idOwner || '').split(',').map(Number)

function checkOwnersId(ctx) {
    console.log(idOwner)
    console.log(idOwner.includes(ctx.from.id))
    return idOwner.includes(ctx.from.id)
}

function persent(val, pct) {
    const price = Number(val);
    const percent = Number(pct)
    const res = Math.ceil(price * (100 - percent) / 100)
    console.log(res)
    return res;
}

async function safeDelete(ctx = null, messageId = null, userId = null) {
    try {

        const chatId = ctx.chat?.id || ctx.from?.id || userId;
        console.log(messageId, chatId)
        if (messageId && chatId) {
            return await ctx.telegram.deleteMessage(chatId, messageId);
        }
        return await ctx.deleteMessage()

    }
    catch (er) {
        writeLogs(er, 'safeDelete');
    }
}



async function safeEdit(ctx, text, button = {}, idMessageEdit = null) {
    if (ctx.callbackQuery) {
        await ctx.answerCbQuery().catch(() => { })
    }

    const userId = ctx.from.id;

    try {
        console.log(idMessageEdit)
        if (idMessageEdit) {
            console.log('я тут');
            return await ctx.telegram.editMessageText(
                ctx.chat.id,      // 1. ID чата
                idMessageEdit,    // 2. ID сообщения
                null,             // 3. inline_message_id (пропускаем)
                text,             // 4. Текст
                button            // 5. Кнопки (extra)
            );
        }

        if (ctx.callbackQuery) {
            return await ctx.editMessageText(text, button)
        }
        return await ctx.reply(text, button)
    }
    catch (error) {
        if (error.description?.includes('message is not modified')) return;
        writeLogs(error, 'safeEdit');
        console.log(error)
        return await ctx.reply(text, button);
    }
}

module.exports = {
    checkOwnersId,
    safeDelete,
    safeEdit,
    persent
};