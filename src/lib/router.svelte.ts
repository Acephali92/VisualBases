/** Minimal hash router: #/atlas?kinds=foreign  ·  #/base/ramstein-air-base */
export const route = $state({ path: '/', query: '' });

function read() {
  const h = location.hash.replace(/^#/, '') || '/';
  const [path, query = ''] = h.split('?');
  route.path = path || '/';
  route.query = query;
}

export function initRouter() {
  read();
  addEventListener('hashchange', () => {
    const prev = route.path;
    read();
    if (prev.split('/')[1] !== route.path.split('/')[1]) scrollTo({ top: 0 });
  });
}

export function go(path: string, query = '', replace = false) {
  const url = `#${path}${query ? `?${query}` : ''}`;
  if (replace) { history.replaceState(null, '', url); read(); } else location.hash = url;
}

export const href = (path: string, query = '') => `#${path}${query ? `?${query}` : ''}`;
