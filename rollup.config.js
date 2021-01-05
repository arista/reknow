import typescript from "rollup-plugin-typescript2"
import pkg from "./package.json"

const extensions = [".js", ".jsx", ".ts", ".tsx"]
const input = "src/index.ts"

const plugins = [
  typescript({
    typescript: require('typescript'),
    clean: true
  }),
]

export default [
  {
    input,
    output: {
      file: pkg.module,
      format: "esm",
      sourcemap: false,
    },
    plugins,
  },
  {
    input,
    output: {
      file: pkg.main,
      format: "cjs",
      sourcemap: false,
    },
    plugins,
  },
]
