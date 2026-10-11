const {Readable}=require('node:stream');
function gateway(handler){return async event=>{
 const raw=event.body||'',body=event.isBase64Encoded?Buffer.from(raw,'base64'):Buffer.from(typeof raw==='string'?raw:JSON.stringify(raw));
 const req=Readable.from([body]);req.method=(event.httpMethod||'GET').toUpperCase();req.headers=Object.fromEntries(Object.entries(event.headers||{}).map(([k,v])=>[k.toLowerCase(),String(v)]));req.socket={remoteAddress:event.requestContext?.sourceIp||'unknown'};
 req.url='/?'+new URLSearchParams(event.queryStringParameters||event.queryString||{}).toString();let result;
 const headers={};const res={setHeader:(k,v)=>{headers[k]=v;},writeHead:(status,values)=>{result={statusCode:status,headers:{...headers,...values}};},end:data=>{result.isBase64Encoded=Buffer.isBuffer(data);result.body=Buffer.isBuffer(data)?data.toString('base64'):String(data||'');}};
 await handler(req,res);return result;
};}
module.exports={gateway};
