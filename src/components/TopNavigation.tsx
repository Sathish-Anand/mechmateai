import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Modal,
  Pressable,
  Image,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../context/AuthContext';

interface TopNavigationProps {
  onAccountPress?: () => void;
  title?: string;
  layout?: 'center' | 'logo-center' | 'far-left' | 'far-right' | 'title-center' | 'title-left-logo-center';
}

const TopNavigation: React.FC<TopNavigationProps> = ({ onAccountPress, title, layout = 'title-left-logo-center' }) => {
  const { user, logout } = useAuth();
  const [showDropdown, setShowDropdown] = useState(false);
  const [screenData, setScreenData] = useState(Dimensions.get('window'));

  // Screen size detection
  useEffect(() => {
    const onChange = (result: any) => {
      setScreenData(result.window);
    };

    const subscription = Dimensions.addEventListener('change', onChange);
    return () => subscription?.remove();
  }, []);

  // Screen size helpers
  const isSmallScreen = screenData.width < 375; // iPhone SE and smaller
  const isVerySmallScreen = screenData.width < 330; // Very small phones
  const isTinyScreen = screenData.width < 300; // Extremely small screens

  const handleLogout = async () => {
    try {
      setShowDropdown(false);
      await logout();
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  const handleAccountPress = () => {
    setShowDropdown(false);
    if (onAccountPress) {
      onAccountPress();
    }
  };

  const getInitials = (name: string): string => {
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .substring(0, 2);
  };

  const renderProfileButton = () => (
    <TouchableOpacity
      style={styles.profileButton}
      onPress={() => setShowDropdown(true)}
      activeOpacity={0.7}
    >
      <View style={styles.profileIcon}>
        {user?.name ? (
          <Text style={styles.profileInitials}>
            {getInitials(user.name)}
          </Text>
        ) : (
          <Image
            source={require('../../assets/logo_round_white.png')}
            style={styles.profileLogo}
            resizeMode="contain"
          />
        )}
      </View>
    </TouchableOpacity>
  );

  const renderLogo = () => {
    // Adaptive logo sizing
    const logoStyle = [
      styles.logoImage,
      isSmallScreen && styles.logoImageSmall,
      isVerySmallScreen && styles.logoImageVerySmall,
      isTinyScreen && styles.logoImageTiny,
    ];

    return (
      <Image
        source={require('../../assets/logo_transparent.png')}
        style={logoStyle}
        resizeMode="contain"
      />
    );
  };

  const renderTitle = () => {
    const titleText = title || 'MechMate AI';

    // Adaptive title styling
    const titleStyle = [
      styles.pageTitle,
      isSmallScreen && styles.pageTitleSmall,
      isVerySmallScreen && styles.pageTitleVerySmall,
      isTinyScreen && styles.pageTitleTiny,
    ];

    // For very small screens, use abbreviated title
    const displayTitle = isVerySmallScreen ?
      (titleText === 'MechMate AI' ? 'MechMate' : titleText.substring(0, 12) + '...') :
      titleText;

    return (
      <Text
        style={titleStyle}
        numberOfLines={1}
        adjustsFontSizeToFit={true}
        minimumFontScale={0.7}
      >
        {displayTitle}
      </Text>
    );
  };

  const renderLayout = () => {
    // For very small screens, use a simplified layout
    if (isTinyScreen) {
      return (
        <View style={styles.compactLayout}>
          {renderTitle()}
          <View style={styles.compactRightSection}>
            {renderProfileButton()}
          </View>
        </View>
      );
    }

    // For very small screens, simplify some layouts
    if (isVerySmallScreen && (layout === 'title-left-logo-center' || layout === 'center')) {
      return (
        <View style={styles.smallScreenLayout}>
          <View style={styles.leftSectionSmall}>
            {renderTitle()}
          </View>
          <View style={styles.rightSectionSmall}>
            {renderLogo()}
            {renderProfileButton()}
          </View>
        </View>
      );
    }

    switch (layout) {
      case 'center':
        return (
          <View style={styles.centerLayout}>
            <View style={styles.leftSection}>
              {renderTitle()}
            </View>
            {isSmallScreen ? null : renderLogo()}
            <View style={styles.rightSection}>
              {renderProfileButton()}
            </View>
          </View>
        );

      case 'logo-center':
        return (
          <View style={styles.logoCenterLayout}>
            <View style={styles.spacer} />
            {renderLogo()}
            <View style={styles.rightSection}>
              {renderProfileButton()}
            </View>
          </View>
        );

      case 'far-left':
        return (
          <View style={styles.farLeftLayout}>
            {renderLogo()}
            <View style={styles.spacer} />
            {renderProfileButton()}
          </View>
        );

      case 'far-right':
        return (
          <View style={styles.farRightLayout}>
            <View style={styles.spacer} />
            {renderLogo()}
            {renderProfileButton()}
          </View>
        );

      case 'title-center':
        return (
          <View style={styles.titleCenterLayout}>
            <View style={styles.spacer} />
            {renderTitle()}
            <View style={styles.rightSection}>
              {renderProfileButton()}
            </View>
          </View>
        );

      case 'title-left-logo-center':
      default:
        return (
          <View style={styles.titleLeftLogoCenterLayout}>
            <View style={styles.leftSection}>
              {renderTitle()}
            </View>
            {isSmallScreen ? null : renderLogo()}
            <View style={styles.rightSection}>
              {renderProfileButton()}
            </View>
          </View>
        );
    }
  };

  const containerStyle = [
    styles.container,
    isSmallScreen && styles.containerSmall,
    isVerySmallScreen && styles.containerVerySmall,
  ];

  return (
    <>
      <SafeAreaView style={styles.safeArea}>
        <View style={containerStyle}>
          {renderLayout()}
        </View>
      </SafeAreaView>

      {/* Dropdown Modal */}
      <Modal
        visible={showDropdown}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowDropdown(false)}
      >
        <Pressable
          style={styles.modalOverlay}
          onPress={() => setShowDropdown(false)}
        >
          <View style={styles.dropdownContainer}>
            <View style={styles.dropdown}>
              {/* User Info */}
              <View style={styles.userInfo}>
                <View style={styles.userAvatar}>
                  {user?.name ? (
                    <Text style={styles.userInitials}>
                      {getInitials(user.name)}
                    </Text>
                  ) : (
                    <Image
                      source={require('../../assets/logo_round_white.png')}
                      style={styles.avatarLogo}
                      resizeMode="contain"
                    />
                  )}
                </View>
                <View style={styles.userDetails}>
                  <Text style={styles.userName}>{user?.name || 'User'}</Text>
                  <Text style={styles.userEmail}>{user?.email || ''}</Text>
                  <Text style={styles.userPlan}>
                    Plan: {user?.plan_type || 'Basic'}
                  </Text>
                </View>
              </View>

              {/* Divider */}
              <View style={styles.divider} />

              {/* Menu Items */}
              <TouchableOpacity
                style={styles.menuItem}
                onPress={handleAccountPress}
                activeOpacity={0.7}
              >
                <Text style={styles.menuIcon}>👤</Text>
                <Text style={styles.menuText}>Account Settings</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.menuItem}
                onPress={handleLogout}
                activeOpacity={0.7}
              >
                <Text style={styles.menuIcon}>🚪</Text>
                <Text style={styles.menuText}>Logout</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Pressable>
      </Modal>
    </>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    backgroundColor: '#1a2332',
  },
  container: {
    paddingLeft: 16, // Reduced for Samsung curved edges
    paddingRight: 16,
    paddingVertical: 12,
    backgroundColor: '#1a2332',
    borderBottomWidth: 1,
    borderBottomColor: '#34495e',
    minHeight: 56, // Ensure minimum touch target
  },
  containerSmall: {
    paddingLeft: 12,
    paddingRight: 12,
    paddingVertical: 10,
    minHeight: 52,
  },
  containerVerySmall: {
    paddingLeft: 8,
    paddingRight: 8,
    paddingVertical: 8,
    minHeight: 48,
  },
  // Layout styles
  centerLayout: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  logoCenterLayout: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  farLeftLayout: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  farRightLayout: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
  },
  titleCenterLayout: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  titleLeftLogoCenterLayout: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  // Small screen layouts
  compactLayout: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  smallScreenLayout: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  // Section styles
  leftSection: {
    flex: 1,
    alignItems: 'flex-start',
  },
  rightSection: {
    flex: 1,
    alignItems: 'flex-end',
  },
  // Small screen sections
  leftSectionSmall: {
    flex: 2,
    alignItems: 'flex-start',
  },
  rightSectionSmall: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  compactRightSection: {
    alignItems: 'flex-end',
  },
  spacer: {
    flex: 1,
  },
  // Element styles
  pageTitle: {
    color: '#ecf0f1',
    fontSize: 22,
    fontWeight: '700',
  },
  pageTitleSmall: {
    fontSize: 20,
  },
  pageTitleVerySmall: {
    fontSize: 18,
  },
  pageTitleTiny: {
    fontSize: 16,
  },
  logoImage: {
    width: 100,
    height: 30,
  },
  logoImageSmall: {
    width: 85,
    height: 26,
  },
  logoImageVerySmall: {
    width: 70,
    height: 22,
  },
  logoImageTiny: {
    width: 60,
    height: 18,
  },
  profileLogo: {
    width: 24,
    height: 24,
  },
  avatarLogo: {
    width: 32,
    height: 32,
  },
  profileButton: {
    // Profile button styling
  },
  profileIcon: {
    width: 44, // Larger for better touch target
    height: 44,
    borderRadius: 22,
    backgroundColor: '#2C8AA6', // Teal color from logo
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#2980b9',
    minWidth: 44, // Ensure minimum touch target on Samsung devices
    minHeight: 44,
  },
  profileInitials: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-start',
    paddingTop: 90, // Position below the header
  },
  dropdownContainer: {
    alignItems: 'flex-end',
    paddingHorizontal: 20,
  },
  dropdown: {
    backgroundColor: '#2c3e50',
    borderRadius: 12,
    paddingVertical: 16,
    minWidth: 280,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 8,
  },
  userInfo: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingBottom: 12,
    alignItems: 'center',
  },
  userAvatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#2C8AA6', // Teal color from logo
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  userInitials: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  userDetails: {
    flex: 1,
  },
  userName: {
    color: '#ecf0f1',
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 2,
  },
  userEmail: {
    color: '#95a5a6',
    fontSize: 14,
    marginBottom: 2,
  },
  userPlan: {
    color: '#F4B942', // Yellow color from logo
    fontSize: 12,
    fontWeight: '500',
  },
  divider: {
    height: 1,
    backgroundColor: '#34495e',
    marginVertical: 8,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  menuIcon: {
    fontSize: 20,
    marginRight: 12,
  },
  menuText: {
    color: '#ecf0f1',
    fontSize: 16,
    fontWeight: '500',
  },
});

export default TopNavigation;