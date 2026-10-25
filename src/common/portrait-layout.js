// Prepared geometry is loaded once; the watch only looks up the current pose.
let shapeIds={},boxes=[];
export function configurePortraitLayouts(data){if(!data||data.format!==1||!data.shapeIds||!Array.isArray(data.boxes))throw Error('立绘目录无效');shapeIds=data.shapeIds;boxes=data.boxes;}
export function clearPortraitLayouts(){shapeIds={};boxes=[];}
export function portraitBox(path,count,index,height){const id=shapeIds[String(path||'').split('/').pop()]||0,shape=boxes[id],layout=shape[height||286]||shape[286],row=layout[count>3?3:count||0];return row[index||0]||row[0];}
