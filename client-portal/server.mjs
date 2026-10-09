import { createServer } from 'node:http';
import { DatabaseSync } from 'node:sqlite';
import { randomBytes, randomUUID, createHash, scrypt, timingSafeEqual } from 'node:crypto';
import { promisify } from 'node:util';
import { mkdirSync, readFileSync, existsSync } from 'node:fs';
import { writeFile, unlink, readFile } from 'node:fs/promises';
import { join, resolve, dirname, extname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { blankState, validateState } from './lib/model.mjs';

const root=dirname(fileURLToPath(import.meta.url)),derive=promisify(scrypt),SESSION_AGE=7*24*60*60*1000,MAX_FILE=5*1024*1024;
const hash = value => createHash('sha256').update(value).digest('hex');
const problem = (message,status=400) => Object.assign(new Error(message),{status});
const publicFiles = new Set(['index.html','style.css','app.mjs','cover.svg','lib/model.mjs','lib/repository.mjs']);

export function createPortal({ dataDir=join(root,'data'), publicOrigin=process.env.PUBLIC_ORIGIN||'', allowSignup=process.env.ALLOW_SIGNUP!=='false' }={}) {
  mkdirSync(join(dataDir,'uploads'),{recursive:true,mode:0o700});
  const db=new DatabaseSync(join(dataDir,'studio.sqlite'));
  db.exec(`PRAGMA journal_mode=WAL; PRAGMA foreign_keys=ON;
    CREATE TABLE IF NOT EXISTS users(id TEXT PRIMARY KEY,name TEXT NOT NULL,email TEXT NOT NULL UNIQUE,salt TEXT NOT NULL,password TEXT NOT NULL);
    CREATE TABLE IF NOT EXISTS sessions(token TEXT PRIMARY KEY,user_id TEXT NOT NULL REFERENCES users(id),expires INTEGER NOT NULL);
    CREATE TABLE IF NOT EXISTS workspaces(user_id TEXT PRIMARY KEY REFERENCES users(id),state TEXT NOT NULL,revision INTEGER NOT NULL);
    CREATE TABLE IF NOT EXISTS files(id TEXT PRIMARY KEY,user_id TEXT NOT NULL REFERENCES users(id),name TEXT NOT NULL,size INTEGER NOT NULL,type TEXT NOT NULL);`);
  const attempts=new Map();
  const json=(res,status,data)=>{res.writeHead(status,{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store'});res.end(JSON.stringify(data));};
  const workspace=userId=>{const record=db.prepare('SELECT state,revision FROM workspaces WHERE user_id=?').get(userId);return{state:JSON.parse(record.state),revision:record.revision};};
  const put=(userId,state,revision)=>db.prepare('UPDATE workspaces SET state=?,revision=? WHERE user_id=?').run(JSON.stringify(state),revision,userId);
  async function body(req,limit=1024*1024) {const chunks=[];let size=0;for await(const chunk of req){size+=chunk.length;if(size>limit)throw problem('Request is too large.',413);chunks.push(chunk);}return Buffer.concat(chunks);}
  async function input(req) {if(!req.headers['content-type']?.startsWith('application/json'))throw problem('Expected JSON.',415);try{return JSON.parse((await body(req)).toString());}catch(error){if(error.status)throw error;throw problem('Invalid JSON.');}}
  function authenticate(req) {
    const token=req.headers.cookie?.split(';').map(c=>c.trim()).find(c=>c.startsWith('studio_session='))?.slice('studio_session='.length);
    if(!token||!/^[a-f0-9]{64}$/.test(token))throw problem('Sign in to access your workspace.',401);
    const row=db.prepare('SELECT users.id,users.name,users.email FROM sessions JOIN users ON users.id=sessions.user_id WHERE token=? AND expires>?').get(hash(token),Date.now());
    if(!row)throw problem('Your session has expired. Sign in again.',401);return row;
  }
  function newSession(res,userId) {
    const token=randomBytes(32).toString('hex');db.prepare('DELETE FROM sessions WHERE expires<?').run(Date.now());
    db.prepare('INSERT INTO sessions VALUES(?,?,?)').run(hash(token),userId,Date.now()+SESSION_AGE);
    res.setHeader('Set-Cookie',`studio_session=${token}; HttpOnly; SameSite=Strict; Path=/; Max-Age=${SESSION_AGE/1000}${publicOrigin.startsWith('https:')?'; Secure':''}`);
  }
  function limitAuth(req) {
    const key=req.socket.remoteAddress||'unknown',now=Date.now();
    if(attempts.size>1000)for(const [ip,a]of attempts)if(a.until<now)attempts.delete(ip);
    const a=attempts.get(key);if(a?.until>now&&a.count>=20)throw problem('Too many sign-in attempts. Try again in 15 minutes.',429);
    attempts.set(key,{count:a?.until>now?a.count+1:1,until:a?.until>now?a.until:now+15*60*1000});
  }
  const server=createServer(async(req,res)=>{
    res.setHeader('X-Content-Type-Options','nosniff');res.setHeader('Referrer-Policy','same-origin');
    res.setHeader('Content-Security-Policy',"default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; connect-src 'self'; font-src 'self'; object-src 'none'; base-uri 'self'; frame-ancestors 'none'");
    try {
      const url=new URL(req.url,'http://localhost'),path=url.pathname.replace(/^\/client-portal(?=\/|$)/,'')||'/';
      if(path.startsWith('/api/')) {
        if(!['GET','HEAD'].includes(req.method)) {
          if(req.headers['x-studio-desk']!=='1')throw problem('Invalid request origin.',403);
          const origin=req.headers.origin;
          const expected=publicOrigin||`http://${req.headers.host}`;
          if(origin&&origin!==expected)throw problem('Invalid request origin.',403);
          if(req.headers['sec-fetch-site']==='cross-site')throw problem('Cross-site requests are not allowed.',403);
        }
        const endpoint=path.slice(5);
        if(endpoint==='health'&&req.method==='GET')return json(res,200,{app:'studio-desk',version:1,allowSignup});
        if(['signup','login'].includes(endpoint)&&req.method==='POST') {
          limitAuth(req);const data=await input(req);
          const email=String(data.email||'').trim().toLowerCase(),password=data.password;
          if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)||email.length>254||typeof password!=='string'||password.length<10||password.length>128)throw problem('Enter a valid email and a password of 10–128 characters.');
          let user;
          if(endpoint==='signup') {
            if(!allowSignup)throw problem('New accounts are disabled for this workspace server.',403);
            const name=String(data.name||'').trim();if(!name||name.length>80)throw problem('Enter your name (up to 80 characters).');
            if(db.prepare('SELECT id FROM users WHERE email=?').get(email))throw problem('Unable to create this account. Try signing in instead.',409);
            const salt=randomBytes(16).toString('hex'),derived=(await derive(password,salt,64)).toString('hex');user={id:randomUUID(),name,email};
            db.exec('BEGIN IMMEDIATE');try{db.prepare('INSERT INTO users VALUES(?,?,?,?,?)').run(user.id,name,email,salt,derived);db.prepare('INSERT INTO workspaces VALUES(?,?,1)').run(user.id,JSON.stringify(blankState(`${name.split(' ')[0]}'s studio`)));db.exec('COMMIT');}catch(error){db.exec('ROLLBACK');if(String(error.message).includes('UNIQUE'))throw problem('Unable to create this account. Try signing in instead.',409);throw error;}
          } else {
            const row=db.prepare('SELECT * FROM users WHERE email=?').get(email);
            // Derive even for unknown users to reduce account timing differences.
            const candidate=await derive(password,row?.salt||'00000000000000000000000000000000',64);
            if(!row||!timingSafeEqual(candidate,Buffer.from(row.password,'hex')))throw problem('Email or password is incorrect.',401);
            user={id:row.id,name:row.name,email:row.email};
          }
          newSession(res,user.id);return json(res,200,user);
        }
        const user=authenticate(req);
        if(endpoint==='session'&&req.method==='GET')return json(res,200,user);
        if(endpoint==='logout'&&req.method==='POST') {
          const token=req.headers.cookie.split(';').map(c=>c.trim()).find(c=>c.startsWith('studio_session='))?.slice(15);
          if(token)db.prepare('DELETE FROM sessions WHERE token=?').run(hash(token));
          res.setHeader('Set-Cookie','studio_session=; HttpOnly; SameSite=Strict; Path=/; Max-Age=0');return json(res,200,{ok:true});
        }
        if(endpoint==='workspace'&&req.method==='GET')return json(res,200,workspace(user.id));
        if(endpoint==='workspace'&&req.method==='PUT') {
          const data=await input(req),validated=validateState(data.state),current=workspace(user.id);
          if(data.revision!==current.revision)throw problem('Workspace changed in another tab. Reload and try again.',409);
          if(JSON.stringify(validated.files)!==JSON.stringify(current.state.files))throw problem('Manage file attachments through the file controls.');
          put(user.id,validated,current.revision+1);return json(res,200,{state:validated,revision:current.revision+1});
        }
        const upload=endpoint.match(/^projects\/([\w-]+)\/files$/);
        if(upload&&req.method==='POST') {
          const filename=(url.searchParams.get('name')||'').trim();if(!filename||filename.length>160||/[\x00-\x1f\\/]/.test(filename))throw problem('Invalid filename.');
          const initial=workspace(user.id);if(!initial.state.projects.some(p=>p.id===upload[1]))throw problem('Project not found.',404);
          const bytes=await body(req,MAX_FILE);if(!bytes.length)throw problem('The file is empty.');
          const id=randomUUID(),diskPath=join(dataDir,'uploads',id),type=String(req.headers['content-type']||'application/octet-stream').slice(0,100);
          await writeFile(diskPath,bytes,{flag:'wx',mode:0o600});
          try {
            const current=workspace(user.id);if(!current.state.projects.some(p=>p.id===upload[1]))throw problem('Project not found.',404);
            if(current.state.files.reduce((n,f)=>n+f.size,0)+bytes.length>25*1024*1024)throw problem('Workspace file limit is 25 MB.');
            const state=validateState({...current.state,files:[...current.state.files,{id,projectId:upload[1],name:filename,type,size:bytes.length,date:new Date().toISOString()}]});
            db.exec('BEGIN IMMEDIATE');try{db.prepare('INSERT INTO files VALUES(?,?,?,?,?)').run(id,user.id,filename,bytes.length,type);put(user.id,state,current.revision+1);db.exec('COMMIT');}catch(error){db.exec('ROLLBACK');throw error;}
            return json(res,201,{state,revision:current.revision+1});
          } catch(error) {await unlink(diskPath).catch(()=>{});throw error;}
        }
        const file=endpoint.match(/^files\/([\w-]+)$/);
        if(file) {
          const metadata=db.prepare('SELECT * FROM files WHERE id=? AND user_id=?').get(file[1],user.id);if(!metadata)throw problem('File not found.',404);
          if(req.method==='GET') { const bytes=await readFile(join(dataDir,'uploads',file[1]));res.writeHead(200,{'Content-Type':'application/octet-stream','Content-Disposition':`attachment; filename*=UTF-8''${encodeURIComponent(metadata.name)}`,'Cache-Control':'no-store'});return res.end(bytes); }
          if(req.method==='DELETE') {const current=workspace(user.id),state={...current.state,files:current.state.files.filter(f=>f.id!==file[1])};db.exec('BEGIN IMMEDIATE');try{db.prepare('DELETE FROM files WHERE id=? AND user_id=?').run(file[1],user.id);put(user.id,state,current.revision+1);db.exec('COMMIT');}catch(error){db.exec('ROLLBACK');throw error;}await unlink(join(dataDir,'uploads',file[1])).catch(()=>{});return json(res,200,{state,revision:current.revision+1});}
        }
        throw problem('Endpoint not found.',404);
      }
      if(!['GET','HEAD'].includes(req.method))throw problem('Method not allowed.',405);
      if(url.pathname==='/'){res.writeHead(302,{Location:'/client-portal/'});return res.end();}
      const name=path==='/'?'index.html':path.slice(1);
      if(!publicFiles.has(name))throw problem('Not found.',404);
      const types={'.html':'text/html; charset=utf-8','.css':'text/css; charset=utf-8','.mjs':'text/javascript; charset=utf-8','.svg':'image/svg+xml'};
      res.writeHead(200,{'Content-Type':types[extname(name)],'Cache-Control':'no-cache'});res.end(req.method==='HEAD'?undefined:readFileSync(join(root,name)));
    } catch(error) {if(!res.headersSent){if(!error.status&&!/^(Invalid|Duplicate|Project |Milestone )/.test(error.message))console.error(error);json(res,error.status||400,{error:error.status||/^(Invalid|Duplicate|Project |Milestone )/.test(error.message)?error.message:'Could not complete the request.'});}else res.end();}
  });
  server.on('close',()=>db.close());return server;
}

if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)) {
  const server=createPortal({dataDir:process.env.DATA_DIR||join(root,'data')});
  const port=Number(process.env.PORT)||3000,host=process.env.HOST||'127.0.0.1';
  server.listen(port,host,()=>console.log(`Studio Desk: http://${host}:${port}/client-portal/`));
}
