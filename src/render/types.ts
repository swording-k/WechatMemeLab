export type Template = 'pinch' | 'pull' | 'knead' | 'bulge' | 'twist' | 'squish' | 'cat' | 'dog' | 'suction' | 'melt' | 'leak' | 'custom' | 'notify' | 'crack' | 'screen';
export interface Warp {kind:'drag'|'expand'|'shrink';x:number;y:number;dx:number;dy:number;radius:number}
export interface Settings {
  custom?:Warp[];
  petX?:number;petY?:number;petScale?:number;petRotation?:number;
  petFace?:{dx:number;dy:number;angle:number};
  captionX?:number;captionY?:number;captionSize?:number;captionColor?:string;captionStyle?:'meme'|'plain'|'band'|'shake';
  captionCenterX?:number;captionCenterY?:number;captionRotation?:number;captionScale?:number;
  template:Template;caption:string;zoom:number;x:number;y:number;intensity:number;speed:number;background:string;size:number;focusX:number;focusY:number;radius:number;
}
export interface RenderAssets {hand?:CanvasImageSource}
export const templates:{id:Template;title:string;subtitle:string;caption:string;tag:string;suggestions:string[]}[]=[
  {id:'custom',title:'自由捏图',subtitle:'自己拉拽、鼓起、缩小，捏出你的动作',caption:'',tag:'自己来',suggestions:['你看我像正常吗','我先疯为敬','已读乱捏']},
  {id:'cat',title:'摸两下就上头',subtitle:'变成怪猫，挠下巴挠到脸扁耳朵折',caption:'再摸一下',tag:'人变猫',suggestions:['再摸一下','你的小猫突然发疯','现在知道哄我了？']},
  {id:'dog',title:'见你就变狗',subtitle:'狗耳乱甩，伸舌头，兴奋到扑脸',caption:'你终于回我了',tag:'人变狗',suggestions:['你终于回我了','让我闻闻','我就蹭一下']},
  {id:'notify',title:'被消息震飞',subtitle:'催命消息连着来，脸都震歪了',caption:'来了来了',tag:'催回复',suggestions:['来了来了','别催了在回了','消息把我震醒了']},
  {id:'crack',title:'脸先破防',subtitle:'嘴还在硬撑，脸已经裂开',caption:'我没急',tag:'互损',suggestions:['我没急','兄弟我真没破防','说好的不许笑']},
  {id:'screen',title:'挤进你的屏幕',subtitle:'脸顶着屏幕挤过来，求你理一下',caption:'理我一下',tag:'贴贴',suggestions:['理我一下','让我挤进去','就要黏着你']},
  {id:'suction',title:'吸走理智',subtitle:'吸管一靠近，五官被吸过去',caption:'脑子被你吸走了',tag:'上头',suggestions:['脑子被你吸走了','理智已下线','你把我CPU吸走了']},
  {id:'melt',title:'被夸到融化',subtitle:'越夸越软，下巴都挂不住',caption:'你再夸一句',tag:'拿捏',suggestions:['你再夸一句','被你拿捏了','别夸了要化了']},
  {id:'leak',title:'嘴硬漏气',subtitle:'先憋鼓，突然漏气，再装没事',caption:'我真的没事',tag:'嘴硬',suggestions:['我真的没事','才没有想你','兄弟我没破防']},
  {id:'pinch',title:'就捏一下',subtitle:'两边捏住，脸挤成一团',caption:'就捏一下',tag:'别躲',suggestions:['就捏一下','不许躲','让我捏捏']},
  {id:'pull',title:'脸借我拉一下',subtitle:'抓住脸颊，拉长又弹回来',caption:'脸借我拉一下',tag:'欠揍',suggestions:['脸借我拉一下','你怎么回事','略略略']},
  {id:'knead',title:'揉到走形',subtitle:'左右揉两下，五官拧巴了',caption:'过来让我揉揉',tag:'贴脸',suggestions:['过来让我揉揉','别动','你先别说话']},
  {id:'bulge',title:'憋成大头',subtitle:'越憋越鼓，原地破防',caption:'憋不住了',tag:'抽象',suggestions:['憋不住了','你看我像正常吗','就这样吧']},
  {id:'twist',title:'脸都气歪了',subtitle:'嘴硬一下，脸真的歪了',caption:'我没事啊',tag:'嘴硬',suggestions:['我没事啊','你再说一遍','嘴硬一下']},
  {id:'squish',title:'憋成一团',subtitle:'脸扁了，又悄悄弹回来',caption:'不许笑',tag:'绷不住',suggestions:['不许笑','我忍','已读乱回']},
];
export const defaults:Settings={template:'pinch',caption:'就捏一下',captionX:50,captionY:96,captionSize:35,captionColor:'#ffffff',captionStyle:'meme',zoom:1,x:0,y:0,intensity:.75,speed:1,background:'#fff8ed',size:240,focusX:.5,focusY:.5,radius:.35};
export const DURATION=1600;
