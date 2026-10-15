'use strict';
const {api,money,escape:esc,date:formatDate,notice,badge,timeline}=Slotline;
const params=new URLSearchParams(location.hash.slice(1));
const reference=params.get('ref'),access=params.get('token');
async function refresh() {
  if(!reference||!access)return;
  const button=document.getElementById('tracking-refresh');button.disabled=true;
  try {
    const b=await api('/bookings/'+encodeURIComponent(reference),{headers:{'X-Booking-Token':access}});
    notice(document.getElementById('tracking-message'),'');
    document.getElementById('tracking-content').innerHTML=`<section class="tracking-card"><div class="receipt-header"><strong class="receipt-reference">${esc(b.reference)}</strong>${badge(b.status)}</div><h2>${esc(b.clientName)}</h2><div class="receipt-grid"><div><small>KICKOFF</small>${esc(formatDate(b.date))} · ${esc(b.time)}<br><span class="muted small">${esc(b.zone)} · 30 minutes</span></div><div><small>PROJECT TOTAL</small>${money(b.quote.total)} USD<br><span class="muted small">Deposit ${money(b.quote.deposit)} · balance ${money(b.quote.balance)}</span></div></div><section class="detail-block"><h3>Your services</h3><p class="brief-text">${b.quote.lines.map(l=>esc(l.label)+(l.quantity>1?' × '+l.quantity:'')).join('<br>')}</p></section><section class="detail-block"><h3>Your brief</h3><p class="brief-text">${esc(b.brief)}</p></section><section class="detail-block"><h3>Activity</h3>${timeline(b)}</section></section>`;
    button.classList.remove('hidden');
  }catch(e){const el=document.getElementById('tracking-message');el.classList.remove('info');el.classList.add('error');notice(el,e.message);}
  finally{button.disabled=false;}
}
document.getElementById('tracking-refresh').addEventListener('click',refresh);
refresh();
