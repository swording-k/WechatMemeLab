export type Template = 'zoom' | 'melt' | 'rush' | 'cling' | 'peek' | 'kiss' | 'creep' | 'hop' | 'shy';
export interface Settings {
  template: Template;
  caption: string;
  zoom: number;
  x: number;
  y: number;
  intensity: number;
  speed: number;
  background: string;
  size: number;
}
export const templates: { id: Template; title: string; subtitle: string; caption: string; tag: string }[] = [
  { id: 'zoom', title: '你说啥？', subtitle: '突然怼脸，越看越离谱', caption: '啊？', tag: '一脸问号' },
  { id: 'melt', title: '精神状态良好', subtitle: '拉长、压扁、原地发疯', caption: '别催了！！', tag: '已经疯了' },
  { id: 'rush', title: '我来啦', subtitle: '冲进来，撞扁，再弹飞', caption: '我来了！！', tag: '闪亮登场' },
  { id: 'cling', title: '贴一下怎么了', subtitle: '两个自己挤在一起，又弹开', caption: '贴一下怎么了', tag: '理直气壮' },
  { id: 'peek', title: '偷偷靠近', subtitle: '探一下，挪过来，装作没事', caption: '你在干嘛', tag: '暗中观察' },
  { id: 'kiss', title: '亲完就跑', subtitle: '冲过来啵一下，转身溜走', caption: '啵！溜了', tag: '偷袭成功' },
  { id: 'creep', title: '阴暗爬行', subtitle: '压成一条，在底下蠕动', caption: '阴暗地爬过来', tag: '扭曲蠕动' },
  { id: 'hop', title: '左右横跳', subtitle: '这边蹦一下，那边又蹦一下', caption: '略略略', tag: '抓不到我' },
  { id: 'shy', title: '害羞到蒸发', subtitle: '抖两下，缩成一团，直接消失', caption: '啊啊不许看', tag: '当场消失' },
];
export const defaults: Settings = { template: 'zoom', caption: '啊？', zoom: 1, x: 0, y: 0, intensity: 0.85, speed: 1, background: '#ffffff', size: 320 };
