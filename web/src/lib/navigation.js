export function appPathname(pathname, basePath = '/') {
  const base = basePath.replace(/\/+$/, '');
  const path = pathname.replace(/\/+$/, '') || '/';
  return base && path.startsWith(`${base}/`) ? path.slice(base.length) : path;
}

export function mobileDeepLink(path = '/') {
  const clean = path.replace(/^\/+/, '');
  const [route, search = ''] = clean.split('?');
  const query = new URLSearchParams(search);
  if (route === 'chat' && query.get('conversation')) return `ruwajay://chat/${encodeURIComponent(query.get('conversation'))}`;
  if (route === 'ruta' && query.get('property')) return `ruwajay://ruta/${encodeURIComponent(query.get('property'))}`;
  return `ruwajay://${clean || 'home'}`;
}
