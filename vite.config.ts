import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react-swc'

export default defineConfig({
  base: '/dino_game_ts/',
  plugins: [react()],
  server: {
    port: 3001,
  },
});
