/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/explicit-module-boundary-types */
import { MD5, AES, enc, mode, pad } from 'crypto-js';

export function getTopicUrl(websocketUrl: string, accessId: string, env: string, query: string) {
  return `${websocketUrl}ws/v2/consumer/persistent/${accessId}/out/${env}/${accessId}-sub${query}`;
}

export function buildQuery(query: { [key: string]: number | string }) {
  return Object.keys(query)
    .map((key) => `${key}=${encodeURIComponent(query[key])}`)
    .join('&');
}

export function buildPassword(accessId: string, accessKey: string) {
  const key = MD5(accessKey).toString();
  return MD5(`${accessId}${key}`).toString().substr(8, 16);
}

export function decrypt(data: string, accessKey: string) {
  try {
    const realKey = enc.Utf8.parse(accessKey.substring(8, 24));
    const json = AES.decrypt(data, realKey, {
      mode: mode.ECB,
      padding: pad.Pkcs7,
    });
    const dataStr = enc.Utf8.stringify(json).toString();
    return JSON.parse(dataStr);
  } catch (e) {
    return '';
  }
}

export function encrypt(data: any, accessKey: string) {
  try {
    const realKey = enc.Utf8.parse(accessKey.substring(8, 24));
    const realData = JSON.stringify(data);
    const retData = AES.encrypt(realData, realKey, {
      mode: mode.ECB,
      padding: pad.Pkcs7,
    }).toString();
    return retData;
  } catch (e) {
    return '';
  }
}
