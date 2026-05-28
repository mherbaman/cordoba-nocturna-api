with open('/etc/easypanel/projects/cordoba-nocturna/app/code/public/padel-connect.html', 'r') as f:
    content = f.read()

viejo = '''async function api(path,opts={}){
  const headers={'Content-Type':'application/json'};
  if(token)headers['Authorization']=`Bearer ${token}`;
  const r=await fetch(API+path,{...opts,headers});
  const data=await r.json();
  if(!r.ok)throw new Error(data.error||'Error desconocido');
  return data;
}'''

nuevo = '''async function api(path,opts={}){
  const headers={'Content-Type':'application/json'};
  if(token)headers['Authorization']=`Bearer ${token}`;
  const r=await fetch(API+path,{...opts,headers});
  let data={};
  const text=await r.text();
  if(text) try{ data=JSON.parse(text); }catch(e){}
  if(!r.ok)throw new Error(data.error||'Error desconocido');
  return data;
}'''

content = content.replace(viejo, nuevo)

with open('/etc/easypanel/projects/cordoba-nocturna/app/code/public/padel-connect.html', 'w') as f:
    f.write(content)

print("OK")
