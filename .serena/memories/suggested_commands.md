# Essential Development Commands

## Core Development Commands
```bash
npm run dev          # Start development server with Turbopack on port 3000
npm run build        # Build for production
npm run start        # Start production server
npm run lint         # Run ESLint
npm run test         # No tests configured (echo placeholder)
```

## Windows System Commands
```cmd
dir                  # List directory contents
cd <path>           # Change directory
netstat -ano | findstr :3000  # Check port usage
taskkill /F /T /PID <pid>      # Kill process
```

## Git Commands
```bash
git status
git add .
git commit -m "message"
git push origin main
```

## Firebase Commands
```bash
firebase emulators:start --only firestore  # Start Firestore emulator (port 8080)
firebase deploy                            # Deploy to Firebase
```

## Project Structure Key Paths
- `src/app/` - Next.js App Router pages
- `src/components/` - Reusable React components
- `src/lib/` - Utilities and API functions
- `src/types/` - TypeScript type definitions