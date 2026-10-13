// Dry run by default. --apply requires a complete backup and explicit identity mappings.
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { dirname } from 'node:path';
import { isDeepStrictEqual } from 'node:util';
import { initializeApp, applicationDefault } from 'firebase-admin/app';
import { getFirestore, Firestore } from 'firebase-admin/firestore';
import { encode, decode } from './backup-codec.js';
import { getAuth } from 'firebase-admin/auth';
import { imageUrls, coordinatesOrNull, normalizeVisit } from '../../src/lib/contracts.js';
import { roomId, slotId } from '../domain.js';
const args=process.argv.slice(2);
function option(name) { const i=args.indexOf(name);return i>=0?args[i+1]:null; }
const project=option('--project'),input=option('--input'),backupFile=option('--backup');
const apply=args.includes('--apply');
if(!input&&!project) throw new Error('Use --input backup.json or --project PROJECT --backup .artifacts/backup.json.');
if(apply&&(!project||!input||!backupFile)) throw new Error('--apply requires --project, --input and --backup.');
let db;
if(project){initializeApp({projectId:project,credential:applicationDefault()});db=getFirestore();}
if(project&&!project.startsWith('demo-')&&(process.env.FIRESTORE_EMULATOR_HOST||process.env.FIREBASE_AUTH_EMULATOR_HOST))throw new Error('Do not mix a real project with emulator environment variables.');
async function capture() {
  const documents={};
  async function collect(collection) {
    for(const ref of await collection.listDocuments()) {
      const document=await ref.get();
      if(document.exists)documents[ref.path]=encode(document.data());
      for(const child of await ref.listCollections())await collect(child);
    }
  }
  for(const collection of await db.listCollections())await collect(collection);
  return {project,createdAt:new Date().toISOString(),documents};
}
let backup=input?JSON.parse(await readFile(input,'utf8')):await capture();
if(project&&backup.project!==project)throw new Error('The backup belongs to a different project.');
if(!input){if(!backupFile)throw new Error('Provide --backup to save the audit snapshot.');await mkdir(dirname(backupFile),{recursive:true});await writeFile(backupFile,JSON.stringify(backup,null,2),{flag:'wx'});}
const mappings=option('--mapping')?JSON.parse(await readFile(option('--mapping'),'utf8')):{};
const identities=mappings.identities||{};
const repairs=mappings.properties||{};
const decodingDb=db || new Firestore({projectId:backup.project});
const documents=Object.fromEntries(Object.entries(backup.documents).map(([path,value])=>[path,decode(value,decodingDb)]));
const actions=new Map(),issues=[];
const canonical=uid=>identities[uid]||uid;
const users=new Set(Object.keys(documents).filter(path=>/^users\/[^/]+$/.test(path)).map(path=>path.split('/')[1]));
function known(uid){return users.has(uid)||Object.values(identities).includes(uid);}
function plan(path,value){actions.set(path,value);}
for(const [path,data] of Object.entries(documents)) {
  if(/^users\/[^/]+$/.test(path)&&data.role==='admin') {
    const uid=path.split('/')[1],decision=mappings.adminDecisions?.[uid];
    if(!['retain','demote'].includes(decision)) issues.push({path,problem:'Existing administrator must be explicitly retained or demoted after identity review'});
    else if(decision==='demote') plan(path,{...data,role:'seeker'});
  }
  if(/^properties\/[^/]+$/.test(path)) {
    const id=path.split('/')[1],repair=repairs[id]||{};
    const images=imageUrls(repair.images||data.images);
    const coordinates=coordinatesOrNull(repair.coordinates||data.coordinates||data.location?.mapCoordinates);
    const ownerId=canonical(data.ownerId);
    if(!known(ownerId)){issues.push({path,problem:'Owner identity requires an explicit verified mapping'});continue;}
    if(!images.length){issues.push({path,problem:'Photos must be uploaded again; temporary URLs cannot be recovered'});continue;}
    if(!coordinates){issues.push({path,problem:'Real coordinates require manual confirmation'});continue;}
    plan(path,{...data,images,thumbnail:images[0],ownerId,coordinates,location:{...data.location,mapCoordinates:coordinates},schemaVersion:2});
  }
  if(/^visits\/[^/]+$/.test(path)) {
    const visit=normalizeVisit({...data,ownerId:canonical(data.ownerId),tenantId:canonical(data.tenantId)});
    if(!known(visit.ownerId)||!known(visit.tenantId)){issues.push({path,problem:'Visit identity requires an explicit verified mapping'});continue;}
    const property=documents[`properties/${visit.propertyId}`];
    if(!property||canonical(property.ownerId)!==visit.ownerId){issues.push({path,problem:'Visit owner does not match the property owner'});continue;}
    if(!visit.date||!visit.time){issues.push({path,problem:'Missing visit date or time'});continue;}
    if(['pendiente','confirmada','aceptada'].includes(visit.status)) {
      const id=slotId(visit.propertyId,visit.date,visit.time),slotPath=`visit_slots/${id}`;
      const reserved=actions.get(slotPath)||documents[slotPath];
      if(reserved&&reserved.visitId!==path.split('/')[1]){issues.push({path,problem:'Conflicting reservation; manual resolution required'});continue;}
      visit.slotId=id;plan(slotPath,{visitId:path.split('/')[1],propertyId:visit.propertyId,date:visit.date,time:visit.time});
    }
    if(['confirmada','aceptada'].includes(visit.status)) {
      const visitId=path.split('/')[1];
      if(visit.confirmedBy!==visit.ownerId && !mappings.confirmedVisitIds?.includes(visitId)) issues.push({path,problem:'Legacy confirmation must be explicitly attested by the operator in confirmedVisitIds'});
      visit.confirmedBy=visit.ownerId;
      visit.conversationId=roomId(visit.tenantId,visit.ownerId,visit.propertyId);
    }
    plan(path,{...visit,schemaVersion:2});
  }
  if(/^conversations\/[^/]+$/.test(path)) {
    if(data.migratedTo) continue;
    if(mappings.archiveRooms?.includes(path)){plan(path,{...data,archived:true});continue;}
    const seekerId=canonical(data.seekerId||data.participants?.find(uid=>uid!==data.ownerId)),ownerId=canonical(data.ownerId);
    if(!known(seekerId)||!known(ownerId)||seekerId===ownerId||!data.propertyId){issues.push({path,problem:'Conversation membership requires manual review'});continue;}
    const target=`conversations/${roomId(seekerId,ownerId,data.propertyId)}`;
    const existing=actions.get(target)||documents[target];
    const preferred=existing&&existing.lastMessageTimestamp?.toMillis?.()>data.lastMessageTimestamp?.toMillis?.()?existing:data;
    const readAt=Object.fromEntries(Object.entries(existing?.readAt||data.readAt||{}).map(([uid,time])=>[canonical(uid),time]));
    plan(target,{...preferred,seekerId,ownerId,lastSenderId:canonical(preferred.lastSenderId)||'',participants:[seekerId,ownerId],readAt,schemaVersion:2});
    if (path !== target) plan(path,{...data,migratedTo:target.split('/')[1]});
    for(const [messagePath,message] of Object.entries(documents)) {
      if(!messagePath.startsWith(`${path}/messages/`))continue;
      // Prefix prevents same-named messages from different legacy rooms overwriting each other.
      const messageId=path===target?messagePath.split('/').at(-1):`${path.split('/')[1]}__${messagePath.split('/').at(-1)}`;
      const type=message.type||(message.image?'image':message.isVoice?'audio':'text');
      if(![seekerId,ownerId].includes(canonical(message.senderId)))issues.push({path:messagePath,problem:'Message sender requires verified identity mapping'});
      if(message.isVoice&&!message.mediaUrl&&!mappings.acceptMissingAudio?.includes(messagePath))issues.push({path:messagePath,problem:'Legacy voice placeholder has no recording; acknowledge archival in mapping.acceptMissingAudio'});
      plan(`${target}/messages/${messageId}`,{...message,senderId:canonical(message.senderId),type,migrated:true});
    }
  }
  if(/^users\/[^/]+\/favorites\/[^/]+$/.test(path)) {
    const parts=path.split('/');plan(`users/${canonical(parts[1])}/favorites/${parts[3]}`,{...data,propertyId:parts[3]});
  }
}
if(apply) {
  if(issues.length)throw new Error('Resolve every audit issue before applying this migration.');
  const referenced=new Set([...Object.values(identities),...Object.keys(mappings.adminDecisions||{}).filter(uid=>mappings.adminDecisions[uid]==='retain')]);
  for(const value of actions.values())for(const uid of [value.ownerId,value.tenantId,value.seekerId,value.senderId,...(value.participants||[])])if(uid)referenced.add(uid);
  for(const uid of referenced)await getAuth().getUser(uid);
  // A fresh backup is mandatory even when the plan was prepared from an older snapshot.
  const fresh=await capture();await mkdir(dirname(backupFile),{recursive:true});await writeFile(backupFile,JSON.stringify(fresh,null,2),{flag:'wx'});
  if(!isDeepStrictEqual(fresh.documents,backup.documents))throw new Error('Database changed after the audit. Regenerate and review the plan. Fresh backup saved.');
  // All-or-nothing small migrations. Larger datasets require a maintenance-window migration.
  if(actions.size>450)throw new Error('More than 450 writes: use an audited maintenance-window migration.');
  const batch=db.batch();for(const [path,value] of actions)batch.set(db.doc(path),value);
  await batch.commit();
}
const report={project:backup.project,mode:apply?'applied':'dry-run',plannedWrites:actions.size,issues,paths:[...actions.keys()]};
if(option('--report'))await writeFile(option('--report'),JSON.stringify(report,null,2));
console.log(JSON.stringify(report,null,2));
