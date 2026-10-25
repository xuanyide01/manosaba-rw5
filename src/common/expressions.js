// Inert expression parser. No eval, Function, imported game code, or property access.
export function evaluate(source,vars){
 const s=String(source&&source.expr!==undefined?source.expr:source||'').replace(/[{}]/g,'');
 const tokens=s.match(/"(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*'|\d+(?:\.\d+)?|[A-Za-z_][A-Za-z_0-9]*|&&|\|\||==|!=|>=|<=|[()!,+*/%<>=-]/g)||[];
 if(tokens.join('').replace(/\s/g,'')!==s.replace(/\s/g,''))throw Error('不支持的表达式：'+s);
 let at=0;const precedence={'||':1,'&&':2,'=':3,'==':3,'!=':3,'>':4,'<':4,'>=':4,'<=':4,'+':5,'-':5,'*':6,'/':6,'%':6};
 function primary(){let t=tokens[at++];if(t===undefined)throw Error('表达式不完整');
  if(t==='!')return !primary();if(t==='-')return -Number(primary());if(t==='+')return Number(primary());
  if(t==='('){const v=parse(0);if(tokens[at++]!==')')throw Error('表达式括号无效');return v;}
  if(t[0]==='"'||t[0]==="'")return t.slice(1,-1).replace(/\\([\\"'])/g,'$1');
  if(/^\d/.test(t))return Number(t);if(/^true$/i.test(t))return true;if(/^false$/i.test(t))return false;
  if(tokens[at]==='('){at++;const args=[];if(tokens[at]!==')'){args.push(parse(0));while(tokens[at]===','){at++;args.push(parse(0));}}if(tokens[at++]!==')')throw Error('函数括号无效');
   const fn={max:Math.max,min:Math.min,Sin:Math.sin,Cos:Math.cos,abs:Math.abs}[t];if(!fn)throw Error('不支持的函数：'+t);return fn.apply(null,args);}
  return Object.prototype.hasOwnProperty.call(vars,t)?vars[t]:0;
 }
 function parse(min){let left=primary();while(at<tokens.length&&(precedence[tokens[at]]||0)>=min&&precedence[tokens[at]]){const op=tokens[at++],right=parse(precedence[op]+1);
  if(op==='||')left=!!left||!!right;else if(op==='&&')left=!!left&&!!right;else if(op==='='||op==='==')left=left===right;else if(op==='!=')left=left!==right;else if(op==='>')left=left>right;else if(op==='<')left=left<right;else if(op==='>=')left=left>=right;else if(op==='<=')left=left<=right;else if(op==='+')left=left+right;else if(op==='-')left=left-right;else if(op==='*')left=left*right;else if(op==='/')left=left/right;else if(op==='%')left=left%right;
 }return left;}
 if(!tokens.length)return false;const result=parse(0);if(at!==tokens.length)throw Error('表达式尾部无效：'+s);return result;
}
export function assign(source,vars){const text=String(source&&source.expr!==undefined?source.expr:source).replace(/[{}]/g,''),m=/^\s*([A-Za-z_][A-Za-z_0-9]*)\s*=\s*(.+)$/.exec(text);if(!m)throw Error('赋值无效：'+text);vars[m[1]]=evaluate(m[2],vars);}
