import {
  getSteamItem as getSteamItemFromCache,
  setSteamItem as setSteamItemToCache,
} from './cache';
import { getSteamItem as getSteamItemFromDB } from './db';

export const getSteamItem = async id => {
  let value = getSteamItemFromCache(id);
  if (value) {
    return value;
  }
  value = await getSteamItemFromDB(id);
  if (value) {
    setSteamItemToCache(id, value);
  }
  return value;
};
