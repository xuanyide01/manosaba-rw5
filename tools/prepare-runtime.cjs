// Compile immutable watch programs, layouts and interaction tables on the desktop.
const fs=require('fs'),path=require('path'),crypto=require('crypto');
const root=path.resolve(__dirname,'..'),common=path.join(root,'src/common');
const readOps=data=>Array.isArray(data)?data:data.ops;
function prepareProgram(ops,id,base,areas){
 const ends=Array(ops.length).fill(0),maps={},objections={},display={};let i=0;
 const plain=o=>o&&o.op==='text'&&!(o.links&&o.links.length)&&!(o.moves&&o.moves.length);
 while(i<ops.length){if(!plain(ops[i])){i++;continue;}let end=i+1;while(end<ops.length&&plain(ops[end]))end++;if(end>i+1)for(let j=i;j<end;j++)ends[j]=end;i=end;}
 for(let n=0;n<ops.length;n++){
  const o=ops[n];if(o.op==='map'){
   const count=o.areas.length,orders=[];if(count>8)throw Error('Map table exceeds bounded mask size');
   for(let mask=0;mask<(1<<count);mask++){const fresh=[],visited=[];for(let j=0;j<count;j++)((mask&(1<<j))?visited:fresh).push(j);orders.push(fresh.concat(visited));}
   maps[n]={orders,items:o.areas.map((value,j)=>({text:areas[value]||value,visitedText:(areas[value]||value)+' · 已调查',value,kind:'map',to:base+n+1,sourceIndex:j}))};
  }
  if(o.op!=='text')continue;
  const clean=String(o.text||'').replace(/・/g,'·').replace(/(^|\n)[ \t\u3000]{3,}/g,'$1');if(clean!==o.text)display[n]=clean;
  if(o.links&&o.links.length){const count=o.links.length,width=count===1?396:count===2?193:125,fontSize=count===1?22:20,line=count===1?26:24,columns=Math.floor((width-12)/fontSize),height=Math.max(52,Math.max(...o.links.map(x=>Math.ceil(x.text.length/columns)*line+12))),artHeight=288-height;
   objections[n]={height,artHeight,panelHeight:514-artHeight,fontSize,words:o.links.map((x,index)=>({index,key:id+':'+(base+n)+':'+index,text:x.text,width}))};
  }
 }
 return {format:2,ops,plan:{textEnds:String.fromCharCode(...ends.map(x=>x+1024)),maps,objections,display}};
}
function prepareRuntime(){
 const catalog=JSON.parse(fs.readFileSync(path.join(common,'catalog.js'),'utf8').replace(/^export const catalog=/,'').trim().replace(/;$/,'')),programs={},rows=[];let blocks=0,bytes=0,mapStops=0,wordStops=0;
 for(const id of fs.readdirSync(path.join(common,'story')))for(const file of fs.readdirSync(path.join(common,'story',id)).filter(x=>x.endsWith('.txt')).sort((a,b)=>parseInt(a)-parseInt(b))){
  const target=path.join(common,'story',id,file),raw=fs.readFileSync(target,'utf8'),ops=readOps(JSON.parse(raw)),base=parseInt(file)*512,data=prepareProgram(ops,id,base,catalog.areas);if(!Array.isArray(ops)||ops.length>512)throw Error('Invalid program '+id+':'+file);const output=JSON.stringify(data);if(raw!==output)fs.writeFileSync(target,output);blocks++;bytes+=Buffer.byteLength(output);mapStops+=Object.keys(data.plan.maps).length;wordStops+=Object.keys(data.plan.objections).length;
  if(['System_Subroutine','System_ResetWitchBook'].includes(id)){const key=id+':'+parseInt(file);programs[key]=data;rows.push({key,ops:ops.length,sourceBytes:Buffer.byteLength(output),opcodeSha256:crypto.createHash('sha256').update(JSON.stringify(ops)).digest('hex')});}
 }
 fs.writeFileSync(path.join(common,'runtime-helpers.txt'),JSON.stringify({format:2,programs}));
 const report={format:2,blocks,preparedSourceBytes:bytes,residentPrograms:rows,helperBytes:fs.statSync(path.join(common,'runtime-helpers.txt')).size,storyOpcodePositionsUnchanged:true,textIndexesPreparedOnDesktop:true,mapOrdersPreparedOnDesktop:mapStops,objectionLayoutsPreparedOnDesktop:wordStops,cacheMaxBlocks:2,cacheMaxSourceChars:65536};fs.writeFileSync(path.join(root,'reports/runtime-programs.json'),JSON.stringify(report,null,2));console.log('PREPARED_PROGRAMS',JSON.stringify(report));return report;
}
module.exports={prepareProgram,prepareRuntime};if(require.main===module)prepareRuntime();
