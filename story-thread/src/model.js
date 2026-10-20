export const clone=value=>JSON.parse(JSON.stringify(value));
const condition=(kind,key,op,value)=>({kind,key,op,value});
const effect=(kind,key,op,value)=>({kind,key,op,value});
const choice=(id,label,target,conditions=[],effects=[])=>({id,label,target,conditions,effects});
export const SAMPLE={version:1,title:'The Glasshouse Letter',start:'gate',initial:{items:[],flags:[],reputation:0,quests:{}},nodes:[
  {id:'gate',speaker:'Mara · The caretaker',text:'The glasshouse has been locked since dawn. And now you arrive with questions. Tell me—are you here to help, or to collect another story?',x:70,y:90,ending:false,choices:[choice('help','I’m here to find the missing botanist.','trust',[],[effect('quest','find_elin','set','active'),effect('reputation','','add',1)]),choice('look','Let me look around first.','courtyard')]},
  {id:'trust',speaker:'Mara · The caretaker',text:'Then take this brass key. Elin trusted people too easily. If you find anything in her study, bring it back to me.',x:420,y:50,ending:false,choices:[choice('key','Take the key and go to the courtyard.','courtyard',[],[effect('item','brass_key','add',true),effect('flag','mara_trust','add',true)])]},
  {id:'courtyard',speaker:'The courtyard',text:'Rain runs down the greenhouse windows. A brass lock guards the study door. An unmarked path disappears behind the hedges.',x:780,y:210,ending:false,choices:[choice('study','Unlock the study.','study',[condition('item','brass_key','has',true)]),choice('hedge','Follow the path behind the hedges.','hedge'),choice('return','Return to Mara.','gate')]},
  {id:'study',speaker:'Elin’s study',text:'Inside a field journal, you find a letter: “I went to the old observatory. Tell Mara I am safe.” The ink is still fresh.',x:1140,y:60,ending:false,choices:[choice('letter','Take the letter back to Mara.','reunion',[],[effect('item','elin_letter','add',true)])]},
  {id:'hedge',speaker:'The hidden path',text:'A groundskeeper steps from the fog. “Elin passed this way. But I won’t trade her secrets with a stranger.”',x:1140,y:390,ending:false,choices:[choice('trusted','Mara trusts me. Let me help.','study',[condition('flag','mara_trust','has',true)]),choice('rep','I’ve already offered to help.','study',[condition('reputation','','gte',1)]),choice('back','Return to the courtyard.','courtyard')]},
  {id:'reunion',speaker:'Mara · The caretaker',text:'She reads the letter twice. Her shoulders finally soften. “The observatory. Of course. Thank you for treating her story with care.”',x:1510,y:90,ending:false,choices:[choice('complete','Give Mara the letter.','end',[condition('item','elin_letter','has',true),condition('quest','find_elin','is','active')],[effect('quest','find_elin','set','complete'),effect('item','elin_letter','remove',true),effect('reputation','','add',2)])]},
  {id:'end',speaker:'Case closed',text:'The glasshouse opens again. Somewhere beyond the rain, a new chapter waits. Your choices restored a little trust.',x:1880,y:130,ending:true,choices:[]}
]};
const assert=(value,message)=>{if(!value)throw Error(message);};
function str(value,max,label,empty=false){assert(typeof value==='string'&&value.length<=max&&(empty||value.trim().length>0),`${label} must be ${empty?'0':'1'}–${max} characters.`);return value;}
function number(value,min,max,label){assert(typeof value==='number'&&Number.isFinite(value)&&value>=min&&value<=max,`${label} must be between ${min} and ${max}.`);return value;}
function key(value){assert(typeof value==='string'&&/^[a-z][a-z0-9_]{0,31}$/.test(value)&&!['constructor','prototype','__proto__'].includes(value),'State keys use lowercase letters, numbers and underscores, starting with a letter.');return value;}
function rule(raw,isEffect){
  assert(raw&&typeof raw==='object','Invalid condition or effect.');const {kind,op}=raw;assert(['item','flag','reputation','quest'].includes(kind),'Unknown state rule type.');
  const k=kind==='reputation'?'':key(raw.key);
  if(kind==='reputation'){assert(op===(isEffect?'add':'gte'),'Invalid reputation operation.');return {kind,key:k,op,value:number(raw.value,-100,100,'Reputation value')};}
  if(kind==='quest'){assert(op===(isEffect?'set':'is'),'Invalid quest operation.');assert(['not_started','active','complete'].includes(raw.value),'Unknown quest status.');return {kind,key:k,op,value:raw.value};}
  assert((isEffect?['add','remove']:['has','lacks']).includes(op),'Invalid inventory or flag operation.');return {kind,key:k,op,value:true};
}
export function validateDocument(raw){
  assert(raw&&typeof raw==='object'&&raw.version===1,'This file needs Thread & Ink schema version 1.');
  const title=str(raw.title,80,'Story title'),start=str(raw.start,40,'Start node');assert(Array.isArray(raw.nodes)&&raw.nodes.length>0&&raw.nodes.length<=60,'A story needs 1–60 nodes.');
  const initial=raw.initial;assert(initial&&Array.isArray(initial.items)&&Array.isArray(initial.flags),'Initial inventory and flags must be lists.');assert(initial.items.length<=50&&initial.flags.length<=50,'Initial state is too large.');
  const items=[...new Set(initial.items.map(key))],flags=[...new Set(initial.flags.map(key))],reputation=number(initial.reputation,-100,100,'Initial reputation');assert(initial.quests&&typeof initial.quests==='object'&&!Array.isArray(initial.quests),'Initial quests must be an object.');assert(Object.keys(initial.quests).length<=50,'Too many initial quests.');
  const quests=Object.fromEntries(Object.entries(initial.quests).map(([k,v])=>{key(k);assert(['not_started','active','complete'].includes(v),'Unknown initial quest status.');return [k,v];}));
  const ids=new Set();const nodes=raw.nodes.map(n=>{
    assert(n&&typeof n==='object','Invalid story node.');const id=str(n.id,40,'Node ID');assert(/^[a-zA-Z][a-zA-Z0-9_-]*$/.test(id)&&!ids.has(id),'Node IDs must be unique letters, numbers, underscores or hyphens.');ids.add(id);
    const speaker=str(n.speaker,64,'Speaker'),text=str(n.text,2000,'Dialogue',true);number(n.x,0,4000,'Node X');number(n.y,0,2400,'Node Y');assert(typeof n.ending==='boolean','Node ending must be true or false.');assert(Array.isArray(n.choices)&&n.choices.length<=6,'Each node supports up to six choices.');assert(!n.ending||n.choices.length===0,'An ending cannot have outgoing choices.');
    const choiceIds=new Set();const choices=n.choices.map(c=>{assert(c&&typeof c==='object','Invalid dialogue choice.');const cid=str(c.id,40,'Choice ID');assert(!choiceIds.has(cid),'Choice IDs must be unique inside each node.');choiceIds.add(cid);assert(Array.isArray(c.conditions)&&Array.isArray(c.effects)&&c.conditions.length<=5&&c.effects.length<=5,'Each choice supports up to five conditions and five effects.');return {id:cid,label:str(c.label,160,'Choice label'),target:str(c.target,40,'Target node'),conditions:c.conditions.map(r=>rule(r,false)),effects:c.effects.map(r=>rule(r,true))};});
    return {id,speaker,text,x:n.x,y:n.y,ending:n.ending,choices};
  });assert(ids.has(start),'Start node does not exist.');for(const n of nodes)for(const c of n.choices)assert(ids.has(c.target),`Choice in ${n.id} points to a missing node.`);
  return {version:1,title,start,initial:{items,flags,reputation,quests},nodes};
}
export function conditionMet(state,c){if(c.kind==='reputation')return state.reputation>=c.value;if(c.kind==='quest')return (state.quests[c.key]||'not_started')===c.value;const values=c.kind==='item'?state.items:state.flags;return c.op==='has'?values.includes(c.key):!values.includes(c.key);}
export function applyEffects(state,effects){const result=clone(state);for(const e of effects){if(e.kind==='reputation')result.reputation=Math.max(-100,Math.min(100,result.reputation+e.value));else if(e.kind==='quest')result.quests[e.key]=e.value;else{const field=e.kind==='item'?'items':'flags';if(e.op==='add'&&!result[field].includes(e.key))result[field].push(e.key);if(e.op==='remove')result[field]=result[field].filter(k=>k!==e.key);}}return result;}
export function describeRule(r){if(r.kind==='reputation')return `${r.op==='add'?'Reputation':'Requires reputation'} ${r.op==='add'&&r.value>=0?'+':r.op==='gte'?'≥ ':''}${r.value}`;if(r.kind==='quest')return `${r.key}: ${r.value.replace('_',' ')}`;return `${{has:'Needs',lacks:'Without',add:'Gain',remove:'Remove'}[r.op]} ${r.kind}: ${r.key}`;}
export function warnings(doc){const reached=new Set(),queue=[doc.start];while(queue.length){const id=queue.shift();if(reached.has(id))continue;reached.add(id);const n=doc.nodes.find(n=>n.id===id);if(n)for(const c of n.choices)queue.push(c.target);}return doc.nodes.flatMap(n=>[...(!reached.has(n.id)?[{id:n.id,text:'Unreachable from the start node.'}]:[]),...(!n.ending&&!n.choices.length?[{id:n.id,text:'No outgoing choices. Mark as an ending or add a choice.'}]:[])]);}
export function removeNode(doc,id){assert(id!==doc.start,'Set another start node before deleting this one.');assert(!doc.nodes.some(n=>n.id!==id&&n.choices.some(c=>c.target===id)),'Reconnect incoming choices before deleting this node.');return {...doc,nodes:doc.nodes.filter(n=>n.id!==id)};}
export class Session{
  constructor(document){this.document=validateDocument(document);this.restart();}
  restart(){this.current=this.document.start;this.state=clone(this.document.initial);this.history=[];this.log=[];}
  get node(){return this.document.nodes.find(n=>n.id===this.current);}
  get choices(){return this.node.choices.map(c=>({...c,enabled:c.conditions.every(r=>conditionMet(this.state,r)),reasons:c.conditions.filter(r=>!conditionMet(this.state,r)).map(describeRule)}));}
  choose(id){assert(this.history.length<100,'Preview reached 100 choices. Restart to continue.');const choice=this.choices.find(c=>c.id===id);assert(choice&&choice.enabled,'This choice is locked or unavailable.');this.history.push({current:this.current,state:clone(this.state),log:clone(this.log)});this.state=applyEffects(this.state,choice.effects);this.log.push(...choice.effects.map(describeRule));this.log=this.log.slice(-20);this.current=choice.target;return this.node;}
  back(){const last=this.history.pop();if(!last)return false;this.current=last.current;this.state=last.state;this.log=last.log;return true;}
}
