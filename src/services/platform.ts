import { Capacitor } from '@capacitor/core';

/** True inside the Android/iOS app, false in a browser or installed PWA. */
export const isNative = Capacitor.isNativePlatform();

/** Resolves a file from /public for both the web and the native build. */
export function assetUrl(path: string): string {
  return `${import.meta.env.BASE_URL}${path.replace(/^\//, '')}`;
}
