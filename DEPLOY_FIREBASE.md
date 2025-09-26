# Deploy to Firebase Hosting

## Prerequisites
- Firebase CLI installed
- Firebase project set up

## Steps

### 1. Install Firebase CLI
```bash
npm install -g firebase-tools
```

### 2. Login to Firebase
```bash
firebase login
```

### 3. Initialize Firebase in your project
```bash
cd /Users/tony/Desktop/jts_new/jts-project-manager
firebase init
```

**Select these options:**
- ✅ **Hosting: Configure files for Firebase Hosting**
- **Project**: Select `jts-project-manager`
- **Public directory**: `build`
- **Single-page app**: `Yes`
- **Overwrite index.html**: `No`

### 4. Build your React app
```bash
npm run build
```

### 5. Deploy
```bash
firebase deploy
```

Your app will be available at: `https://jts-project-manager.web.app`

## Benefits
- ✅ **Seamless Firebase integration**
- ✅ **Easy authentication setup**
- ✅ **Built-in analytics**
- ✅ **Free SSL certificate**
- ✅ **Custom domain support**
