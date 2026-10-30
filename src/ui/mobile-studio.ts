import './mobile-studio.css';
type Tool='photo'|'effects'|'text'|'motion';
export function installMobileStudio(activate:(tool:Tool)=>void){
 const workspace=document.querySelector<HTMLElement>('.workspace')!,preview=document.querySelector<HTMLElement>('.preview-panel')!;
 const tabs=document.createElement('div');tabs.className='mobile-tool-tabs';tabs.setAttribute('role','tablist');tabs.setAttribute('aria-label','表情编辑工具');
 const tools:Tool[]=['photo','effects','text','motion'],labels=['照片','效果','文字','动作'];
 const body=document.createElement('div');body.className='mobile-tool-body';
 const panes=new Map<Tool,HTMLElement>();
 tools.forEach((tool,i)=>{const button=document.createElement('button');button.id=`tool-${tool}`;button.type='button';button.role='tab';button.textContent=labels[i];button.setAttribute('aria-controls',`panel-${tool}`);button.onclick=()=>select(tool);button.onkeydown=e=>{if(!['ArrowLeft','ArrowRight','Home','End'].includes(e.key))return;e.preventDefault();const next=e.key==='Home'?0:e.key==='End'?3:(i+(e.key==='ArrowRight'?1:3))%4;select(tools[next]);(tabs.children[next] as HTMLElement).focus();};tabs.append(button);
  const pane=document.createElement('section');pane.id=`panel-${tool}`;pane.role='tabpanel';pane.setAttribute('aria-labelledby',button.id);pane.tabIndex=0;panes.set(tool,pane);body.append(pane);
 });
 const help=document.createElement('dialog');help.id='mobile-help';help.innerHTML='<form method="dialog"><strong>保存与使用教程</strong><button>返回编辑</button></form>';document.body.append(help);
 const stage=document.createElement('div');stage.className='mobile-studio-stage';
 const motion=document.createElement('div');motion.className='mobile-motion-controls';
 const tuning=document.querySelector<HTMLElement>('.tuning-block')!;
 const motionStart=tuning.querySelector('.slider-label')!;
 // Move existing controls and retain their original locations for desktop layouts.
 const motions=[...tuning.children].slice([...tuning.children].indexOf(motionStart));
 const records:{node:Element,anchor:Comment,target:HTMLElement}[]=[];
 function move(node:Element,target:HTMLElement){const anchor=document.createComment('desktop control position');node.before(anchor);records.push({node,anchor,target});}
 for(const selector of ['.preview-toolbar','.preview-editor','.preview-bottom','.editing-tools'])move(preview.querySelector(selector)!,stage);
 move(document.querySelector('.photo-block')!,panes.get('photo')!);
 move(document.querySelector('.template-panel')!,panes.get('effects')!);
 move(document.querySelector('#sculpt-tools')!,panes.get('motion')!);
 move(document.querySelector('#pet-controls')!,panes.get('motion')!);
 for(const node of motions)move(node,motion);
 move(tuning,panes.get('text')!);move(document.querySelector('#usage')!,help);move(document.querySelector('footer')!,help);
 // Motion contents have their own anchors inside tuning; append after relocating tuning.
 let selected:Tool='photo',mobile=false;
 const media=matchMedia('(max-width:880px)');
 function select(tool:Tool){selected=tool;for(const [key,pane] of panes){const active=key===tool;pane.hidden=!active;const button=document.getElementById(`tool-${key}`)!;button.setAttribute('aria-selected',String(active));button.tabIndex=active?0:-1;}activate(tool);body.scrollTop=0;}
 function measure(){if(!mobile)return;const viewport=window.visualViewport;
  const keyboard=Boolean(viewport&&viewport.height<window.innerHeight*.75);document.body.classList.toggle('studio-keyboard',keyboard);
  const nav=document.querySelector<HTMLElement>('.mode-nav')!;
  const top=keyboard?4:Math.ceil(nav.getBoundingClientRect().bottom+8);
  workspace.style.setProperty('--studio-top',`${top}px`);
  workspace.style.setProperty('--studio-height',`${Math.max(240,(viewport?.height??window.innerHeight)-top-8)}px`);
 }
 function update(){
  if(media.matches===mobile){measure();return;}mobile=media.matches;document.body.classList.toggle('mobile-studio',mobile);
  if(mobile){window.scrollTo(0,0);workspace.prepend(stage,tabs,body);for(const r of records)r.target.append(r.node);panes.get('motion')!.append(motion);select(selected);requestAnimationFrame(measure);}
  else {help.close();for(const r of [...records].reverse())r.anchor.after(r.node);stage.remove();tabs.remove();body.remove();motion.remove();document.body.classList.remove('studio-keyboard');workspace.style.removeProperty('--studio-height');activate('effects');}
 }
 // Choosing a custom deformation opens its brushes; presets remain in the effect chooser.
 workspace.addEventListener('click',e=>{const target=(e.target as HTMLElement).closest<HTMLElement>('[data-template],#layer-text,#layer-pet');if(!mobile||!target)return;if(target.dataset.template==='custom')select('motion');else if(target.id==='layer-text')select('text');else if(target.id==='layer-pet')select('motion');});
 document.addEventListener('click',e=>{const link=(e.target as HTMLElement).closest<HTMLAnchorElement>('a[href="#usage"],a[href="#phone-tutorial"]');if(!mobile||!link)return;e.preventDefault();help.showModal();});
 document.getElementById('file')!.addEventListener('change',()=>{if(mobile)select('photo');});
 const chromeObserver=new ResizeObserver(()=>measure());chromeObserver.observe(document.querySelector('.mode-nav')!);chromeObserver.observe(document.querySelector('.site-header')!);
 media.addEventListener('change',update);window.addEventListener('resize',measure);window.visualViewport?.addEventListener('resize',measure);update();
 return {select,refresh(){if(mobile)activate(selected);},get mobile(){return mobile;}};
}
