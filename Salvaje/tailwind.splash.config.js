/**
 * Config independiente para la landing estática /splash.
 * Genera public/splash/tailwind.css (auto-hospedado) para no depender del
 * CDN de Tailwind, que al caerse dejaba la página sin estilos.
 *
 * Regenerar tras editar public/splash/index.html:
 *   npx tailwindcss -c tailwind.splash.config.js -i tailwind.splash.input.css -o public/splash/tailwind.css --minify
 */
module.exports = {
  content: ['./public/splash/index.html'],
  theme: {
    extend: {
      colors: {
        salvaje: {
          brown: '#2C1810', cream: '#F5ECD7', dark: '#1A0F0A',
          orange: '#D4521A', fire: '#E8732A', gold: '#C9A227',
          success: '#2D7A4F', danger: '#8B1A1A', gray: '#6B5C52',
          light: '#FAF6F0', 'light-alt': '#F0E8D8',
          aqua: '#12B5C9', 'aqua-deep': '#0E7C8B', 'aqua-light': '#7FE3EF',
        },
      },
      fontFamily: {
        display: ['"Bebas Neue"', 'sans-serif'],
        body: ['"DM Sans"', 'sans-serif'],
      },
    },
  },
}
