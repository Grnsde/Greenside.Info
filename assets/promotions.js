(function(root){
 'use strict';
 const names=['Underdog','Betr','DraftKings Pick6','PrizePicks','Sleeper','DraftKings DFS','Splash','Chalkboard','Dabble','Boom Fantasy','ParlayPlay'];
 const headers=['Platform','Promotion name','Original line','Boosted / discounted line','Discount percent','Status','Expiration date','Expiration time (Central)'];
 const blank=v=>v==null||String(v).trim()==='';
 const pad=n=>String(n).padStart(2,'0');
 const formatter=new Intl.DateTimeFormat('en-CA',{timeZone:'America/Chicago',year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',second:'2-digit',hourCycle:'h23'});
 function centralParts(value){const p=Object.fromEntries(formatter.formatToParts(new Date(value)).filter(p=>p.type!=='literal').map(p=>[p.type,p.value]));return `${p.year}-${p.month}-${p.day}T${p.hour}:${p.minute}:${p.second}`;}
 function centralISO(date,time){
  if(blank(date)&&blank(time))return null;
  if(blank(date)||blank(time))throw Error('Fill both expiration date and time, or leave both blank.');
  const dm=String(date).match(/^(\d{4})-(\d{2})-(\d{2})$/),tm=String(time).match(/^(\d{2}):(\d{2})(?::(\d{2}))?$/);
  if(!dm||!tm)throw Error('Use a valid expiration date and time.');
  const [y,m,d]=dm.slice(1).map(Number),[h,min,sec]=tm.slice(1).map(v=>Number(v||0));
  const base=Date.UTC(y,m-1,d,h,min,sec);
  if(y<1900||y>2100||m<1||m>12||d<1||new Date(base).getUTCDate()!==d||h>23||min>59||sec>59)throw Error('Invalid expiration date or time (years 1900–2100).');
  const wanted=`${y}-${pad(m)}-${pad(d)}T${pad(h)}:${pad(min)}:${pad(sec)}`;
  const matches=[5,6].map(offset=>base+offset*3600000).filter(t=>centralParts(t)===wanted);
  if(matches.length!==1)throw Error('This Central time is skipped or repeated during daylight saving changes. Choose an unambiguous time.');
  return new Date(matches[0]).toISOString();
 }
 function dateCell(v,date1904=false){
  if(blank(v))return '';
  if(typeof v==='number'){
   if(!Number.isFinite(v)||v<(date1904?0:1)||(!date1904&&Math.floor(v)===60))throw Error('Invalid Excel expiration date.');
   const epoch=Date.UTC(date1904?1904:1899,date1904?0:11,date1904?1:30);
   const serial=Math.floor(v)+(!date1904&&v<60?1:0);
   return new Date(epoch+serial*86400000).toISOString().slice(0,10);
  }
  const text=String(v).trim(),us=text.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  return us?`${us[3]}-${pad(us[1])}-${pad(us[2])}`:text;
 }
 function timeCell(v){
  if(blank(v))return '';
  if(typeof v==='number'){
   if(!Number.isFinite(v)||v<0||v>=1)throw Error('Expiration time must be a time only.');
   const seconds=Math.round(v*86400);
   if(seconds>=86400)throw Error('Use 12:00 AM with the next day for midnight.');
   return `${pad(Math.floor(seconds/3600))}:${pad(Math.floor(seconds/60)%60)}:${pad(seconds%60)}`;
  }
  const text=String(v).trim(),match=text.match(/^(\d{1,2}):(\d{2})(?::(\d{2}))?\s*(AM|PM)?$/i);
  if(!match)throw Error('Use a time such as 11:59 PM or 23:59.');
  let h=Number(match[1]); if(match[4]){if(h<1||h>12)throw Error('Invalid 12-hour expiration time.');h=h%12+(/pm/i.test(match[4])?12:0);}
  return `${pad(h)}:${match[2]}:${match[3]||'00'}`;
 }
 function numeric(v,label){if(blank(v))return null;if(typeof v==='boolean'||!Number.isFinite(Number(v)))throw Error(`${label} must be a number.`);return Number(v);}
 const key=p=>`${p.platform.toLowerCase()}\u0000${p.title.trim().toLowerCase()}`;
 function rowPayload(row,date1904=false){
  const platform=names.find(n=>n.toLowerCase()===String(row[0]||'').trim().toLowerCase());
  if(!platform)throw Error('Choose a supported platform.');
  const title=String(row[1]??'').trim();if(!title||title.length>180)throw Error('Promotion name is required and must be at most 180 characters.');
  const status=String(row[5]||'').trim().toLowerCase();if(!['active','expired'].includes(status))throw Error('Status must be active or expired.');
  const percent=numeric(row[4],'Discount percent');if(percent!=null&&(percent<0||percent>100))throw Error('Discount percent must be 0–100; enter 25 for 25%.');
  return {platform,title,original_line:numeric(row[2],'Original line'),boosted_line:numeric(row[3],'Discounted line'),discount_percent:percent,status,expires_at:centralISO(dateCell(row[6],date1904),timeCell(row[7]))};
 }
 function prepare(matrix,existing=[],date1904=false){
  if(!matrix.length||headers.some((h,i)=>String(matrix[0][i]||'').trim()!==h)||matrix[0].slice(8).some(v=>!blank(v)))throw Error('Use the unchanged headings on the Promotions tab of the template.');
  if(matrix.length>501)throw Error('Import at most 500 rows at a time.');
  const seen=new Set(existing.map(key)),rows=[],errors=[];let skipped=0;
  matrix.slice(1).forEach((r,i)=>{if(r.every(blank))return;try{if(r.slice(8).some(v=>!blank(v)))throw Error('Remove values outside the eight template columns.');const p=rowPayload(r,date1904);const k=key(p);if(seen.has(k)){skipped++;return;}seen.add(k);rows.push(p);}catch(e){errors.push(`Row ${i+2}: ${e.message}`);}});
  return {rows,errors,skipped};
 }
 function expired(p,now=Date.now()){return p.expires_at!=null&&(!Number.isFinite(Date.parse(p.expires_at))||Date.parse(p.expires_at)<=now);}
 function countdown(expires,now=Date.now()){
  if(!expires)return 'No set expiry';
  let seconds=Math.max(0,Math.ceil((Date.parse(expires)-now)/1000));if(!Number.isFinite(seconds)||!seconds)return 'Expired';
  const days=Math.floor(seconds/86400);seconds%=86400;const hours=Math.floor(seconds/3600);seconds%=3600;
  return `${days?days+'d ':''}${pad(hours)}:${pad(Math.floor(seconds/60))}:${pad(seconds%60)}`;
 }
 root.GSPromos={names,headers,centralParts,centralISO,dateCell,timeCell,key,rowPayload,prepare,expired,countdown};
})(globalThis);
