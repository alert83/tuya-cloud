export enum TuyaRegionConfigEnum {
  CN = 'wss://mqe.tuyacn.com:8285/',
  US = 'wss://mqe.tuyaus.com:8285/',
  EU = 'wss://mqe.tuyaeu.com:8285/',
  IN = 'wss://mqe.tuyain.com:8285/',
}

export enum TUYA_PULSAR_ENV {
  PROD = 'prod',
  TEST = 'test',
}

export const TuyaEnvConfig = Object.freeze({
  [TUYA_PULSAR_ENV.PROD]: {
    name: TUYA_PULSAR_ENV.PROD,
    value: 'event',
    desc: 'online environment',
  },
  [TUYA_PULSAR_ENV.TEST]: {
    name: TUYA_PULSAR_ENV.TEST,
    value: 'event-test',
    desc: 'test environment',
  },
});
type IEnvConfig = typeof TuyaEnvConfig;
export function getTuyaEnvConfig<K extends keyof IEnvConfig>(env: TUYA_PULSAR_ENV): IEnvConfig[K] {
  return TuyaEnvConfig[env];
}
