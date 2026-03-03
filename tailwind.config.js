/** @type {import('tailwindcss').Config} */
module.exports = {
    content: ["./app/**/*.{js,jsx,ts,tsx}", "./components/**/*.{js,jsx,ts,tsx}"],
    presets: [require("nativewind/preset")],
    theme: {
        extend: {
            colors: {
                primary: '#4F46E5',  // Indigo
                accent: '#10B981',   // Emerald
                warning: '#F59E0B',  // Amber
                danger: '#EF4444',   // Rose
            }
        },
    },
    plugins: [],
};
