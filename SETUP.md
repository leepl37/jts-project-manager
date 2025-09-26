# JTS Project Manager Setup Instructions

## Prerequisites
- Node.js (version 14 or higher)
- npm or yarn
- Firebase project
- Google Gemini API key

## Setup Steps

### 1. Install Dependencies
```bash
npm install
```

### 2. Configure Firebase
1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Create a new project or use existing one
3. Enable Firestore Database
4. Enable Authentication (Anonymous sign-in)
5. Get your Firebase config from Project Settings > General > Your apps

### 3. Configure Environment Variables
Create a `.env.local` file in the root directory:

```env
REACT_APP_FIREBASE_API_KEY=your_firebase_api_key
REACT_APP_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
REACT_APP_FIREBASE_PROJECT_ID=your_project_id
REACT_APP_FIREBASE_STORAGE_BUCKET=your_project.appspot.com
REACT_APP_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
REACT_APP_FIREBASE_APP_ID=your_app_id
REACT_APP_GEMINI_API_KEY=your_gemini_api_key
REACT_APP_APP_ID=default-app-id
```

### 4. Get Gemini API Key
1. Go to [Google AI Studio](https://makersuite.google.com/app/apikey)
2. Create a new API key
3. Add it to your `.env.local` file

### 5. Run the Application
```bash
npm start
```

The app will open at `http://localhost:3000`

## Features
- ✅ Project management with password protection
- ✅ Financial transaction tracking (income/expenses)
- ✅ AI-powered receipt scanning
- ✅ Daily activity reports
- ✅ Real-time data synchronization
- ✅ Mobile-responsive design

## Troubleshooting
- Make sure all environment variables are set correctly
- Check Firebase console for any authentication issues
- Ensure Gemini API key has proper permissions
- Check browser console for any error messages
