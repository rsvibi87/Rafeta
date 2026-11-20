(()=>{const subs=[];
const api=async(m,u,b)=>{const r=await fetch('/api/'+u,{method:m,headers:{'Content-Type':'application/json'},body:b&&JSON.stringify(b)});if(!r.ok)throw new Error((await r.text())||r.status);return r.status==204?null:r.json()};
const snap=(id,d)=>({id,exists:d!=null,data:()=>d??undefined});
const fire=c=>subs.filter(s=>s.col==c).forEach(s=>s.run(true));
const sub=(col,load,emit)=>{const s={col,last:null,run:async force=>{try{const x=await load(),j=JSON.stringify(x);if(force||j!==s.last){s.last=j;emit(x)}}catch{}}};subs.push(s);s.run(true);return()=>subs.splice(subs.indexOf(s),1)};
const collection=c=>({onSnapshot:fn=>sub(c,()=>api('GET',c),a=>fn({docs:a.map(x=>snap(x.id,x.data)),size:a.length}))});
const doc=p=>{const[c,id]=p.split('/');const d={id,
 get:async()=>{try{return snap(id,(await api('GET',`${c}/${id}`)).data)}catch{return snap(id,null)}},
 set:async x=>{await api('PUT',`${c}/${id}`,x);fire(c)},
 update:async x=>{await api('PATCH',`${c}/${id}`,x);fire(c)},
 delete:async()=>{await api('DELETE',`${c}/${id}`);fire(c)},
 acquire:()=>api('POST','lock/'+id),
 onSnapshot:fn=>sub(c,async()=>(await d.get()).data()||null,x=>fn(snap(id,x)))};return d};
const dl={save:async({filename,data})=>{const a=document.createElement('a');a.href=URL.createObjectURL(data instanceof Blob?data:new Blob([data]));a.download=filename;a.click();setTimeout(()=>URL.revokeObjectURL(a.href),5000)}};
const mods={db:{collection,doc},user:{id:async()=>'u',isOwner:()=>true,canEdit:()=>true},downloads:dl};
window.claude={use:async n=>mods[n]||null};
setInterval(()=>subs.slice().forEach(s=>s.run()),15000);
})();
