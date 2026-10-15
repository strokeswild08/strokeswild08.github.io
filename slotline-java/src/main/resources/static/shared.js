'use strict';
window.Slotline = (() => {
  let csrf;
  const money = n => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(n);
  const escape = v => String(v ?? '').replace(/[&<>"']/g, x => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[x]));
  const date = d => new Date(d + 'T12:00:00').toLocaleDateString('en-US', {month:'short', day:'numeric', year:'numeric'});
  const statusLabel = s => ({REQUESTED:'Requested',CONFIRMED:'Confirmed',IN_PROGRESS:'In progress',COMPLETED:'Completed',CANCELLED:'Cancelled'}[s] || s);
  const badge = s => `<span class="badge badge-${escape(s.toLowerCase())}"><span></span>${escape(statusLabel(s))}</span>`;
  async function token() {
    const response = await fetch('/api/csrf', { credentials:'same-origin', cache:'no-store' });
    if (!response.ok) throw new Error('Unable to start a secure session. Please refresh.');
    csrf = await response.json();
  }
  async function api(path, options={}) {
    const method=options.method || 'GET';
    const headers = { ...options.headers };
    if (!['GET','HEAD'].includes(method)) {
      if (!csrf) await token();
      headers[csrf.headerName]=csrf.token;
    }
    let body=options.body;
    if (body && !(body instanceof URLSearchParams)) { headers['Content-Type']='application/json';body=JSON.stringify(body); }
    const response = await fetch('/api'+path, { ...options,method,headers,body,credentials:'same-origin',cache:'no-store' });
    const data = response.status===204 ? null : await response.json().catch(()=>null);
    if (!response.ok) {
      const error=new Error(data?.message || 'The request could not be completed.');
      error.status=response.status;error.details=data?.errors;throw error;
    }
    return data;
  }
  const notice=(element,message) => { element.textContent=message || '';element.classList.toggle('hidden',!message); };
  const paths={window:'M3 4h18v16H3z M3 9h18 M7 6.5h.1 M10 6.5h.1',game:'M7 8h10l4 10-3 2-4-4h-4l-4 4-3-2z M8 10v5 M5.5 12.5h5 M16 11h.1 M18 14h.1',link:'M10 13a5 5 0 0 0 7 0l3-3a5 5 0 0 0-7-7l-2 2 M14 11a5 5 0 0 0-7 0l-3 3a5 5 0 0 0 7 7l2-2',bolt:'M13 2 4 14h7l-1 8 10-13h-7z'};
  const icon=n => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="${paths[n] || paths.window}"/></svg>`;
  const timeline=b => `<ol class="timeline">${b.events.map(e=>`<li><span class="timeline-dot"></span><strong>${escape(statusLabel(e.status))}</strong><small>${escape(new Date(e.createdAt).toLocaleString())}</small></li>`).join('')}</ol>`;
  return { api,token,money,escape,date,badge,statusLabel,notice,icon,timeline };
})();
