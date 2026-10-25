// A pending timeout belongs to one displayed frame and is invalidated on every UI transition.
export function autoDelay(speed,length){return [2600,1500,800][speed===0?0:speed===2?2:1]+Math.min(5000,Math.max(0,length-60)*30);}
export function canAutoAdvance(state){return !!(state.enabled&&state.mode==='play'&&!state.loading&&!state.hidden&&!state.dragged&&!state.typing&&!state.interaction);}
export function createAutoplay(set,clear){let timer=null,version=0;return {
 cancel(){version++;if(timer!==null){clear(timer);timer=null;}},
 schedule(delay,guard,advance){this.cancel();const token=version;timer=set(()=>{timer=null;if(token===version&&guard())advance();},delay);}
};}
