<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

# Run and deploy your AI Studio app

This contains everything you need to run your app locally.

View your app in AI Studio: https://ai.studio/apps/drive/1BvLwYeIsqfbWvKOnC89uT_eulU430ZeA

## Run Locally

**Prerequisites:**  Node.js


1. Install dependencies:
   `npm install`
2. Set up Environment Variables:
   - Copy `.env.example` to `.env` or `.env.local`
   - Set `GEMINI_API_KEY` to your Gemini API key
   - Set `VITE_GOOGLE_CLIENT_ID` to your Google OAuth 2.0 Client ID
3. Run the app:
   `npm run dev`

## Google Authentication Setup

To use Google Sign-In:
1. Go to [Google Cloud Console](https://console.cloud.google.com/).
2. Create a new project or select an existing one.
3. Enable **Google Sheets API**.
4. Configure **OAuth Consent Screen** (User Type: External or Internal).
5. Create **OAuth Client ID** (Application type: Web application).
   - **Authorized JavaScript origins**: `http://localhost:5173` (or your production URL)
   - **Authorized redirect URIs**: `http://localhost:5173`
6. Copy the Client ID and paste it into `.env.local` as `VITE_GOOGLE_CLIENT_ID`.
