
const taryffUsers = new Map()
//запись айди
function addUserId(userId, userIdTar){

    taryffUsers.set(userId, {
        userIdTar: userIdTar,
        price: 0,
        numberTaryff: null
    })
    console.log('айди записан в озу');
    return
}
//ввод номера тарифа
function numTaryff(userId, numberTaryff){
    //получение ссылки на обьект
    const userDate = taryffUsers.get(userId);
    userDate.numberTaryff = numberTaryff;
    console.log('номер тарифа записан в озу');
    console.log(numberTaryff)
    return
}
//ввод цены для тарифа
function priceTaryff(userId, price){
    const userDate = taryffUsers.get(userId);
    userDate.price = price;
    console.log('цена для выбранного тарифа записана в озу');
    return
}


function clearMap(userId){
    if(!taryffUsers?.has(userId)){
        console.log(`Юзера ${userId} нет в map`)
        return
    }

    taryffUsers.delete(userId);
    console.log('map был очищен');
    return
}

module.exports = { 
    taryffUsers,
    addUserId,
    numTaryff,
    priceTaryff,
    clearMap
}