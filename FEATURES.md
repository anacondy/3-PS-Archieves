# PS2 Archive Collection - Feature Documentation

## Version: 3.2.0 (STABLE)
**Last Updated:** November 2025

---

## 1. Core Architecture

| Component | Technology |
|-----------|------------|
| Framework | React 19 (Functional Components + Hooks) |
| Styling | Tailwind CSS 3 (Utility-first) |
| Build Tool | Vite 7 |
| Icons | Lucide React |
| Audio | Web Audio API |
| Cloud Sync | Firebase Firestore (optional) |

---

## 2. Real-Time System Monitoring

### Live Stats Display
- **Memory:** Uses `performance.memory` API (Chrome) or `navigator.deviceMemory` (fallback)
- **CPU:** Approximated from FPS deviation (target: 60fps)
- **FPS:** Calculated via `requestAnimationFrame` every 500ms

---

## 3. Data Persistence

### Hybrid Storage System
The application uses a hybrid approach for maximum reliability:

#### Local Storage (Always Active)
- `ps2-archive-games` - Complete game list with metadata
- `ps2-archive-tracks` - Custom uploaded audio tracks
- Preserves: images (Base64), audio configs, fonts, descriptions
- Works offline and provides instant access

#### Firebase Firestore (Optional - Cross-Device Sync)
- Real-time synchronization across all devices
- Unique session IDs for each game cover
- Automatic conflict resolution
- Offline persistence with sync on reconnect

### Session ID Format
Each game cover entry gets a unique identifier:
```
SESSION-{timestamp}-{random4chars}-{random4chars}
```
Example: `SESSION-1701234567890-A1B2-C3D4`

### Metadata Structure
```javascript
{
  sessionId: "SESSION-...",
  createdAt: 1701234567890,
  updatedAt: 1701234567890,
  metadata: {
    hasCustomImage: true,
    hasAudioTrack: true,
    imageSize: 123456,
    timestamp: "2025-11-30T12:00:00.000Z"
  }
}
```

---

## 4. Settings Panel (God Mode Editor)

- **Access:** Hold `F + S` for 2 seconds
- **Features:** Image upload, text overlays, 9 fonts, header styles (PS1-PS5, Xbox)
- **Edit Mode:** Loads all saved metadata when editing existing entries

---

## 5. Audio Engine (v8)

- Hybrid playback (procedural + file-based)
- Smooth fade transitions
- Audio reactivity driving UI effects

---

## 6. Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| `F + S` (hold 2s) | Open Settings Panel |
| `C + O + 2` (hold 2s) | Open System Registry |
| `Escape` | Close any modal |
