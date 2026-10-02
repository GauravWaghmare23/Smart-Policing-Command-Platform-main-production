// Dynamic Expo config. Extends app.json (passed in as `config`) so that secrets
// and environment-specific values never live in version control.
//
// GOOGLE_MAPS_ANDROID_API_KEY  - native Google Maps key for Android (react-native-maps).
//   Local : put it in client-mobile/.env (git-ignored)
//   EAS   : eas env:create --environment production --name GOOGLE_MAPS_ANDROID_API_KEY \
//             --value <key> --visibility sensitive
//   In Google Cloud Console restrict the key to "Maps SDK for Android" and to package
//   name com.smartpolice.citizen + your EAS signing SHA-1 fingerprint.

module.exports = ({ config }) => {
  const googleMapsAndroidKey = process.env.GOOGLE_MAPS_ANDROID_API_KEY;

  if (!googleMapsAndroidKey && process.env.EAS_BUILD) {
    console.warn(
      '[app.config] GOOGLE_MAPS_ANDROID_API_KEY is not set - maps will not render in this Android build.'
    );
  }

  return {
    ...config,
    android: {
      ...config.android,
      config: {
        ...(config.android && config.android.config),
        ...(googleMapsAndroidKey
          ? { googleMaps: { apiKey: googleMapsAndroidKey } }
          : {}),
      },
    },
  };
};
