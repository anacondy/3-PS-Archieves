# PS2 Archive Collection

[![Deploy to GitHub Pages](https://github.com/anacondy/3-PS-Archieves/actions/workflows/deploy.yml/badge.svg)](https://github.com/anacondy/3-PS-Archieves/actions/workflows/deploy.yml)

🔗 **Live Demo:** [https://anacondy.github.io/3-PS-Archieves/](https://anacondy.github.io/3-PS-Archieves/)

A React-based PS2 game archive collection featuring immersive audio visualization, real-time system monitoring, and a comprehensive settings panel for customizing game covers.

![Main Grid View](https://github.com/user-attachments/assets/bec03d26-281c-4046-824b-14e0d457459a)

## Features

### 🎮 Archive Wall
- Gapless grid layout mimicking physical DVD cases
- Interactive hover effects with 3D transformations
- PlayStation-style header strips (PS1-PS5, Xbox)
- Dynamic metadata display (title, publisher, rating, serial)

### 🔊 Audio Engine
- Hybrid playback system (procedural synthesis + file-based)
- Web Audio API with real-time frequency analysis
- Smooth fade-in/fade-out transitions
- Support for .mp3 and .wav uploads

### 📊 Real-Time System Stats
- Live memory usage monitoring
- CPU load approximation
- FPS counter with color-coded performance indicators

### ⚙️ Settings Panel (God Mode Editor)
- Access via **F + S** keys (hold 2 seconds)
- Image upload with pan & zoom controls
- Custom text overlays with 9 font options
- Header style selector (PS1-PS5, Xbox, None)
- Audio timeline editor with loop controls
- Edit existing entries or create new ones

### 💾 Data Persistence
- Automatic localStorage saving for local sessions
- **Cross-device synchronization** via Firebase (optional)
- Each game cover has a unique session ID with timestamp and metadata
- Metadata preserved across sessions (images, audio, fonts, descriptions)
- Edit mode retrieves all saved data

### ☁️ Cross-Device Sync (Firebase)
- Real-time synchronization across multiple devices and browsers
- Automatic offline support with local fallback
- Unique session IDs for each game cover entry
- Stores images, music, timestamps, and all metadata

### 📱 Mobile Optimization
- Responsive grid (2-5 columns based on screen size)
- Touch-optimized targets (44px minimum)
- Safe area inset support
- GPU-accelerated animations
- 60fps performance target

## Screenshots

### Game Detail Modal
![Game Detail](https://github.com/user-attachments/assets/8d3d0865-41c7-4aff-9ffa-a2477e583a0e)

## Installation

```bash
# Clone the repository
git clone https://github.com/anacondy/3-PS-Archieves.git
cd 3-PS-Archieves

# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build
```

## Keyboard Shortcuts

| Keys | Action |
|------|--------|
| **F + S** (hold 2s) | Open Settings Panel |
| **C + O + 2** (hold 2s) | Open System Registry |
| **Escape** | Close any modal |

## Tech Stack

- **React 19** - UI Framework
- **Vite** - Build Tool
- **Tailwind CSS 3** - Styling
- **Lucide React** - Icons
- **Web Audio API** - Audio Engine
- **Firebase** - Cross-device data synchronization (optional)

## Firebase Setup (For Cross-Device Sync)

To enable data synchronization across different devices and browsers:

### 1. Create a Firebase Project
1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Click "Create a project" and follow the wizard
3. Once created, go to Project Settings > General

### 2. Add a Web App
1. In Project Settings, scroll to "Your apps" section
2. Click the web icon (</>) to add a web app
3. Give it a name and register the app
4. Copy the `firebaseConfig` object values

### 3. Enable Firestore Database
1. In Firebase Console, go to Build > Firestore Database
2. Click "Create database"
3. Choose production mode or test mode
4. Select a location closest to your users

### 4. Set Security Rules (for public access)
In Firestore > Rules, set:
```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /{document=**} {
      allow read, write: if true;
    }
  }
}
```

> ⚠️ **SECURITY WARNING:** 
> 
> The rules above allow **PUBLIC read and write access** to all data. This is appropriate for:
> - Public game archives where anyone can view and contribute
> - Development and testing environments
> - Shared collections where data is non-sensitive
> 
> **For private or sensitive data**, implement Firebase Authentication:
> - [Firebase Auth Documentation](https://firebase.google.com/docs/auth)
> - [Firestore Security Rules Guide](https://firebase.google.com/docs/firestore/security/get-started)

### 5. Configure Environment Variables
Create a `.env` file in the project root:
```bash
VITE_FIREBASE_API_KEY=your_api_key
VITE_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your_project_id
VITE_FIREBASE_STORAGE_BUCKET=your_project.firebasestorage.app
VITE_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
VITE_FIREBASE_APP_ID=your_app_id
```

### 6. Deploy with Environment Variables
For GitHub Pages, add these as repository secrets and update the workflow, or use a hosting platform that supports environment variables.

## Browser Support

- Chrome/Edge (Full support including memory API)
- Firefox (Memory display uses device memory estimate)
- Safari (Memory display uses device memory estimate)

## License

MIT License - See [LICENSE](LICENSE) for details.

## Author

**Anacondy** - November 2025