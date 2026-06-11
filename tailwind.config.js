module.exports = {
  content: ["./index.html", "./renderer/**/*.{js,jsx}"],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        vault: {
          bg: "#111318",
          panel: "#181b22",
          line: "#2a2f3a",
          text: "#eef1f5",
          muted: "#9aa3b2",
          accent: "#7c8cff",
          input: "#101219"
        }
      },
      boxShadow: {
        glow: "0 18px 60px rgba(0, 0, 0, 0.35)"
      }
    }
  },
  plugins: []
};
