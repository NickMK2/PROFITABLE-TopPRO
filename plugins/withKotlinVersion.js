const { withGradleProperties } = require('expo/config-plugins');

/**
 * React Native 0.76 usa Kotlin 1.9.24. Expo 52 mapea esa versión al Compose
 * Compiler 1.5.14, pero si no se declara explícitamente toma 1.5.15 y la
 * compilación falla. Fijamos la versión para que sobreviva a `expo prebuild`.
 */
module.exports = function withKotlinVersion(config) {
  return withGradleProperties(config, (mod) => {
    mod.modResults = mod.modResults.filter(
      (item) => !(item.type === 'property' && item.key === 'android.kotlinVersion'),
    );
    mod.modResults.push({
      type: 'property',
      key: 'android.kotlinVersion',
      value: '1.9.24',
    });
    return mod;
  });
};
