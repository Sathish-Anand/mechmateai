import { Platform, Dimensions, StatusBar } from 'react-native';

// Device detection utilities
export const isAndroid = Platform.OS === 'android';
export const isAndroid12Plus = isAndroid && Platform.Version >= 31;
export const isSamsungDevice = () => {
  // Common Samsung model indicators
  const { width, height } = Dimensions.get('window');
  const samsungAspectRatios = [
    2.2, // S10/S20 series
    2.1, // Note series
    2.0, // A series
  ];

  const aspectRatio = Math.max(width, height) / Math.min(width, height);
  return samsungAspectRatios.some(ratio => Math.abs(aspectRatio - ratio) < 0.1);
};

// Safe area utilities for Samsung devices
export const getSafeAreaPadding = () => {
  if (!isAndroid) return { paddingTop: 0, paddingBottom: 0 };

  const statusBarHeight = StatusBar.currentHeight || 0;
  const isSamsung = isSamsungDevice();

  return {
    paddingTop: statusBarHeight,
    paddingBottom: isSamsung ? 8 : 0, // Extra padding for Samsung gesture area
    paddingHorizontal: isSamsung ? 8 : 16, // Reduced for curved edges
  };
};

// Touch target utilities
export const getTouchableMinSize = () => ({
  minWidth: isAndroid ? 48 : 44,
  minHeight: isAndroid ? 48 : 44,
});

// Performance utilities for Android 12+
export const getAndroidPerformanceProps = () => {
  if (!isAndroid12Plus) return {};

  return {
    removeClippedSubviews: true,
    windowSize: 10,
    maxToRenderPerBatch: 5,
    updateCellsBatchingPeriod: 50,
    initialNumToRender: 5,
    getItemLayout: undefined, // Let RN calculate for better performance
  };
};

export default {
  isAndroid,
  isAndroid12Plus,
  isSamsungDevice,
  getSafeAreaPadding,
  getTouchableMinSize,
  getAndroidPerformanceProps,
};