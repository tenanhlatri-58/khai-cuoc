import {mkdir,cp,rm} from 'node:fs/promises';
const root=new URL('../',import.meta.url);
const dist=new URL('dist/',root);
await rm(dist,{recursive:true,force:true});
await mkdir(dist,{recursive:true});
for(const name of ['index.html','styles.css','favicon.svg','src','vendor'])await cp(new URL(name,root),new URL(name,dist),{recursive:true});
console.log('Built static site in dist/ (no API keys or server files).');
