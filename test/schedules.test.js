const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const os=require('node:os');
const path=require('node:path');
const {createScheduleStore,validateEvent}=require('../lib/schedules');
const example={sport:'Basketball',date:'2026-11-03',start:'11:45',end:'12:25',place:'Main gym',detail:'All grades'};

test('intramurals store no teacher or level data; tryouts retain teacher and level',()=>{
 const intramural=validateEvent({...example,teacher:'irrelevant',level:'irrelevant'},'intramurals');
 assert(!('teacher' in intramural));assert(!('level' in intramural));
 const tryout=validateEvent({...example,level:'Junior girls',teacher:'Ms. Example'},'tryouts');
 assert.equal(tryout.level,'Junior girls');assert.equal(tryout.teacher,'Ms. Example');
});
test('rejects impossible dates, invalid times and incomplete forms',()=>{
 for(const change of [{date:'2026-02-30'},{date:'not-a-date'},{end:'11:00'},{start:'25:00'},{sport:''},{place:''}]){
  assert.throws(()=>validateEvent({...example,...change},'intramurals'));
 }
 assert.throws(()=>validateEvent(example,'tryouts'),/level/);
});
test('optional Classroom codes and multiline tryout information persist without affecting intramurals',t=>{
 const directory=fs.mkdtempSync(path.join(os.tmpdir(),'parkdale-tryout-info-'));t.after(()=>fs.rmSync(directory,{recursive:true,force:true}));
 const file=path.join(directory,'schedules.json'),store=createScheduleStore(file);
 const event={...example,level:'Senior girls',classroomCode:'abc1234',information:'Bring indoor shoes.\nPermission form required.'};
 const saved=store.change({revision:0,action:'upsert',category:'tryouts',event});
 const entry=createScheduleStore(file).read().tryouts.at(-1);
 assert.equal(entry.classroomCode,'abc1234');assert.equal(entry.information,event.information);
 const cleared=store.change({revision:saved.revision,action:'upsert',category:'tryouts',event:{...event,id:entry.id,classroomCode:'',information:''}});
 assert.equal(cleared.tryouts.at(-1).classroomCode,'');assert.equal(cleared.tryouts.at(-1).information,'');
 const original=validateEvent({...example,level:'Junior boys'},'tryouts');assert.equal(original.classroomCode,'');assert.equal(original.information,'');
 const intramural=validateEvent(event,'intramurals');assert(!('classroomCode'in intramural));assert(!('information'in intramural));
 assert.throws(()=>validateEvent({...event,information:'x'.repeat(2001)},'tryouts'),/information/);
});
test('add, edit and delete persist across reloads, protecting against stale writes',t=>{
 const directory=fs.mkdtempSync(path.join(os.tmpdir(),'parkdale-schedules-'));
 t.after(()=>fs.rmSync(directory,{recursive:true,force:true}));
 const file=path.join(directory,'schedules.json'),store=createScheduleStore(file);
 const initial=store.read();assert.equal(initial.revision,0);assert(initial.intramurals.every(x=>x.sample));
 const added=store.change({revision:0,action:'upsert',category:'intramurals',event:example});
 const id=added.intramurals.at(-1).id;assert.equal(added.revision,1);assert.equal(added.intramurals.at(-1).sample,false);
 assert.deepEqual(createScheduleStore(file).read(),added);
 assert.throws(()=>store.change({revision:0,action:'upsert',category:'intramurals',event:example}),/another window/);
 const edited=store.change({revision:1,action:'upsert',category:'intramurals',event:{...example,id,place:'Upper gym'}});
 assert.equal(edited.intramurals.find(x=>x.id===id).place,'Upper gym');
 const deleted=store.change({revision:2,action:'delete',category:'intramurals',id});
 assert(!deleted.intramurals.some(x=>x.id===id));assert.equal(deleted.revision,3);
 assert.throws(()=>store.change({revision:3,action:'delete',category:'intramurals',id}),/no longer exists/);
});
test('corrupt saved data does not silently reset to demonstration events',t=>{
 const directory=fs.mkdtempSync(path.join(os.tmpdir(),'parkdale-corrupt-'));t.after(()=>fs.rmSync(directory,{recursive:true,force:true}));
 const file=path.join(directory,'schedules.json');fs.writeFileSync(file,'not JSON');
 assert.throws(()=>createScheduleStore(file).read());assert.equal(fs.readFileSync(file,'utf8'),'not JSON');
});
