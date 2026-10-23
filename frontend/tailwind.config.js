/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        // Shopery Organic theme palette
        shopery: {
          green: '#00B207',       // Main Shopery Green
          greenDark: '#008A05',   // Hover / Darker
          greenLight: '#EAF8E7',  // Soft tint background
          greenPale: '#EDF2EE',   // Subtle border / background
          greenText: '#2C742F',   // Accent text
          heading: '#1A1A1A',     // Deep charcoal heading
          body: '#4D4D4D',        // Body text
          muted: '#808080',       // Muted gray
          border: '#E6E6E6',      // Light border
          cardBg: '#FFFFFF',      // Card white
          accent: '#FF8A00',      // Warm orange badge (Hot deal / Urgent)
          danger: '#EA4B48',      // Critical / Red
          blue: '#2C742F',        // Deep forest
        },
        brand: {
          50: '#f0fdf4',
          100: '#dcfce7',
          200: '#bbf7d0',
          500: '#00B207',
          600: '#008A05',
          700: '#15803d',
          800: '#166534',
          900: '#14532d',
        },
        civic: {
          dark: '#0B0F19',
          card: '#FFFFFF',
          border: '#E6E6E6',
          hover: '#F2F7F2',
          accent: '#00B207',
          urgent: '#EA4B48',
          warning: '#FF8A00',
          success: '#00B207',
          slate: '#666666',
        }
      },
      fontFamily: {
        sans: ['Poppins', 'Inter', 'system-ui', '-apple-system', 'sans-serif'],
      },
      boxShadow: {
        'shopery': '0 8px 24px rgba(0, 178, 7, 0.08)',
        'shopery-card': '0 2px 8px rgba(0, 0, 0, 0.04)',
        'shopery-hover': '0 12px 28px rgba(0, 178, 7, 0.12)',
      }
    },
  },
  plugins: [],
}
