import { terser } from "rollup-plugin-terser";

export default {
  input: "src/nward.js",
  output: {
    format: "es",
    file: "dist/nward.esm.min.js",
    sourcemap: true
  },
  plugins: [
    terser()
  ]
};
