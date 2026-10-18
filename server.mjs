import http from 'node:http';
import {readFile,stat} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import {join,resolve,extname} from 'node:path';
import {generate,APIError} from './api/generate.mjs';
const root=fileURLToPath(new URL('.',import.meta.url));
const port=Number(process.env.PORT)||4173;
const mime={'.html':'text/html; charset=utf-8','.css':'text/css; charset=utf-8','.js':'text/javascript; charset=utf-8','.mjs':'text/javascript; charset=utf-8','.svg':'image/svg+xml','.json':'application/json'};
const limits=new Map();
const server=http.createServer(async(req,res)=>{
  const json=(status,data)=>{res.writeHead(status,{'Content-Type':'application/json','Cache-Control':'no-store'});res.end(JSON.stringify(data));};
  try{
    const url=new URL(req.url,`http://127.0.0.1:${port}`);
    if(url.pathname==='/api/generate'){
      if(req.method!=='POST')return json(405,{error:'Chỉ hỗ trợ POST.'});
      const origin=req.headers.origin;
      if(origin && ![`http://localhost:${port}`,`http://127.0.0.1:${port}`].includes(origin))return json(403,{error:'Origin không hợp lệ.'});
      if(process.env.ACCESS_CODE&&req.headers['x-access-code']!==process.env.ACCESS_CODE)return json(401,{error:'Mã truy cập AI chưa đúng.'});
      const ip=req.socket.remoteAddress;const now=Date.now();
      const prior=(limits.get(ip)||[]).filter(t=>now-t<60000);limits.set(ip,prior);
      if(prior.length>=2)return json(429,{error:'Tối đa 2 lượt tạo mỗi phút. Hãy chờ một chút.'});
      if(!req.headers['content-type']?.includes('application/json'))return json(415,{error:'Cần gửi JSON.'});
      let size=0;const chunks=[];
      for await(const chunk of req){size+=chunk.length;if(size>300000)return json(413,{error:'Tài liệu quá lớn.'});chunks.push(chunk);}
      let input;try{input=JSON.parse(Buffer.concat(chunks).toString());}catch{return json(400,{error:'JSON không hợp lệ.'});}
      prior.push(now);return json(200,await generate(input,process.env));
    }
    if(!['GET','HEAD'].includes(req.method))return json(405,{error:'Method không hợp lệ.'});
    const pathname=decodeURIComponent(url.pathname);
    const allowed=pathname==='/'||pathname==='/index.html'||pathname==='/styles.css'||pathname==='/favicon.svg'||/^\/(src|vendor)\/[a-zA-Z0-9_./-]+$/.test(pathname);
    if(!allowed || pathname.split('/').includes('..')||pathname.includes('\\'))return json(404,{error:'Không tìm thấy.'});
    let path=resolve(join(root,pathname==='/'?'index.html':pathname.slice(1)));
    if(!path.startsWith(resolve(root)+ (process.platform==='win32'?'\\':'/')) || !(await stat(path)).isFile())return json(404,{error:'Không tìm thấy.'});
    res.writeHead(200,{'Content-Type':mime[extname(path)]||'application/octet-stream','X-Content-Type-Options':'nosniff','Referrer-Policy':'no-referrer','Cache-Control':'no-cache'});
    res.end(req.method==='HEAD'?undefined:await readFile(path));
  }catch(error){if(error.code==='ENOENT')return json(404,{error:'Không tìm thấy.'});json(error instanceof APIError?error.status:500,{error:error instanceof APIError?error.message:'Không thể xử lý yêu cầu.'});}
});
server.listen(port,'127.0.0.1',()=>console.log(`Khai Cuộc: http://localhost:${port}`));
