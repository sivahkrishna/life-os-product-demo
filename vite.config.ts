// __aindriya_hmr_off__: HMR forced off by the platform (the preview reloads on file writes
// instead — see file-api.js). Your config is preserved verbatim; only server.hmr/host
// are overridden in the wrapper appended below.
import { fileURLToPath, URL } from "node:url";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// Platform boilerplate. hmr:false is required behind the preview proxy (the platform reloads
// the preview on file writes). "@/..." resolves to src/ here AND in tsconfig.json.
const __aindriyaUserConfig = defineConfig({
  plugins: [react()],
  resolve: { alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) } },
  server: { host: "0.0.0.0", port: 3000, allowedHosts: true, hmr: false },
  preview: { host: "0.0.0.0", port: 3000 },
});

import { mergeConfig as __ahMergeConfig } from 'vite';
export default async (__ahEnv) => { let __c = __aindriyaUserConfig; if (typeof __c === 'function') __c = await __c(__ahEnv); return __ahMergeConfig(__ahMergeConfig(/* __aindriya_alias__ */ { resolve: { alias: { '@': "/workspace/src" } } }, __c || {}), { server: { hmr: false, host: '0.0.0.0' } }); };
