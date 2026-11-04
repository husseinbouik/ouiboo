#!/usr/bin/env node
/**
 * Native traveller shell validation (#782).
 *
 * Pure Node.js standard library — no Android SDK, no Xcode, no
 * CocoaPods and no installed dependencies required. This is what CI
 * can honestly prove on Linux:
 *   - the Capacitor config is valid and points at the staging
 *     traveller origin over HTTPS (no cleartext),
 *   - the generated Android / iOS projects carry the same appId,
 *   - the Gradle project files are structurally sane,
 *   - the brand icons are real PNGs at the sizes the projects claim,
 *   - if `npx cap sync` has run, the synced Android config agrees
 *     with the source config.
 * A real Gradle/Xcode build is NOT claimed here — that needs the
 * Android SDK / a Mac, see ../README.md.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const failures = [];

function check(label, condition) {
  if (condition) {
    console.log(`ok - ${label}`);
  } else {
    failures.push(label);
    console.error(`FAIL - ${label}`);
  }
}

function read(rel) {
  const full = path.join(root, rel);
  return fs.existsSync(full) ? fs.readFileSync(full, 'utf8') : '';
}

function pngSize(rel) {
  const full = path.join(root, rel);
  if (!fs.existsSync(full)) return null;
  const buf = fs.readFileSync(full);
  const signature = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];
  if (!signature.every((byte, i) => buf[i] === byte)) return null;
  return { width: buf.readUInt32BE(16), height: buf.readUInt32BE(20) };
}

const APP_ID = 'ma.ouiboo.traveler';
const APP_NAME = 'Ouiboo';
const SERVER_URL = 'https://ouiboo-traveler-staging.vercel.app';

// --- Package + Capacitor dependencies -------------------------------------
const pkg = JSON.parse(read('package.json') || '{}');
const allDeps = { ...pkg.dependencies, ...pkg.devDependencies };
for (const dep of [
  '@capacitor/core',
  '@capacitor/cli',
  '@capacitor/android',
  '@capacitor/ios',
]) {
  check(`package.json declares ${dep}`, typeof allDeps[dep] === 'string');
}
const majors = ['@capacitor/core', '@capacitor/android', '@capacitor/ios'].map(
  (dep) => (allDeps[dep] || '').replace(/^[^0-9]*/, '').split('.')[0],
);
check(
  'Capacitor core/android/ios share one major version',
  majors.every((m) => m && m === majors[0]),
);

// --- Capacitor config ------------------------------------------------------
const config = read('capacitor.config.ts');
check('capacitor.config.ts sets the appId', config.includes(`appId: '${APP_ID}'`));
check('capacitor.config.ts sets the appName', config.includes(`appName: '${APP_NAME}'`));
check('capacitor.config.ts sets webDir www', config.includes("webDir: 'www'"));
check('capacitor.config.ts loads the staging traveller URL', config.includes(`url: '${SERVER_URL}'`));
check('capacitor.config.ts forbids cleartext', config.includes('cleartext: false'));
check('www fallback page exists', fs.existsSync(path.join(root, 'www/index.html')));

// --- Android project --------------------------------------------------------
const appGradle = read('android/app/build.gradle');
check('android applicationId matches appId', appGradle.includes(`applicationId "${APP_ID}"`));
check('android namespace matches appId', appGradle.includes(`namespace "${APP_ID}"`));
check(
  'MainActivity lives in the appId package',
  fs.existsSync(path.join(root, `android/app/src/main/java/ma/ouiboo/traveler/MainActivity.java`)),
);
const manifest = read('android/app/src/main/AndroidManifest.xml');
check('AndroidManifest declares a LAUNCHER activity', manifest.includes('android.intent.category.LAUNCHER'));
check('AndroidManifest requests INTERNET', manifest.includes('android.permission.INTERNET'));
check(
  'strings.xml names the app Ouiboo',
  read('android/app/src/main/res/values/strings.xml').includes('<string name="app_name">Ouiboo</string>'),
);
const wrapper = read('android/gradle/wrapper/gradle-wrapper.properties');
check('gradle wrapper properties pin a distribution', /distributionUrl=.*gradle-[0-9]/.test(wrapper));
check(
  'gradle wrapper jar is present',
  fs.existsSync(path.join(root, 'android/gradle/wrapper/gradle-wrapper.jar')),
);
check(
  'settings.gradle includes the app module',
  read('android/settings.gradle').includes("include ':app'"),
);
const variables = read('android/variables.gradle');
check(
  'variables.gradle pins compile/target SDK',
  variables.includes('compileSdkVersion') && variables.includes('targetSdkVersion'),
);

// --- iOS project -------------------------------------------------------------
const pbxproj = read('ios/App/App.xcodeproj/project.pbxproj');
check(
  'iOS bundle identifier matches appId (debug + release)',
  (pbxproj.match(new RegExp(`PRODUCT_BUNDLE_IDENTIFIER = ${APP_ID.replaceAll('.', '\\.')};`, 'g')) || [])
    .length >= 2,
);
check('iOS Info.plist exists', fs.existsSync(path.join(root, 'ios/App/App/Info.plist')));
check('iOS Podfile exists', fs.existsSync(path.join(root, 'ios/App/Podfile')));

// --- Brand icons ---------------------------------------------------------------
const icon512 = pngSize('resources/icon-512.png');
check('resources/icon-512.png is a 512x512 PNG', icon512?.width === 512 && icon512?.height === 512);
const icon192 = pngSize('resources/icon-192.png');
check('resources/icon-192.png is a 192x192 PNG', icon192?.width === 192 && icon192?.height === 192);
const launcher = pngSize('android/app/src/main/res/mipmap-xxxhdpi/ic_launcher.png');
check('android xxxhdpi launcher icon is 192x192', launcher?.width === 192 && launcher?.height === 192);
const appIcon = pngSize('ios/App/App/Assets.xcassets/AppIcon.appiconset/AppIcon-512@2x.png');
check('iOS AppIcon is 1024x1024', appIcon?.width === 1024 && appIcon?.height === 1024);

// --- Synced output (only when `npx cap sync` has run) -------------------------
const synced = path.join(root, 'android/app/src/main/assets/capacitor.config.json');
if (fs.existsSync(synced)) {
  const syncedConfig = JSON.parse(fs.readFileSync(synced, 'utf8'));
  check('synced android capacitor.config.json appId matches', syncedConfig.appId === APP_ID);
  check(
    'synced android capacitor.config.json server URL matches',
    syncedConfig.server?.url === SERVER_URL,
  );
} else {
  console.log('skip - synced android config not present (run `npx cap sync android`)');
}

if (failures.length > 0) {
  console.error(`\nNative shell validation FAILED (${failures.length}): ${failures.join('; ')}`);
  process.exit(1);
}
console.log('\nNative shell validation passed.');
