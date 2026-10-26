from pathlib import Path
import json

root = Path(__file__).resolve().parent.parent

def replace(relative, pairs):
    path = root / relative
    text = path.read_text(encoding='utf-8-sig')
    for old, new in pairs:
        if old not in text:
            raise ValueError(f'No se encontro {old!r} en {relative}')
        text = text.replace(old, new)
    path.write_text(text, encoding='utf-8')

for path in (root / 'web/tests').rglob('*.js'):
    text = path.read_text(encoding='utf-8')
    text = text.replace("'../functions/", "'../../archivos varios/servicios/functions/")
    text = text.replace("'../supabase/", "'../../archivos varios/servicios/supabase/")
    text = text.replace("readFile('firestore.rules',", "readFile(new URL('../../archivos varios/servicios/firestore.rules', import.meta.url),")
    text = text.replace("readFile('storage.rules',", "readFile(new URL('../../archivos varios/servicios/storage.rules', import.meta.url),")
    path.write_text(text, encoding='utf-8')

replace('archivos varios/servicios/functions/scripts/migrate-data.js', [
    ("'../../src/lib/contracts.js'", "'../../../../web/src/lib/contracts.js'"),
    ('--backup .artifacts/backup.json', '--backup "../../../recuros ia/respaldos/backup.json"'),
])
replace('archivos varios/servicios/firebase.json', [('"public": "dist"', '"public": "../../web/dist"')])
replace('web/scripts/run-emulators.mjs', [
    ("'emulators:exec','--only'", "'emulators:exec','--config',resolve('../archivos varios/servicios/firebase.json'),'--only'"),
])
for config in ['web/playwright.config.js', 'web/playwright.public.config.js']:
    replace(config, [(".artifacts/", "../recuros ia/pruebas/")])
replace('web/vite.config.js', [("['**/android-app/**', '**/*.exe', '**/cloudflared*']", "['**/node_modules/**']")])

path = root / 'web/package.json'
package = json.loads(path.read_text(encoding='utf-8'))
package['scripts']['dev'] = 'vite'
del package['scripts']['dev:backend']  # El backend Python ya no existe en este proyecto.
path.write_text(json.dumps(package, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')

replace('.gitignore', [
    ('android-app/', 'app/'),
    ('supabase/.temp/', 'archivos varios/servicios/supabase/.temp/'),
    ('supabase/.branches/', 'archivos varios/servicios/supabase/.branches/'),
])
with (root / '.gitignore').open('a', encoding='utf-8') as file:
    file.write('\n# Resultados locales de analisis y validacion\n/recuros ia/validacion/\n/recuros ia/pruebas/\n/recuros ia/respaldos/\n/app/distribucion/*.apk\n')

replace('.github/workflows/deploy-vps.yml', [
    ("      - 'src/**'\n      - 'public/**'\n      - 'tests/**'\n      - 'functions/**'\n      - 'supabase/functions/_shared/**'\n      - 'scripts/deploy-iis.ps1'\n      - 'index.html'\n      - 'package*.json'\n      - 'vite.config.js'", "      - 'web/**'\n      - 'archivos varios/servicios/**'"),
    ('    env:\n      VITE_SUPABASE_URL:', '    defaults:\n      run:\n        working-directory: web\n    env:\n      VITE_SUPABASE_URL:'),
    ('          cache: npm', '          cache: npm\n          cache-dependency-path: web/package-lock.json'),
    ('          path: release/', '          path: web/release/'),
])

replace('archivos varios/herramientas/generar_docs.py', [
    ('import os', 'import os\nfrom pathlib import Path'),
    ('output_filename = "Documentacion_Tecnica_RuwaJay_Ingenieria.docx"', 'output_dir = Path(__file__).resolve().parents[2] / "recuros ia" / "documentos"\n    output_dir.mkdir(parents=True, exist_ok=True)\n    output_filename = output_dir / "Documentacion_Tecnica_RuwaJay_Ingenieria.docx"'),
])

replace('archivos varios/documentacion/README.md', [
    ('(docs/DESPLIEGUE-VPS-WINDOWS.md)', '(../../recuros%20ia/ORGANIZACION.txt)'),
    ('(docs/INTEGRACION.md)', '(../../recuros%20ia/ORGANIZACION.txt)'),
    ('android-app', 'app'),
    ('Copiar .env.example a .env.local', 'Desde `web/`, copiar .env.example a .env.local'),
])
print('Rutas de web, pruebas, Firebase, migraciones, documentos y CI actualizadas.')
