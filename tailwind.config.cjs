/** @type {import('tailwindcss').Config} */
module.exports = {
    content: [
        './index.html',
        './*.{ts,tsx}',
        './components/**/*.{ts,tsx}',
        './services/**/*.{ts,tsx}',
        './utils/**/*.{ts,tsx}',
    ],
    theme: {
        extend: {
            colors: {
                primary: "#7C1D36",
                "background-light": "#F9FAFB",
                "background-dark": "#111827",
                gob: {
                    guinda: '#691C32', // Primary
                    'guinda-dark': '#541628',
                    gold: '#BC955C',   // Secondary
                    text: '#1F2937',   // Gray-800
                    light: '#F9FAFB',  // Gray-50
                }
            },
            fontFamily: {
                sans: ['Inter', 'sans-serif'],
            }
        },
    },
    plugins: [],
};
