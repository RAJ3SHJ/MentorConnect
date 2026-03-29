const { getDefaultConfig } = require("expo/metro-config");
const { withNativeWind } = require("nativewind/metro");

const config = getDefaultConfig(__dirname);

// Force Metro to prioritize the 'react-native' and 'browser' versions of libraries.
// This prevents axios from trying to load Node-only modules like 'crypto'.
config.resolver.resolverMainFields = ["react-native", "browser", "main"];
const path = require("path");
config.resolver.extraNodeModules = {
  crypto: path.resolve(__dirname, "empty.js"),
  http: path.resolve(__dirname, "empty.js"),
  https: path.resolve(__dirname, "empty.js"),
  stream: path.resolve(__dirname, "empty.js"),
  zlib: path.resolve(__dirname, "empty.js"),
  url: path.resolve(__dirname, "empty.js"),
  os: path.resolve(__dirname, "empty.js"),
  util: path.resolve(__dirname, "empty.js"),
  buffer: path.resolve(__dirname, "empty.js"),
  path: path.resolve(__dirname, "empty.js"),
  fs: path.resolve(__dirname, "empty.js"),
  http2: path.resolve(__dirname, "empty.js"),
  tls: path.resolve(__dirname, "empty.js"),
  net: path.resolve(__dirname, "empty.js"),
  dns: path.resolve(__dirname, "empty.js"),
  vm: path.resolve(__dirname, "empty.js"),
  events: path.resolve(__dirname, "empty.js"),
  assert: path.resolve(__dirname, "empty.js"),
  process: path.resolve(__dirname, "empty.js"),
  querystring: path.resolve(__dirname, "empty.js"),
};

module.exports = withNativeWind(config, { input: "./global.css" });
