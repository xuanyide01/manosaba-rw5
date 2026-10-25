// Grouped shared programs are read once at startup, independently of the UI bundle.
let residentPrograms={};
export function configureResident(value){
 if(!value||value.format!==2||!value.programs)throw Error('运行目录无效');
 for(const key of Object.keys(value.programs))if(!value.programs[key]||!Array.isArray(value.programs[key].ops)||value.programs[key].ops.length>512)throw Error('运行目录分块无效');
 residentPrograms=value.programs;
}
export function residentProgram(key){return residentPrograms[key]||null;}
export function clearResident(){residentPrograms={};}
