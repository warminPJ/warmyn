
require('dotenv').config();
const { getDateDbUsers } = require('./db/dbUsers');
const { writeLogs } = require('./logs/logFunc');
const axios = require('axios');
const { remnawaveToken, domen, uuidSquad, secretName, secretValue } = process.env

function createLegitUrl(path = '') {
  const url = `https://${domen}${path}?${secretName}=${secretValue}`
  return url
}

async function createRemnewaveUser(userId, expireAt, trafficLimitGB, username) {

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
    hwidDeviceLimit: 5,
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
      return null;
    }
    const data = await response.json()
    console.log('успешное добавление юзера:' + 'не будет обьекта соси');
    return data;

  } catch (error) {
    console.error('Ошибка запроса к remnawave', error.message);
    console.error('детали:', error.cause)
    //запись логов в отдельнй файл
    writeLogs(error, '|создание пользователя в панеле remnawave|')
    return null;
  }
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
      console.dir(error.response.data, { depth: null });}
      writeLogs(error.message, 'updateTimeGbTrafficTaryff');
    }
  }

  module.exports = {
    createRemnewaveUser,
    getHWIDDevices,
    revokeUrl,
    deletedDevice,
    updateTimeGbTrafficTaryff
  }