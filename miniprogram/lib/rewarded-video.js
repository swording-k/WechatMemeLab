// One instance belongs to one page. A successful show() is NOT a completed watch.
function createRewardedVideo({wx, adUnitId, timeoutMs = 300000}) {
 let ad, active, closed = false;
 function settle(ticket, error) {
  if (active !== ticket) return;
  active = undefined; clearTimeout(ticket.timer);
  if (error) ticket.reject(error); else ticket.resolve();
 }
 function onClose(result) {
  if (!active) return;
  settle(active, result?.isEnded === true ? null : Error('完整观看后才能解锁一次导出'));
 }
 function detach() {
  closed = true;
  if (!ad) return;
  ad.offClose?.(onClose); ad.offError?.(onError); ad.destroy?.();
 }
 function onError() {
  if (active) settle(active, Error('暂时没有可用广告，请稍后重试'));
  detach();
 }
 return {
  get closed() { return closed; },
  async watch() {
   if (closed) throw Error('广告页面已关闭，请重试');
   if (active) throw Error('广告正在播放，请稍候');
   if (!wx.createRewardedVideoAd) throw Error('当前微信不支持激励视频，请更新微信');
   if (!ad) {
    try { ad = wx.createRewardedVideoAd({adUnitId}); ad.onClose(onClose); ad.onError(onError); }
    catch { throw Error('广告暂时无法加载，请稍后重试'); }
   }
   return new Promise((resolve, reject) => {
    const ticket = {resolve, reject}; active = ticket;
    ticket.timer = setTimeout(() => { settle(ticket, Error('广告等待超时，请重试')); detach(); }, timeoutMs);
    Promise.resolve().then(() => { if (active === ticket) return ad.show(); }).catch(async () => {
     if (active !== ticket) return;
     await ad.load();
     if (active === ticket) await ad.show();
    }).catch(() => { if (active === ticket) { settle(ticket, Error('暂时没有可用广告，请稍后重试')); detach(); } });
   });
  },
  dispose() {
   if (active) settle(active, Error('已取消观看广告'));
   if (!closed) detach();
  }
 };
}
module.exports = {createRewardedVideo};
