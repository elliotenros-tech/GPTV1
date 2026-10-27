const $=selector=>document.querySelector(selector);
const escapeHtml=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
let editorToken='', saved=null, busy=false;
const form=$('#event-form');
const category=()=>$('#category').value;
function status(text,error=false){$('#editor-status').textContent=text;$('#editor-status').classList.toggle('error',error);}
async function request(url,options={}){
 const response=await fetch(url,{...options,headers:{'Content-Type':'application/json',Authorization:'Bearer '+editorToken,...options.headers},cache:'no-store'});
 const data=await response.json();
 if(!response.ok){if(response.status===401)lock();throw Error(data.error||'Request failed.');}
 return data;
}
function lock(){editorToken='';saved=null;$('#editor-workspace').hidden=true;$('#unlock-panel').hidden=false;$('#lock-editor').hidden=true;$('#editor-code').value='';}
function resetForm(){
 form.reset();form.elements.id.value='';
 const tryout=category()==='tryouts';
 $('#tryout-fields').hidden=!tryout;$('#level').required=tryout;
 $('#level').disabled=!tryout;$('#teacher').disabled=!tryout;
 $('#detail-label').hidden=tryout;$('#detail').disabled=tryout;
 $('#form-title').textContent=tryout?'Add tryout':'Add intramural';
 $('#cancel-edit').textContent='Clear';
}
function listEvents(){
 const items=[...(saved?.[category()]||[])].sort((a,b)=>a.date.localeCompare(b.date)||a.start.localeCompare(b.start));
 $('#event-list').innerHTML=items.length?items.map(event=>`<article class="editor-event"><div><strong>${escapeHtml(event.sport)}</strong>${event.sample?'<span class="sample-tag">Sample</span>':''}<p>${escapeHtml(event.date)} · ${escapeHtml(event.start)}–${escapeHtml(event.end)}</p><p>${escapeHtml(event.place)}${category()==='tryouts'?' · '+escapeHtml(event.level):''}</p></div><div class="event-actions"><button class="refresh-games" data-edit="${escapeHtml(event.id)}" aria-label="Edit ${escapeHtml(event.sport)} on ${escapeHtml(event.date)}">Edit</button><button class="delete-button" data-delete="${escapeHtml(event.id)}" aria-label="Delete ${escapeHtml(event.sport)} on ${escapeHtml(event.date)}">Delete</button></div></article>`).join(''):'<p class="editor-hint">No events. Add one using the form.</p>';
}
async function loadList(){saved=await request('/api/schedules');listEvents();}
function setBusy(value){busy=value;$('#save-event').disabled=value;$('#category').disabled=value;$('#reload-list').disabled=value;$('#new-event').disabled=value;}
$('#unlock-form').addEventListener('submit',async event=>{
 event.preventDefault();editorToken=$('#editor-code').value.trim();
 try{await request('/api/editor/session',{method:'POST'});await loadList();$('#unlock-panel').hidden=true;$('#editor-workspace').hidden=false;$('#lock-editor').hidden=false;$('#editor-code').value='';resetForm();status('');}
 catch(error){status(error.message,true);}
});
$('#lock-editor').addEventListener('click',()=>{lock();status('Editor locked.');});
$('#category').addEventListener('change',()=>{resetForm();listEvents();status('');});
$('#new-event').addEventListener('click',()=>{if(busy)return;resetForm();$('#sport').focus();status('');});
$('#cancel-edit').addEventListener('click',()=>{if(busy)return;resetForm();status('');});
$('#reload-list').addEventListener('click',async()=>{if(busy)return;setBusy(true);try{await loadList();status('List reloaded. Check your details before saving.');}catch(error){status(error.message,true);}finally{setBusy(false);}});
$('#event-list').addEventListener('click',async event=>{
 const edit=event.target.closest('[data-edit]'),remove=event.target.closest('[data-delete]');
 if((!edit&&!remove)||busy)return;
 const id=edit?.dataset.edit||remove.dataset.delete;
 const entry=saved[category()].find(x=>x.id===id);if(!entry)return;
 if(edit){resetForm();for(const [key,value] of Object.entries(entry)){if(form.elements[key])form.elements[key].value=value;}$('#form-title').textContent=category()==='tryouts'?'Edit tryout':'Edit intramural';$('#cancel-edit').textContent='Cancel';$('#sport').focus();status('');return;}
 if(!confirm(`Delete ${entry.sport} on ${entry.date}?`))return;
 setBusy(true);
 try{saved=await request('/api/schedules',{method:'POST',body:JSON.stringify({revision:saved.revision,category:category(),action:'delete',id})});listEvents();if(form.elements.id.value===id)resetForm();status('Event deleted.');}
 catch(error){status(error.message,true);}finally{setBusy(false);}
});
form.addEventListener('submit',async event=>{
 event.preventDefault();if(busy||!form.reportValidity())return;
 const input=Object.fromEntries(new FormData(form));
 if(input.end<=input.start){status('End time must be after start time.',true);return;}
 setBusy(true);
 try{saved=await request('/api/schedules',{method:'POST',body:JSON.stringify({revision:saved.revision,category:category(),action:'upsert',event:input})});listEvents();resetForm();status('Saved. The athletics page will show your changes.');}
 catch(error){status(error.message,true);}finally{setBusy(false);}
});
resetForm();
