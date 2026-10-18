import {generate, APIError} from '../api/generate.mjs';

export default {async fetch(request,env){
  const origin=request.headers.get('Origin')||'';
  const allowed=(env.ALLOWED_ORIGINS||'').split(',').map(x=>x.trim()).filter(Boolean);
  if(!allowed.includes(origin))return Response.json({error:'Origin chưa được cho phép.'},{status:403});
  const headers={'Access-Control-Allow-Origin':origin,'Access-Control-Allow-Methods':'POST, OPTIONS','Access-Control-Allow-Headers':'Content-Type, X-Access-Code','Vary':'Origin','Cache-Control':'no-store','X-Content-Type-Options':'nosniff'};
  const json=(data,status=200)=>Response.json(data,{status,headers});
  if(new URL(request.url).pathname!=='/api/generate')return json({error:'Không tìm thấy API.'},404);
  if(request.method==='OPTIONS')return new Response(null,{status:204,headers});
  if(request.method!=='POST')return json({error:'Chỉ hỗ trợ POST.'},405);
  if(env.ACCESS_CODE && request.headers.get('X-Access-Code')!==env.ACCESS_CODE)return json({error:'Mã truy cập AI chưa đúng. Hãy kiểm tra trong Cài đặt.'},401);
  if(!env.AI_LIMITER)return json({error:'Chủ web cần cấu hình giới hạn API trước khi sử dụng.'},503);
  const ip=request.headers.get('CF-Connecting-IP')||'unknown';
  if(!(await env.AI_LIMITER.limit({key:`generate:${ip}`})).success)return json({error:'Bạn đã dùng hết lượt trong phút này. Hãy chờ một chút.'},429);
  // The global limit is per Cloudflare location, not a worldwide cost cap.
  if(env.GLOBAL_LIMITER && !(await env.GLOBAL_LIMITER.limit({key:'all-users'})).success)return json({error:'Có nhiều người đang tạo bài. Hãy thử lại sau một phút.'},429);
  if(!request.headers.get('Content-Type')?.includes('application/json'))return json({error:'Cần gửi JSON.'},415);
  let size=0,body='';const decoder=new TextDecoder();
  try{
    for await (const chunk of request.body||[]){size+=chunk.length;if(size>300000)return json({error:'Tài liệu quá lớn.'},413);body+=decoder.decode(chunk,{stream:true});}
    body+=decoder.decode();
    let input;try{input=JSON.parse(body);}catch{return json({error:'JSON không hợp lệ.'},400);}
    return json(await generate(input,env));
  }catch(error){return json({error:error instanceof APIError?error.message:'Không thể tạo bài vào lúc này.'},error.status||500);}
}};
