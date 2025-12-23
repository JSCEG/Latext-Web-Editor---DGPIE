/** @type {import('tailwindcss').Config} */
module.exports = {
    content: [
        './index.html',
        './**/*.{ts,tsx}',
    ],
    theme: {
        extend: {
            colors: {
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
