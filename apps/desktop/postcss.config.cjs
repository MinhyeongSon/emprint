const path = require('path')

module.exports = {
  plugins: {
    tailwindcss: {
      // Use an absolute path so tailwindcss resolves the config correctly
      // regardless of the working directory the build is invoked from (e.g.
      // the repo root in CI vs. apps/desktop locally).
      config: path.resolve(__dirname, './tailwind.config.ts')
    },
    autoprefixer: {}
  }
}
