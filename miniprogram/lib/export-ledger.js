function createLedger({policy, read, write, now = Date.now}) {
 const enabled = policy.enabled === true && /^adunit-[\w-]+$/.test(policy.adUnitId || '')
  && Number.isSafeInteger(policy.dailyFree) && policy.dailyFree > 0;
 let active;
 const day = () => new Date(now() + 8 * 3600000).toISOString().slice(0, 10);
 const count = n => Number.isSafeInteger(n) && n >= 0 ? n : 0;
 function state() {
  let saved;
  try { saved = read(); } catch { throw Error('无法读取导出次数，请稍后重试'); }
  return {day: day(), used: saved?.day === day() ? count(saved.used) : 0, rewards: count(saved?.rewards)};
 }
 function persist(s) {
  try { write(s); } catch { throw Error('导出次数未能保存，请检查设备存储后重试'); }
 }
 return {
  snapshot() {
   if (!enabled) return {enabled: false, remaining: 0, rewards: 0};
   const s = state();
   return {enabled: true, remaining: Math.max(0, policy.dailyFree - s.used), rewards: s.rewards};
  },
  reward() {
   if (!enabled) return;
   const s = state(); s.rewards++; persist(s);
  },
  begin() {
   if (!enabled) return {commit() {}, release() {}};
   if (active) throw Error('已有作品正在生成，请稍候');
   const s = state();
   if (s.used >= policy.dailyFree && !s.rewards) throw Object.assign(Error('今日免费次数已用完'), {code: 'AD_REQUIRED'});
   const ticket = {}; active = ticket;
   return {
    commit() {
     if (active !== ticket) return;
     const current = state();
     if (current.used < policy.dailyFree) current.used++;
     else if (current.rewards > 0) current.rewards--;
     else throw Error('导出资格已变化，请重试');
     persist(current); active = undefined;
    },
    release() { if (active === ticket) active = undefined; }
   };
  }
 };
}
module.exports = {createLedger};
