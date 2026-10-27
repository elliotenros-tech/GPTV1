const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const os = require('node:os');
const seed = require('../data/schedules-seed.json');
const fail = (message,status=400) => Object.assign(new Error(message),{status});

function validateEvent(input, category) {
  if (!input || typeof input !== 'object') throw fail('Enter event details.');
  function text(key,required=false,max=120) {
    const value = input[key] ?? '';
    if(typeof value !== 'string' || value.trim().length>max || (required&&!value.trim())) throw fail(`Check the ${key} field.`);
    return value.trim();
  }
  const event = {sport:text('sport',true,60),date:text('date',true,10),start:text('start',true,5),end:text('end',true,5),place:text('place',true),detail:text('detail',false,120)};
  if(!/^\d{4}-\d{2}-\d{2}$/.test(event.date)||!Number.isFinite(Date.parse(event.date+'T12:00:00Z'))||new Date(event.date+'T12:00:00Z').toISOString().slice(0,10)!==event.date)throw fail('Enter a valid date.');
  if(![event.start,event.end].every(t=>/^([01]\d|2[0-3]):[0-5]\d$/.test(t))||event.end<=event.start)throw fail('End time must be after start time on the same day.');
  if(category==='tryouts'){
    event.level=text('level',true,80);event.teacher=text('teacher',false,80);
    event.classroomCode=text('classroomCode',false,40);
    event.information=text('information',false,2000);
  }
  return event;
}

const defaultFile = process.platform==='darwin'
  ? path.join(os.homedir(),'Library/Application Support/ParkdaleAthletics/schedules.json')
  : path.join(__dirname,'../data/schedules.local.json');
function createScheduleStore(file = process.env.SCHEDULES_FILE || defaultFile) {
  function read() {
    if(!fs.existsSync(file))return structuredClone(seed);
    const data=JSON.parse(fs.readFileSync(file,'utf8'));
    if(!Number.isInteger(data.revision)||!Array.isArray(data.intramurals)||!Array.isArray(data.tryouts))throw Error('Saved schedules could not be read.');
    return data;
  }
  function change(request) {
    const current=read();
    if(request.revision!==current.revision)throw fail('Schedules changed in another window. Reload the list before saving.',409);
    if(!['intramurals','tryouts'].includes(request.category))throw fail('Choose intramurals or tryouts.');
    const entries=current[request.category];
    if(request.action==='delete'){
      const index=entries.findIndex(x=>x.id===request.id);
      if(index<0)throw fail('This event no longer exists.',404);
      entries.splice(index,1);
    }else if(request.action==='upsert'){
      const event=validateEvent(request.event,request.category);
      if(request.event.id){
        const index=entries.findIndex(x=>x.id===request.event.id);
        if(index<0)throw fail('This event no longer exists.',404);
        entries[index]={...event,id:request.event.id,sample:false};
      }else{
        if(entries.length>=250)throw fail('Maximum 250 events per section. Delete older entries first.');
        entries.push({...event,id:crypto.randomUUID(),sample:false});
      }
    }else throw fail('Unknown action.');
    current.revision++;
    current.updatedAt=new Date().toISOString();
    fs.mkdirSync(path.dirname(file),{recursive:true});
    const temporary=file+'.'+crypto.randomUUID()+'.tmp';
    try {
      fs.writeFileSync(temporary,JSON.stringify(current,null,2)+'\n',{mode:0o600});
      fs.renameSync(temporary,file);
    }finally{if(fs.existsSync(temporary))fs.unlinkSync(temporary);}
    return current;
  }
  return {read,change};
}
module.exports={createScheduleStore,validateEvent};
