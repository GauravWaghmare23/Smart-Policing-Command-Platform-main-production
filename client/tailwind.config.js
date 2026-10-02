/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],

  theme: {
    extend: {
      // ============================================================
      // COLORS
      // ============================================================
      // ============================================================
      // COLORS
      // ============================================================
      colors: {
        // Primary Blue
        primary: {
          50: "#EFF6FF",
          100: "#DBEAFE",
          200: "#BFDBFE",
          300: "#93C5FD",
          400: "#60A5FA",
          500: "#3B82F6",
          600: "#2563EB",
          700: "#1D4ED8",
          800: "#1E40AF",
          900: "#1E3A8A",
        },

        // Light UI Surface
        surface: {
          50: "#F8FAFC",
          100: "#F1F5F9",
          200: "#E2E8F0",
          300: "#CBD5E1",
          400: "#94A3B8",
          500: "#64748B",
          600: "#475569",
          700: "#334155",
          800: "#1E293B",
          900: "#0F172A",
        },

        // Danger / Emergency
        danger: {
          50: "#FEF2F2",
          100: "#FEE2E2",
          200: "#FECACA",
          300: "#FCA5A5",
          400: "#F87171",
          500: "#EF4444",
          600: "#DC2626",
          700: "#B91C1C",
          800: "#991B1B",
          900: "#7F1D1D",
        },

        // Warning
        warning: {
          50: "#FFFBEB",
          100: "#FEF3C7",
          200: "#FDE68A",
          300: "#FCD34D",
          400: "#FBBF24",
          500: "#F59E0B",
          600: "#D97706",
          700: "#B45309",
          800: "#92400E",
          900: "#78350F",
        },

        // Success
        success: {
          50: "#F0FDF4",
          100: "#DCFCE7",
          200: "#BBF7D0",
          300: "#86EFAC",
          400: "#4ADE80",
          500: "#22C55E",
          600: "#16A34A",
          700: "#15803D",
          800: "#166534",
          900: "#14532D",
        },

        "primary-navy": "#123B7A",
        "primary-blue": "#2563C7",
        "light-blue": "#EAF2FF",
        "background": "#F8FAFC",
        "text-primary": "#172033",
        "text-muted": "#64748B",
        "border": "#D9E2EF",
        "success-color": "#2E8B57",
        "warning-color": "#D89D1D",
        "danger-color": "#D92D20",

        // Existing/legacy police colors (deprecated)
        police: {
          dark: "#0F172A",
          navy: "#1E293B",
          accent: "#2563EB",
          danger: "#DC2626",
          warning: "#F59E0B",
          success: "#10B981",
        },
      },
      // ============================================================
      // TYPOGRAPHY
      // ============================================================
      fontFamily: {
        sans: [
          "Inter",
          "system-ui",
          "-apple-system",
          "BlinkMacSystemFont",
          "Segoe UI",
          "sans-serif",
        ],

        mono: [
          "JetBrains Mono",
          "Fira Code",
          "monospace",
        ],
      },

      // ============================================================
      // BORDER RADIUS
      // ============================================================
      borderRadius: {
        xl: "12px",
        "2xl": "16px",
        "3xl": "24px",
      },

      // ============================================================
      // SHADOWS
      // ============================================================
      boxShadow: {
        card:
          "0 1px 3px 0 rgba(0, 0, 0, 0.06), 0 1px 2px -1px rgba(0, 0, 0, 0.06)",

        "card-md":
          "0 4px 6px -1px rgba(0, 0, 0, 0.07), 0 2px 4px -2px rgba(0, 0, 0, 0.07)",

        "card-lg":
          "0 10px 15px -3px rgba(0, 0, 0, 0.08), 0 4px 6px -4px rgba(0, 0, 0, 0.08)",

        modal:
          "0 25px 50px -12px rgba(0, 0, 0, 0.18)",

        blue:
          "0 4px 14px 0 rgba(37, 99, 235, 0.25)",
      },

      // ============================================================
      // ANIMATIONS
      // ============================================================
      animation: {
        "fade-in": "fadeIn 0.2s ease-out",
        "slide-up": "slideUp 0.25s ease-out",
        "pulse-soft": "pulseSoft 2s ease-in-out infinite",
      },

      // ============================================================
      // KEYFRAMES
      // ============================================================
      keyframes: {
        fadeIn: {
          "0%": {
            opacity: "0",
          },
          "100%": {
            opacity: "1",
          },
        },

        slideUp: {
          "0%": {
            opacity: "0",
            transform: "translateY(8px)",
          },
          "100%": {
            opacity: "1",
            transform: "translateY(0)",
          },
        },

        pulseSoft: {
          "0%, 100%": {
            opacity: "1",
          },
          "50%": {
            opacity: "0.6",
          },
        },
      },
    },
  },

  plugins: [],
};