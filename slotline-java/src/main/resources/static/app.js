'use strict';
const {api,money,escape:esc,date:formatDate,notice,icon,badge}=Slotline;
const $=id=>document.getElementById(id);
const state={catalog:null,items:new Map([['website',1]]),scope:'standard',extras:new Set(['docs']),priority:false,quote:null,step:1,date:'',time:'',quoteGeneration:0,slotGeneration:0,key:null,lastPayload:null};
let quoteTimer;
function showError(message) { notice($('global-error'),message); }
function renderServices() {
  $('service-grid').innerHTML=state.catalog.services.map(s=>{
    const selected=state.items.has(s.id);
    return `<div class="service-card ${selected?'selected':''}" data-service="${s.id}" role="checkbox" aria-checked="${selected}" tabindex="0"><div class="service-card-top"><span class="service-icon">${icon(s.icon)}</span><span class="service-check">✓</span></div><h3>${esc(s.name)}</h3><p>${esc(s.description)}</p><div class="service-card-bottom"><span class="service-price"><small>from </small>${money(s.price).replace('.00','')}</span>${selected?`<div class="quantity"><button data-quantity="-1" data-id="${s.id}" aria-label="Decrease ${esc(s.name)} quantity" ${state.items.get(s.id)===1?'disabled':''}>−</button><span aria-label="Quantity">${state.items.get(s.id)}</span><button data-quantity="1" data-id="${s.id}" aria-label="Increase ${esc(s.name)} quantity" ${state.items.get(s.id)===5?'disabled':''}>+</button></div>`:''}</div></div>`;
  }).join('');
}
function changeService(id) {
  if(state.items.has(id)) state.items.delete(id);else state.items.set(id,1);
  renderServices();scheduleQuote();
}
$('service-grid').addEventListener('click',e=>{
  const quantity=e.target.closest('[data-quantity]');
  if(quantity) { const n=state.items.get(quantity.dataset.id)+Number(quantity.dataset.quantity);if(n>=1&&n<=5)state.items.set(quantity.dataset.id,n);renderServices();scheduleQuote();return; }
  const card=e.target.closest('[data-service]');if(card)changeService(card.dataset.service);
});
$('service-grid').addEventListener('keydown',e=>{if((e.key==='Enter'||e.key===' ')&&e.target.matches('[data-service]')){e.preventDefault();changeService(e.target.dataset.service);}});
document.querySelectorAll('[data-scope]').forEach(button=>button.addEventListener('click',()=>{
  state.scope=button.dataset.scope;document.querySelectorAll('[data-scope]').forEach(b=>{b.classList.toggle('selected',b===button);b.setAttribute('aria-pressed',b===button);});scheduleQuote();
}));
$('extras-list').addEventListener('change',e=>{if(e.target.checked)state.extras.add(e.target.value);else state.extras.delete(e.target.value);scheduleQuote();});
$('priority').addEventListener('change',e=>{state.priority=e.target.checked;scheduleQuote();});
function renderQuote() {
  const q=state.quote;const amount=Number(q?.total||0).toFixed(2).split('.');
  $('quote-price').innerHTML=`${money(Number(amount[0])).replace('.00','')}<span>.${amount[1]}</span>`;
  $('quote-lines').innerHTML=q?q.lines.map(l=>`<div class="quote-row"><span>${esc(l.label)}${l.quantity>1?` × ${l.quantity}`:''}</span><b>${money(l.total)}</b></div>`).join(''):'<p>Choose a service to start your quote.</p>';
  $('priority-line').classList.toggle('hidden',!q?.priority);$('priority-amount').textContent=money(q?.priorityFee||0);
  $('quote-total').textContent=money(q?.total||0);$('quote-deposit').textContent=money(q?.deposit||0);$('quote-balance').textContent=money(q?.balance||0);
  $('to-schedule').disabled=!q;
  $('quote-status').textContent=q?'Calculated by the server · valid for 24 hours. Deposit and balance are shown for planning; no charge is made.':'Choose a service to calculate your quote.';
}
function scheduleQuote() {
  clearTimeout(quoteTimer);state.quote=null;state.quoteGeneration++;renderQuote();
  if(!state.items.size)return;
  $('quote-status').textContent='Calculating your quote…';
  quoteTimer=setTimeout(refreshQuote,250);
}
async function refreshQuote() {
  const generation=state.quoteGeneration;
  try {
    const q=await api('/quotes',{method:'POST',body:{items:[...state.items].map(([serviceId,quantity])=>({serviceId,quantity})),scope:state.scope,extras:[...state.extras],priority:state.priority}});
    if(generation!==state.quoteGeneration)return;
    state.quote=q;showError('');renderQuote();
  } catch(e) {if(generation===state.quoteGeneration){showError(e.message);$('quote-status').textContent='Quote unavailable. Change a selection to try again.';}}
}
function step(n) {
  state.step=n;document.querySelectorAll('.form-step').forEach((el,i)=>el.classList.toggle('hidden',i+1!==n));
  document.querySelectorAll('.step').forEach(b=>{
    const number=Number(b.dataset.step);b.classList.toggle('active',number===n);b.classList.toggle('complete',number<n);b.disabled=number>n;
    if(number===n)b.setAttribute('aria-current','step');else b.removeAttribute('aria-current');
  });
  showError('');$('kickoff-summary').classList.toggle('hidden',!state.time);
  if(state.time)$('kickoff-summary').innerHTML=`<strong>YOUR KICKOFF</strong>${esc(formatDate(state.date))} · ${esc(state.time)}<br><span class="muted small">${esc(state.catalog.zone)} · 30 minutes</span>`;
  document.querySelector('.steps').scrollIntoView({behavior:'smooth',block:'start'});
}
document.querySelectorAll('[data-back]').forEach(b=>b.addEventListener('click',()=>step(Number(b.dataset.back))));
document.querySelectorAll('.step').forEach(b=>b.addEventListener('click',()=>{if(Number(b.dataset.step)<=state.step)step(Number(b.dataset.step));}));
$('to-schedule').addEventListener('click',()=>{step(2);loadSlots();});
$('to-details').addEventListener('click',()=>{if(state.time)step(3);});
$('kickoff-date').addEventListener('change',e=>{state.date=e.target.value;loadSlots();});
async function loadSlots() {
  state.time='';$('to-details').disabled=true;const generation=++state.slotGeneration;
  if(!state.date){$('slots').innerHTML='<p class="muted small">Choose a date to see available times.</p>';return;}
  $('slots').innerHTML='<p class="muted small">Checking availability…</p>';
  try {
    const data=await api('/availability?date='+encodeURIComponent(state.date));
    if(generation!==state.slotGeneration)return;
    $('slots').innerHTML=data.slots.length?data.slots.map(t=>`<button class="time-slot" data-time="${t}" aria-pressed="false">${t}</button>`).join(''):'<p class="muted small">No kickoff slots on this date. Please choose another weekday.</p>';
  } catch(e) {if(generation===state.slotGeneration)$('slots').innerHTML=`<p class="muted small">${esc(e.message)}</p>`;}
}
$('slots').addEventListener('click',e=>{const b=e.target.closest('[data-time]');if(!b)return;state.time=b.dataset.time;document.querySelectorAll('[data-time]').forEach(x=>{x.classList.toggle('selected',x===b);x.setAttribute('aria-pressed',x===b);});$('to-details').disabled=false;});
$('booking-form').addEventListener('submit',async e=>{
  e.preventDefault();if(!state.quote){notice($('submit-error'),'Your quote is unavailable. Please return to services.');return;}
  const fields=Object.fromEntries(new FormData(e.target));
  const body={quoteId:state.quote.id,...fields,date:state.date,time:state.time};
  const fingerprint=JSON.stringify(body);
  if(state.lastPayload!==fingerprint){state.key=crypto.randomUUID();state.lastPayload=fingerprint;}
  const button=$('submit-booking');button.disabled=true;button.textContent='Sending your request…';notice($('submit-error'),'');
  try {const result=await api('/bookings',{method:'POST',headers:{'Idempotency-Key':state.key},body});confirmation(result);}
  catch(error){
    notice($('submit-error'),error.details?.length?error.details.join(' · '):error.message);
    if(error.status===410){step(1);scheduleQuote();showError(error.message);}
    else if(error.status===409){step(2);loadSlots();showError(error.message);}
  } finally{button.disabled=false;button.innerHTML='Request booking <span>↗</span>';}
});
function confirmation(result) {
  const b=result.booking;const link=location.origin+'/booking.html#'+new URLSearchParams({ref:b.reference,token:result.accessToken});
  $('booking-layout').classList.add('hidden');document.querySelector('.steps').classList.add('hidden');
  $('confirmation').classList.remove('hidden');
  $('confirmation').innerHTML=`<div class="success-mark">✓</div><div class="eyebrow">A GOOD PLACE TO START</div><h2>Your request is on the board.</h2><p>Thanks, ${esc(b.clientName)}. Your kickoff slot has been reserved while the admin reviews your brief. Save the private tracking link below to check for confirmation. No email has been sent by this demo.</p><div class="receipt"><div class="receipt-header"><span class="receipt-reference">${esc(b.reference)}</span>${badge(b.status)}</div><div class="receipt-grid"><div><small>KICKOFF CALL</small>${esc(formatDate(b.date))} · ${esc(b.time)}<br><span class="muted small">${esc(b.zone)} · 30 minutes</span></div><div><small>PROJECT CONTACT</small>${esc(b.email)}<br>${esc(b.company||'Independent project')}</div></div><div class="receipt-lines">${b.quote.lines.map(l=>`<div class="quote-row"><span>${esc(l.label)}${l.quantity>1?' × '+l.quantity:''}</span><b>${money(l.total)}</b></div>`).join('')}${b.quote.priority?`<div class="quote-row"><span>Priority handover</span><b>${money(b.quote.priorityFee)}</b></div>`:''}<div class="quote-row"><span>Project total</span><b>${money(b.quote.total)}</b></div><div class="quote-row"><span>50% deposit / remaining balance</span><b>${money(b.quote.deposit)} / ${money(b.quote.balance)}</b></div></div></div><div class="confirmation-actions"><a class="button primary" href="${esc(link)}">Track your booking ↗</a><button class="button secondary" id="copy-link">Copy private link</button><button class="button secondary" id="print-receipt">Print quote</button></div><p id="copy-status" class="private-link" role="status">This link grants access to your booking details. Keep it private.</p>`;
  $('copy-link').addEventListener('click',async()=>{try{await navigator.clipboard.writeText(link);$('copy-status').textContent='Private tracking link copied.';}catch{$('copy-status').textContent=link;}});
  $('print-receipt').addEventListener('click',()=>window.print());
  $('confirmation').scrollIntoView({behavior:'smooth',block:'start'});
}
(async()=>{
  try {
    state.catalog=await api('/catalog');renderServices();
    $('extras-list').innerHTML=state.catalog.extras.map(e=>`<label class="extra-row"><input type="checkbox" value="${e.id}" ${state.extras.has(e.id)?'checked':''}><span>${esc(e.name)}</span><b>+${money(e.price).replace('.00','')}</b></label>`).join('');
    $('kickoff-date').min=state.catalog.today;$('kickoff-date').max=state.catalog.lastDate;
    const d=new Date(state.catalog.today+'T12:00:00');d.setDate(d.getDate()+1);while([0,6].includes(d.getDay()))d.setDate(d.getDate()+1);
    state.date=`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;$('kickoff-date').value=state.date;
    $('zone-label').textContent='All kickoff times are in '+state.catalog.zone+'. Weekdays only, within the next 30 days.';
    document.querySelectorAll('[data-scope]').forEach(b=>b.setAttribute('aria-pressed',b.dataset.scope===state.scope));
    await Slotline.token();scheduleQuote();
  }catch(e){showError('Could not load the booking workspace. '+e.message);}
})();
