import { ESLint } from './herramientas/node_modules/eslint/lib/api.js';
import hooks from './herramientas/node_modules/eslint-plugin-react-hooks/index.js';
import { fileURLToPath } from 'node:url';
import { resolve, dirname } from 'node:path';
import { writeFile } from 'node:fs/promises';

const here = dirname(fileURLToPath(import.meta.url));
const web = resolve(here, '../../web');
const eslint = new ESLint({
  cwd: web,
  overrideConfigFile: true,
  overrideConfig: [{
    files: ['**/*.{js,jsx}'],
    languageOptions: { ecmaVersion: 'latest', sourceType: 'module', parserOptions: { ecmaFeatures: { jsx: true } } },
    plugins: { 'react-hooks': hooks },
    rules: { 'react-hooks/rules-of-hooks': 'error', 'react-hooks/exhaustive-deps': 'warn' },
  }],
});
const results = await eslint.lintFiles(['src/**/*.{js,jsx}']);
await writeFile(resolve(here, 'auditoria-hooks.json'), JSON.stringify(results, null, 2));
const errors = results.flatMap(file => file.messages.filter(message => message.severity === 2).map(message => ({ file: file.filePath, ...message })));
const warnings = results.reduce((sum, file) => sum + file.warningCount, 0);
console.log(JSON.stringify({ archivos: results.length, errores: errors.length, advertenciasDependencias: warnings }));
for (const error of errors) console.log(`${error.file}:${error.line} ${error.message}`);
if (errors.length) process.exitCode = 1;
