import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { resolve } from "path";

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  build: {
    rollupOptions: {
      input: {
        main: resolve(__dirname, "index.html"),
        myryk: resolve(__dirname, "myryk/index.html"),
        register: resolve(__dirname, "register/index.html"),
      },
    },
  },
});
