const express=require('express');
const fs=require('fs');
const path=require('path');
const crypto=require('crypto');
const cors=require('cors');

const app=express();
const PORT=process.env.PORT||3000;
const ADMIN_PASSWORD=process.env.ADMIN_PASSWORD||'admin123';
const DATA=path.join(__dirname,'..','data','db.json');
const FRONT=path.join(__dirname,'..','frontend');

app.use(cors());
app.use(express.json({limit:'1mb'}));
app.use(express.static(FRONT));

function init(){
  if(!fs.existsSync(DATA)){
    const kunds=Array.from({length:108},(_,i)=>({number:i+1,status:i<9?'booked':'available',regId:i<9?'RESERVED_PERMANENT':null,reservedAt:null}));
    fs.writeFileSync(DATA,JSON.stringify({kunds,registrations:{},reservations:{},counter:0},null,2));
  }
}
function db(){return JSON.parse(fs.readFileSync(DATA,'utf8'))}
function save(x){fs.writeFileSync(DATA,JSON.stringify(x,null,2))}
function cleanup(x){
  const now=Date.now();
  Object.values(x.reservations).forEach(r=>{
    if(r.status==='reserved' && now-r.reservedAt>15*60*1000){
      const k=x.kunds.find(k=>k.number===r.kund);
      if(k&&k.status==='reserved'){k.status='available';k.reservedAt=null}
      r.status='expired';
    }
  });
  save(x);
}
function token(n){return `BU-MY-2026-${String(n).padStart(5,'0')}`}
function auth(req,res,next){
  const h=req.headers.authorization||'';
  if(h!=='Bearer '+process.env.ADMIN_SESSION && !req.adminToken)return res.status(401).json({error:'अनधिकृत अनुरोध'});
  next();
}

app.get('/api/stats',(req,res)=>{const x=db();cleanup(x);const booked=x.kunds.filter(k=>k.status==='booked').length;res.json({totalKunds:108,booked,available:108-booked})});
app.get('/api/kunds',(req,res)=>{const x=db();cleanup(x);res.json(x.kunds)});
app.post('/api/reservations',(req,res)=>{
  const x=db();cleanup(x);const {name,mobile,email,city,date,slot,type,count,kund}=req.body;
  if(!name||!/^[6-9]\d{9}$/.test(mobile)||!city||!Number.isInteger(+kund))return res.status(400).json({error:'आवश्यक विवरण सही नहीं हैं।'});
  const max=type==='couple'?2:type==='family'?6:10;
  if(!['couple','family','group'].includes(type)||count<1||count>max)return res.status(400).json({error:'प्रतिभागियों की संख्या मान्य सीमा में नहीं है।'});
  const k=x.kunds.find(k=>k.number===+kund);
  if(!k||k.number<=9||k.status!=='available')return res.status(409).json({error:'यह कुंड अभी उपलब्ध नहीं है।'});
  const amount=type==='couple'&&count===2?2100:count*1100;
  const id='RSV'+Date.now()+crypto.randomBytes(3).toString('hex');
  x.reservations[id]={reservationId:id,name,mobile,email,city,date,slot,type,count,kund:+kund,amount,status:'reserved',reservedAt:Date.now()};
  k.status='reserved';k.reservedAt=Date.now();
  save(x);res.json(x.reservations[id]);
});
app.delete('/api/reservations/:id',(req,res)=>{
  const x=db();const r=x.reservations[req.params.id];if(r&&r.status==='reserved'){const k=x.kunds.find(k=>k.number===r.kund);if(k&&k.status==='reserved'){k.status='available';k.reservedAt=null}r.status='cancelled';save(x)}res.json({ok:true})
});
app.post('/api/payments',(req,res)=>{
  const x=db();cleanup(x);const {reservationId,utr}=req.body;const r=x.reservations[reservationId];
  if(!r||r.status!=='reserved')return res.status(400).json({error:'आरक्षण समाप्त या अमान्य है।'});
  if(!utr||utr.length<6)return res.status(400).json({error:'मान्य UTR दर्ज करें।'});
  x.counter++;const regId='REG'+Date.now()+crypto.randomBytes(2).toString('hex');const t=token(x.counter);
  const reg={regId,token:t,name:r.name,mobile:r.mobile,email:r.email,city:r.city,date:r.date,slot:r.slot,type:r.type,count:r.count,kund:r.kund,amount:r.amount,utr,paymentStatus:'प्राप्त',verification:'मैनुअल सत्यापन लंबित',createdAt:new Date().toISOString()};
  x.registrations[regId]=reg;r.status='converted';r.regId=regId;
  const k=x.kunds.find(k=>k.number===r.kund);k.status='booked';k.regId=regId;k.reservedAt=null;save(x);
  res.json(reg);
});
app.get('/api/registrations/:id',(req,res)=>{const x=db();const r=x.registrations[req.params.id];if(!r)return res.status(404).json({error:'पंजीकरण नहीं मिला'});res.json(r)});
app.get('/api/search',(req,res)=>{const q=String(req.query.q||'').trim().toLowerCase();const x=db();const r=Object.values(x.registrations).find(r=>r.mobile===q||r.token.toLowerCase()===q||r.regId.toLowerCase()===q);if(!r)return res.status(404).json({error:'पंजीकरण नहीं मिला'});res.json(r)});
app.post('/api/admin/login',(req,res)=>{if(req.body.password!==ADMIN_PASSWORD)return res.status(401).json({error:'गलत पासवर्ड'});const t=crypto.randomBytes(32).toString('hex');process.env.ADMIN_SESSION=t;res.json({token:t})});
app.get('/api/admin/dashboard',(req,res)=>{const x=db();const t=(req.headers.authorization||'').replace('Bearer ','');if(!t||t!==process.env.ADMIN_SESSION)return res.status(401).json({error:'लॉगिन आवश्यक है'});cleanup(x);res.json({booked:x.kunds.filter(k=>k.status==='booked').length,available:x.kunds.filter(k=>k.status==='available').length,registrations:Object.values(x.registrations).sort((a,b)=>b.createdAt.localeCompare(a.createdAt))})});
app.get('*',(req,res)=>res.sendFile(path.join(FRONT,'index.html')));
init();
app.listen(PORT,()=>console.log(`भारत उत्कर्ष महायज्ञ server running at http://localhost:${PORT}`));