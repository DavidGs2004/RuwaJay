from pathlib import Path
import hashlib
import json

root = Path(__file__).resolve().parent.parent
inventory = json.loads((root / 'recuros ia/inventario-original.json').read_text(encoding='utf-8-sig'))
web = {'src', 'public', 'scripts', 'tests', 'package.json', 'package-lock.json', 'vite.config.js', 'tsconfig.json', 'index.html', '.env.example', 'Dockerfile', 'nginx.conf', 'playwright.config.js', 'playwright.public.config.js'}
services = {'functions', 'supabase', 'firebase.json', '.firebaserc', 'firestore.rules', 'firestore.indexes.json', 'storage.rules'}
removed = {'cloudflared.exe', 'src/main.ts', 'src/counter.ts', 'src/style.css', 'src/assets/hero.png', 'src/assets/typescript.svg', 'src/assets/vite.svg', 'scripts/dev.mjs'}
expected_changes = {'.gitignore', '.github/workflows/deploy-vps.yml', 'firebase.json', 'functions/scripts/migrate-data.js', 'generar_docs.py', 'README.md', 'vite.config.js', 'package.json', 'scripts/run-emulators.mjs', 'playwright.config.js', 'playwright.public.config.js', 'tests/contracts.test.js', 'tests/backend.unit.test.js', 'tests/supabase.backend.test.js', 'tests/storage.rules.test.js', 'tests/integration.test.js', 'tests/firestore.rules.test.js'}
results = []
errors = []
for item in inventory:
    old = item['original']
    first = old.split('/')[0]
    if old in removed:
        results.append({'original': old, 'estado': 'eliminacion autorizada: herramienta sin referencias o plantilla sin uso'})
        continue
    if first == 'android-app':
        new = 'app' + old[len(first):]
    elif first in web:
        new = 'web/' + old
    elif first in services:
        new = 'archivos varios/servicios/' + old
    elif old.endswith('.docx') or old in {'README.md', 'Documentacion_Tecnica_RuwaJay.md'}:
        new = 'archivos varios/documentacion/' + old
    elif old == 'generar_docs.py':
        new = 'archivos varios/herramientas/' + old
    elif old == 'bitacora.txt':
        new = 'recuros ia/historico/' + old
    else:
        new = old
    target = root / new
    if not target.is_file():
        errors.append('Falta ' + new)
        continue
    sha = hashlib.sha256(target.read_bytes()).hexdigest().upper()
    changed = sha != item['sha256']
    if changed and old not in expected_changes:
        errors.append('Cambio inesperado: ' + old)
    results.append({'original': old, 'actual': new, 'sha256': sha, 'estado': 'rutas o configuracion actualizadas' if changed else 'contenido intacto'})
report = {'archivos_inventariados': len(inventory), 'archivos_verificados': len(results), 'errores': errors, 'archivos': results}
(root / 'recuros ia/verificacion.json').write_text(json.dumps(report, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
print(json.dumps({key: value for key, value in report.items() if key != 'archivos'}, ensure_ascii=False))
if errors:
    raise SystemExit(1)
