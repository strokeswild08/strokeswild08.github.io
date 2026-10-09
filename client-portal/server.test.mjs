import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createPortal } from './server.mjs';
import { DatabaseSync } from 'node:sqlite';

test('private accounts, state persistence, revision guards and owner-only file storage',async()=>{
  const dataDir=await mkdtemp(join(tmpdir(),'studio-desk-test-'));
  let server=createPortal({dataDir}),base,cookie='';
  const start=async()=>{await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));base=`http://127.0.0.1:${server.address().port}/client-portal/api/`;};
  const stop=async()=>{await new Promise((resolve,reject)=>server.close(error=>error?reject(error):resolve()));};
  const request=async(path,{method='GET',body,token=cookie,headers={}}={})=>{
    const response=await fetch(base+path,{method,headers:{Cookie:token,'X-Studio-Desk':'1',...(body&&!(body instanceof Uint8Array)?{'Content-Type':'application/json'}:{}),...headers},body:body instanceof Uint8Array?body:body?JSON.stringify(body):undefined});
    return response;
  };
  try{
    await start();assert.equal((await request('workspace')).status,401);
    const account=await request('signup',{method:'POST',body:{name:'Test Artist',email:'artist@example.com',password:'strong-password-123'}});
    assert.equal(account.status,200);cookie=account.headers.get('set-cookie').split(';')[0];assert.ok(account.headers.get('set-cookie').includes('HttpOnly'));assert.ok(account.headers.get('set-cookie').includes('SameSite=Strict'));
    let current=await(await request('workspace')).json();assert.equal(current.state.projects.length,0);
    current.state.clients.push({id:'client1',name:'A Client',company:'Studio',email:'client@example.com',color:'sage'});
    current.state.projects.push({id:'project1',clientId:'client1',title:'A Project',category:'Game art',status:'In progress',due:'2026-11-01',budgetCents:10000,brief:'A private brief',color:'sage'});
    const saved=await request('workspace',{method:'PUT',body:current});assert.equal(saved.status,200);current=await saved.json();
    assert.equal((await request('workspace',{method:'PUT',body:{...current,revision:1}})).status,409);
    assert.equal((await request('workspace',{method:'PUT',body:current,headers:{Origin:'https://unrelated.example'}})).status,403);
    const uploaded=await request('projects/project1/files?name=brief.txt',{method:'POST',body:Buffer.from('Private project file'),headers:{'Content-Type':'text/plain'}});
    assert.equal(uploaded.status,201);current=await uploaded.json();const fileId=current.state.files[0].id;
    assert.equal(await(await request(`files/${fileId}`)).text(),'Private project file');
    const ownerCookie=cookie;
    const second=await request('signup',{method:'POST',body:{name:'Another User',email:'other@example.com',password:'strong-password-456'}});
    cookie=second.headers.get('set-cookie').split(';')[0];assert.equal((await request(`files/${fileId}`)).status,404);assert.equal((await(await request('workspace')).json()).state.projects.length,0);
    cookie=ownerCookie;assert.equal((await request('projects/missing/files?name=x.txt',{method:'POST',body:Buffer.from('x')})).status,404);
    await stop();server=createPortal({dataDir});await start();
    current=await(await request('workspace')).json();assert.equal(current.state.projects[0].title,'A Project');assert.equal(await(await request(`files/${fileId}`)).text(),'Private project file');
    assert.equal((await request(`files/${fileId}`,{method:'DELETE'})).status,200);assert.equal((await request(`files/${fileId}`)).status,404);
    assert.equal((await request('logout',{method:'POST',body:{}})).status,200);assert.equal((await request('workspace')).status,401);
    assert.equal((await request('login',{method:'POST',body:{email:'artist@example.com',password:'wrong-password'}})).status,401);
    assert.equal((await request('login',{method:'POST',body:{email:'artist@example.com',password:'strong-password-123'}})).status,200);
    await stop();const db=new DatabaseSync(join(dataDir,'studio.sqlite'));const user=db.prepare('SELECT password,salt FROM users WHERE email=?').get('artist@example.com');assert.equal(user.password.length,128);assert.equal(user.salt.length,32);assert.notEqual(user.password,'strong-password-123');db.close();
  }finally{if(server.listening)await stop();await rm(dataDir,{recursive:true,force:true});}
});
test('backend source and data cannot be downloaded through static routes',async()=>{
  const dataDir=await mkdtemp(join(tmpdir(),'studio-desk-routes-')),server=createPortal({dataDir});
  try{await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));const base=`http://127.0.0.1:${server.address().port}`;
    for(const path of ['/client-portal/server.mjs','/client-portal/data/studio.sqlite','/client-portal/package.json'])assert.equal((await fetch(base+path)).status,404);
    assert.equal((await fetch(base+'/client-portal/')).status,200);
  }finally{await new Promise(resolve=>server.close(resolve));await rm(dataDir,{recursive:true,force:true});}
});
