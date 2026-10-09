export type Template = 'pinch' | 'pull' | 'knead' | 'bulge' | 'twist' | 'squish' | 'glass' | 'suction' | 'melt' | 'leak';
export interface Settings {
  template:Template;caption:string;zoom:number;x:number;y:number;intensity:number;speed:number;background:string;size:number;focusX:number;focusY:number;radius:number;
}
export interface RenderAssets {hand?:CanvasImageSource}
export const templates:{id:Template;title:string;subtitle:string;caption:string;tag:string;suggestions:string[]}[]=[
  {id:'glass',title:'贴到玻璃上',subtitle:'鼻尖压扁，脸颊贴开，再松开',caption:'让我贴贴',tag:'黏人',suggestions:['让我贴贴','想你想到变形','别隔着屏幕']},
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
export const defaults:Settings={template:'pinch',caption:'就捏一下',zoom:1,x:0,y:0,intensity:.75,speed:1,background:'#fff8ed',size:240,focusX:.5,focusY:.5,radius:.35};
export const DURATION=1600;
