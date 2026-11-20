const express=require('express'),Database=require('better-sqlite3'),fs=require('fs'),path=require('path'),crypto=require('crypto');
const DIR=process.env.DATA_DIR||path.join(__dirname,'data');fs.mkdirSync(DIR+'/backups',{recursive:true});
const U=process.env.APP_USER,P=process.env.APP_PASSWORD;
if(!U||!P){console.error('Define APP_USER y APP_PASSWORD');process.exit(1)}
const db=new Database(DIR+'/facturas.db');db.pragma('journal_mode=WAL');
db.exec('CREATE TABLE IF NOT EXISTS docs(col TEXT,id TEXT,data TEXT NOT NULL,PRIMARY KEY(col,id))');
const h=s=>crypto.createHash('sha256').update(s).digest(),eq=(a,b)=>crypto.timingSafeEqual(h(a),h(b));
const app=express();app.disable('x-powered-by');
app.use((q,r,n)=>{const a=q.headers.authorization||'';if(a.startsWith('Basic ')){const[u,...p]=Buffer.from(a.slice(6),'base64').toString().split(':');if(eq(u,U)&&eq(p.join(':'),P))return n()}r.set('WWW-Authenticate','Basic realm="Facturacion"').status(401).send('Acceso restringido')});
app.use(express.json({limit:'5mb'}));
const S={get:db.prepare('SELECT data FROM docs WHERE col=? AND id=?'),list:db.prepare('SELECT id,data FROM docs WHERE col=?'),put:db.prepare('INSERT INTO docs(col,id,data) VALUES(?,?,?) ON CONFLICT(col,id) DO UPDATE SET data=excluded.data'),del:db.prepare('DELETE FROM docs WHERE col=? AND id=?'),ins:db.prepare('INSERT OR IGNORE INTO docs(col,id,data) VALUES(?,?,?)')};
const ok=s=>/^[\w.\-]{1,100}$/.test(s);
app.use('/api/:col',(q,r,n)=>ok(q.params.col)?n():r.sendStatus(400));
app.use('/api/:col/:id',(q,r,n)=>ok(q.params.id)?n():r.sendStatus(400));
// Reserva atómica de número de factura: una vez reservado, nunca se reutiliza
app.post('/api/lock/:id',(q,r)=>r.json({acquired:S.ins.run('locks',q.params.id,'{}').changes===1}));
app.get('/api/:col',(q,r)=>r.json(S.list.all(q.params.col).map(x=>({id:x.id,data:JSON.parse(x.data)}))));
app.get('/api/:col/:id',(q,r)=>{const x=S.get.get(q.params.col,q.params.id);x?r.json({data:JSON.parse(x.data)}):r.sendStatus(404)});
app.put('/api/:col/:id',(q,r)=>{const{col,id}=q.params;
 if(col=='locks')return r.sendStatus(403);
 if(col=='invoices'&&S.get.get(col,id))return r.status(409).send('Las facturas emitidas no se pueden modificar');
 S.put.run(col,id,JSON.stringify(q.body));r.sendStatus(204)});
app.patch('/api/:col/:id',(q,r)=>{const{col,id}=q.params,x=S.get.get(col,id);if(!x)return r.sendStatus(404);
 let b=q.body;if(col=='invoices'){b={};for(const k of['status','paidAt'])if(k in q.body)b[k]=q.body[k];if(!['Pendiente','Pagada','Anulada'].includes(b.status||'Pendiente'))return r.sendStatus(400)}
 S.put.run(col,id,JSON.stringify({...JSON.parse(x.data),...b}));r.sendStatus(204)});
app.delete('/api/:col/:id',(q,r)=>{const{col,id}=q.params;if(col=='invoices'||col=='locks')return r.status(403).send('No se pueden borrar facturas');S.del.run(col,id);r.sendStatus(204)});
app.use(express.static(path.join(__dirname,'public')));
function backup(){const f=`${DIR}/backups/facturas-${new Date().toISOString().slice(0,10)}.db`;
 try{if(!fs.existsSync(f))db.exec(`VACUUM INTO '${f}'`);const a=fs.readdirSync(DIR+'/backups').sort();a.slice(0,-14).forEach(x=>fs.unlinkSync(`${DIR}/backups/${x}`))}catch(e){console.error('Backup:',e.message)}}
backup();setInterval(backup,6*3600e3);
app.listen(process.env.PORT||3000,()=>console.log('Facturación en marcha'));
