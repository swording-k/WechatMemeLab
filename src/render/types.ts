export type Template = 'zoom' | 'melt' | 'rush';
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
];
export const defaults: Settings = { template: 'zoom', caption: '啊？', zoom: 1, x: 0, y: 0, intensity: 0.85, speed: 1, background: '#ffffff', size: 320 };
