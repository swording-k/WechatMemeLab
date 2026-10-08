export type Template = 'pinch' | 'pull' | 'knead' | 'bulge' | 'twist' | 'squish';
export interface Settings {
  template:Template;caption:string;zoom:number;x:number;y:number;intensity:number;speed:number;background:string;size:number;focusX:number;focusY:number;radius:number;
}
export interface RenderAssets {hand?:CanvasImageSource}
export const templates:{id:Template;title:string;subtitle:string;caption:string;tag:string;suggestions:string[]}[]=[
  {id:'pinch',title:'就捏一下',subtitle:'两边捏住，脸挤成一团',caption:'就捏一下',tag:'别躲',suggestions:['就捏一下','不许躲','让我捏捏']},
  {id:'pull',title:'脸借我拉一下',subtitle:'抓住脸颊，拉长又弹回来',caption:'脸借我拉一下',tag:'欠揍',suggestions:['脸借我拉一下','你怎么回事','略略略']},
  {id:'knead',title:'揉到走形',subtitle:'左右揉两下，五官拧巴了',caption:'过来让我揉揉',tag:'贴脸',suggestions:['过来让我揉揉','别动','你先别说话']},
  {id:'bulge',title:'憋成大头',subtitle:'越憋越鼓，原地破防',caption:'憋不住了',tag:'抽象',suggestions:['憋不住了','你看我像正常吗','就这样吧']},
  {id:'twist',title:'脸都气歪了',subtitle:'嘴硬一下，脸真的歪了',caption:'我没事啊',tag:'嘴硬',suggestions:['我没事啊','你再说一遍','嘴硬一下']},
  {id:'squish',title:'憋成一团',subtitle:'脸扁了，又悄悄弹回来',caption:'不许笑',tag:'绷不住',suggestions:['不许笑','我忍','已读乱回']},
];
export const defaults:Settings={template:'pinch',caption:'就捏一下',zoom:1,x:0,y:0,intensity:.75,speed:1,background:'#fff8ed',size:240,focusX:.5,focusY:.5,radius:.35};
export const DURATION=1600;
