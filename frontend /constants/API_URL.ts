import Constants from "expo-constants";
import { Platform } from "react-native";

const BACKEND_PORT = "8000";
// Résolution dynamique de l'IP de l'ordinateur hôte via Expo Constants
const getHostIp = (): string => {
  const hostUri = Constants.expoConfig?.hostUri || (Constants as any).manifest?.debuggerHost;
  if (hostUri) {
    return hostUri.split(":")[0];
  }
  return "127.0.0.1"; // Fallback pour les émulateurs locaux ou web
};

const COMPUTER_IP = getHostIp();

const configuredUrl = process.env.EXPO_PUBLIC_BACKEND_URL?.replace(/\/$/, "");

// Si EXPO_PUBLIC_BACKEND_URL est défini dans le .env, on l'utilise.
// Sinon, on construit l'URL avec l'IP fixe.
export const API_URL = configuredUrl ?? `http://${COMPUTER_IP}:${BACKEND_PORT}`;

if (__DEV__) {
  console.info(`[API] Backend URL: ${API_URL}`);
  console.info(`[API] Configured URL (EXPO_PUBLIC_BACKEND_URL): ${configuredUrl || "not set"}`);
}
