# MechmateAI

AI-powered automotive diagnosis and repair assistant for vehicle owners and mechanics.

## Overview

MechmateAI is a React Native mobile application that provides intelligent automotive diagnosis using artificial intelligence. The app helps users identify vehicle problems through symptom description, OBDII error codes, and visual evidence (photos/videos), then provides detailed repair guidance, cost estimates, and parts recommendations.

## Features

### Core Functionality
- **AI-Powered Diagnosis**: Advanced automotive problem analysis using Groq AI
- **Multi-Modal Input**: Support for text descriptions, OBDII codes, photos, and videos
- **Intelligent Recommendations**: Detailed repair steps with tool requirements and expected outcomes
- **Cost Estimation**: Realistic repair cost estimates based on diagnosis complexity
- **Parts Integration**: Smart parts recommendations with pricing and availability

### User Management
- **Guest Mode**: Limited diagnosis capability without registration
- **User Authentication**: Secure signup/login with Supabase
- **Plan Tiers**: Basic, Essential, Performance, and Ultimate subscription plans
- **Vehicle Garage**: Personal vehicle management and maintenance tracking

### Data & Analytics
- **Service History**: Complete logbook for maintenance tracking
- **Diagnosis History**: Access to previous diagnostic reports
- **Guest Analytics**: Conversion tracking for marketing insights
- **Multi-platform Support**: iOS, Android, and Web compatibility

## Tech Stack

- **Frontend**: React Native 0.81.5 with TypeScript 5.9.2
- **Development**: Expo 54.0.31 for streamlined development
- **Backend**: Supabase for authentication, database, and storage
- **AI Integration**: Groq API for automotive diagnosis
- **Navigation**: React Navigation 7.x with stack and tab navigators
- **UI Components**: React Native Elements with custom styling

## Project Structure

```
mechmateai/
├── src/                          # Source code
│   ├── components/               # Reusable UI components
│   │   ├── LoadingScreen.tsx     # Loading states
│   │   └── TopNavigation.tsx     # Navigation header
│   ├── context/                  # React Context providers
│   │   └── AuthContext.tsx       # Authentication context
│   ├── navigation/               # App navigation
│   │   └── AppNavigator.tsx      # Main navigation stack
│   ├── screens/                  # Screen components
│   │   ├── auth/                 # Authentication screens
│   │   ├── guest/                # Guest user screens
│   │   └── main/                 # Authenticated user screens
│   ├── services/                 # API and external services
│   │   ├── diagnosisService.ts   # Diagnosis API
│   │   ├── groqService.ts        # AI integration
│   │   ├── vehicleService.ts     # Vehicle management
│   │   └── ...                   # Other services
│   └── utils/                    # Utility functions
├── assets/                       # Static assets
│   ├── icon.png                  # App icon
│   ├── splash-icon.png           # Splash screen
│   └── ...                       # Other images and logos
├── backend/                      # Express.js backend (optional)
├── App.tsx                       # Root React Native component
├── app.json                      # Expo configuration
├── package.json                  # Dependencies and scripts
└── tsconfig.json                 # TypeScript configuration
```

## Getting Started

### Prerequisites

- Node.js 18+ (current: v21.0.0 supported with warnings)
- npm 10+
- Expo CLI
- React Native development environment
- Supabase account (for backend services)

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/Sathish-Anand/mechmate.git
   cd mechmate
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Install required peer dependencies**
   ```bash
   npx expo install react-native-gesture-handler
   ```

4. **Set up environment variables**
   ```bash
   cp .env.example .env
   # Edit .env with your Supabase and API keys
   ```

### Development

Start the development server:
```bash
npm start
# or
npx expo start
```

Run on specific platforms:
```bash
npm run android    # Android emulator/device
npm run ios        # iOS simulator/device
npm run web        # Web browser
```

### Configuration

#### Supabase Setup
1. Create a Supabase project
2. Run the SQL scripts in the project for database setup
3. Configure Row Level Security (RLS) policies
4. Add your Supabase URL and anon key to `.env`

#### API Keys
- **Groq AI**: Register at Groq Console and add API key
- **Google AI**: Optional, for additional AI capabilities

## Architecture

### Data Flow
1. **User Input**: Symptoms, codes, photos/videos via UI
2. **AI Processing**: Groq AI analyzes input and generates diagnosis
3. **Data Storage**: Results stored in Supabase (authenticated users)
4. **Recommendations**: Parts and video recommendations fetched
5. **User Output**: Formatted diagnosis with actionable steps

### Authentication Flow
- Guest users: Limited functionality, conversion tracking
- Registered users: Full features, data persistence
- Plan-based restrictions: Feature access based on subscription tier

### Offline Capability
- Basic functionality available offline
- Cached diagnosis results
- Sync when connection restored

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit changes (`git commit -m 'Add amazing feature'`)
4. Push to branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Support

For support and questions:
- Create an issue on GitHub
- Check the documentation in the `docs/` folder
- Contact the development team

---

**MechmateAI** - Intelligent automotive diagnosis powered by AI