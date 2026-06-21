import { Browser } from '@capacitor/browser';
import { Capacitor } from '@capacitor/core';

export const isNativePlatform = Capacitor.isNativePlatform();

export async function openPaymentUrl(url: string): Promise<void> {
  if (isNativePlatform) {
    await Browser.open({ url, windowName: '_self', presentationStyle: 'popover' });
  } else {
    window.location.href = url;
  }
}

export async function openExternalUrl(url: string): Promise<void> {
  if (isNativePlatform) {
    await Browser.open({ url, presentationStyle: 'popover' });
  } else {
    window.open(url, '_blank');
  }
}

export function onBrowserFinished(callback: () => void): () => void {
  if (!isNativePlatform) return () => {};
  let removed = false;
  const listenerPromise = Browser.addListener('browserFinished', () => {
    if (!removed) callback();
  });
  return () => {
    removed = true;
    listenerPromise.then((h) => h.remove()).catch(() => {});
  };
}
