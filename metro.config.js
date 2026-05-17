const { getDefaultConfig } = require("expo/metro-config");
const { withNativeWind } = require('nativewind/metro');

const config = getDefaultConfig(__dirname);

// Add .db to asset extensions so it can be bundled
config.resolver.assetExts.push('db');

module.exports = withNativeWind(config, { input: './global.css' });
