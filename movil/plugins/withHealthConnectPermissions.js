const { withAndroidManifest } = require('@expo/config-plugins');

const PERMISSIONS = [
  'android.permission.health.READ_HEART_RATE',
  'android.permission.health.READ_RESTING_HEART_RATE',
  'android.permission.health.READ_HEART_RATE_VARIABILITY',
  'android.permission.health.READ_OXYGEN_SATURATION',
  'android.permission.health.READ_STEPS',
  'android.permission.health.READ_SLEEP',
  'android.permission.health.READ_SKIN_TEMPERATURE',
  'android.permission.health.READ_BODY_TEMPERATURE',
  // Lectura con la app en segundo plano (tarea de expo-background-task).
  'android.permission.health.READ_HEALTH_DATA_IN_BACKGROUND',
];

function withHealthConnectPermissions(config) {
  return withAndroidManifest(config, (next) => {
    const manifest = next.modResults.manifest;
    const uses = manifest['uses-permission'] ?? [];
    for (const name of PERMISSIONS) {
      if (!uses.some((item) => item.$['android:name'] === name)) {
        uses.push({ $: { 'android:name': name } });
      }
    }
    manifest['uses-permission'] = uses;

    const queries = manifest.queries ?? [];
    const hasProvider = queries.some((query) =>
      (query.package ?? []).some((item) => item.$['android:name'] === 'com.google.android.apps.healthdata'),
    );
    if (!hasProvider) {
      queries.push({ package: [{ $: { 'android:name': 'com.google.android.apps.healthdata' } }] });
    }
    manifest.queries = queries;
    return next;
  });
}

module.exports = withHealthConnectPermissions;
