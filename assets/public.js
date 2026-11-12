
window.GREENSIDE_CONFIGURED=!!(window.GS_CONFIG && window.GS_CONFIG.url && window.GS_CONFIG.key);
window.gsClient=window.GREENSIDE_CONFIGURED&&window.supabase?supabase.createClient(window.GS_CONFIG.url,window.GS_CONFIG.key):null;
// Promotion data comes from the existing Supabase table.
let platforms=[];
const palette={"Underdog": {"color": "#ffd60a", "shade": "#574800", "ink": "#151600"}, "Betr": {"color": "#742bb0", "shade": "#341347"}, "DraftKings Pick6": {"color": "#d56812", "shade": "#4c2309"}, "PrizePicks": {"color": "#a43df1", "shade": "#39134f"}, "Sleeper": {"color": "#2766b8", "shade": "#102e56"}, "DraftKings DFS": {"color": "#25c83c", "shade": "#0a4a1e"}, "Splash": {"color": "#00bfe9", "shade": "#064454", "ink": "#06212a"}, "Chalkboard": {"color": "#568c39", "shade": "#233e1c"}, "Dabble": {"color": "#bc86ed", "shade": "#3a2450", "ink": "#180d28"}, "Boom Fantasy": {"color": "#78a4e5", "shade": "#203e5e", "ink": "#06192b"}, "ParlayPlay": {"color": "#ffbd0c", "shade": "#574006", "ink": "#241900"}};
async function loadPromotions(){
 const root=document.getElementById('grid');
 if(!window.gsClient){root.textContent='Unable to connect. Check your internet connection and website configuration, then refresh.';return}
 try{
  const data=[];
  for(let start=0;;start+=1000){
   const {data:batch,error}=await window.gsClient.from('promotions').select('id,platform,title,original_line,boosted_line,discount_percent,expires_at').eq('status','active').or('expires_at.is.null,expires_at.gt.'+new Date().toISOString()).order('created_at',{ascending:false}).order('id').range(start,start+999);
   if(error)throw error;
   data.push(...batch);if(batch.length<1000)break;
  }
  platforms=Object.entries(palette).map(([name,style])=>({...style,name,offers:(data||[]).filter(x=>x.platform===name).map(x=>[x.title,x.original_line,x.boosted_line,x.discount_percent == null ? null : String(x.discount_percent)+'%',x.expires_at])}));
  render();
 }catch(e){root.textContent='Could not load promotions: '+e.message}
}

let selected='All Apps';const filters=document.getElementById('filters'),grid=document.getElementById('grid'),search=document.getElementById('search');
function pct(row){if(row[3])return row[3];if(typeof row[1]==='number'&&typeof row[2]==='number'&&row[1]!==0)return ((row[1]-row[2])/row[1]*100).toFixed(2)+'%';return '—'}
function cell(value){return value===null||value===undefined?'—':String(value)}
function render(){const term=search.value.toLowerCase().trim();filters.replaceChildren();for(const name of ['All Apps',...platforms.map(p=>p.name)]){const b=document.createElement('button');b.textContent=name;b.className=name===selected?'active':'';b.setAttribute('aria-pressed',name===selected);b.onclick=()=>{selected=name;render()};filters.append(b)}grid.replaceChildren();let shown=0;for(const p of platforms){if(selected!=='All Apps'&&selected!==p.name)continue;const active=p.offers.filter(r=>!GSPromos.expired({expires_at:r[4]}));const matched=active.filter(r=>r[0].toLowerCase().includes(term));if(term&&!p.name.toLowerCase().includes(term)&&!matched.length)continue;const rows=term&&!p.name.toLowerCase().includes(term)?matched:active;const card=document.createElement('article');card.className='card';card.style.setProperty('--accent',p.color);card.style.setProperty('--shade',p.shade);card.style.setProperty('--ink',p.ink||'#fff');const title=document.createElement('h2');title.textContent=p.name;const content=document.createElement('div');content.className='content';const count=document.createElement('div');count.className='count';count.textContent=rows.length+' promotion'+(rows.length===1?'':'s');content.append(count);if(rows.length){const scroll=document.createElement('div');scroll.className='table-scroll';const table=document.createElement('table');const thead=document.createElement('thead');const head=document.createElement('tr');for(const label of ['Boost / Discount','Normal','Discount','%','Expires in']){const th=document.createElement('th');th.textContent=label;head.append(th)}thead.append(head);table.append(thead);const tbody=document.createElement('tbody');for(const row of rows){const tr=document.createElement('tr');for(const value of [row[0],cell(row[1]),cell(row[2]),pct(row)]){const td=document.createElement('td');td.textContent=value;tr.append(td)}const timer=document.createElement('td');timer.className='expiry';if(row[4]){timer.dataset.expires=row[4];timer.title='Expires '+new Date(row[4]).toLocaleString(undefined,{timeZone:'America/Chicago'})+' Central';}timer.textContent=GSPromos.countdown(row[4]);tr.append(timer);tbody.append(tr)}table.append(tbody);scroll.append(table);content.append(scroll)}else{const empty=document.createElement('div');empty.className='empty';empty.textContent='No promotions listed yet.';content.append(empty)}card.append(title,content);grid.append(card);shown++}if(!shown){const message=document.createElement('p');message.textContent='No matching promotions found.';grid.append(message)}}search.addEventListener('input',render);loadPromotions();

function tick(){let changed=false;for(const e of document.querySelectorAll('[data-expires]')){if(GSPromos.expired({expires_at:e.dataset.expires})){changed=true;break;}e.textContent=GSPromos.countdown(e.dataset.expires);}if(changed)render();}
setInterval(tick,1000);document.addEventListener('visibilitychange',()=>{if(!document.hidden)tick();});
