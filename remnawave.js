
require('dotenv').config();
const { getDateDbUsers, createSubdb } = require('./db/dbUsers');
const { writeLogs } = require('./logs/logFunc');
const { dontTouch } = require('./db/dbPayment');
const { remnawaveToken, domen, uuidSquad, secretName, secretValue } = process.env

const axios = require('axios');

const api = axios.create({
  baseURL: `https://${domen}`,
  headers: { Authorization: `Bearer ${remnawaveToken}` }
});

function createLegitUrl(path = '') {
  const url = `https://${domen}${path}?${secretName}=${secretValue}`
  return url
}

async function createRemnewaveUser(userId, expireAt, trafficLimitGB, username, paymentId = null, notPayment = 0, nameTaryff = '', hwidDeviceLimit) {

  const expireDate = new Date(expireAt).toISOString();
  const createdAt = new Date(Date.now()).toISOString();
  const telegramId = userId;
  const requestBody = {
    username: username,
    status: 'ACTIVE',
    trafficLimitBytes: trafficLimitGB * 1024 * 1024 * 1024,
    trafficLimitStrategy: 'NO_RESET',
    expireAt: expireDate,
    createdAt: createdAt,
    hwidDeviceLimit,
    activeInternalSquads: [uuidSquad],
    telegramId
  }

  try {
    const response = await fetch(createLegitUrl('/api/users'), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${remnawaveToken}`
      },
      body: JSON.stringify(requestBody)

    })

    if (!response.ok) {
      const errData = await response.json().catch(() => null)
      console.error('Ошибка запроса ramewaveAPI:', response.status, errData || response.statusText);
      if (errData?.errorCode === 'A019' || errData?.message?.includes('User username already exists')) {

        console.log(`Пользователь ${username} уже существует. Получаем/обновляем данные...`);
        if (!notPayment) {
          const dbPayment = await dontTouch(paymentId);//получение строки покупки
          const res = await getUuidByTelegramId(userId);//получение uuid запросом в панель с помощью тг айди(уже не объект, не парся)
          const uuid = res.uuid
          const link = res.subscriptionUrl
          const subTime = Date.now() + dbPayment.subTime

          //создание пользователя в базе
          await createSubdb(userId, subTime, dbPayment.maxGB, 0, res.id, link, uuid, username, dbPayment.nameTaryff, 0, 0)

          //перенос из базы новых данных в панель
          await updateTimeGbTrafficTaryff(userId);
        } else {
          const res = await getUuidByTelegramId(userId);

          //создание пользователя в базе
          await createSubdb(userId, expireAt, trafficLimitGB, 0, res.id, res.subscriptionUrl, res.uuid, username, nameTaryff, 0, 0)

          //перенос из базы новых данных в панель
          const data = await updateTimeGbTrafficTaryff(userId)
        }
        return 'test'// логика если есть в панеле но нет в базе
      }
      return null;
    }
    const data = await response.json()
    console.log('успешное добавление юзера:' + 'не будет обьекта соси');
    return data;

  } catch (error) {
    const apierror = error.message;
    console.error('Ошибка запроса к remnawave', error.message);
    console.error('детали:', error.cause)
    //запись логов в отдельный файл
    writeLogs(error, '|создание пользователя в панеле remnawave|')
    return null;
  }
}

async function takeEmergencyTaryff(uuid, expireAt, maxGB = 200 * 1024 * 1024) {
  const options = {
    method: 'PATCH',
    url: createLegitUrl(`/api/users`),
    headers: {
      Authorization: `Bearer ${remnawaveToken}`
    },
    data: {
      trafficLimitBytes: maxGB,
      expireAt,
      uuid
    }
  }
  try {
    const { data } = await axios.request(options)
  } catch (er) {
    console.error(er);
    writeLogs(er, 'takeEmergencyTaryff')
  }
}

//получение uuid с помощью тг айди
async function getUuidByTelegramId(userId) {
  const { data } = await api.get(createLegitUrl(`/api/users/by-telegram-id/${userId}`));
  console.log('ага ёпт', data)
  return data.response[0];
}

//получение устройств пользователя
async function getHWIDDevices(uuid = '') {
  const options = {
    method: 'GET',
    url: createLegitUrl(`/api/hwid/devices/${uuid}`),
    headers: {
      Authorization: `Bearer ${remnawaveToken}`
    }
  }
  try {
    const { data } = await axios.request(options);
    return data.response;
  }
  catch (error) {
    console.error(error);
    writeLogs(error, 'getHWIDDevices')
  }
}

async function deletedDevice(uuid, hwid = '') {
  if (!hwid || hwid === 'undefined') {
    console.error(' Ошибка: hwid не передан в функцию');
    return false;
  }
  const safeUuid = String(uuid || '').trim();
  const safeHwid = String(hwid || '').trim();
  console.log('Удаляем устройство:', safeHwid, 'для пользователя:', safeUuid)
  const options = {
    method: 'POST',
    url: createLegitUrl('/api/hwid/devices/delete'),
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${remnawaveToken}`
    },
    data: {
      userUuid: safeUuid,
      hwid: safeHwid
    }
  }
  try {
    const { data } = await axios.request(options)
    return data.response;
  } catch (error) {
    if (error.response?.status === 404) {
      console.error('❌ Ошибка 404: Устройство или пользователь не найдены в Remnawave.');
      console.error('Ответ панели:', error.response.data);
    } else {
      console.error('Ошибка удаления:', error.response?.data || error.message);
    }
    writeLogs(error, 'deleteDevice')
    return null
  }
}

async function revokeUrl(uuid) {
  const options = {
    method: 'POST',
    url: createLegitUrl(`/api/users/${uuid}/actions/revoke`),
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${remnawaveToken}`
    },
    data: {
      revokeOnlyPasswords: false
    }
  }

  try {
    const { data } = await axios.request(options)
    return data.response.subscriptionUrl;
  } catch (error) {
    console.error('Ошибка revokeUrl:', error.response?.data || error.message);
    writeLogs(error, 'revokeUrl')
    return false
  }
}

async function updateTimeGbTrafficTaryff(userId) {
  const dbUser = await getDateDbUsers(userId)
  const uuid = dbUser.uuid;
  console.log(dbUser.uuid)
  const newExpireAt = new Date(dbUser.subTime).toISOString();
  const newTrafficLimitGb = dbUser.maxGB;
  const options = {
    method: 'PATCH',
    url: createLegitUrl('/api/users'),
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${remnawaveToken}`
    },
    data: {
      uuid,
      trafficLimitBytes: newTrafficLimitGb * 1024 * 1024 * 1024,
      expireAt: newExpireAt
    }
  }

  try {
    const { data } = await axios.request(options)
    console.log(data)
  } catch (error) {
    if (error.response?.data) {
      console.dir(error.response.data, { depth: null });
    }
    writeLogs(error, 'updateTimeGbTrafficTaryff');
  }
}

async function stopUserInRemnawave(uuid, stop = 0, expireAt) {
  let options = {}
  if (stop === 1) {
    options = {
      method: 'PATCH',
      url: createLegitUrl(`/api/users`),
      headers: {
        Authorization: `Bearer ${remnawaveToken}`
      },
      data: {
        uuid,
        status: 'DISABLED'
      }
    }
  } else {
    options = {
      method: 'PATCH',
      url: createLegitUrl(`/api/users`),
      headers: {
        Authorization: `Bearer ${remnawaveToken}`
      },
      data: {
        uuid,
        status: 'ACTIVE',
        expireAt
      }
    }
  }
  try {
    const { data } = await axios.request(options)
  } catch (er) {
    console.error(er);
    writeLogs(er, 'stopUserInRemnawave')
  }
}

module.exports = {
  createRemnewaveUser,
  getHWIDDevices,
  revokeUrl,
  deletedDevice,
  updateTimeGbTrafficTaryff,
  getUuidByTelegramId,
  takeEmergencyTaryff,
  stopUserInRemnawave
}