const policy = require('../config/export-policy');
const {createLedger} = require('./export-ledger');
const {createRewardedVideo} = require('./rewarded-video');
const STORAGE_KEY = 'meme-export-allowance-v1';
// Shared by the two pages, so they cannot each spend the same free allowance.
let ledger;
function sharedLedger() {
 if (!ledger) ledger = createLedger({policy, read: () => wx.getStorageSync(STORAGE_KEY), write: state => wx.setStorageSync(STORAGE_KEY, state)});
 return ledger;
}
const initialData = {exportUsage: ''};
const pageMethods = {
 refreshExportUsage() {
  try {
   const s = sharedLedger().snapshot();
   this.setData({exportUsage: !s.enabled ? '' : `今日免费 ${s.remaining}/${policy.dailyFree} 次${s.rewards ? ` · 广告奖励 ${s.rewards} 次` : ''}${!s.remaining && !s.rewards ? ' · 完整看广告可解锁一次' : ''}`});
  } catch { this.setData({exportUsage: '暂时无法读取导出次数，请重试'}); }
 },
 async acquireExport() {
  const store = sharedLedger();
  let permit;
  try { permit = store.begin(); }
  catch (error) {
   if (error.code !== 'AD_REQUIRED') throw error;
   this.waitingForExportAd = true;
   try {
    const choice = await wx.showModal({title: '今日免费次数已用完', content: `照片和视频每天共可免费导出 ${policy.dailyFree} 次。完整观看一段广告，解锁一次导出；生成失败不扣次数。`, confirmText: '看广告', cancelText: '稍后再做'});
    if (!choice.confirm || this.exportClosed) throw Error('已取消生成，作品仍在');
    if (!this.exportAd || this.exportAd.closed) this.exportAd = createRewardedVideo({wx, adUnitId: policy.adUnitId});
    await this.exportAd.watch();
    if (this.exportClosed) throw Error('已取消生成');
    store.reward();
    permit = store.begin();
   } finally { this.waitingForExportAd = false; this.refreshExportUsage(); }
  }
  this.exportPermit = permit;
  return permit;
 },
 disposeExportAccess() {
  this.exportClosed = true;
  this.exportAd?.dispose();
  this.exportPermit?.release();
  this.exportPermit = undefined;
 }
};
module.exports = {initialData, pageMethods};
