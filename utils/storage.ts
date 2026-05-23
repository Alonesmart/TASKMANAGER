import AsyncStorage from "@react-native-async-storage/async-storage";
import { Platform } from "react-native";

const memoryStorage = new Map<string, string>();

const canUseLocalStorage = () =>
  Platform.OS === "web" && typeof globalThis.localStorage !== "undefined";

export const setStorageItem = async (key: string, value: string) => {
  memoryStorage.set(key, value);

  if (canUseLocalStorage()) {
    globalThis.localStorage.setItem(key, value);
    return;
  }

  try {
    await AsyncStorage.setItem(key, value);
  } catch (error) {
    console.warn("AsyncStorage unavailable, using memory storage.", error);
  }
};

export const getStorageItem = async (key: string) => {
  if (canUseLocalStorage()) {
    return globalThis.localStorage.getItem(key);
  }

  try {
    const value = await AsyncStorage.getItem(key);
    if (value !== null) {
      memoryStorage.set(key, value);
    }
    return value;
  } catch (error) {
    console.warn("AsyncStorage unavailable, reading memory storage.", error);
    return memoryStorage.get(key) ?? null;
  }
};
