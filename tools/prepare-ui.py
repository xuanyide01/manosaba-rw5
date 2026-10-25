from pathlib import Path
import re
r=Path(__file__).resolve().parents[1];p=r/'src/pages/index/index.ux';s=p.read_text(encoding='utf8')
start=s.index('      <div class="title-menu">');end=s.index('    </div>\n    <div if="{{mode',start)
s=s[:start]+'''      <div class="title-menu">
        <div class="title-row" onclick="startNew"><text class="title-label">开始游戏</text></div>
        <div class="title-row" onclick="continueGame"><text class="title-label">读取存档</text></div>
        <div class="title-row" onclick="openChapterRoutes"><text class="title-label">章节选择</text></div>
        <div class="title-row" onclick="openGallery"><text class="title-label">CG 鉴赏</text></div>
        <div class="title-row" onclick="openSettings"><text class="title-label">设置</text></div>
        <div class="title-row" onclick="exitApplication"><text class="title-label">退出应用</text></div>
      </div>
      <text class="title-footer">REDMI WATCH 5 / CODEX</text>
'''+s[end:]
s=s.replace('<text class="tool" onclick="goBack">上一句</text>', '<text class="tool" onclick="goBack">上一句</text><text if="{{hasObjection}}" class="tool objection" onclick="openObjections">反驳</text>')
s=s.replace('<text class="choice-title">选择下一步</text>','<text class="choice-title">{{choiceTitle}}</text>')
s=s.replace('tid="text" class="choice"','tid="key" class="choice"')
s=s.replace('<text class="menu-action" onclick="toggleSpeed">{{speedLabel}}</text>\n      <text class="menu-action" onclick="toggleFont">{{fontLabel}}</text>\n      <text class="menu-action" onclick="resume">返回游戏</text>','<text class="menu-action" onclick="openBook">魔女手册</text>\n      <text class="menu-action" onclick="openSettings">阅读设置</text>\n      <text class="menu-action" onclick="resume">返回游戏</text>',1)
s=s.replace('<text class="menu-action muted" onclick="toTitle">返回标题</text>\n    </div>\n    <div if="{{mode === \'routes', '<text class="menu-action muted" onclick="closeSettings">返回</text>\n    </div>\n    <div if="{{mode === \'routes')
idx=s.index('    <div if="{{mode === \'end\'}}"')
s=s[:idx]+'''    <div if="{{mode === 'book'}}" class="full-panel"><text class="panel-title">魔女手册</text><text class="panel-subtitle">{{bookLabel}}</text><div class="slot-list"><div for="{{bookRows}}" tid="key" class="slot-card" onclick="selectBook($idx)"><text class="slot-title" style="font-family: {{$item.font}};">{{$item.name}}</text><text class="slot-meta">{{$item.detail}}</text></div></div><div class="pager"><text class="pager-action" onclick="previousBook">‹ 上一页</text><text class="pager-action" onclick="closeBook">返回</text><text class="pager-action" onclick="nextBook">下一页 ›</text></div></div>
    <div if="{{mode === 'bookDetail'}}" class="full-panel"><text class="panel-title" style="font-family: {{dialogueFont}};">{{bookName}}</text><scroll class="book-scroll" scroll-y="true"><text class="book-text" style="font-family: {{dialogueFont}};">{{bookText}}</text></scroll><text class="menu-action" onclick="closeBookDetail">返回手册</text></div>
'''+s[idx:]
s=s.replace("import {newState,restore,readFrame,readChapterSkip,next,nextChapter,choose,previous,previewMap}","import {newState,restore,readFrame,readChapterSkip,next,nextChapter,choose,previous,previewMap,setBookCatalog,bookEntries,objectTo}")
s=re.sub(r"import \{PROGRESS_KEY.*?;\n",'',s)
s=s.replace("options:[],loading:false", "options:[],hasObjection:false,choiceTitle:'作出选择',bookRows:[],bookLabel:'',bookName:'',bookText:'',loading:false")
s=s.replace('fontSize:24,textSpeed:30','fontSize:24,textSpeed:0')
s=s.replace("this._progress=emptyProgress();this._progressWriteBusy=false;this._progressDirty=false;this._progressReady=false;this.loading=true;", "this._progressReady=false;this.loading=true;")
start=s.index('  readProgress(){');end=s.index('  openChapterRoutes(){',start)
s=s[:start]+'''  readProgress(){this.loading=true;file.readText({uri:'/common/book.txt',success:data=>{try{setBookCatalog(JSON.parse(data.text));this._progressReady=true;this.loading=false;console.log('MANOSABA_RW5 book ready');}catch(e){this.fail(e.message);}},fail:()=>this.fail('手册资源读取失败'),complete:()=>{}});},
  syncProgress(){},writeProgress(){},
  startNew(){if(this.loading)return;this.clearTyping();this._chapterSkip=null;this.session=newState(catalog.initial,true);this.cachedChapter=0;this._autoHops=0;this.renderFrame();},
  openSettings(){if(this.loading)return;this._settingsReturn=this.mode;this.clearTyping();this.mode='settings';},
  closeSettings(){this.mode=this._settingsReturn||'title';},
  exitApplication(){this.clearTyping();console.log('MANOSABA_RW5 exit');this.$app.exit();},
'''+s[end:]
s=s.replace("(this.afterUnlocked?catalog.routes:catalog.routes.slice(0,1))",'catalog.routes')
s=s.replace("this.session=withProgress(newState(item.id),this._progress)","this.session=newState(item.id)")
s=s.replace("if(this.session.progression==='story')withProgress(this.session,this._progress);",'')
s=s.replace("if(f.type==='map'){this.renderMap(f);return;}", "this.hasObjection=!!(f.links&&f.links.length);")
s=s.replace("if(f.type==='choice'){this.options=this.visibleOptions(f.items);", "if(f.type==='choice'){this._objectionMenu=false;this.choiceTitle=f.title||'作出选择';this.options=this.visibleOptions(f.items);")
start=s.index("        if(f.type==='end'){");end=s.index("        this.mode='play';",start)
s=s[:start]+'''        if(f.type==='end'){this.endingLabel=f.kind==='bad'?'BAD END':f.kind==='trialFail'?'审判失败':'本段剧情结束';this.mode='end';console.log('MANOSABA_RW5 ending',this.session.chapter,f.kind);return;}
'''+s[end:]
s=s.replace("return items.map(item=>{const text=this.visibleText(item.text);return Object.assign({},item,{text,font:textFont(text)});});", "return items.map((item,i)=>{const text=this.visibleText(item.text);return Object.assign({},item,{text,key:this.session.chapter+':'+this.session.cursor+':'+i,font:textFont(text)});});")
s=s.replace("pick(index){if(this.mode!=='choice'||this.loading)return;choose(this.session,this.options[index],index);this.renderFrame();}","pick(index){if(this.mode!=='choice'||this.loading)return;if(this._objectionMenu){if(index===this.options.length-1){this._objectionMenu=false;this.renderFrame();return;}objectTo(this.session,index);this._objectionMenu=false;}else choose(this.session,this.options[index],index);this.renderFrame();}")
idx=s.index('  goBack(){')
s=s[:idx]+'''  openObjections(){if(this.loading||this.mode!=='play'||!this.hasObjection)return;this.clearTyping();this._objectionMenu=true;this.choiceTitle='选择反驳关键词';this.options=this.visibleOptions(this.session.links.concat([{text:'返回发言'}]));this.mode='choice';},
  openBook(){this._bookReturn=this.mode;this._bookItems=bookEntries(this.session);this._bookPage=0;this.refreshBook();this.mode='book';},
  refreshBook(){const start=this._bookPage*4;this.bookRows=this._bookItems.slice(start,start+4).map(x=>Object.assign({},x,{font:textFont(x.name),detail:{Clue:'证据',Profile:'人物',Rule:'规则',Note:'笔记',Map:'地图'}[x.category]+' · 版本 '+x.version}));this.bookLabel=this._bookItems.length+' 条 · '+(this._bookPage+1)+' / '+Math.max(1,Math.ceil(this._bookItems.length/4));},
  previousBook(){if(this._bookPage>0){this._bookPage--;this.refreshBook();}},
  nextBook(){if(this._bookPage<Math.ceil(this._bookItems.length/4)-1){this._bookPage++;this.refreshBook();}},
  selectBook(i){const item=this._bookItems[this._bookPage*4+i];if(!item)return;this.bookName=item.name;this.bookText=item.text||'暂无详细记录';this.dialogueFont=textFont(this.bookText+this.bookName);this.mode='bookDetail';},
  closeBookDetail(){this.mode='book';},closeBook(){this.mode=this._bookReturn||'menu';},
'''+s[idx:]
s=s.replace("if(this.resumeMode==='choice'){this.mode='choice';this.toast('请先作出当前选择');return;}","if(this.resumeMode==='choice'||this.session.links.length){this.renderFrame();this.toast('请先处理当前选项或反驳关键词');return;}")
s=s.replace("this.mode=this.resumeMode;},\n  swipe", "if(this.resumeMode==='choice'&&this._objectionMenu){this.mode='choice';return;}this.renderFrame();},\n  swipe")
s=s.replace('@font-face {font-family:stellaextra;src:url(\'/common/stella-extra.otf\');}',"@font-face {font-family:manosabafont;src:url('/common/manosaba.otf');}")
# A consistent wine/cream palette based on the original dark storybook UI.
colors={'#f4f8f5':'#201820','#17483c':'#dfc7bd','#285d50':'#241b27','#376b5e':'#30212c','#96b5a9':'#b3848d','#e0f0e9':'#d6b9bf','#174d40':'#f3ddd3','#527769':'#bca7ad','#17483c':'#f3ddd3','#21594d':'#583646','#123f36':'#241b27','#2c6657':'#583646','#dae8df':'#3d2b38','#325e4e':'#d5bcc3','#e6efe9':'#3d2b38','#173f35':'#f0dfd4','#345f4f':'#c9b0b8','#24594c':'#f0dfd4','#e5eee8':'#3d2b38','#f5f8f5':'#241b27','#234f40':'#ecdcd3','#f1f6f1':'#241b27','#dceae3':'#503341','#edf3ef':'#3d2b38'}
for a,b in colors.items():s=s.replace(a,b)
s=s.replace('.page{width:','.page{font-family:manosabafont;width:')
s=s.replace('top:214px;left:24px;width:250px;height:266px','top:190px;left:28px;width:250px;height:288px')
s=s.replace('height:36px;width:246px','height:46px;width:246px')
s=s.replace('.title-label{height:28px;width:222px;object-fit:contain;}','.title-label{height:38px;width:222px;font-size:25px;color:#f6e7df;text-align:left;}')
s=s.replace('top:26px;left:30px;width:352px;height:135px','top:28px;left:28px;width:376px;height:138px')
s=s.replace('height:50px;font-size:22px','height:49px;font-size:22px')
s=s.replace('.choice{height:108px;', '.choice{height:112px;flex-shrink:0;lines:-1;')
s=s.replace('</style>', '.book-scroll{height:364px;width:396px;flex-direction:column;}\n.book-text{width:396px;flex-shrink:0;lines:-1;font-size:23px;line-height:32px;color:#f1e3db;}\n.objection{color:#ffd1db;}\n</style>')
p.write_text(s,encoding='utf8')
print('UI prepared')
