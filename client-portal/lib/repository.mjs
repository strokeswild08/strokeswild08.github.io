import { demoState, validateState, uid } from './model.mjs';
export const MAX_FILE = 5 * 1024 * 1024;
export class DemoRepository {
  mode = 'demo';
  async open() {
    this.db = await new Promise((resolve, reject) => {
      const request = indexedDB.open('wild-strokes-studio-desk', 1);
      request.onupgradeneeded = () => { request.result.createObjectStore('workspace'); request.result.createObjectStore('files'); };
      request.onsuccess = () => resolve(request.result); request.onerror = () => reject(new Error('Browser storage is unavailable. Allow storage and reload.'));
    });
    if (!await this.read('workspace', 'state')) await this.write('workspace', 'state', { revision: 1, state: demoState() });
    return this;
  }
  read(store, key) { return new Promise((resolve, reject) => { const request = this.db.transaction(store).objectStore(store).get(key); request.onsuccess = () => resolve(request.result); request.onerror = () => reject(request.error); }); }
  write(store, key, value) { return new Promise((resolve, reject) => { const tx = this.db.transaction(store, 'readwrite'); tx.objectStore(store).put(value, key); tx.oncomplete = resolve; tx.onerror = () => reject(tx.error); }); }
  async session() { return { name: 'Owais', email: 'Demo workspace' }; }
  load() { return this.read('workspace', 'state'); }
  async save(state, revision) {
    const validated = validateState(state);
    return new Promise((resolve, reject) => {
      const tx = this.db.transaction('workspace', 'readwrite'), store = tx.objectStore('workspace'), request = store.get('state');
      let result;
      request.onsuccess = () => { if (request.result.revision !== revision) { tx.abort(); return; } result = { state: validated, revision: revision + 1 }; store.put(result, 'state'); };
      tx.oncomplete = () => resolve(result); tx.onabort = () => reject(new Error('Workspace changed in another tab. Reload and try again.')); tx.onerror = () => reject(tx.error);
    });
  }
  async upload(projectId, file) {
    if (!file.size || file.size > MAX_FILE) throw new Error('Choose a file between 1 byte and 5 MB.');
    const current = await this.load();
    if (!current.state.projects.some(p => p.id === projectId)) throw new Error('Project not found.');
    if (current.state.files.reduce((n,f) => n + f.size, 0) + file.size > 25 * 1024 * 1024) throw new Error('Workspace file limit is 25 MB.');
    const metadata = { id: uid(), projectId, name: file.name.slice(0,160), size: file.size, type: file.type, date: new Date().toISOString() };
    const updated = { ...current.state, files: [...current.state.files, metadata] };
    validateState(updated);
    // File bytes and metadata commit together, including a revision guard.
    return new Promise((resolve, reject) => {
      const tx = this.db.transaction(['workspace','files'],'readwrite'), store = tx.objectStore('workspace'), request = store.get('state'); let result;
      request.onsuccess = () => { if (request.result.revision !== current.revision) { tx.abort(); return; } result = { state: updated, revision: current.revision + 1 }; store.put(result,'state'); tx.objectStore('files').put(file,metadata.id); };
      tx.oncomplete = () => resolve(result); tx.onabort = () => reject(new Error('Workspace changed. Reload and try again.')); tx.onerror = () => reject(tx.error);
    });
  }
  async download(id) { const blob = await this.read('files',id); if (!blob) throw new Error('This file is no longer available in this browser.'); return blob; }
  async removeFile(id) {
    const current = await this.load();
    return new Promise((resolve,reject) => {
      const tx=this.db.transaction(['workspace','files'],'readwrite'),store=tx.objectStore('workspace'),request=store.get('state');let result;
      request.onsuccess=()=>{if(request.result.revision!==current.revision){tx.abort();return;}result={revision:current.revision+1,state:{...current.state,files:current.state.files.filter(f=>f.id!==id)}};store.put(result,'state');tx.objectStore('files').delete(id);};
      tx.oncomplete=()=>resolve(result);tx.onabort=()=>reject(new Error('Workspace changed. Reload and try again.'));tx.onerror=()=>reject(tx.error);
    });
  }
  async reset() { const previous = await this.load(); return new Promise((resolve,reject) => { const tx=this.db.transaction(['workspace','files'],'readwrite');tx.objectStore('workspace').put({revision:previous.revision+1,state:demoState()},'state');tx.objectStore('files').clear();tx.oncomplete=resolve;tx.onerror=()=>reject(tx.error); }); }
}
export class ApiRepository {
  mode = 'server';
  constructor(base) { this.base=base; }
  async request(path, options={}) {
    const response=await fetch(new URL(path,this.base),{credentials:'same-origin',...options,headers:{'X-Studio-Desk':'1',...options.headers}});
    if (!response.ok) { let message='Request failed.';try{message=(await response.json()).error||message;}catch{}const error=new Error(message);error.status=response.status;throw error; }
    return response;
  }
  async json(path,body,method='POST') { return (await this.request(path,{method,headers:{'Content-Type':'application/json'},body:JSON.stringify(body)})).json(); }
  async session() { return (await this.request('session')).json(); }
  login(email,password) { return this.json('login',{email,password}); }
  signup(name,email,password) { return this.json('signup',{name,email,password}); }
  logout() { return this.json('logout',{}); }
  async load() { return (await this.request('workspace')).json(); }
  save(state,revision) { return this.json('workspace',{state,revision},'PUT'); }
  async upload(projectId,file) { if(!file.size||file.size>MAX_FILE)throw new Error('Choose a file between 1 byte and 5 MB.');return (await this.request(`projects/${projectId}/files?name=${encodeURIComponent(file.name)}`,{method:'POST',headers:{'Content-Type':file.type||'application/octet-stream'},body:file})).json(); }
  async download(id) { return (await this.request(`files/${id}`)).blob(); }
  async removeFile(id) { return (await this.request(`files/${id}`,{method:'DELETE'})).json(); }
}
