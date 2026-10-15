'use strict';
const {api,money,escape:esc,date:formatDate,notice,badge,statusLabel,timeline}=Slotline;
const $=id=>document.getElementById(id);
let page=0,current=null,listGeneration=0,searchTimer,sessionReady=false;
const transitions={REQUESTED:['CONFIRMED','CANCELLED'],CONFIRMED:['IN_PROGRESS','CANCELLED'],IN_PROGRESS:['COMPLETED','CANCELLED'],COMPLETED:[],CANCELLED:[]};
function signedIn(yes) {
  sessionReady=yes;$('login-panel').classList.toggle('hidden',yes);$('dashboard').classList.toggle('hidden',!yes);$('logout').classList.toggle('hidden',!yes);
}
async function load() {
  if(!sessionReady)return;
  const generation=++listGeneration;
  $('refresh').disabled=true;
  try {
    const query=new URLSearchParams({status:$('status-filter').value,q:$('search').value.trim(),page});
    const data=await api('/admin/bookings?'+query);
    if(generation!==listGeneration)return;
    const stats=data.stats;
    $('stats').innerHTML=`<div class="stat"><small>NEW REQUESTS</small><strong>${stats.requests}</strong><span>Ready for a first look</span></div><div class="stat"><small>ACTIVE PROJECTS</small><strong>${stats.confirmed+stats.inProgress}</strong><span>Confirmed + in progress</span></div><div class="stat"><small>OPEN PIPELINE</small><strong>${money(stats.pipelineValue)}</strong><span>Quoted value, not revenue collected</span></div><div class="stat"><small>COMPLETED</small><strong>${stats.completed}</strong><span>From first brief to final handover</span></div>`;
    $('result-count').textContent=data.total+' '+(data.total===1?'request':'requests');
    $('booking-rows').innerHTML=data.bookings.length?data.bookings.map(b=>{
      const initials=b.clientName.split(/\s+/).slice(0,2).map(s=>s[0]).join('').toUpperCase();
      return `<tr><td><div class="client-cell"><span class="avatar">${esc(initials)}</span><div><strong>${esc(b.clientName)}</strong><small>${esc(b.quote.lines[0]?.label||'Project')} · ${esc(b.reference)}</small></div></div></td><td><strong>${esc(formatDate(b.date))}</strong><small>${esc(b.time)} · ${esc(b.zone)}</small></td><td>${badge(b.status)}</td><td><strong>${money(b.quote.total)}</strong><small>USD · ${b.quote.scope}</small></td><td><button class="view-button" data-ref="${b.reference}" aria-label="View booking for ${esc(b.clientName)}">↗</button></td></tr>`;
    }).join(''):'<tr><td colspan="5" class="empty-cell">No requests here yet.<br>New bookings will appear here, or try a different search.</td></tr>';
    $('page-label').textContent=data.total?`${page*20+1}–${Math.min((page+1)*20,data.total)} of ${data.total}`:'No matching bookings';
    $('prev-page').disabled=page===0;$('next-page').disabled=(page+1)*20>=data.total;
    notice($('admin-error'),'');
  } catch(e) {if(e.status===401){signedIn(false);await Slotline.token();}else notice($('admin-error'),e.message);}
  finally {if(generation===listGeneration)$('refresh').disabled=false;}
}
$('login-form').addEventListener('submit',async e=>{
  e.preventDefault();$('login-button').disabled=true;notice($('login-error'),'');
  try {
    await api('/session',{method:'POST',body:new URLSearchParams(new FormData(e.target))});
    $('password').value='';await Slotline.token();signedIn(true);await load();
  }catch(error){notice($('login-error'),error.message);await Slotline.token().catch(()=>{});}
  finally{$('login-button').disabled=false;}
});
$('logout').addEventListener('click',async()=>{
  try{await api('/logout',{method:'POST'});signedIn(false);$('booking-rows').replaceChildren();$('stats').replaceChildren();current=null;await Slotline.token();}
  catch(e){notice($('admin-error'),e.message);}
});
$('refresh').addEventListener('click',load);
$('status-filter').addEventListener('change',()=>{page=0;load();});
$('search').addEventListener('input',()=>{clearTimeout(searchTimer);searchTimer=setTimeout(()=>{page=0;load();},250);});
$('prev-page').addEventListener('click',()=>{if(page>0){page--;load();}});
$('next-page').addEventListener('click',()=>{page++;load();});
$('booking-rows').addEventListener('click',async e=>{
  const b=e.target.closest('[data-ref]');if(!b)return;
  try{current=await api('/admin/bookings/'+encodeURIComponent(b.dataset.ref));renderDetail();$('detail-dialog').showModal();}
  catch(error){notice($('admin-error'),error.message);}
});
$('close-dialog').addEventListener('click',()=>{$('detail-dialog').close();current=null;});
$('detail-dialog').addEventListener('click',e=>{if(e.target===$('detail-dialog')){$('detail-dialog').close();current=null;}});
function renderDetail() {
  const b=current;if(!b)return;
  const options=transitions[b.status];
  $('detail-content').innerHTML=`<h2 class="detail-title">${esc(b.clientName)}</h2><p class="detail-sub">${esc(b.reference)} · ${esc(b.email)}</p>${badge(b.status)}<div class="receipt-grid"><div><small>KICKOFF</small>${esc(formatDate(b.date))} · ${esc(b.time)}<br><span class="muted small">${esc(b.zone)}</span></div><div><small>COMPANY / STUDIO</small>${esc(b.company||'Independent project')}</div></div><section class="detail-block"><h3>The brief</h3><p class="brief-text">${esc(b.brief)}</p></section><section class="detail-block receipt-lines"><h3>Project quote</h3>${b.quote.lines.map(l=>`<div class="quote-row"><span>${esc(l.label)}${l.quantity>1?' × '+l.quantity:''}</span><b>${money(l.total)}</b></div>`).join('')}${b.quote.priority?`<div class="quote-row"><span>Priority handover</span><b>${money(b.quote.priorityFee)}</b></div>`:''}<div class="quote-row"><span>Total / 50% deposit</span><b>${money(b.quote.total)} / ${money(b.quote.deposit)}</b></div><p class="muted small">These are quoted amounts. Slotline does not collect or track payments.</p></section><section class="detail-block"><h3>Move the project forward</h3>${options.length?`<form id="status-form" class="status-form"><select id="new-status" aria-label="Next booking status">${options.map(s=>`<option value="${s}">${statusLabel(s)}</option>`).join('')}</select><button class="button primary" id="save-status" type="submit">Update status ↗</button></form>`:'<p class="muted small">This booking has reached its final status.</p>'}<div id="status-error" class="notice error hidden" role="alert"></div></section><section class="detail-block"><h3>Activity</h3>${timeline(b)}</section>`;
  $('status-form')?.addEventListener('submit',async e=>{
    e.preventDefault();const status=$('new-status').value;
    if(status==='CANCELLED'&&!window.confirm('Cancel this booking and release its kickoff slot?'))return;
    $('save-status').disabled=true;
    try{current=await api('/admin/bookings/'+current.reference,{method:'PATCH',body:{status,version:current.version}});renderDetail();await load();}
    catch(error){notice($('status-error'),error.message);if($('save-status'))$('save-status').disabled=false;}
  });
}
$('export').addEventListener('click',async()=>{
  $('export').disabled=true;
  try {
    const res=await fetch('/api/admin/export',{credentials:'same-origin',cache:'no-store'});
    if(!res.ok)throw new Error(res.status===401?'Your session expired. Sign in again.':'Export could not be created.');
    const url=URL.createObjectURL(await res.blob());const a=document.createElement('a');a.href=url;a.download='slotline-bookings.csv';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
  } catch(e){notice($('admin-error'),e.message);}
  finally{$('export').disabled=false;}
});
(async()=>{
  try {
    await Slotline.token();const session=await api('/session');const catalog=await api('/catalog');
    $('demo-banner').classList.toggle('hidden',!catalog.demoData);signedIn(session.authenticated);if(session.authenticated)await load();
  }catch(e){signedIn(false);notice($('admin-error'),e.message);}
})();
