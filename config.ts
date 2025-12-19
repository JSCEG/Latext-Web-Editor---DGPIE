export const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID || "116829183648-ac95ljolkbo7622u6894rb5nj8e8s07r.apps.googleusercontent.com";
export const API_URL = import.meta.env.DEV ? "http://localhost:3003" : "https://latext-web-editor-dgpie.onrender.com";
export const GOOGLE_SCOPES = [
    'https://www.googleapis.com/auth/spreadsheets',
    'https://www.googleapis.com/auth/drive.readonly'
].join(' ');
