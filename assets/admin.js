'use strict';
const $=id=>document.getElementById(id), P=GSPromos;
for(const name of P.names){const o=document.createElement('option');o.value=o.textContent=name;$('platform').append(o);}
const cfg=window.GS_CONFIG||{};
const client=cfg.url&&cfg.key&&window.supabase?supabase.createClient(cfg.url,cfg.key):null;
let offers=[],editing=null,authorized=false,staged=null,previewVersion=0,saving=false;
const msg=(id,text,bad=false)=>{const e=$(id);e.textContent=text;e.classList.toggle('error',bad);};
const val=id=>$(id).value.trim();
const friendly=e=>/expires_at|schema cache/i.test(e.message||'')?'Expiration setup is missing. Run the supplied Supabase setup SQL, then refresh.':e.message||'Request failed. Please try again.';
function clearPreview(){previewVersion++;staged=null;$('importPreview').replaceChildren();$('importSave').disabled=true;}
async function allOffers(){let result=[];for(let start=0;;start+=1000){const {data,error}=await client.from('promotions').select('*').order('created_at',{ascending:false}).order('id').range(start,start+999);if(error)throw error;result.push(...data);if(data.length<1000)return result;}}
function draw(){
 const list=$('offers');list.replaceChildren();if(!offers.length){list.textContent='No promotions yet. Add or import your first promotion.';return;}
 for(const item of offers){
  const row=document.createElement('div');row.className='offer';const info=document.createElement('div'),title=document.createElement('strong'),meta=document.createElement('small');title.textContent=`${item.platform} — ${item.title}`;
  meta.textContent=[P.expired(item)?'Expired by timer':item.status,item.original_line==null?'':`Normal: ${item.original_line}`,item.boosted_line==null?'':`Discount: ${item.boosted_line}`,item.discount_percent==null?'':`${item.discount_percent}%`,item.expires_at?`Expires ${P.centralParts(item.expires_at).replace('T',' ')} Central`:'No set expiry'].filter(Boolean).join(' · ');
  info.append(title,meta);const actions=document.createElement('div');actions.className='actions';
  const edit=document.createElement('button');edit.textContent='Edit';edit.className='secondary';edit.onclick=()=>showEditor(item);
  const del=document.createElement('button');del.textContent='Delete';del.className='danger';del.onclick=async()=>{if(!authorized||saving||!confirm('Permanently delete this promotion?'))return;del.disabled=true;try{const {error}=await client.from('promotions').delete().eq('id',item.id);if(error)throw error;await load();}catch(e){msg('message',friendly(e),true);}finally{del.disabled=false;}};
  actions.append(edit,del);row.append(info,actions);list.append(row);
 }
}
async function load(){offers=await allOffers();draw();msg('message',`${offers.length} promotions loaded.`);}
function showEditor(item=null){
 editing=item?.id||null;$('formTitle').textContent=item?'Edit promotion':'New promotion';$('promoForm').reset();
 if(item){$('platform').value=item.platform;$('title').value=item.title;$('normal').value=item.original_line??'';$('discount').value=item.boosted_line??'';$('boost').value=item.discount_percent??'';$('status').value=item.status;
  if(item.expires_at){const central=P.centralParts(item.expires_at);$('expiryDate').value=central.slice(0,10);$('expiryTime').value=central.slice(11);}}
 $('editor').classList.remove('hidden');$('title').focus();
}
async function check(){
 authorized=false;if(!client){msg('loginMsg','Unable to connect. Check your connection and config.js.',true);return;}
 const {data:{session},error}=await client.auth.getSession();if(error)throw error;
 if(!session||session.user.id!=='4bd7126b-bb0c-44f4-b736-4041188e1fc5'){
  if(session)await client.auth.signOut();$('login').classList.remove('hidden');$('dashboard').classList.add('hidden');offers=[];clearPreview();$('editor').classList.add('hidden');
  if(session)msg('loginMsg','This account is not authorized as an admin.',true);return;
 }
 authorized=true;$('login').classList.add('hidden');$('dashboard').classList.remove('hidden');await load();
}
$('signIn').onclick=async()=>{if(!client)return;const button=$('signIn');button.disabled=true;try{msg('loginMsg','Signing in…');const {error}=await client.auth.signInWithPassword({email:val('email'),password:$('password').value});if(error)throw error;$('password').value='';await check();}catch(e){msg('loginMsg',friendly(e),true);}finally{button.disabled=false;}};
$('signOut').onclick=async()=>{if(saving)return;try{const {error}=await client.auth.signOut();if(error)throw error;await check();}catch(e){msg('message',friendly(e),true);}};
$('newBtn').onclick=()=>showEditor();$('cancel').onclick=()=>$('editor').classList.add('hidden');$('reload').onclick=()=>load().catch(e=>msg('message',friendly(e),true));
$('promoForm').onsubmit=async e=>{
 e.preventDefault();if(!authorized||saving)return;const btn=$('save');
 try{
  const payload=P.rowPayload([val('platform'),val('title'),val('normal'),val('discount'),val('boost'),val('status'),val('expiryDate'),val('expiryTime')]);
  saving=true;btn.disabled=true;const q=editing?client.from('promotions').update(payload).eq('id',editing):client.from('promotions').insert(payload);const {error}=await q;if(error)throw error;
  $('editor').classList.add('hidden');clearPreview();await load();msg('message','Promotion saved successfully.');
 }catch(e){msg('message',friendly(e),true);}finally{saving=false;btn.disabled=false;}
};
$('importFile').onchange=()=>{clearPreview();msg('importMsg','');};
function previewTable(rows){
 const table=document.createElement('table'),head=document.createElement('thead'),hr=document.createElement('tr');
 for(const label of ['Platform','Promotion','Normal','Discount','%','Status','Expires (Central)']){const th=document.createElement('th');th.textContent=label;hr.append(th);}head.append(hr);table.append(head);const body=document.createElement('tbody');
 for(const p of rows){const tr=document.createElement('tr');for(const value of [p.platform,p.title,p.original_line??'—',p.boosted_line??'—',p.discount_percent??'—',P.expired(p)?'Expired by timer':p.status,p.expires_at?P.centralParts(p.expires_at).replace('T',' '):'No set expiry']){const td=document.createElement('td');td.textContent=value;tr.append(td);}body.append(tr);}table.append(body);return table;
}
$('importPreviewBtn').onclick=async()=>{
 clearPreview();if(!authorized||saving)return;const token=previewVersion,button=$('importPreviewBtn');button.disabled=true;
 try{
  if(!window.XLSX)throw Error('Excel reader did not load. Check your internet connection, then refresh.');
  const file=$('importFile').files[0];if(!file)throw Error('Choose your filled .xlsx template first.');
  if(!/\.xlsx$/i.test(file.name))throw Error('Save your file as .xlsx first.');if(file.size>5*1024*1024)throw Error('Use a file smaller than 5 MB.');
  const book=XLSX.read(await file.arrayBuffer(),{type:'array',cellDates:false,cellFormula:true,sheetRows:502});
  const sheet=book.Sheets.Promotions;if(!sheet)throw Error('The workbook needs a Promotions tab. Use the supplied template.');
  const extent=XLSX.utils.decode_range(sheet['!fullref']||sheet['!ref']||'A1');if(extent.e.r>500)throw Error('Import at most 500 rows at a time.');
  for(const [address,cell] of Object.entries(sheet)){if(address.startsWith('!'))continue;if(cell.f||cell.t==='e')throw Error(`Cell ${address}: use plain values, not formulas or Excel errors.`);if(address.match(/^[I-Z]|^[A-Z]{2}/)&&cell.v!=null&&String(cell.v).trim())throw Error('Remove values outside the eight template columns.');}
  const matrix=XLSX.utils.sheet_to_json(sheet,{header:1,raw:true,defval:null,blankrows:true});
  const existing=await allOffers();if(token!==previewVersion||!authorized)return;
  const date1904=!!book.Workbook?.WBProps?.date1904,result=P.prepare(matrix,existing,date1904);
  $('importPreview').append(previewTable(result.rows));
  if(result.errors.length)throw Error(`${result.errors.slice(0,20).join('\n')}${result.errors.length>20?'\nMore errors exist.':''}\nNothing will be imported until all rows are valid.`);
  const message=`${result.rows.length} new promotions ready. ${result.skipped} duplicates skipped (same platform and title).`;
  msg('importMsg',message+(result.rows.some(p=>P.expired(p))?' Offers with past expiration times will stay hidden.':''));
  if(!result.rows.length)return;
  staged={matrix,date1904,token};$('importSave').disabled=false;
 }catch(e){if(token===previewVersion){staged=null;$('importSave').disabled=true;msg('importMsg',friendly(e),true);}}finally{button.disabled=false;}
};
$('importSave').onclick=async()=>{
 if(!staged||!authorized||saving)return;const stage=staged;const button=$('importSave');button.disabled=true;saving=true;
 try{
  const existing=await allOffers();if(!authorized||stage.token!==previewVersion)throw Error('Preview this file again before saving.');
  const result=P.prepare(stage.matrix,existing,stage.date1904);if(result.errors.length)throw Error(result.errors.join('\n'));
  if(!result.rows.length){clearPreview();msg('importMsg','These promotions already exist. Nothing was added.');return;}
  if(!confirm(`Add ${result.rows.length} new promotions? Existing promotions will not be changed. Offers with past expiration times will stay hidden.`)){button.disabled=false;return;}
  // One bulk insert is atomic: a database validation error cannot save a partial batch.
  const {error}=await client.from('promotions').insert(result.rows);if(error)throw error;
  clearPreview();$('importFile').value='';msg('importMsg',`${result.rows.length} promotions imported successfully.`);await load();
 }catch(e){clearPreview();msg('importMsg',friendly(e)+' Refresh the promotion list to check what was saved before previewing again.',true);}
 finally{saving=false;$('importSave').disabled=!staged;}
};
check().catch(e=>msg('loginMsg',friendly(e),true));
