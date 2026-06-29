import Constants from "expo-constants";
import { Platform } from "react-native";

const BACKEND_PORT = "8000";
// IP de la machine hôte du backend
const COMPUTER_IP = "192.168.1.158"; 

const configuredUrl = process.env.EXPO_PUBLIC_BACKEND_URL?.replace(/\/$/, "");

// Si EXPO_PUBLIC_BACKEND_URL est défini dans le .env, on l'utilise.
// Sinon, on construit l'URL avec l'IP fixe.
export const API_URL = configuredUrl ?? `http://${COMPUTER_IP}:${BACKEND_PORT}`;

if (__DEV__) {
  console.info(`[API] Backend URL: ${API_URL}`);
  console.info(`[API] Configured URL (EXPO_PUBLIC_BACKEND_URL): ${configuredUrl || "not set"}`);
}
