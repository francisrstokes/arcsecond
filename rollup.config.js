import commonjs from '@rollup/plugin-commonjs';

export default {
  input: './dist/index.js',
  output: {
      file: 'bundle.js',
      format: 'cjs'
  },
  plugins: [commonjs()]
};