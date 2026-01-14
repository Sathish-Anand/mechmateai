const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// Enhanced Android support
config.resolver.platforms = ['native', 'android', 'ios', 'web'];

// Optimize for Android performance
config.transformer.minifierConfig = {
  keep_classnames: true, // Required for Samsung devices
  mangle: {
    keep_classnames: true,
  },
};

// Handle Samsung-specific issues
config.resolver.alias = {
  // Ensure proper resolution on Samsung devices
  '@': './src',
};

module.exports = config;