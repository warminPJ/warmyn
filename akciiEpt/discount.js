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
            ]]

        if (checkOwnersId(ctx)) {
            buttons.push([Markup.button.callback('админка', 'admenet')])
        }

        const text = `Йоу! Я <b>Warmyn</b>👋 будущий VPN-сервис. Вообще я ещё в разработке и не должен был выходить в свет, но разработчик отпустил погулять, пока сам допиливает базу.

Заодно можно урвать персональную <b>скидку 20%</b> на любой тариф на <b>первые полгода</b> после релиза.

Жми кнопку внизу, чтобы закрепить её за своим аккаунтом 👇

<i>p.s. Скидка спокойно плюсуется к скидкам при оплате за 3, 6 и 12 месяцев.</i> 🔥`

        safeEdit(ctx, text, {
            parse_mode: 'HTML',
            ...Markup.inlineKeyboard(buttons)
        });
        return true
    }
    return false
}

//сумма с учётом скидки
function takeFixPrice(ctx, num) {
    const userId = ctx.from.id
    const dbDiscount = getdbDiscount(userId)
    const priceTaryff1 = 100
    const priceTaryff2 = 250
    let finalPrice = 0
    if (dbDiscount) {
        const discountPercent = dbDiscount.discountPercent
        console.log(discountPercent);
        if (num === 1) {
            finalPrice = persent(priceTaryff1, discountPercent)
        } else if (num === 2) {
            finalPrice = persent(priceTaryff2, discountPercent)
        }
    }

    if (Number(num) === 1) {
        finalPrice = priceTaryff1;
    } else if (Number(num === 2)) {
        finalPrice = priceTaryff2;
    }
    return finalPrice;
}

module.exports = {
    discount,
    onoffDiscount,
    takeFixPrice
}