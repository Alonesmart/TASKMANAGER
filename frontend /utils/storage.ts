import * as SecureStore from "expo-secure-store";
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
    if (Platform.OS !== "web") {
      await SecureStore.setItemAsync(key, value);
    }
  } catch (error) {
    console.warn("SecureStore unavailable, using memory storage.", error);
  }
};

export const getStorageItem = async (key: string) => {
  if (canUseLocalStorage()) {
    return globalThis.localStorage.getItem(key);
  }

  try {
    let value = null;
    if (Platform.OS !== "web") {
      value = await SecureStore.getItemAsync(key);
    }
    
    if (value !== null) {
      memoryStorage.set(key, value);
    }
    return value;
  } catch (error) {
    console.warn("SecureStore unavailable, reading memory storage.", error);
    return memoryStorage.get(key) ?? null;
  }
};

export const removeStorageItem = async (key: string) => {
  memoryStorage.delete(key);

  if (canUseLocalStorage()) {
    globalThis.localStorage.removeItem(key);
    return;
  }

  try {
    if (Platform.OS !== "web") {
      await SecureStore.deleteItemAsync(key);
    }
  } catch (error) {
    console.warn("SecureStore unavailable, removing from memory storage only.", error);
  }
};
