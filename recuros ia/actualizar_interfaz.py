from pathlib import Path
import re

root = Path(__file__).resolve().parents[1]
android = root / 'app/app/src/main/java/com/example/ruwajay'

path = android / 'ui/theme/Color.kt'
text = path.read_text(encoding='utf-8')
start = text.index('import androidx.compose.runtime.getValue')
end = text.index('// Primary Palette')
text = text[:start] + 'import androidx.compose.ui.graphics.Brush\nimport androidx.compose.ui.graphics.Color\n\n// Paleta permanente en modo claro.\n' + text[end:]
text = re.sub(r'themed\((0x[0-9A-Fa-f]+), 0x[0-9A-Fa-f]+\)', r'Color(\1)', text)
text = text.replace('// Primary Palette — identical to web index.css (@theme) and html.dark overrides', '// Paleta de marca compartida con la web.')
text = text.replace('// Footer (shared light & dark: soft café gradient)', '// Pie de página: gradiente café.')
path.write_text(text, encoding='utf-8')

path = android / 'ui/theme/Theme.kt'
text = path.read_text(encoding='utf-8')
text = text[text.index('@Composable\nfun RuwaJayTheme'):]
start = text.index('    val dark =')
end = text.index('    ) else lightColorScheme(') + len('    ) else ')
text = text[:start] + '    val colorScheme = ' + text[end:]
path.write_text('''package com.example.ruwajay.ui.theme

import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.lightColorScheme
import androidx.compose.runtime.Composable
import androidx.compose.ui.graphics.Color

''' + text, encoding='utf-8')

path = android / 'ui/components/RuwaHeader.kt'
text = path.read_text(encoding='utf-8')
for line in ['import androidx.compose.material.icons.filled.DarkMode\n', 'import androidx.compose.material.icons.filled.LightMode\n', 'import androidx.compose.ui.platform.LocalContext\n', '    val context = LocalContext.current\n', '    val isDark = RuwaThemeState.isDark\n']:
    text = text.replace(line, '')
start = text.index('                // Toggle Modo Claro')
end = text.index('\n            }\n        }', start)
text = text[:start] + text[end:]
path.write_text(text, encoding='utf-8')

path = android / 'ui/screens/ProfileScreen.kt'
text = path.read_text(encoding='utf-8')
start = text.index('                                // 2. Apariencia y Tema')
end = text.index('                                // 3. Privacidad', start)
text = text[:start] + text[end:]
path.write_text(text, encoding='utf-8')

path = root / 'web/src/App.jsx'
text = path.read_text(encoding='utf-8').replace("import { ThemeProvider } from './context/ThemeContext';\n", '')
text = text.replace('    <ThemeProvider>\n', '').replace('    </ThemeProvider>\n', '')
path.write_text(text, encoding='utf-8')

path = root / 'web/src/index.css'
text = path.read_text(encoding='utf-8').replace('html {\n', 'html {\n  color-scheme: light;\n', 1)
path.write_text(text, encoding='utf-8')
for path in (root / 'web/src').rglob('*.jsx'):
    text = path.read_text(encoding='utf-8')
    # Variantes de tema oscuro restantes de Tailwind; no toca colores de marca.
    text = re.sub(r'\bdark:[^\s\x27\x22`]+', '', text)
    path.write_text(text, encoding='utf-8')

print('Paleta clara permanente; retirados los controles de tema y sus variantes.')
