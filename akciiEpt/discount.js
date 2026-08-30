const { Telegraf, Markup, Composer } = require('telegraf');
const { checkOwnersId, safeEdit } = require('../helpers')
const { getdbDiscount, createDiscountdb, updatedbDiscount } = require('../db/dbDiscount')
const { persent } = require('../helpers')
const composer = new Composer();
const { getDatedbCustPrice } = require('../db/dbCustTaryff')

const { db } = require('../db/dbUsers')

let benefit = 0

function onoffDiscount(onoff) {
    if (onoff === 'off') {
        benefit = 0
    } else if (onoff === 'on') {
        benefit = 1
    }
}

//странно выглядит но это для вывода соо если чо функция
function discount(ctx) {
    if (benefit === 1) {

        const buttons = [
            [
                Markup.button.callback('Забронировать скидку', 'discount')
            ], [
                Markup.button.callback('Посмотреть тарифы', 'rate:2')
            ]]

        if (checkOwnersId(ctx)) {
            buttons.push([Markup.button.callback('админка', 'admenet')])
        }

        const text = `Йоу! Я <b>Warmyn</b>👋 будущий VPN-сервис. Вообще я ещё в разработке и не должен был выходить в свет, но разработчик отпустил погулять, пока сам допиливает базу.

Заодно можно урвать персональную <b>скидку 12%</b> на любой тариф на <b>первые полгода</b> после релиза.

Жми кнопку внизу, чтобы закрепить её за своим аккаунтом 👇

<i>p.s. Скидка спокойно плюсуется к скидкам при оплате за 3, 6 и 12 месяцев🔥 \nА ещё вы можете сравнить цены до брони скидки и после в "Посмотреть тарифы"</i> `

        safeEdit(ctx, text, {
            parse_mode: 'HTML',
            ...Markup.inlineKeyboard(buttons)
        });
        return true
    }
    return false
}

const priceTaryff = {
    11: 100,
    12: 250,
    31: 249, // 3 месяца
    32: 649,
    61: 449, //6 месяцев
    62: 1149,
    91: 699, //12 месяцев
    92: 1799
}

const discountPriceTarryf = {
    11: 89,
    12: 219,
    31: 219, // 3 месяца
    32: 569,
    61: 399, //6 месяцев
    62: 999,
    91: 619, //12 месяцев
    92: 1579
}

//сумма с учётом скидки
function takeFixPrice(userId, num) {
    const bazePrice = priceTaryff[num];
    const dbDiscount = getdbDiscount(userId)
    const dbCustTarryf = getDatedbCustPrice(userId)

    if (dbCustTarryf) {
        const custPrice = dbCustTarryf[`taryff${num}`]
        if (custPrice === 0) {
            //проверка на наличие в базе
            if (!dbDiscount) return bazePrice;

            //проверка на наличие скидочных покупок(изначально 6)
            if (dbDiscount?.maxLimit <= 0) return bazePrice
            const discountPercent = dbDiscount.discountPercent

            //если пререг - 12 праценов скидка то берём предустановленные значения
            if (discountPercent === 12) return discountPriceTarryf[num]

            const finalPrice = persent(priceTaryff[num], discountPercent)
        }

        return custPrice
    }

    //проверка на наличие в базе
    if (!dbDiscount) return bazePrice;

    //проверка на наличие скидочных покупок(изначально 6)
    if (dbDiscount?.maxLimit <= 0) return bazePrice
    const discountPercent = dbDiscount.discountPercent

    //если пререг - 12 праценов скидка то берём предустановленные значения
    if (discountPercent === 12) return discountPriceTarryf[num]

    const finalPrice = persent(priceTaryff[num], discountPercent)
    console.log('сумма за тариф', finalPrice)

    return finalPrice;
}


composer.action('discount', async (ctx) => {
    const userId = ctx.from.id;
    const username = ctx.from.username

    const dbDiscount = await getdbDiscount(userId)
    console.log(dbDiscount)
    if (!dbDiscount) {
        createDiscountdb(userId, username, 12, 'test')
        await ctx.answerCbQuery('Успешно!', {
            show_alert: true
        })
        return
    }
    ctx.answerCbQuery('Ну всё, всё, не кликай, ты уже добавлен')
})


composer.action(/^chivo:(.+)/, (ctx) => {
    const num = Number(ctx.match[1])
    if (num === 1) {
        ctx.answerCbQuery('Чиво?')
    } else if (num === 2) {
        ctx.answerCbQuery('Чивоо?')
    } else if (num === 3) {
        ctx.answerCbQuery('Чивооо?')
    } else
        ctx.answerCbQuery('Чивоооо?')
})

module.exports = {
    composer,//сделать логику с 6 месячной акцией(мб 6 раз сделать скидку при покупке а потом 0 и всё)
    discount,
    onoffDiscount,
    takeFixPrice,
    priceTaryff
}