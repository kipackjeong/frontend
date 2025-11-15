# 초성빙고 (Choseong Bingo) Frontend

A React Native + Expo multilingual multiplayer word bingo game frontend built with TypeScript, Zustand, and Socket.IO.

## 🚀 Quick Start

### Prerequisites
- Node.js 18+
- Expo CLI (`npm install -g @expo/cli`)
- React Native development environment

### Installation

1. **Install dependencies:**
```bash
cd frontend
npm install
```

2. **Install additional React Navigation dependencies:**
```bash
npx expo install @react-navigation/native @react-navigation/stack
npx expo install react-native-screens react-native-safe-area-context react-native-gesture-handler
```

3. **Start the development server:**
```bash
npm run start
```

4. **Run on device/simulator:**
```bash
# iOS
npm run ios

# Android  
npm run android

# Web
npm run web
```

## 🏗️ Architecture

### State Management (Zustand)
- **userSlice**: Authentication, user profile, mock login/signup
- **gameSlice**: Room management, game phases, voting system
- **boardSlice**: Bingo boards, cell management, line detection
- **turnSlice**: Turn management, timers, word calling

### Components
- **Button**: Multi-variant button with loading states
- **Input**: Form input with validation and error display
- **Card**: Container component with elevation variants
- **Text**: Typography component with size/color variants

### Services
- **socketService**: Socket.IO client with auto-reconnection
- **Mock data**: Development-friendly mock APIs and data

### Screens
- **LoginScreen**: Email/password authentication
- **SignupScreen**: User registration with validation

## 🛠️ Development

### Scripts
```bash
npm run start:dev     # Start with dev client
npm run test          # Run Jest tests
npm run test:watch    # Run tests in watch mode
npm run lint          # Lint TypeScript files
npm run lint:fix      # Fix linting issues
npm run type-check    # TypeScript type checking
npm run clean         # Clear Expo cache
```

### Mock Data
- **Development mode**: Auto-fills login forms for quick testing
- **Mock users**: `test@test.com` / `password` and `user@test.com` / `123456`
- **Mock Socket events**: Simulates server responses for frontend development

### Configuration
- **API_CONFIG**: Backend URLs and timeouts
- **GAME_CONFIG**: Game rules and limits
- **UI_CONFIG**: Theme colors, fonts, and animations
- **DEV_CONFIG**: Development flags and mock settings

## 📱 Features Implemented

✅ **Authentication Flow**
- Login/Signup screens with form validation
- Persistent authentication state
- Korean/English UI text
- Mock authentication for development

✅ **State Management**
- Zustand store with TypeScript
- Modular slices for different app areas
- Persistent storage middleware
- Mock data and API simulation

✅ **UI Component Library**
- Reusable styled components
- Consistent design system
- Loading and error states
- Form validation components

✅ **Socket.IO Integration**
- Real-time communication setup
- Auto-reconnection logic
- Event handling for game phases
- Mock server events for development

✅ **Development Environment**
- TypeScript configuration
- ESLint rules and formatting
- Jest testing setup
- Hot reloading and debugging

## 🔧 Known Issues

⚠️ **Type Errors** (Development only):
- React Navigation types need installation: `npm install @react-navigation/native @react-navigation/stack`
- Jest types missing: `npm install --save-dev @types/jest`
- Some Button component styling conflicts (non-blocking)

⚠️ **Dependencies Missing**:
Run `npm install` to install all required packages from updated package.json

## 🎯 Next Steps

1. **Install missing dependencies** to resolve import errors
2. **Connect to real backend** when available
3. **Implement game screens** (Lobby, Voting, Board Creation, Game, Result)
4. **Add unit tests** for components and store slices
5. **UI/UX polish** with animations and responsive design

## 🏆 Gamification (PlayFab)

This app integrates PlayFab as a backend for gamification (leaderboards, player stats, achievements). UI is implemented with custom React Native screens for full cross‑platform control.

### Setup

1. Create a PlayFab Title and note your `TitleId`.
2. Expose it to the app via Expo env:

```
EXPO_PUBLIC_PLAYFAB_TITLE_ID=<YOUR_TITLE_ID>
```

3. On login, the app automatically attempts a PlayFab login using the Supabase `user.id` as a `CustomId`.

### Files

- Service: `src/services/playfab.ts` (client‑side reads; use backend for sensitive writes)
- Config: `PLAYFAB_CONFIG` in `src/constants/config.ts`
- Screens:
  - `src/screens/gamification/LeaderboardsScreen.tsx`
  - `src/screens/gamification/AchievementsScreen.tsx`
- Navigation: Registered in `App.tsx` and types in `src/types/navigation.ts`

### Navigation

You can navigate programmatically:

```ts
import { navigate } from './src/services/navigation';

navigate('LeaderboardsScreen');
navigate('AchievementsScreen');
```

Or add buttons in `HomeScreen` to open these screens.

### Notes

- For production, perform stat updates and achievement unlocks via your backend using PlayFab Server API or CloudScript for security.
- Client screens perform safe reads (leaderboard, player statistics).

## 📚 Tech Stack

- **React Native** + **Expo** - Cross-platform mobile framework
- **TypeScript** - Type safety and developer experience  
- **Zustand** - Lightweight state management
- **Socket.IO** - Real-time communication
- **React Navigation** - Navigation and routing
- **Hangul-js** - Korean text processing

## 🧪 Testing

The project includes Jest configuration for testing:

```bash
# Run tests
npm test

# Run with coverage
npm run test:coverage

# Watch mode
npm run test:watch
```

Test files should be placed in `src/__tests__/` or use `.test.ts` suffix.

---

**Status**: ✅ Frontend foundation completed with authentication, state management, Socket.IO, and development environment setup.

**Ready for**: Backend integration, game screen implementation, and user testing.
