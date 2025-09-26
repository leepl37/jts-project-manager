# Deploy to Cloudflare Pages

## Prerequisites
- GitHub account
- Cloudflare account (free)

## Steps

### 1. Push to GitHub
```bash
# Initialize git (if not already done)
git init
git add .
git commit -m "Initial commit"

# Create repository on GitHub, then:
git remote add origin https://github.com/yourusername/jts-project-manager.git
git push -u origin main
```

### 2. Deploy to Cloudflare Pages
1. Go to [Cloudflare Pages](https://pages.cloudflare.com/)
2. Click "Connect to Git"
3. Select your GitHub repository
4. Configure build settings:
   - **Framework preset**: Create React App
   - **Build command**: `npm run build`
   - **Build output directory**: `build`
   - **Root directory**: `/` (leave empty)

### 3. Set Environment Variables
In Cloudflare Pages dashboard:
1. Go to your project → Settings → Environment Variables
2. Add these variables:
   ```
   REACT_APP_FIREBASE_API_KEY=AIzaSyDgJ7Asl02Uxp_CIx9Hutyq26Vyx2L_ESs
   REACT_APP_FIREBASE_AUTH_DOMAIN=jts-project-manager.firebaseapp.com
   REACT_APP_FIREBASE_PROJECT_ID=jts-project-manager
   REACT_APP_FIREBASE_STORAGE_BUCKET=jts-project-manager.firebasestorage.app
   REACT_APP_FIREBASE_MESSAGING_SENDER_ID=266438273855
   REACT_APP_FIREBASE_APP_ID=1:266438273855:web:41c6ac44644bc5b49fc18a
   REACT_APP_GEMINI_API_KEY=your_gemini_api_key_here
   REACT_APP_APP_ID=default-app-id
   ```

### 4. Deploy
- Click "Save and Deploy"
- Your app will be available at: `https://your-project-name.pages.dev`

## Benefits
- ✅ **Fastest global performance**
- ✅ **Unlimited bandwidth**
- ✅ **Automatic deployments**
- ✅ **Free custom domain**
- ✅ **Free SSL certificate**
