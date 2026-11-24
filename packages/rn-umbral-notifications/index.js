const { NativeEventEmitter, NativeModules, Platform } = require('react-native');

const Native = NativeModules.UmbralNotifications || null;
const emitter = Native ? new NativeEventEmitter(Native) : null;

function isAvailable() {
  return Platform.OS === 'android' && Native !== null;
}

async function isEnabled() {
  if (!Native) return false;
  return Native.isEnabled();
}

async function openSettings() {
  if (Native) await Native.openSettings();
}

/** Callback: { package, content, postedAt } */
function addOfferListener(callback) {
  if (!emitter) return { remove() {} };
  const subscription = emitter.addListener('UmbralOffer', callback);
  return { remove: () => subscription.remove() };
}

/** Callback: { enabled: boolean } */
function addStatusListener(callback) {
  if (!emitter) return { remove() {} };
  const subscription = emitter.addListener('UmbralListenerStatus', callback);
  return { remove: () => subscription.remove() };
}

module.exports = {
  isAvailable,
  isEnabled,
  openSettings,
  addOfferListener,
  addStatusListener,
};
