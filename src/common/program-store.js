// Index basic text runs once; the VM still executes all state-changing operations.
export function compileProgram(data,base){
 const ops=Array.isArray(data)?data:data&&data.ops,plan=Array.isArray(data)?null:data&&data.plan;
 if(!Array.isArray(ops)||ops.length>512||(plan&&(!plan.textEnds||plan.textEnds.length!==ops.length)))throw Error('章节格式无效');
 return {ops,base:base||0,plan};
}
export function createProgramStore(resident){
 const maxBlocks=2,maxSourceChars=65536,items=[],fixed={};let chars=0,loads=0,hits=0,residentHits=0,evictions=0;
 return {
  get(key,base){const source=resident(key);if(source){residentHits++;if(!fixed[key])fixed[key]=compileProgram(source,base);return fixed[key];}const i=items.findIndex(x=>x.key===key);if(i<0)return null;hits++;const entry=items.splice(i,1)[0];items.push(entry);return entry.program;},
  put(key,data,base,sourceChars){loads++;const program=compileProgram(data,base),old=items.findIndex(x=>x.key===key);if(old>=0)chars-=items.splice(old,1)[0].chars;
   if(sourceChars<=maxSourceChars){while(items.length&&(items.length>=maxBlocks||chars+sourceChars>maxSourceChars)){chars-=items.shift().chars;evictions++;}items.push({key,program,chars:sourceChars});chars+=sourceChars;}return program;},
  clear(){items.length=0;chars=0;for(const k of Object.keys(fixed))delete fixed[k];},
  stats(){return {loads,hits,residentHits,evictions,cachedBlocks:items.length,sourceChars:chars,maxBlocks,maxSourceChars,residentBlocks:Object.keys(fixed).length};}
 };
}
