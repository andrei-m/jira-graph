import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
	plugins: [react()],
	server: {
		proxy: {
			'/api': {
				target: 'http://localhost:8080'
			}
		}
	},
    build: {
      minify: false,
      commonjsOptions: {
        dynamicRequireTargets: [
          'node_modules/graphlib/lib/alg/*.js',
          'node_modules/graphlib/lib/data/*.js',
          'node_modules/graphlib/lib/*.js',
          'node_modules/graphlib/*.js'
        ]
      }
    }
})
