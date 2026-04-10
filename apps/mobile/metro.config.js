const { getDefaultConfig } = require("expo/metro-config");
const fs = require("node:fs");
const path = require("node:path");

const projectRoot = __dirname;
const monorepoRoot = path.resolve(projectRoot, "../..");

const config = getDefaultConfig(projectRoot);

// Monorepo: watch the repo root so workspace packages resolve if you add them later.
config.watchFolders = [monorepoRoot];
config.resolver.nodeModulesPaths = [
  path.join(projectRoot, "node_modules"),
  path.join(monorepoRoot, "node_modules"),
];

// IMPORTANT: do not set disableHierarchicalLookup — with Bun's layout, that blocks Metro
// from seeing transitive deps (expo-modules-core, invariant, whatwg-fetch, @babel/runtime, …).
// We still pin React below so the bundle loads a single React instance (avoids Hermes crashes).

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
