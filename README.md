# PS2 Archive Collection

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
- Automatic localStorage saving
- Metadata preserved across sessions (images, audio, fonts, descriptions)
- Edit mode retrieves all saved data

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

## Browser Support

- Chrome/Edge (Full support including memory API)
- Firefox (Memory display uses device memory estimate)
- Safari (Memory display uses device memory estimate)

## License

MIT License - See [LICENSE](LICENSE) for details.

## Author

**Anacondy** - November 2025