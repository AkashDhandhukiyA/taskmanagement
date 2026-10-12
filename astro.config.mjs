// @ts-check
import { defineConfig } from 'astro/config';
import cloudflare from '@astrojs/cloudflare';
import tailwindcss from '@tailwindcss/vite';
import react from '@astrojs/react';

// https://astro.build/config
export default defineConfig({
  output: 'server',
  adapter: cloudflare({
    imageService: 'passthrough',
  }),
  session: false,

  vite: {
    plugins: [tailwindcss()],
    optimizeDeps: {
      exclude: [
        'astro:middleware',
        'astro/middleware',
        'react',
        'react-dom',
        'react/jsx-runtime',
        'react/jsx-dev-runtime',
        '@astrojs/react/server.js'
      ]
    },
    ssr: {
      noExternal: [
        'astro:middleware',
        'react',
        'react-dom',
        'react/jsx-runtime',
        'react/jsx-dev-runtime',
        '@astrojs/react/server.js'
      ]
    }
  },

  integrations: [react()]
});