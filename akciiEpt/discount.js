const { Telegraf, Markup } = require('telegraf');
const { checkOwnersId, safeEdit } = require('../helpers')
const { getdbDiscount } = require('../db/dbDiscount')
const { persent } = require('../helpers')

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
function takeFixPrice(ctx, num) {
    const userId = ctx.from.id
    const bazePrice = priceTaryff[num];
    const dbDiscount = getdbDiscount(userId)

    if (!dbDiscount) return bazePrice;

    const discountPercent = dbDiscount.discountPercent
    if(discountPercent === 12) return discountPriceTarryf[num]
    const finalPrice = persent(priceTaryff[num], discountPercent)
    console.log('сумма за тариф', finalPrice)


    return finalPrice;
}

module.exports = {
    discount,
    onoffDiscount,
    takeFixPrice,
    priceTaryff
}