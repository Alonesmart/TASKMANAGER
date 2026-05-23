import Constants from "expo-constants";

const BACKEND_PORT = "8000";

function getExpoDevServerHost() {
  const constants = Constants as any;
  const hostUri =
    constants.expoConfig?.hostUri ??
    constants.manifest2?.extra?.expoClient?.hostUri ??
    constants.manifest?.debuggerHost;

  return typeof hostUri === "string" ? hostUri.split(":")[0] : undefined;
}

const configuredUrl = process.env.EXPO_PUBLIC_BACKEND_URL?.replace(/\/$/, "");
const devServerHost = getExpoDevServerHost();

export const API_URL =
  configuredUrl ??
  (devServerHost
    ? `http://${devServerHost}:${BACKEND_PORT}`
    : `http://127.0.0.1:${BACKEND_PORT}`);
