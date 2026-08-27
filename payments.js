const crypto = require('crypto')

const { defLinkTgBot } = process.env

async function pay(value, shopId, secretKey) {

    const authHeader = Buffer.from(`${shopId}:${secretKey}`).toString('base64');
    const idempotenceKey = crypto.randomUUID();

    const response = await fetch('https://api.yookassa.ru/v3/payments', {
        method: 'POST',
        headers: {
            'Authorization': `Basic ${authHeader}`,
            'Idempotence-Key': idempotenceKey,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            amount: {
                value: value.toFixed(2),
                currency: 'RUB'
            },
            confirmation: {
                type: 'redirect',
                return_url: defLinkTgBot
            },
            capture: true,
            description: 'Заказ подписки'
        })
    });

    const payment = await response.json();
    return payment;
}

async function checkPayment(shopId, secretKey, paymentId) {
    const authHeader = Buffer.from(`${shopId}:${secretKey}`).toString('base64');
    const response = await fetch(`https://api.yookassa.ru/v3/payments/${paymentId}`, {
        method: 'GET',
        headers: {
            'Authorization': `Basic ${authHeader}`,
            'Content-Type': 'application/json'
        }
    })
    return response;
}


module.exports = {
    pay,
    checkPayment
}