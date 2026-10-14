// Tailwind CSS v4 is wired through PostCSS. This is the Webpack-compatible
// setup (the project runs `next dev/build --webpack` because the FAT32 volume
// it lives on does not support the junctions Turbopack requires).
const config = {
  plugins: {
    "@tailwindcss/postcss": {},
  },
};

export default config;
