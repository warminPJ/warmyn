const { Telegraf, Markup } = require('telegraf');
const { checkOwnersId, safeEdit } = require('../helpers')

let benefit = 1

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

        safeEdit(ctx, text,{
            parse_mode:'HTML',
            ...Markup.inlineKeyboard(buttons)
    });
        return true
    }
    return false
}

module.exports = {
    discount,
    onoffDiscount
}