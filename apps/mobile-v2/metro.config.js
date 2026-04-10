const { getDefaultConfig } = require("expo/metro-config");
const fs = require("node:fs");
const path = require("node:path");

const projectRoot = __dirname;
const monorepoRoot = path.resolve(projectRoot, "../..");

const config = getDefaultConfig(projectRoot);

config.watchFolders = [monorepoRoot];
const mobileV2Modules = path.join(monorepoRoot, "apps", "mobile-v2", "node_modules");
config.resolver.nodeModulesPaths = [
  path.join(projectRoot, "node_modules"),
  mobileV2Modules,
  path.join(monorepoRoot, "node_modules"),
];

function realPackageDir(name) {
  const linked = path.join(projectRoot, "node_modules", name);
  try {
    return fs.realpathSync(linked);
  } catch {
    return linked;
  }
}

config.resolver.extraNodeModules = {
  ...config.resolver.extraNodeModules,
  react: realPackageDir("react"),
  "react-dom": realPackageDir("react-dom"),
  "react-native": realPackageDir("react-native"),
  // Monorepo: these are not hoisted to the repo root; pin so Metro always resolves this app's copies.
  expo: realPackageDir("expo"),
  "expo-router": realPackageDir("expo-router"),
  "@expo/metro-runtime": realPackageDir("@expo/metro-runtime"),
  // Same as React: pin Reanimated to this app so we never resolve to apps/mobile's 3.x copy.
  "react-native-reanimated": realPackageDir("react-native-reanimated"),
  "react-native-worklets": realPackageDir("react-native-worklets"),
};

// Reanimated and Worklets point Metro at `src/`; compiling that TS through the Worklets Babel plugin
// hits a Babel 7.29 + plugin edge case in this monorepo. Use the published `lib/module` JS.
const reanimatedRoot = realPackageDir("react-native-reanimated");
const reanimatedMetroMain = path.join(reanimatedRoot, "lib", "module", "index.js");
const workletsRoot = realPackageDir("react-native-worklets");
const workletsMetroMain = path.join(workletsRoot, "lib", "module", "index.js");
const upstreamResolveRequest = config.resolver.resolveRequest;
config.resolver.resolveRequest = (context, moduleName, platform) => {
  if (moduleName === "react-native-reanimated") {
    return { filePath: reanimatedMetroMain, type: "sourceFile" };
  }
  if (moduleName === "react-native-worklets") {
    return { filePath: workletsMetroMain, type: "sourceFile" };
  }
  if (typeof upstreamResolveRequest === "function") {
    return upstreamResolveRequest(context, moduleName, platform);
  }
  return context.resolveRequest(context, moduleName, platform);
};

config.resolver.sourceExts = [...(config.resolver.sourceExts ?? []), "mjs", "cjs"];

config.transformer = config.transformer || {};
config.transformer.getTransformOptions = async () => ({
  transform: {
    experimentalImportSupport: false,
    inlineRequires: true,
  },
});

module.exports = config;
