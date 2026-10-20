export const DECK_THEMES={forest:{name:'Forest',background:'#f6f8f5',ink:'#172f29',accent:'#237153',panel:'#e4eee7'},ocean:{name:'Ocean',background:'#f2f7fb',ink:'#102e46',accent:'#166a9a',panel:'#deedf5'},sunrise:{name:'Sunrise',background:'#fff8ef',ink:'#422c23',accent:'#ae4c20',panel:'#f7e7d2'},midnight:{name:'Midnight',background:'#152334',ink:'#f5f7fc',accent:'#70d3bc',panel:'#24384e'}};
export const MAX_SLIDES=40;
export const newSlide=()=>({title:'New slide',body:'',notes:'',layout:'content'});
export const newDeck=()=>({theme:'forest',show_author:false,slides:[{title:'Your presentation',body:'Subject · Grade · Topic',notes:'',layout:'title'}]});
export function validateDeck(content){
 if(!content||!DECK_THEMES[content.theme]||typeof content.show_author!=='boolean'||!Array.isArray(content.slides)||content.slides.length<1||content.slides.length>MAX_SLIDES)return false;
 return content.slides.every(s=>s&&typeof s.title==='string'&&s.title.trim().length>0&&s.title.length<=100&&typeof s.body==='string'&&s.body.length<=1600&&typeof s.notes==='string'&&s.notes.length<=2000&&['title','content'].includes(s.layout));
}
export function buildLessonDeck(topic){
 const name=topic.trim().slice(0,100)||'My lesson';
 return {...newDeck(),slides:[
 {title:name,body:'Add your subject and grade.',notes:'Introduce the topic and connect it to the previous lesson.',layout:'title'},
 {title:'Learning objectives',body:'By the end of this lesson, learners should be able to:\n• Add an observable learning objective.\n• Add a success criterion.',notes:'Review these objectives with learners.',layout:'content'},
 {title:'Explain the idea',body:'• Add your explanation of '+name+'.\n• Define important terms.\n• Include a helpful example.',notes:'Check facts and curriculum alignment before presenting.',layout:'content'},
 {title:'Worked example',body:'1. Introduce the problem.\n2. Model each step.\n3. Explain and check the answer.',notes:'Replace this outline with your actual worked example.',layout:'content'},
 {title:'Your turn',body:'• Add a practice question.\n• Give learners time to respond.\n• Discuss their reasoning.',notes:'Adjust difficulty to learner needs.',layout:'content'},
 {title:'Check understanding',body:'• Add an exit-ticket question.\n• Summarise the key idea.\n• Set a follow-up task.',notes:'Use responses to plan the next lesson.',layout:'content'}]};
}
export function deckFromLesson(plan){
 const content={...newDeck(),slides:[
 {title:String(plan.topic||'My lesson').slice(0,100),body:[plan.subject,plan.grade].filter(Boolean).join(' · ').slice(0,1600),notes:'',layout:'title'},
 {title:'Learning objectives',body:[plan.objective,plan.success].filter(Boolean).join('\n').slice(0,1600),notes:String(plan.misconception||'').slice(0,2000),layout:'content'},
 ...(Array.isArray(plan.stages)?plan.stages:[]).slice(0,36).map(stage=>({title:String(stage.title||'Activity').slice(0,100),body:String(stage.detail||'').slice(0,1600),notes:stage.minutes?'Suggested time: '+stage.minutes+' minutes':'',layout:'content'})),
 {title:'Check understanding',body:String(plan.assessment||'Add an exit-ticket question.').slice(0,1600),notes:String(plan.followup||'').slice(0,2000),layout:'content'}]};
 const title=String(plan.topic||'My lesson').trim();return {title:(title.length<3?'Lesson: '+title:title).slice(0,120),content};
}
function wrap(context,text,maxWidth){
 return text.split('\n').flatMap(paragraph=>{if(!paragraph)return [''];const words=paragraph.split(/\s+/),lines=[];let line='';for(const word of words){const next=line?line+' '+word:word;if(line&&context.measureText(next).width>maxWidth){lines.push(line);line=word;}else line=next;}lines.push(line);return lines;});
}
function textBlock(ctx,text,{x,y,width,height,size,min=18,color,weight='400'}){
 let lines,step;
 do {ctx.font=weight+' '+size+'px Arial, sans-serif';lines=wrap(ctx,text,width);step=Math.round(size*1.3);if(lines.length*step<=height||size<=min)break;size-=2;}while(size>=min);
 ctx.fillStyle=color;ctx.textBaseline='top';lines.slice(0,Math.floor(height/step)).forEach((line,i)=>ctx.fillText(line,x,y+i*step,width));
}
// The fixed footer is drawn into the pixels, so it survives PDF export and live sharing.
export function renderDeckSlide(canvas,slide,themeName,page,total,author=''){
 const theme=DECK_THEMES[themeName]||DECK_THEMES.forest;canvas.width=1280;canvas.height=720;
 const ctx=canvas.getContext('2d');if(!ctx)throw new Error('Slide preview is unavailable in this browser.');
 ctx.fillStyle=theme.background;ctx.fillRect(0,0,1280,720);
 ctx.fillStyle=theme.accent;ctx.fillRect(0,0,16,720);ctx.globalAlpha=0.12;ctx.beginPath();ctx.arc(1200,0,320,0,Math.PI*2);ctx.fill();ctx.globalAlpha=1;
 const cover=slide.layout==='title';
 textBlock(ctx,slide.title,{x:76,y:cover?150:62,width:1120,height:cover?210:140,size:cover?64:48,min:30,color:theme.ink,weight:'700'});
 ctx.fillStyle=theme.accent;ctx.fillRect(78,cover?382:214,92,5);
 textBlock(ctx,slide.body,{x:78,y:cover?420:250,width:1110,height:cover?190:365,size:cover?32:34,min:18,color:theme.ink});
 ctx.fillStyle=theme.panel;ctx.fillRect(16,656,1264,64);
 ctx.fillStyle=theme.accent;ctx.font='700 28px Arial, sans-serif';ctx.textBaseline='middle';ctx.fillText('SmartBridge FET',44,688);
 if(author){ctx.font='18px Arial, sans-serif';ctx.fillStyle=theme.ink;ctx.fillText('Author: '+author.slice(0,80),340,688,750);}
 ctx.textAlign='right';ctx.font='18px Arial, sans-serif';ctx.fillStyle=theme.ink;ctx.fillText(page+' / '+total,1236,688);ctx.textAlign='left';
}
export function addPdfBrand(canvas,page,total,author=''){
 const ctx=canvas.getContext('2d'),height=Math.max(36,Math.round(canvas.width*0.05));
 ctx.fillStyle='#e4eee7';ctx.fillRect(0,canvas.height-height,canvas.width,height);ctx.fillStyle='#17623f';ctx.textBaseline='middle';ctx.font='700 '+Math.max(12,Math.round(canvas.width*0.022))+'px Arial, sans-serif';ctx.fillText('SmartBridge FET',12,canvas.height-height/2);
 if(author){ctx.font=Math.max(10,Math.round(canvas.width*0.014))+'px Arial, sans-serif';ctx.fillText('Author: '+author.slice(0,80),canvas.width*0.27,canvas.height-height/2,canvas.width*0.56);}
 ctx.textAlign='right';ctx.font=Math.max(10,Math.round(canvas.width*0.014))+'px Arial, sans-serif';ctx.fillText(page+' / '+total,canvas.width-12,canvas.height-height/2);ctx.textAlign='left';
}
export async function exportDeckPdf(deck,author=''){
 const {jsPDF}=await import('jspdf');const pdf=new jsPDF({orientation:'landscape',unit:'mm',format:[320,180]});
 const canvas=document.createElement('canvas');
 deck.content.slides.forEach((slide,i)=>{if(i)pdf.addPage([320,180],'landscape');renderDeckSlide(canvas,slide,deck.content.theme,i+1,deck.content.slides.length,deck.content.show_author?author:'');pdf.addImage(canvas.toDataURL('image/jpeg',0.9),'JPEG',0,0,320,180);});
 pdf.setProperties({title:deck.title,author:deck.content.show_author?author:'SmartBridge FET',creator:'SmartBridge FET'});
 pdf.save((deck.title.replace(/[^a-zA-Z0-9 _-]/g,'').trim()||'Presentation')+'.pdf');
}
