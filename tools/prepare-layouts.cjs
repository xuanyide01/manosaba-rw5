// Precompute portrait geometry for every size, panel height, count and slot.
const fs=require('fs'),path=require('path');const root=path.resolve(__dirname,'..'),common=path.join(root,'src/common'),target=path.join(common,'portrait-layout.js'),sourceFile=path.join(root,'resources/portrait-dimensions.json');
function prepareLayouts(){
 const text=fs.readFileSync(target,'utf8'),m=text.match(/const dimensions=(.*);/);if(m)fs.writeFileSync(sourceFile,JSON.stringify(JSON.parse(m[1])));
 const dimensions=JSON.parse(fs.readFileSync(sourceFile)),heights=new Set([286]);for(const id of fs.readdirSync(path.join(common,'story')))for(const f of fs.readdirSync(path.join(common,'story',id))){const d=JSON.parse(fs.readFileSync(path.join(common,'story',id,f)));for(const o of Object.values(d.plan?.objections||{}))heights.add(o.artHeight);}
 const shapes=[[180,286]],shapeIds={};for(const [name,size] of Object.entries(dimensions)){let id=shapes.findIndex(x=>x[0]===size[0]&&x[1]===size[1]);if(id<0){id=shapes.length;shapes.push(size);}shapeIds[name]=id;}
 const boxes=shapes.map(size=>{const out={};for(const h of heights){out[h]=[];for(let count=0;count<=3;count++){const cell=count>=3?144:count===2?216:432,scale=Math.min((count===1?h:cell)/size[0],h/size[1]),width=Math.round(size[0]*scale),height=Math.round(size[1]*scale);out[h].push(Array.from({length:count||1},(_,index)=>({width,height,left:Math.round(index*cell+(cell-width)/2),top:h-height})));}}return out;});
 fs.writeFileSync(path.join(common,'portrait-layouts.txt'),JSON.stringify({format:1,shapeIds,boxes}));
 const code=`// Prepared geometry is loaded once; the watch only looks up the current pose.
let shapeIds={},boxes=[];
export function configurePortraitLayouts(data){if(!data||data.format!==1||!data.shapeIds||!Array.isArray(data.boxes))throw Error('立绘目录无效');shapeIds=data.shapeIds;boxes=data.boxes;}
export function clearPortraitLayouts(){shapeIds={};boxes=[];}
export function portraitBox(path,count,index,height){const id=shapeIds[String(path||'').split('/').pop()]||0,shape=boxes[id],layout=shape[height||286]||shape[286],row=layout[count>3?3:count||0];return row[index||0]||row[0];}
`;fs.writeFileSync(target,code);
 fs.writeFileSync(path.join(root,'reports/desktop-layouts.json'),JSON.stringify({portraitAssets:Object.keys(shapeIds).length,uniqueSizes:shapes.length,panelHeights:[...heights],scalingOnWatch:false,positionsPreparedOnDesktop:true},null,2));
}
module.exports={prepareLayouts};if(require.main===module)prepareLayouts();
