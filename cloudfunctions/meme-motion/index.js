"use strict";
var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __commonJS = (cb, mod) => function __require() {
  try {
    return mod || (0, cb[__getOwnPropNames(cb)[0]])((mod = { exports: {} }).exports, mod), mod.exports;
  } catch (e) {
    throw mod = 0, e;
  }
};
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// cloudfunctions/meme-feedback/security-core.cjs
var require_security_core = __commonJS({
  "cloudfunctions/meme-feedback/security-core.cjs"(exports2, module2) {
    "use strict";
    var { createHash: createHash8, createHmac: createHmac3, timingSafeEqual: timingSafeEqual3, createDecipheriv } = require("node:crypto");
    function fail5(message, status = 503) {
      throw Object.assign(new Error(message), { status });
    }
    function equal2(a, b) {
      const x = Buffer.from(String(a)), y = Buffer.from(String(b));
      return x.length === y.length && timingSafeEqual3(x, y);
    }
    function secret(env2) {
      if (!env2.MEME_SECURITY_SECRET || env2.MEME_SECURITY_SECRET.length < 32) fail5("\u5185\u5BB9\u5B89\u5168\u670D\u52A1\u5C1A\u672A\u914D\u7F6E");
      return env2.MEME_SECURITY_SECRET;
    }
    function sign(data, env2) {
      const text = Buffer.from(JSON.stringify(data)).toString("base64url");
      return text + "." + createHmac3("sha256", secret(env2)).update(text).digest("base64url");
    }
    function verify(token, env2, kind) {
      const [text, mac, ...extra] = String(token || "").split(".");
      if (extra.length || !text || !mac || !equal2(mac, createHmac3("sha256", secret(env2)).update(text).digest("base64url"))) fail5("\u68C0\u6D4B\u51ED\u8BC1\u65E0\u6548\uFF0C\u8BF7\u91CD\u65B0\u68C0\u6D4B", 401);
      let data;
      try {
        data = JSON.parse(Buffer.from(text, "base64url"));
      } catch {
        fail5("\u68C0\u6D4B\u51ED\u8BC1\u65E0\u6548", 401);
      }
      if (data.kind !== kind || !Number.isFinite(data.exp) || data.exp < Date.now()) fail5("\u68C0\u6D4B\u51ED\u8BC1\u5DF2\u8FC7\u671F\uFF0C\u8BF7\u91CD\u65B0\u68C0\u6D4B", 401);
      return data;
    }
    function digest2(text, images) {
      const h = createHash8("sha256").update(JSON.stringify(String(text)));
      for (const image of images) {
        const b = image.buffer || Buffer.from(image.data, "base64");
        h.update(String(b.length) + ":").update(b);
      }
      return h.digest("hex");
    }
    async function checkText(call, uid, text) {
      if (!text.trim()) return;
      const r = await call("msg_sec_check", { openid: uid, scene: 4, version: 2, content: text });
      if (r.errcode !== 0 || r.result?.suggest !== "pass") fail5(r.result?.suggest === "risky" || r.errcode === 87014 ? "\u5185\u5BB9\u5305\u542B\u8FDD\u89C4\u4FE1\u606F\uFF0C\u8BF7\u4FEE\u6539\u540E\u91CD\u8BD5" : "\u6587\u5B57\u672A\u901A\u8FC7\u68C0\u6D4B\uFF0C\u8BF7\u4FEE\u6539\u5185\u5BB9\u6216\u7A0D\u540E\u91CD\u8BD5", 422);
    }
    function signature(q, env2, encrypted) {
      if (!env2.WECHAT_CALLBACK_TOKEN || env2.WECHAT_CALLBACK_TOKEN.length < 3 || env2.WECHAT_CALLBACK_TOKEN.length > 32) fail5("\u56DE\u8C03Token\u987B\u4E3A3\u81F332\u4F4D");
      if (!/^\d+$/.test(q.timestamp || "") || Math.abs(Date.now() / 1e3 - Number(q.timestamp)) > 600 || !q.nonce) fail5("\u65E0\u6548\u56DE\u8C03", 403);
      const values = [env2.WECHAT_CALLBACK_TOKEN, q.timestamp, q.nonce];
      if (encrypted) values.push(encrypted);
      const hash3 = createHash8("sha1").update(values.sort().join("")).digest("hex");
      if (!equal2(hash3, encrypted ? q.msg_signature : q.signature)) fail5("\u56DE\u8C03\u7B7E\u540D\u4E0D\u7B26", 403);
    }
    function callbackMessage(q, body, env2) {
      const encrypted = body.Encrypt || body.encrypt;
      signature(q, env2, encrypted);
      if (!encrypted) fail5("\u8BF7\u4F7F\u7528\u5B89\u5168\u6A21\u5F0F\u6D88\u606F\u63A8\u9001", 403);
      const key = Buffer.from((env2.WECHAT_CALLBACK_AES_KEY || "") + "=", "base64");
      if (key.length !== 32) fail5("\u56DE\u8C03AES\u5BC6\u94A5\u65E0\u6548");
      const decipher = createDecipheriv("aes-256-cbc", key, key.subarray(0, 16));
      decipher.setAutoPadding(false);
      let data;
      try {
        data = Buffer.concat([decipher.update(Buffer.from(encrypted, "base64")), decipher.final()]);
      } catch {
        fail5("\u56DE\u8C03\u89E3\u5BC6\u5931\u8D25", 403);
      }
      const pad = data[data.length - 1];
      if (pad < 1 || pad > 32 || !data.subarray(data.length - pad).every((x) => x === pad)) fail5("\u56DE\u8C03\u586B\u5145\u9519\u8BEF", 403);
      data = data.subarray(0, data.length - pad);
      if (data.length < 20) fail5("\u56DE\u8C03\u683C\u5F0F\u9519\u8BEF", 403);
      const n = data.readUInt32BE(16);
      if (n > data.length - 20 || data.subarray(20 + n).toString() !== env2.WECHAT_APP_ID) fail5("\u56DE\u8C03AppID\u4E0D\u5339\u914D", 403);
      try {
        return JSON.parse(data.subarray(20, 20 + n).toString());
      } catch {
        fail5("\u8BF7\u914D\u7F6EJSON\u6D88\u606F\u63A8\u9001", 400);
      }
    }
    function receiptMatches(ticket, text, images, env2) {
      const r = verify(ticket, env2, "receipt");
      if (r.hash !== digest2(text, images)) fail5("\u63D0\u4EA4\u5185\u5BB9\u5DF2\u53D8\u5316\uFF0C\u8BF7\u91CD\u65B0\u68C0\u6D4B", 403);
      return r;
    }
    module2.exports = { fail: fail5, sign, verify, digest: digest2, checkText, callbackMessage, signature, receiptMatches };
  }
});

// cloudfunctions/meme-motion/entry.mjs
var entry_exports = {};
__export(entry_exports, {
  main: () => main
});
module.exports = __toCommonJS(entry_exports);

// cloudfunctions/meme-motion/billing-policy.mjs
var import_node_crypto = require("node:crypto");
var id = (uid) => (0, import_node_crypto.createHash)("sha256").update("wechat:" + uid).digest("hex");
var ids = (value) => new Set((value || "").split(",").map((x) => x.trim()).filter(Boolean));
function billingPolicy(env2, publicPaymentEnabled) {
  const testers = ids(env2.MEME_BILLING_TEST_ACCOUNT_IDS), free = ids([env2.MEME_DEVELOPER_ACCOUNT_IDS, env2.MEME_FREE_ACCOUNT_IDS].filter(Boolean).join(","));
  const publicEnabled = env2.MEME_BILLING_ENABLED === "true" && publicPaymentEnabled;
  return { enabled: (uid) => publicEnabled || typeof uid === "string" && testers.has(id(uid)), exempt: (uid) => !testers.has(id(uid)) && free.has(id(uid)) };
}

// cloudfunctions/meme-motion/accounts.mjs
var import_node_crypto2 = require("node:crypto");
var import_security_core = __toESM(require_security_core(), 1);
var hash = (x) => (0, import_node_crypto2.createHash)("sha256").update(x).digest("hex");
var fail = (message, status = 422) => {
  throw Object.assign(Error(message), { status });
};
var same = (a, b) => typeof a === "string" && typeof b === "string" && a.length === b.length && (0, import_node_crypto2.timingSafeEqual)(Buffer.from(a), Buffer.from(b));
var accountId = (uid) => hash("wechat:" + uid);
function createAccounts({ store: store2, env: env2, billingEnabled: billingEnabled2 = false, billingExempt, now = Date.now }) {
  async function ensure(tx, uid, create = true) {
    if (typeof uid !== "string" || !uid || uid.startsWith("web:")) fail("\u8BF7\u4F7F\u7528\u5FAE\u4FE1\u767B\u5F55", 401);
    const id2 = accountId(uid);
    let account = await tx.get("meme_accounts", id2);
    if (!account && !create) return null;
    if (!account) {
      account = { id: id2, createdAt: now() };
      await tx.set("meme_accounts", id2, account);
    }
    let wallet = await tx.get("meme_wallets", id2);
    if (!wallet && !create) return null;
    if (!wallet) {
      wallet = { accountId: id2, available: 0, frozen: 0, spent: 0, credited: 0 };
      await tx.set("meme_wallets", id2, wallet);
    }
    return { account: { id: id2, number: "GX" + id2.slice(0, 12).toUpperCase(), createdAt: account.createdAt }, wallet: { available: wallet.available, frozen: wallet.frozen, spent: wallet.spent }, developer: (env2.MEME_DEVELOPER_ACCOUNT_IDS || "").split(",").map((x) => x.trim()).includes(id2), free: !(typeof billingEnabled2 === "function" ? billingEnabled2(uid) : billingEnabled2) || (billingExempt ? billingExempt(uid) : (env2.MEME_DEVELOPER_ACCOUNT_IDS || "").split(",").map((x) => x.trim()).includes(id2)) };
  }
  async function rate(tx, key, limit, window) {
    const r = await tx.get("meme_login_limits", key) || { at: now(), count: 0 };
    if (now() - r.at >= window) {
      r.at = now();
      r.count = 0;
    }
    if (r.count >= limit) return false;
    r.count++;
    await tx.set("meme_login_limits", key, r);
    return true;
  }
  return {
    async me(uid) {
      if (store2.readOnly) {
        const found = await store2.readOnly((tx) => ensure(tx, uid, false));
        if (found) return found;
      }
      return store2.transaction((tx) => ensure(tx, uid));
    },
    async start({ clientId, secret }) {
      if (!/^[a-f0-9]{32,64}$/.test(clientId || "") || !/^[A-Za-z0-9_-]{40,100}$/.test(secret || "")) fail("\u6D4F\u89C8\u5668\u767B\u5F55\u4FE1\u606F\u65E0\u6548", 400);
      const result = await store2.transaction(async (tx) => {
        if (!await rate(tx, "start:" + hash(clientId), 1, 3e4)) return { error: "\u767B\u5F55\u7801\u7533\u8BF7\u8FC7\u4E8E\u9891\u7E41\uFF0C\u8BF7\u7A0D\u540E\u518D\u8BD5" };
        let code;
        for (let i = 0; i < 5; i++) {
          code = String((0, import_node_crypto2.randomInt)(1e7, 1e8));
          const old = await tx.get("meme_login_challenges", code);
          if (!old || old.expires < now()) break;
          code = null;
        }
        if (!code) return { error: "\u767B\u5F55\u7E41\u5FD9\uFF0C\u8BF7\u7A0D\u540E\u91CD\u8BD5" };
        const row = { code, secret: hash(secret), expires: now() + 3e5, state: "pending", sid: (0, import_node_crypto2.randomUUID)() };
        await tx.set("meme_login_challenges", code, row);
        return { code, expires: row.expires };
      });
      if (result.error) fail(result.error, 429);
      return result;
    },
    async confirm(uid, { code }) {
      if (!/^\d{8}$/.test(code || "")) fail("\u8BF7\u8F93\u51658\u4F4D\u7F51\u9875\u767B\u5F55\u7801", 400);
      const result = await store2.transaction(async (tx) => {
        if (!await rate(tx, "confirm:" + hash(uid), 10, 6e4)) return { error: "\u786E\u8BA4\u8FC7\u4E8E\u9891\u7E41\uFF0C\u8BF7\u7A0D\u540E\u91CD\u8BD5" };
        const r = await tx.get("meme_login_challenges", code);
        if (!r || r.expires < now()) return { error: "\u767B\u5F55\u7801\u4E0D\u5B58\u5728\u6216\u5DF2\u8FC7\u671F\uFF0C\u8BF7\u5237\u65B0\u7F51\u9875" };
        if (r.uid && r.uid !== uid) return { error: "\u6B64\u767B\u5F55\u7801\u5DF2\u786E\u8BA4\uFF0C\u8BF7\u91CD\u65B0\u7533\u8BF7" };
        await ensure(tx, uid);
        r.uid = uid;
        r.state = "confirmed";
        await tx.set("meme_login_challenges", code, r);
        return { confirmed: true };
      });
      if (result.error) fail(result.error);
      return result;
    },
    async poll({ code, secret }) {
      if (!/^\d{8}$/.test(code || "") || typeof secret !== "string") fail("\u767B\u5F55\u4FE1\u606F\u65E0\u6548", 400);
      return store2.transaction(async (tx) => {
        const r = await tx.get("meme_login_challenges", code);
        if (!r || r.expires < now() || !same(r.secret, hash(secret))) fail("\u767B\u5F55\u7801\u5DF2\u8FC7\u671F\uFF0C\u8BF7\u91CD\u65B0\u7533\u8BF7", 401);
        if (r.state === "pending") return { status: "pending" };
        let s = await tx.get("meme_account_sessions", r.sid);
        if (s?.revoked) fail("\u767B\u5F55\u5DF2\u9000\u51FA\uFF0C\u8BF7\u91CD\u65B0\u7533\u8BF7", 401);
        if (!s) {
          s = { uid: r.uid, exp: now() + 30 * 864e5, revoked: false };
          await tx.set("meme_account_sessions", r.sid, s);
        }
        return { status: "confirmed", session: import_security_core.default.sign({ kind: "account-session", sid: r.sid, exp: s.exp }, env2) };
      });
    },
    async resolve(token) {
      const s = import_security_core.default.verify(token, env2, "account-session");
      return store2.transaction(async (tx) => {
        const row = await tx.get("meme_account_sessions", s.sid);
        if (!row || row.revoked || row.exp < now()) fail("\u767B\u5F55\u5DF2\u8FC7\u671F\uFF0C\u8BF7\u91CD\u65B0\u767B\u5F55", 401);
        return row.uid;
      });
    },
    async webMe(token) {
      return this.me(await this.resolve(token));
    },
    async logout(token) {
      const s = import_security_core.default.verify(token, env2, "account-session");
      await store2.transaction(async (tx) => {
        const row = await tx.get("meme_account_sessions", s.sid);
        if (row) {
          row.revoked = true;
          await tx.set("meme_account_sessions", s.sid, row);
        }
      });
      return { loggedOut: true };
    }
  };
}

// cloudfunctions/meme-motion/payments.mjs
var import_node_crypto3 = require("node:crypto");
var import_security_core2 = __toESM(require_security_core(), 1);
var paymentAccountId = (uid) => (0, import_node_crypto3.createHash)("sha256").update("wechat:" + uid).digest("hex");
var hmac = (key, value) => (0, import_node_crypto3.createHmac)("sha256", key).update(value, "utf8").digest("hex");
var fail2 = (message, status = 400) => {
  const e = new Error(message);
  e.status = status;
  return e;
};
var publicOrder = (r) => ({ id: r.id, productId: r.productId, priceFen: r.priceFen, points: r.points, status: r.status, createdAt: r.createdAt, updatedAt: r.updatedAt, creditedAt: r.creditedAt ?? null, deliveryPending: r.deliveryPending === true, clientFailure: r.clientFailure || null });
var validUid = (uid) => typeof uid === "string" && uid.length > 0 && uid.length <= 128 && !uid.startsWith("web:");
var validCode = (code) => typeof code === "string" && code.length > 0 && code.length <= 256;
function createPayments({ store: store2, env: env2 = process.env, fetcher = fetch, now = Date.now, wxSession, accessToken }) {
  let products = [];
  try {
    const parsed = JSON.parse(env2.MEME_PAY_PRODUCTS_BASE64 ? Buffer.from(env2.MEME_PAY_PRODUCTS_BASE64, "base64").toString("utf8") : env2.MEME_PAY_PRODUCTS_JSON || "[]");
    if (!Array.isArray(parsed) || !parsed.length || parsed.length > 30) throw Error("catalog");
    const ids2 = /* @__PURE__ */ new Set(), providerIds = /* @__PURE__ */ new Set();
    products = parsed.map((p) => {
      if (!p || typeof p.id !== "string" || !/^[A-Za-z0-9_-]{1,64}$/.test(p.id) || typeof p.productId !== "string" || !/^[A-Za-z0-9_-]{1,64}$/.test(p.productId) || !Number.isSafeInteger(p.priceFen) || p.priceFen < 100 || p.priceFen > 1e6 || !Number.isSafeInteger(p.points) || p.points < 1 || p.points > 1e9 || ids2.has(p.id) || providerIds.has(p.productId)) throw Error("catalog");
      ids2.add(p.id);
      providerIds.add(p.productId);
      return { id: p.id, productId: p.productId, priceFen: p.priceFen, points: p.points };
    });
  } catch {
    products = [];
  }
  const enabled = env2.MEME_PAY_ENABLED === "true" && env2.MEME_PAY_VERIFIED === "true" && Boolean(env2.MEME_PAY_OFFER_ID?.trim()) && Boolean(env2.MEME_PAY_APP_KEY?.trim()) && products.length > 0;
  const testers = new Set((env2.MEME_PAY_TEST_ACCOUNT_IDS || "").split(",").map((x) => x.trim()).filter(Boolean));
  const canPay = (uid) => enabled || validUid(uid) && testers.has(paymentAccountId(uid)) && Boolean(env2.MEME_PAY_OFFER_ID?.trim()) && Boolean(env2.MEME_PAY_APP_KEY?.trim()) && products.length > 0;
  const guard = (uid) => {
    if (!canPay(uid)) throw fail2("\u5145\u503C\u5C1A\u672A\u5F00\u901A\uFF0C\u5F53\u524D\u4FDD\u6301\u514D\u8D39\u4F7F\u7528", 503);
  };
  const auth = async (uid, code) => {
    if (!validUid(uid)) throw fail2("\u8BF7\u5148\u4F7F\u7528\u5FAE\u4FE1\u767B\u5F55", 401);
    if (!validCode(code)) throw fail2("\u8BF7\u91CD\u65B0\u767B\u5F55\u540E\u652F\u4ED8", 401);
    const s = await wxSession(code);
    if (s?.openid !== uid || typeof s.session_key !== "string" || !s.session_key) throw fail2("\u5FAE\u4FE1\u767B\u5F55\u8EAB\u4EFD\u4E0D\u4E00\u81F4\uFF0C\u8BF7\u91CD\u65B0\u767B\u5F55", 401);
    return s;
  };
  const owned = async (tx, uid, id2) => {
    const r = await tx.get("meme_orders", id2);
    if (!r || r.accountId !== paymentAccountId(uid) || r.openid !== uid) throw fail2("\u8BA2\u5355\u4E0D\u5B58\u5728", 404);
    return r;
  };
  const query = async (uid, id2, sessionKey) => {
    const body = JSON.stringify({ openid: uid, env: 0, order_id: id2 });
    const params = new URLSearchParams({ access_token: await accessToken(), pay_sig: hmac(env2.MEME_PAY_APP_KEY, "/xpay/query_order&" + body), signature: hmac(sessionKey, body) });
    let response2, data;
    try {
      response2 = await fetcher("https://api.weixin.qq.com/xpay/query_order?" + params, { method: "POST", headers: { "Content-Type": "application/json" }, body, redirect: "error", signal: AbortSignal.timeout(15e3) });
      data = await response2.json();
    } catch {
      throw fail2("\u652F\u4ED8\u72B6\u6001\u67E5\u8BE2\u6682\u4E0D\u53EF\u7528\uFF0C\u8BF7\u7A0D\u540E\u67E5\u8BE2\u539F\u8BA2\u5355", 502);
    }
    if (!response2.ok || data?.errcode !== 0 || !data.order || typeof data.order !== "object") throw fail2("\u5FAE\u4FE1\u67E5\u5355\u672A\u5B8C\u6210\uFF08\u9519\u8BEF\u7801 " + (Number.isSafeInteger(data?.errcode) ? data.errcode : "\u672A\u77E5") + "\uFF09\uFF0C\u8BF7\u67E5\u8BE2\u539F\u8BA2\u5355\uFF0C\u52FF\u91CD\u590D\u4ED8\u6B3E", 502);
    return data.order;
  };
  const hash3 = (value) => (0, import_node_crypto3.createHash)("sha256").update(value).digest("hex");
  const credit = async (tx, row, providerId, providerType) => {
    const eventId = "xpay:" + hash3(row.id), event = await tx.get("meme_wallet_events", eventId);
    if (event) {
      if (event.orderId !== row.id || event.accountId !== row.accountId || event.points !== row.points || row.status !== "credited") throw fail2("\u8BA2\u5355\u5165\u8D26\u8BB0\u5F55\u4E0D\u4E00\u81F4\uFF0C\u8BF7\u8054\u7CFB\u4F5C\u8005\u6838\u5BF9", 409);
      return publicOrder(row);
    }
    if (row.status === "refund_review" || row.status === "refunded" || row.status === "closed") throw fail2("\u8BA2\u5355\u72B6\u6001\u5F02\u5E38\uFF0C\u8BF7\u8054\u7CFB\u4F5C\u8005\u6838\u5BF9", 409);
    if (providerId) {
      const providerKey = "platform:" + providerType + ":" + hash3(providerId), existing = await tx.get("meme_orders", providerKey);
      if (existing && existing.orderId !== row.id) throw fail2("\u5E73\u53F0\u4EA4\u6613\u53F7\u91CD\u590D\uFF0C\u8BF7\u8054\u7CFB\u4F5C\u8005\u6838\u5BF9", 409);
      await tx.set("meme_orders", providerKey, { orderId: row.id, accountId: row.accountId });
    }
    const updatedAt = now(), wallet = await tx.get("meme_wallets", row.accountId) || { accountId: row.accountId, available: 0, frozen: 0, spent: 0, credited: 0 };
    for (const field of ["available", "frozen", "spent", "credited"]) if (!Number.isSafeInteger(wallet[field]) || field !== "available" && wallet[field] < 0) throw fail2("\u8D26\u6237\u70B9\u6570\u8BB0\u5F55\u5F02\u5E38\uFF0C\u8BF7\u8054\u7CFB\u4F5C\u8005", 409);
    if (!Number.isSafeInteger(wallet.available + row.points) || !Number.isSafeInteger(wallet.credited + row.points)) throw fail2("\u8D26\u6237\u70B9\u6570\u8D85\u51FA\u8303\u56F4", 409);
    wallet.available += row.points;
    wallet.credited += row.points;
    wallet.updatedAt = updatedAt;
    row.status = "credited";
    row.creditedAt = updatedAt;
    row.updatedAt = updatedAt;
    if (providerType === "wx") row.wxOrderId = providerId;
    else if (providerId) row.channelOrderId = providerId;
    await tx.set("meme_wallets", row.accountId, wallet);
    await tx.set("meme_wallet_events", eventId, { id: eventId, accountId: row.accountId, orderId: row.id, type: "topup", points: row.points, priceFen: row.priceFen, providerId: providerId || null, providerType, createdAt: updatedAt });
    await tx.set("meme_orders", row.id, row);
    return publicOrder(row);
  };
  const notifyDelivery = async (uid, id2) => {
    const before = await store2.transaction((tx) => owned(tx, uid, id2));
    if (before.status !== "credited" || before.deliveryPending !== true) return publicOrder(before);
    let delivered = false;
    try {
      const response2 = await fetcher("https://api.weixin.qq.com/xpay/notify_provide_goods?" + new URLSearchParams({ access_token: await accessToken() }), { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ order_id: id2, env: 0 }), redirect: "error", signal: AbortSignal.timeout(15e3) });
      const result = await response2.json();
      delivered = response2.ok && result?.errcode === 0;
    } catch {
    }
    return store2.transaction(async (tx) => {
      const row = await owned(tx, uid, id2);
      if (row.status === "credited" && row.deliveryPending === true) {
        row.deliveryLastAttempt = now();
        if (delivered) {
          row.deliveryPending = false;
          row.deliveryNotifiedAt = now();
        }
        await tx.set("meme_orders", id2, row);
      }
      return publicOrder(row);
    });
  };
  const response = (statusCode, value, plain = false) => ({ statusCode, headers: { "Content-Type": plain ? "text/plain; charset=utf-8" : "application/json; charset=utf-8", "Cache-Control": "no-store" }, body: plain ? value : JSON.stringify(value) });
  return {
    catalog(uid) {
      return { enabled: canPay(uid), currency: "CNY", products: products.map((p) => ({ ...p })) };
    },
    async prepare(uid, { productId, code, quantity = 1 } = {}) {
      guard(uid);
      const p = products.find((p2) => p2.id === productId);
      if (!p) throw fail2("\u5145\u503C\u5546\u54C1\u4E0D\u5B58\u5728");
      if (!Number.isSafeInteger(quantity) || quantity < 1 || quantity > 500 || !Number.isSafeInteger(p.priceFen * quantity) || !Number.isSafeInteger(p.points * quantity)) throw fail2("\u5145\u503C\u6570\u91CF\u987B\u4E3A1\u81F3500\u7684\u6574\u6570");
      const s = await auth(uid, code), accountId2 = paymentAccountId(uid);
      const id2 = "M" + (0, import_node_crypto3.randomBytes)(15).toString("hex");
      const createdAt = now();
      const row = { id: id2, accountId: accountId2, openid: uid, productId: p.productId, catalogId: p.id, quantity, unitPriceFen: p.priceFen, priceFen: p.priceFen * quantity, points: p.points * quantity, status: "pending", createdAt, updatedAt: createdAt };
      const signData = JSON.stringify({ offerId: env2.MEME_PAY_OFFER_ID, buyQuantity: quantity, env: 0, currencyType: "CNY", productId: p.productId, goodsPrice: p.priceFen, outTradeNo: id2, attach: id2 });
      await store2.transaction(async (tx) => {
        const account = await tx.get("meme_accounts", accountId2);
        if (!account || account.deletedAt || account.status === "deleted") throw fail2("\u8D26\u6237\u4E0D\u5B58\u5728\uFF0C\u8BF7\u91CD\u65B0\u767B\u5F55", 401);
        if (await tx.get("meme_orders", id2)) throw fail2("\u8BA2\u5355\u521B\u5EFA\u51B2\u7A81\uFF0C\u8BF7\u91CD\u8BD5", 409);
        const indexId = "index:" + accountId2, index = await tx.get("meme_orders", indexId) || { ids: [] };
        await tx.set("meme_orders", id2, row);
        await tx.set("meme_orders", indexId, { ids: [id2, ...index.ids].slice(0, 50) });
      });
      return { ...publicOrder(row), payData: { signData, mode: "short_series_goods", paySig: hmac(env2.MEME_PAY_APP_KEY, "requestVirtualPayment&" + signData), signature: hmac(s.session_key, signData) } };
    },
    async reconcile(uid, { id: id2, code } = {}) {
      guard(uid);
      if (!validUid(uid)) throw fail2("\u8BF7\u5148\u4F7F\u7528\u5FAE\u4FE1\u767B\u5F55", 401);
      if (typeof id2 !== "string" || !/^M[0-9a-f]{30}$/.test(id2)) throw fail2("\u8BA2\u5355\u4E0D\u5B58\u5728", 404);
      const before = await store2.transaction((tx) => owned(tx, uid, id2));
      if (before.status === "credited") return notifyDelivery(uid, id2);
      if (["refund_review", "refunded", "closed"].includes(before.status)) return publicOrder(before);
      const s = await auth(uid, code), remote2 = await query(uid, id2, s.session_key);
      const paid = remote2.status === 2 || remote2.status === 4;
      if (paid) {
        if (remote2.order_id !== id2 || remote2.order_fee !== before.priceFen || remote2.openid !== void 0 && remote2.openid !== uid || remote2.order_type !== void 0 && remote2.order_type !== 0 && remote2.order_type !== 7) throw fail2("\u5FAE\u4FE1\u652F\u4ED8\u8BA2\u5355\u4FE1\u606F\u4E0D\u4E00\u81F4\uFF0C\u8BF7\u8054\u7CFB\u4F5C\u8005\u6838\u5BF9", 502);
        if (typeof remote2.wx_order_id !== "string" || !remote2.wx_order_id || remote2.wx_order_id.length > 128) throw fail2("\u5FAE\u4FE1\u652F\u4ED8\u8BA2\u5355\u7F3A\u5C11\u5E73\u53F0\u4EA4\u6613\u53F7\uFF0C\u8BF7\u7A0D\u540E\u67E5\u8BE2", 502);
      }
      const reconciled = await store2.transaction(async (tx) => {
        const row = await owned(tx, uid, id2);
        if (row.status === "credited" || row.status === "refund_review") return publicOrder(row);
        const updatedAt = now();
        if (!paid) {
          row.updatedAt = updatedAt;
          row.providerStatus = Number.isSafeInteger(remote2.status) ? remote2.status : null;
          if (remote2.status === 5 || remote2.status === 8) row.status = "refunded";
          else if (remote2.status === 6) row.status = "closed";
          await tx.set("meme_orders", id2, row);
          return publicOrder(row);
        }
        row.providerStatus = remote2.status;
        row.deliveryPending = remote2.status === 2;
        if (remote2.status === 4) row.deliveryNotifiedAt = now();
        return credit(tx, row, remote2.wx_order_id, "wx");
      });
      return reconciled.status === "credited" ? notifyDelivery(uid, id2) : reconciled;
    },
    async callback(event = {}) {
      try {
        const callbackEnv = { WECHAT_APP_ID: env2.WECHAT_APP_ID, WECHAT_CALLBACK_TOKEN: env2.MEME_PAY_CALLBACK_TOKEN, WECHAT_CALLBACK_AES_KEY: env2.MEME_PAY_CALLBACK_AES_KEY };
        if (!callbackEnv.WECHAT_APP_ID || typeof callbackEnv.WECHAT_CALLBACK_TOKEN !== "string" || !/^[A-Za-z0-9]{3,32}$/.test(callbackEnv.WECHAT_CALLBACK_TOKEN) || typeof callbackEnv.WECHAT_CALLBACK_AES_KEY !== "string" || callbackEnv.WECHAT_CALLBACK_AES_KEY.length !== 43 || Buffer.from(callbackEnv.WECHAT_CALLBACK_AES_KEY + "=", "base64").length !== 32) throw fail2("\u652F\u4ED8\u6D88\u606F\u63A8\u9001\u5C1A\u672A\u914D\u7F6E", 503);
        const q = event.queryStringParameters || event.queryString || {}, method = String(event.httpMethod || "").toUpperCase();
        if (method === "GET") {
          import_security_core2.default.signature(q, callbackEnv);
          if (typeof q.echostr !== "string" || q.echostr.length > 1e3) throw fail2("\u56DE\u8C03\u53C2\u6570\u65E0\u6548", 400);
          return response(200, q.echostr, true);
        }
        if (method !== "POST") throw fail2("\u8BF7\u6C42\u65B9\u5F0F\u4E0D\u652F\u6301", 405);
        const raw = event.isBase64Encoded ? Buffer.from(event.body || "", "base64").toString() : event.body || "{}";
        if (typeof raw !== "string" || Buffer.byteLength(raw) > 3e4) throw fail2("\u56DE\u8C03\u5185\u5BB9\u8FC7\u5927", 413);
        let envelope;
        try {
          envelope = JSON.parse(raw);
        } catch {
          throw fail2("\u8BF7\u914D\u7F6EJSON\u6D88\u606F\u63A8\u9001", 400);
        }
        const message = import_security_core2.default.callbackMessage(q, envelope, callbackEnv);
        if (message.Event === "xpay_goods_deliver_notify") {
          if (!validUid(message.OpenId) || message.Env !== 0 || typeof message.OutTradeNo !== "string") throw fail2("\u652F\u4ED8\u56DE\u8C03\u8EAB\u4EFD\u6216\u73AF\u5883\u4E0D\u4E00\u81F4", 403);
          await store2.transaction(async (tx) => {
            const row = await owned(tx, message.OpenId, message.OutTradeNo), goods = message.GoodsInfo;
            if (!goods || goods.ProductId !== row.productId || goods.Quantity !== (row.quantity || 1) || goods.OrigPrice !== row.priceFen || goods.ActualPrice !== row.priceFen || goods.Attach !== row.id) throw fail2("\u652F\u4ED8\u56DE\u8C03\u5546\u54C1\u4FE1\u606F\u4E0D\u4E00\u81F4", 409);
            const providerId = message.WeChatPayInfo?.MchOrderNo;
            if (providerId !== void 0 && (typeof providerId !== "string" || !providerId || providerId.length > 128)) throw fail2("\u652F\u4ED8\u56DE\u8C03\u4EA4\u6613\u53F7\u4E0D\u4E00\u81F4", 409);
            row.deliveryPending = false;
            row.deliveryNotifiedAt = now();
            await credit(tx, row, providerId, "mch");
            await tx.set("meme_orders", row.id, row);
          });
        } else if (message.Event === "xpay_refund_notify") {
          if (!validUid(message.OpenId) || typeof message.MchOrderId !== "string" || typeof message.WxRefundId !== "string" || !message.WxRefundId || message.WxRefundId.length > 128 || !Number.isSafeInteger(message.RefundFee) || message.RefundFee <= 0 || !Number.isSafeInteger(message.RetCode)) throw fail2("\u9000\u6B3E\u56DE\u8C03\u4FE1\u606F\u4E0D\u4E00\u81F4", 409);
          await store2.transaction(async (tx) => {
            const row = await owned(tx, message.OpenId, message.MchOrderId);
            if (message.RefundFee > row.priceFen) throw fail2("\u9000\u6B3E\u91D1\u989D\u4E0D\u4E00\u81F4", 409);
            const refundId = "refund:" + hash3(message.WxRefundId), existing = await tx.get("meme_orders", refundId);
            if (existing && (existing.orderId !== row.id || existing.accountId !== row.accountId || existing.refundFen !== message.RefundFee)) throw fail2("\u9000\u6B3E\u5355\u53F7\u91CD\u590D\u6216\u91D1\u989D\u4E0D\u4E00\u81F4", 409);
            if (message.WxOrderId !== void 0 && row.wxOrderId && message.WxOrderId !== row.wxOrderId) throw fail2("\u9000\u6B3E\u5BF9\u5E94\u652F\u4ED8\u5355\u4E0D\u4E00\u81F4", 409);
            if (existing?.result === 0) return;
            await tx.set("meme_orders", refundId, { orderId: row.id, accountId: row.accountId, refundId: message.WxRefundId, refundFen: message.RefundFee, result: message.RetCode, createdAt: now() });
            if (message.RetCode !== 0) return;
            if (message.RefundFee !== row.priceFen) {
              row.status = "refund_review";
              row.updatedAt = now();
              row.refundNeedsReview = true;
              await tx.set("meme_orders", row.id, row);
              return;
            }
            if (row.refundedAt) throw fail2("\u8BA2\u5355\u5DF2\u7ECF\u5B8C\u6210\u9000\u6B3E\uFF0C\u8BF7\u6838\u5BF9\u91CD\u590D\u9000\u6B3E\u5355", 409);
            const creditEvent = await tx.get("meme_wallet_events", "xpay:" + hash3(row.id));
            if (creditEvent) {
              if (creditEvent.orderId !== row.id || creditEvent.accountId !== row.accountId || creditEvent.points !== row.points || creditEvent.priceFen !== row.priceFen || creditEvent.type !== "topup") throw fail2("\u9000\u6B3E\u539F\u5165\u8D26\u51ED\u8BC1\u4E0D\u4E00\u81F4", 409);
              const reversalId = "refund:" + hash3(message.WxRefundId), reversal = await tx.get("meme_wallet_events", reversalId);
              if (reversal) throw fail2("\u9000\u6B3E\u56DE\u6536\u8BB0\u5F55\u4E0D\u4E00\u81F4", 409);
              const wallet = await tx.get("meme_wallets", row.accountId);
              if (!wallet || wallet.accountId !== row.accountId || !Number.isSafeInteger(wallet.available) || !Number.isSafeInteger(wallet.available - row.points) || !Number.isSafeInteger(wallet.refunded ?? 0) || !Number.isSafeInteger((wallet.refunded ?? 0) + row.points)) throw fail2("\u9000\u6B3E\u8D26\u6237\u70B9\u6570\u8BB0\u5F55\u5F02\u5E38", 409);
              wallet.available -= row.points;
              wallet.refunded = (wallet.refunded ?? 0) + row.points;
              wallet.updatedAt = now();
              await tx.set("meme_wallets", row.accountId, wallet);
              await tx.set("meme_wallet_events", reversalId, { id: reversalId, accountId: row.accountId, orderId: row.id, type: "refund", points: -row.points, refundFen: message.RefundFee, wxRefundId: message.WxRefundId, createdAt: now() });
            }
            row.status = "refunded";
            row.refundedAt = now();
            row.refundFen = message.RefundFee;
            row.refundNeedsReview = false;
            row.deliveryPending = false;
            row.updatedAt = now();
            await tx.set("meme_orders", row.id, row);
          });
        }
        return response(200, { ErrCode: 0, ErrMsg: "success" });
      } catch (e) {
        return response(e.status || 503, { ErrCode: -1, ErrMsg: e.status ? e.message : "\u652F\u4ED8\u56DE\u8C03\u5904\u7406\u5931\u8D25\uFF0C\u8BF7\u91CD\u8BD5" });
      }
    },
    async recordClientFailure(uid, { id: id2, errorCode, errorMessage } = {}) {
      return store2.transaction(async (tx) => {
        const row = await owned(tx, uid, id2);
        row.clientFailure = { code: Number.isSafeInteger(errorCode) ? errorCode : null, message: String(errorMessage || "").slice(0, 200), at: now() };
        await tx.set("meme_orders", id2, row);
        return { recorded: true };
      });
    },
    async orders(uid) {
      if (!validUid(uid)) throw fail2("\u8BF7\u5148\u4F7F\u7528\u5FAE\u4FE1\u767B\u5F55", 401);
      return (store2.readOnly ? store2.readOnly.bind(store2) : store2.transaction.bind(store2))(async (tx) => {
        const index = await tx.get("meme_orders", "index:" + paymentAccountId(uid));
        const rows = await Promise.all((index?.ids || []).slice(0, 50).map((id2) => owned(tx, uid, id2)));
        return rows.map(publicOrder);
      });
    }
  };
}

// cloudfunctions/meme-motion/account-handler.mjs
var import_security_core3 = __toESM(require_security_core(), 1);
function createAccountHandler({ accounts: accounts2, payments: payments2, env: env2 }) {
  return async (event, op) => {
    const headers = Object.fromEntries(Object.entries(event.headers || {}).map(([k, v]) => [k.toLowerCase(), String(v)]));
    const origin = headers.origin, allowed = (env2.MEME_WEB_ORIGINS || "").split(",").map((x) => x.trim());
    const cors = origin && allowed.includes(origin) ? { "Access-Control-Allow-Origin": origin, Vary: "Origin" } : {};
    const json = (statusCode, body) => ({ statusCode, headers: { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store", ...cors }, body: JSON.stringify(body) });
    try {
      if (origin && !allowed.includes(origin)) throw Object.assign(Error("\u6B64\u7F51\u9875\u5C1A\u672A\u914D\u7F6E\u767B\u5F55\u670D\u52A1"), { status: 403 });
      if (event.httpMethod !== "POST") return json(405, { error: "\u8BF7\u6C42\u65B9\u5F0F\u4E0D\u652F\u6301" });
      const raw = event.isBase64Encoded ? Buffer.from(event.body || "", "base64").toString() : event.body || "{}";
      if (Buffer.byteLength(raw) > 4096) return json(413, { error: "\u767B\u5F55\u53C2\u6570\u8FC7\u5927" });
      const data = JSON.parse(raw);
      if (!data || typeof data !== "object" || Array.isArray(data)) return json(400, { error: "\u53C2\u6570\u683C\u5F0F\u9519\u8BEF" });
      const token = (headers.authorization || "").replace(/^Bearer /, "");
      if (op === "account-web-start") return json(200, await accounts2.start(data));
      if (op === "account-web-poll") return json(200, await accounts2.poll(data));
      if (op === "account-web-logout") return json(200, await accounts2.logout(token));
      const web = op.startsWith("account-web-"), uid = web ? await accounts2.resolve(token) : import_security_core3.default.verify(token, env2, "session").uid;
      const action = op.slice(web ? "account-web-".length : "account-".length);
      if (action === "me") return json(200, { ...await accounts2.me(uid), payments: payments2.catalog(uid) });
      if (action === "orders") return json(200, { orders: await payments2.orders(uid) });
      if (!web && action === "confirm-login") return json(200, await accounts2.confirm(uid, data));
      if (!web && action === "pay-prepare") {
        await accounts2.me(uid);
        const r = await payments2.prepare(uid, data);
        return json(200, { id: r.id, payment: r.payData });
      }
      if (!web && action === "pay-error") return json(200, await payments2.recordClientFailure(uid, data));
      if (!web && action === "pay-query") {
        const order = await payments2.reconcile(uid, data);
        return json(200, { order, wallet: (await accounts2.me(uid)).wallet });
      }
      return json(404, { error: "\u64CD\u4F5C\u4E0D\u5B58\u5728" });
    } catch (e) {
      return json(e.status || 422, { error: e instanceof SyntaxError ? "\u53C2\u6570\u683C\u5F0F\u9519\u8BEF" : e.message || "\u8D26\u6237\u670D\u52A1\u6682\u4E0D\u53EF\u7528\uFF0C\u8BF7\u7A0D\u540E\u91CD\u8BD5" });
    }
  };
}

// cloudfunctions/meme-motion/account-wechat.mjs
function accountWechat(env2, fetcher = fetch) {
  let cached, pending;
  const json = async (url, options) => {
    try {
      const r = await fetcher(url, { ...options, redirect: "error", signal: AbortSignal.timeout(15e3) });
      if (!r.ok) throw Error();
      return await r.json();
    } catch {
      throw Error("\u5FAE\u4FE1\u8D26\u6237\u670D\u52A1\u8FDE\u63A5\u5931\u8D25\uFF0C\u8BF7\u7A0D\u540E\u91CD\u8BD5");
    }
  };
  return {
    async session(code) {
      if (typeof code !== "string" || !code || code.length > 256) throw Error("\u5FAE\u4FE1\u767B\u5F55\u51ED\u8BC1\u65E0\u6548");
      const q = new URLSearchParams({ appid: env2.WECHAT_APP_ID, secret: env2.WECHAT_APP_SECRET, js_code: code, grant_type: "authorization_code" });
      const r = await json("https://api.weixin.qq.com/sns/jscode2session?" + q);
      if (!r.openid || !r.session_key) throw Error("\u5FAE\u4FE1\u767B\u5F55\u5DF2\u8FC7\u671F\uFF0C\u8BF7\u91CD\u65B0\u767B\u5F55");
      return { openid: r.openid, session_key: r.session_key };
    },
    async token() {
      if (cached?.expires > Date.now()) return cached.value;
      if (pending) return pending;
      return pending = (async () => {
        const r = await json("https://api.weixin.qq.com/cgi-bin/stable_token", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ grant_type: "client_credential", appid: env2.WECHAT_APP_ID, secret: env2.WECHAT_APP_SECRET, force_refresh: false }) });
        if (!r.access_token) throw Error("\u5FAE\u4FE1\u8D26\u6237\u670D\u52A1\u5C1A\u672A\u5C31\u7EEA");
        cached = { value: r.access_token, expires: Date.now() + Math.max(1, Number(r.expires_in) - 120) * 1e3 };
        return cached.value;
      })().finally(() => pending = null);
    }
  };
}

// cloudfunctions/meme-motion/service.mjs
var import_node_crypto6 = require("node:crypto");

// server/motion/pricing.mjs
var PRICE_VERSION = "2026-10-27";
function quote(mode, duration = 2) {
  if (mode === "draw" || mode === "edit") return { costFen: 20, priceFen: 50 };
  if (mode === "describe") return { costFen: 30, priceFen: 80 };
  if (mode === "imitate") {
    if (!Number.isFinite(duration) || duration < 2 || duration > 6.05) throw Error("\u53C2\u8003\u52A8\u4F5C\u65F6\u957F\u9700\u4E3A2\uFF5E6\u79D2");
    const seconds = Math.ceil(duration);
    return { costFen: seconds * 40, priceFen: seconds * 80 };
  }
  throw Error("\u8BF7\u9009\u62E9\u5236\u4F5C\u65B9\u5F0F");
}
function catalog() {
  return { version: PRICE_VERSION, currency: "CNY", paymentsEnabled: false, items: [
    { mode: "draw", name: "\u4E00\u53E5\u8BDD\u751F\u56FE", ...quote("draw"), unit: "\u5F20" },
    { mode: "edit", name: "AI\u6539\u56FE", ...quote("edit"), unit: "\u5F20" },
    { mode: "describe", name: "2\u79D2\u52A8\u4F5C", ...quote("describe"), unit: "\u6B21" },
    { mode: "imitate", name: "\u53C2\u8003\u52A8\u4F5C", costFen: 40, priceFen: 80, unit: "\u79D2\uFF08\u5411\u4E0A\u53D6\u6574\uFF09" }
  ] };
}

// cloudfunctions/meme-motion/usage.mjs
var import_node_crypto4 = require("node:crypto");
var fail3 = (message, status = 409) => {
  throw Object.assign(Error(message), { status });
};
var integer = (value, min = Number.MIN_SAFE_INTEGER) => Number.isSafeInteger(value) && value >= min;
var accountFor = (uid) => (0, import_node_crypto4.createHash)("sha256").update("wechat:" + uid).digest("hex");
function validateWallet(wallet, accountId2) {
  if (!wallet || wallet.accountId !== accountId2 || !integer(wallet.available) || !integer(wallet.frozen, 0) || !integer(wallet.spent, 0)) fail3("\u8D26\u6237\u70B9\u6570\u8BB0\u5F55\u5F02\u5E38\uFF0C\u8BF7\u8054\u7CFB\u4F5C\u8005");
}
function validateUsage(usage) {
  if (!usage || typeof usage.id !== "string" || !usage.id || !/^[a-f0-9]{64}$/.test(usage.accountId || "") || !integer(usage.points, 1) || !["held", "spent", "refunded", "free", "exempt"].includes(usage.state)) fail3("\u4EFB\u52A1\u6263\u8D39\u8BB0\u5F55\u5F02\u5E38\uFF0C\u8BF7\u8054\u7CFB\u4F5C\u8005");
}
function reserveUsage(state, { id: id2, uid, points, enabled, exempt = false, now = Date.now() }) {
  if (typeof id2 !== "string" || !id2 || typeof uid !== "string" || !uid || uid.startsWith("web:") || !integer(points, 1) || !integer(now, 0)) fail3("\u4EFB\u52A1\u6263\u8D39\u53C2\u6570\u65E0\u6548", 422);
  const accountId2 = accountFor(uid);
  if (state.usage) {
    validateUsage(state.usage);
    if (state.usage.id !== id2 || state.usage.accountId !== accountId2 || state.usage.points !== points) fail3("\u4EFB\u52A1\u6263\u8D39\u53C2\u6570\u4E0E\u539F\u8BB0\u5F55\u4E0D\u4E00\u81F4");
    if (!["free", "exempt"].includes(state.usage.state)) validateWallet(state.wallet, accountId2);
    return state;
  }
  const usage = { id: id2, accountId: accountId2, points, state: exempt ? "exempt" : enabled === true ? "held" : "free", createdAt: now };
  if (usage.state !== "held") return { ...state, usage };
  validateWallet(state.wallet, accountId2);
  const wallet = { ...state.wallet };
  if (wallet.available < points) fail3("\u70B9\u6570\u4E0D\u8DB3\uFF0C\u8BF7\u5145\u503C\u540E\u518D\u8BD5", 402);
  if (!integer(wallet.frozen + points, 0)) fail3("\u8D26\u6237\u70B9\u6570\u8D85\u51FA\u8303\u56F4");
  wallet.available -= points;
  wallet.frozen += points;
  wallet.updatedAt = now;
  return { ...state, wallet, usage };
}
function settleUsage(state, { success, now = Date.now() }) {
  if (typeof success !== "boolean" || !integer(now, 0)) fail3("\u4EFB\u52A1\u7ED3\u679C\u5C1A\u672A\u786E\u8BA4\uFF0C\u4E0D\u80FD\u7ED3\u7B97");
  validateUsage(state.usage);
  const usage = state.usage;
  if (usage.state === "free" || usage.state === "exempt") return state;
  validateWallet(state.wallet, usage.accountId);
  const result = success ? "spent" : "refunded";
  if (usage.state !== "held") {
    if (usage.state !== result) fail3("\u4EFB\u52A1\u7ED3\u7B97\u7ED3\u679C\u4E0E\u539F\u8BB0\u5F55\u4E0D\u4E00\u81F4");
    return state;
  }
  const wallet = { ...state.wallet };
  if (wallet.frozen < usage.points) fail3("\u4EFB\u52A1\u51BB\u7ED3\u70B9\u6570\u8BB0\u5F55\u5F02\u5E38");
  const next = success ? wallet.spent + usage.points : wallet.available + usage.points;
  if (!integer(next, success ? 0 : Number.MIN_SAFE_INTEGER)) fail3("\u8D26\u6237\u70B9\u6570\u8D85\u51FA\u8303\u56F4");
  wallet.frozen -= usage.points;
  if (success) wallet.spent = next;
  else wallet.available = next;
  wallet.updatedAt = now;
  return { ...state, wallet, usage: { ...usage, state: result, settledAt: now } };
}

// server/motion/provider.mjs
var import_node_crypto5 = require("node:crypto");
var MODELS = { draw: "wan2.6-t2i", edit: "wan2.6-image", describe: "wan2.6-i2v-flash", imitate: "wan2.2-animate-move" };
function buildRequest({ mode, prompt = "", image, reference }) {
  if (!MODELS[mode]) throw Error("\u8BF7\u9009\u62E9\u5199\u52A8\u4F5C\u6216\u5B66\u52A8\u4F5C");
  if (mode === "draw" || mode === "edit") return { path: "/services/aigc/image-generation/generation", body: { model: MODELS[mode], input: { messages: [{ role: "user", content: [...mode === "edit" ? [{ image }] : [], { text: prompt }] }] }, parameters: { n: 1, size: mode === "draw" ? "1280*1280" : "1K", prompt_extend: false, watermark: true, ...mode === "edit" ? { enable_interleave: false } : {} } } };
  if (mode === "imitate") return { path: "/services/aigc/image2video/video-synthesis", body: { model: MODELS.imitate, input: { image_url: image, video_url: reference, watermark: true }, parameters: { mode: "wan-std", check_image: true } } };
  return { path: "/services/aigc/video-generation/video-synthesis", body: { model: MODELS.describe, input: { img_url: image, prompt: `${prompt}\u3002\u56FA\u5B9A\u955C\u5934\uFF0C\u53EA\u6709\u7167\u7247\u4E2D\u7684\u4E3B\u4F53\u8868\u6F14\u8FD9\u4E2A\u52A8\u4F5C\uFF0C\u4FDD\u6301\u8EAB\u4EFD\u3001\u539F\u753B\u98CE\u548C\u80CC\u666F\uFF0C\u5355\u4E2A\u8FDE\u7EED\u955C\u5934\u3002`, negative_prompt: "\u65B0\u589E\u4EBA\u7269\uFF0C\u591A\u4EBA\uFF0C\u955C\u5934\u5207\u6362\uFF0C\u6587\u5B57\uFF0C\u5B57\u5E55\uFF0C\u6807\u5FD7\uFF0C\u9762\u90E8\u4E25\u91CD\u7578\u53D8" }, parameters: { resolution: "720P", duration: 2, audio: false, prompt_extend: false, watermark: true } } };
}
function parseTask(data) {
  const o = data.output;
  if (!o?.task_status) throw Error("\u751F\u6210\u670D\u52A1\u8FD4\u56DE\u4E86\u65E0\u6548\u4EFB\u52A1\u72B6\u6001");
  const status = { PENDING: "queued", RUNNING: "processing", SUCCEEDED: "success", FAILED: "failed", CANCELED: "failed", UNKNOWN: "unknown" }[o.task_status] || "unknown";
  const videoUrl = o.video_url || o.results?.video_url, imageUrl = o.choices?.flatMap((x) => x.message?.content || []).find((x) => typeof x.image === "string")?.image;
  if (status === "success" && !videoUrl && !imageUrl) throw Error("\u4EFB\u52A1\u6210\u529F\u4F46\u672A\u8FD4\u56DE\u89C6\u9891\u6216\u56FE\u7247\u7ED3\u679C\uFF0C\u8BF7\u7EE7\u7EED\u67E5\u8BE2");
  return { status, ...videoUrl ? { videoUrl } : {}, ...imageUrl ? { imageUrl } : {}, ...status === "failed" ? { error: `\u751F\u6210\u672A\u5B8C\u6210\uFF08${o.code || "Failed"}\uFF09\uFF0C\u53EF\u8C03\u6574\u7D20\u6750\u540E\u91CD\u65B0\u521B\u5EFA\u4EFB\u52A1` } : {}, requestId: data.request_id };
}
function remote(url, upgrade = false) {
  let u;
  try {
    u = new URL(url);
  } catch {
    throw Error("\u89C6\u9891\u5730\u5740\u65E0\u6548");
  }
  if (upgrade && u.protocol === "http:" && /^dashscope-[a-z0-9-]+\.oss(?:-[a-z0-9-]+)?\.aliyuncs\.com$/.test(u.hostname)) u.protocol = "https:";
  if (u.protocol !== "https:" || u.port || u.username || u.password || !u.hostname.endsWith(".aliyuncs.com")) throw Error("\u89C6\u9891\u5730\u5740\u672A\u901A\u8FC7\u6821\u9A8C");
  return u;
}
function createProvider({ key, base = "https://dashscope.aliyuncs.com", fetcher = fetch }) {
  const u = new URL(base);
  if (u.protocol !== "https:" || !(u.hostname === "dashscope.aliyuncs.com" || u.hostname === "dashscope-intl.aliyuncs.com" || u.hostname.endsWith(".maas.aliyuncs.com")) || u.username || u.password || u.port || u.pathname !== "/") throw Error("\u963F\u91CC\u4E91\u670D\u52A1\u5730\u5740\u914D\u7F6E\u65E0\u6548");
  const api = async (path, body) => {
    const r = await fetcher(u.origin + "/api/v1" + path, { method: body ? "POST" : "GET", headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json", ...body ? { "X-DashScope-Async": "enable", "X-DashScope-OssResourceResolve": "enable" } : {} }, ...body ? { body: JSON.stringify(body) } : {}, signal: AbortSignal.timeout(6e4), redirect: "error" });
    const data = await r.json();
    if (!r.ok) throw Object.assign(Error(`\u963F\u91CC\u4E91\u8BF7\u6C42\u5931\u8D25\uFF08${r.status}/${String(data.code || "Unknown").slice(0, 80)}\uFF09`), { rejected: r.status >= 400 && r.status < 500 && r.status !== 408 });
    return data;
  };
  return {
    async upload(bytes, type, model) {
      const ext = { "image/png": "png", "image/jpeg": "jpg", "image/webp": "webp", "video/mp4": "mp4" }[type];
      if (!ext) throw Error("\u7D20\u6750\u683C\u5F0F\u4E0D\u652F\u6301");
      const p = (await api("/uploads?action=getPolicy&model=" + encodeURIComponent(model))).data;
      remote(p.upload_host);
      const filename = (0, import_node_crypto5.randomUUID)() + "." + ext, keyname = p.upload_dir + "/" + filename, f = new FormData();
      for (const [k, v] of Object.entries({ OSSAccessKeyId: p.oss_access_key_id, Signature: p.signature, policy: p.policy, "x-oss-object-acl": p.x_oss_object_acl, "x-oss-forbid-overwrite": p.x_oss_forbid_overwrite, key: keyname, success_action_status: "200" })) {
        if (typeof v !== "string") throw Error("\u4E34\u65F6\u4E0A\u4F20\u51ED\u8BC1\u65E0\u6548");
        f.append(k, v);
      }
      f.append("file", new Blob([bytes], { type }), filename);
      const r = await fetcher(p.upload_host, { method: "POST", body: f, signal: AbortSignal.timeout(9e4), redirect: "error" });
      if (!r.ok) throw Error("\u7D20\u6750\u4E34\u65F6\u4E0A\u4F20\u5931\u8D25\uFF0C\u8BF7\u91CD\u8BD5");
      return "oss://" + keyname;
    },
    async create(input) {
      let image = input.image, reference;
      if (input.mode === "imitate") {
        try {
          image = await this.upload(input.imageBytes, input.imageType, MODELS.imitate);
          reference = await this.upload(input.referenceBytes, "video/mp4", MODELS.imitate);
        } catch {
          throw Object.assign(Error("\u53C2\u8003\u7D20\u6750\u4E0A\u4F20\u5931\u8D25\uFF0C\u5C1A\u672A\u63D0\u4EA4\u751F\u6210"), { rejected: true });
        }
      }
      const x = buildRequest({ ...input, image, reference });
      const d = await api(x.path, x.body);
      if (!d.output?.task_id) throw Error("\u4EFB\u52A1\u63D0\u4EA4\u7ED3\u679C\u672A\u786E\u8BA4");
      return d.output.task_id;
    },
    async query(id2) {
      return parseTask(await api("/tasks/" + encodeURIComponent(id2)));
    },
    async download(url) {
      return download(url, "video/", 80 * 1024 * 1024);
    },
    async downloadImage(url) {
      return download(url, "image/", 10 * 1024 * 1024);
    },
    async probe() {
      await api("/models?page_size=1");
      return { authenticated: true };
    }
  };
  async function download(url, type, max) {
    const secure = remote(url, true);
    const r = await fetcher(secure.href, { redirect: "error", signal: AbortSignal.timeout(9e4) });
    if (!r.ok || !r.headers.get("content-type")?.startsWith(type) || Number(r.headers.get("content-length")) > max) throw Error("\u7ED3\u679C\u4E0B\u8F7D\u672A\u5B8C\u6210\uFF0C\u8BF7\u7A0D\u540E\u91CD\u8BD5");
    const chunks = [];
    let size = 0;
    for await (const c of r.body) {
      size += c.length;
      if (size > max) throw Error("\u7ED3\u679C\u8FC7\u5927\uFF0C\u8BF7\u8054\u7CFB\u5F00\u53D1\u8005");
      chunks.push(c);
    }
    return Buffer.concat(chunks);
  }
}

// cloudfunctions/meme-motion/service.mjs
var hash2 = (s) => (0, import_node_crypto6.createHash)("sha256").update(s).digest("hex");
var uuid = (s) => /^[a-f0-9]{8}(?:-[a-f0-9]{4}){3}-[a-f0-9]{12}$/i.test(s || "");
function createMotion({ store: store2, storage: storage2, provider, validate, verifyInput, inspectResult, inspectImage, budget = 3, maxJobs = 4, budgetEnforced = true, activeScope = "global", billingEnabled: billingEnabled2 = false, billingExempt = () => false, now = Date.now }) {
  const charging = (uid) => typeof billingEnabled2 === "function" ? billingEnabled2(uid) : billingEnabled2;
  const activeKey = (uid) => activeScope === "user" ? "active_" + hash2(uid) : "active";
  const publicRow = (r) => ({ id: r.id, mode: r.mode, status: r.status, error: r.error, created: r.created });
  async function owned(uid, id2) {
    if (!uuid(id2)) throw Object.assign(Error("\u4EFB\u52A1\u4E0D\u5B58\u5728"), { status: 404 });
    const r = await store2.read(id2);
    if (!r || r.uid !== uid) throw Object.assign(Error("\u4EFB\u52A1\u4E0D\u5B58\u5728"), { status: 404 });
    if (r.expires < now()) throw Object.assign(Error("\u4EFB\u52A1\u5DF2\u8FC7\u671F\uFF0C\u8BF7\u91CD\u65B0\u5236\u4F5C"), { status: 410 });
    return r;
  }
  async function finish(id2, changes) {
    return store2.atomic(id2, (s) => {
      Object.assign(s.row, changes);
      if (s.usage && ["success", "failed"].includes(s.row.status)) Object.assign(s, settleUsage(s, { success: s.row.status === "success", now: now() }));
      const key = activeKey(s.row.uid);
      if (["success", "failed"].includes(s.row.status) && s.quota[key] === id2) delete s.quota[key];
      return publicRow(s.row);
    });
  }
  async function reconcile(uid) {
    const key = activeKey(uid), active = (await store2.info())[key];
    if (!active) return;
    const row = await store2.read(active);
    if (!row || row.expires < now()) return store2.atomic(active, (s) => {
      if (s.quota[key] === active) delete s.quota[key];
      if (s.row) s.row.status = "expired";
    });
    if (["success", "failed"].includes(row.status)) return finish(active, {});
    if (row.taskId) return finish(active, await provider.query(row.taskId));
    if (row.status === "submitting" && now() - row.submitted > 12e4) return finish(active, { status: "unknown", error: "\u63D0\u4EA4\u7ED3\u679C\u5F85\u786E\u8BA4\uFF0C\u8BF7\u8054\u7CFB\u5F00\u53D1\u8005\u67E5\u8BE2\u539F\u4EFB\u52A1\uFF0C\u6682\u52FF\u91CD\u590D\u751F\u6210" });
  }
  return {
    reconcile,
    async info(uid) {
      const q = await store2.info();
      return { billingEnabled: charging(uid) && !billingExempt(uid), budgetEnforced, available: !budgetEnforced || Number.isFinite(budget) && budget > 0 && q.count < maxJobs && q.cost + 0.2 <= budget + 1e-6, remaining: budgetEnforced ? Math.max(0, Math.min(maxJobs - q.count, Math.floor((budget - q.cost + 1e-6) / 0.2))) : null, models: MODELS, pricing: catalog() };
    },
    async prepare(uid, { id: id2, mode }) {
      if (!uuid(id2) || !Object.hasOwn(MODELS, mode)) throw Error("\u5236\u4F5C\u53C2\u6570\u65E0\u6548");
      await store2.atomic(id2, (s) => {
        if (s.row) {
          if (s.row.uid !== uid) throw Error("\u4EFB\u52A1\u4E0D\u5B58\u5728");
          if (s.row.mode !== mode) throw Error("\u4EFB\u52A1\u5185\u5BB9\u5DF2\u53D8\u5316");
          return;
        }
        s.row = { id: id2, uid, mode, status: "draft", created: now(), expires: now() + 24 * 36e5 };
      });
      const row = await owned(uid, id2);
      if (row.status !== "draft") return publicRow(row);
      const prefix = `meme-motion/${hash2(uid).slice(0, 24)}/${id2}`;
      const image = mode === "draw" ? void 0 : await storage2.ticket(prefix + "/input.jpg");
      const reference = mode === "imitate" ? await storage2.ticket(prefix + "/reference.mp4") : void 0;
      await store2.atomic(id2, (s) => {
        if (s.row.status === "draft") {
          if (image) s.row.imageFile = image.fileId;
          if (reference) s.row.referenceFile = reference.fileId;
          s.row.prefix = prefix;
        }
      });
      return { ...publicRow(row), uploads: { ...image ? { image } : {}, ...reference ? { reference } : {} } };
    },
    async create(uid, data) {
      if (charging(uid) && (typeof uid !== "string" || !uid || uid.startsWith("web:"))) throw Object.assign(Error("\u8BF7\u5148\u4F7F\u7528\u5FAE\u4FE1\u767B\u5F55\u540E\u5236\u4F5C"), { status: 401 });
      const row = await owned(uid, data.id);
      const prompt = typeof data.prompt === "string" ? data.prompt.trim() : "";
      if (prompt.length > 800 || row.mode !== "imitate" && !prompt) throw Error("\u8BF7\u7528800\u5B57\u4EE5\u5185\u63CF\u8FF0\u521B\u610F");
      if (row.status !== "draft") {
        if (row.promptHash !== hash2(prompt)) throw Error("\u4EFB\u52A1\u5185\u5BB9\u5DF2\u53D8\u5316\uFF0C\u8BF7\u65B0\u5EFA\u4EFB\u52A1");
        return publicRow(row);
      }
      await reconcile(uid);
      if (row.mode !== "draw" && !row.imageFile) throw Error("\u8BF7\u5148\u4E0A\u4F20\u7167\u7247");
      const imageBytes = row.mode === "draw" ? void 0 : await storage2.read(row.imageFile, 1024 * 1024);
      await verifyInput(uid, { ...data, prompt, imageBytes });
      const input = await validate({ mode: row.mode, prompt, imageBytes, ...row.mode === "imitate" ? { referenceBytes: await storage2.read(row.referenceFile, 20 * 1024 * 1024) } : {} });
      const priceFen = quote(row.mode, input.duration).priceFen, exempt = billingExempt(uid) === true;
      if (charging(uid) && !exempt && (data.acceptedPriceFen !== priceFen || data.priceVersion !== PRICE_VERSION)) throw Object.assign(Error("\u4EF7\u683C\u5DF2\u66F4\u65B0\uFF0C\u8BF7\u91CD\u65B0\u786E\u8BA4\u672C\u6B21\u70B9\u6570"), { status: 422 });
      const claimed = await store2.atomic(row.id, (s) => {
        if (s.row.status !== "draft") {
          if (s.row.promptHash !== hash2(prompt)) throw Error("\u4EFB\u52A1\u5185\u5BB9\u5DF2\u53D8\u5316");
          return false;
        }
        if (s.quota[activeKey(uid)]) throw Error("\u5DF2\u6709\u52A8\u4F5C\u4EFB\u52A1\u8FDB\u884C\u4E2D\uFF0C\u8BF7\u5148\u67E5\u8BE2\u539F\u4EFB\u52A1");
        if (!Number.isFinite(input.cost) || input.cost < 0 || budgetEnforced && (!Number.isFinite(budget) || !Number.isSafeInteger(maxJobs) || maxJobs < 1 || s.quota.count >= maxJobs || s.quota.cost + input.cost > budget + 1e-6)) throw Error("\u514D\u8D39\u4F53\u9A8C\u989D\u5EA6\u6682\u65F6\u7528\u5B8C\uFF0C\u8BF7\u7A0D\u540E\u518D\u6765");
        if (charging(uid)) Object.assign(s, reserveUsage(s, { id: row.id, uid, points: priceFen, enabled: true, exempt, now: now() }));
        s.quota.count++;
        s.quota.cost += input.cost;
        s.quota[activeKey(uid)] = row.id;
        Object.assign(s.row, { status: "submitting", cost: input.cost, model: MODELS[row.mode], priceVersion: PRICE_VERSION, priceFen, promptHash: hash2(prompt), submitted: now() });
        return true;
      });
      if (!claimed) return publicRow(await owned(uid, row.id));
      try {
        const taskId = await provider.create(input);
        await finish(row.id, { taskId, status: "queued" });
      } catch (e) {
        await store2.atomic(row.id, (s) => {
          if (e.rejected) {
            if (s.usage) Object.assign(s, settleUsage(s, { success: false, now: now() }));
            s.quota.cost -= s.row.cost;
            s.row.cost = 0;
            const key = activeKey(uid);
            if (s.quota[key] === row.id) delete s.quota[key];
            s.row.status = "failed";
            s.row.error = "\u751F\u6210\u670D\u52A1\u672A\u63A5\u53D7\u672C\u6B21\u8BF7\u6C42\uFF0C\u8BF7\u8C03\u6574\u7D20\u6750\u540E\u91CD\u8BD5";
          } else {
            s.row.status = "unknown";
            s.row.error = "\u63D0\u4EA4\u7ED3\u679C\u8FD8\u672A\u786E\u8BA4\uFF0C\u8BF7\u67E5\u8BE2\u539F\u4EFB\u52A1\uFF0C\u6682\u52FF\u91CD\u590D\u751F\u6210";
          }
        });
      } finally {
        try {
          await storage2.remove([row.imageFile, row.referenceFile].filter(Boolean));
        } catch {
        }
      }
      return publicRow(await owned(uid, row.id));
    },
    async query(uid, id2) {
      const row = await owned(uid, id2);
      if (row.taskId && !["success", "failed"].includes(row.status)) return finish(id2, await provider.query(row.taskId));
      if (row.status === "submitting" && now() - row.submitted > 12e4) return finish(id2, { status: "unknown", error: "\u63D0\u4EA4\u7ED3\u679C\u5F85\u786E\u8BA4\uFF0C\u8BF7\u8054\u7CFB\u5F00\u53D1\u8005\u67E5\u8BE2\u539F\u4EFB\u52A1\uFF0C\u6682\u52FF\u91CD\u590D\u751F\u6210" });
      return publicRow(row);
    },
    async result(uid, id2) {
      let row = await owned(uid, id2);
      const image = ["draw", "edit"].includes(row.mode);
      if (row.status !== "success" || !(image ? row.imageUrl : row.videoUrl)) throw Error("\u4F5C\u54C1\u5C1A\u672A\u5B8C\u6210\uFF0C\u8BF7\u7EE7\u7EED\u67E5\u8BE2");
      if (!row.resultFile) {
        const bytes = image ? await provider.downloadImage(row.imageUrl) : await provider.download(row.videoUrl);
        const info = image ? await inspectImage(bytes) : await inspectResult(bytes);
        const resultFile = await storage2.save(row.prefix + (image ? "/result.png" : "/result.mp4"), bytes);
        await store2.atomic(id2, (s) => {
          s.row.resultFile = resultFile;
          s.row.resultInfo = info;
        });
        row = await owned(uid, id2);
      }
      return { ...row.resultInfo, kind: image ? "image" : "video", url: await storage2.url(row.resultFile) };
    }
  };
}

// cloudfunctions/meme-motion/web.mjs
var import_node_crypto7 = require("node:crypto");
var import_security_core4 = __toESM(require_security_core(), 1);
var digest = (x) => (0, import_node_crypto7.createHash)("sha256").update(x).digest("hex");
var equal = (a, b) => {
  const x = Buffer.from(a), y = Buffer.from(b);
  return x.length === y.length && (0, import_node_crypto7.timingSafeEqual)(x, y);
};
var fail4 = (message, status) => {
  throw Object.assign(Error(message), { status });
};
function createWebMotionHandler({ service: service2, env: env2, resolveAccount }) {
  return async (event, op) => {
    const headers = Object.fromEntries(Object.entries(event.headers || {}).map(([k, v]) => [k.toLowerCase(), String(v)])), origin = headers.origin;
    const allowed = (env2.MEME_WEB_ORIGINS || "").split(",").map((x) => x.trim()).filter(Boolean), cors = origin && allowed.includes(origin) ? { "Access-Control-Allow-Origin": origin, Vary: "Origin" } : {};
    const json = (statusCode, body) => ({ statusCode, headers: { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store", "X-Content-Type-Options": "nosniff", ...cors }, body: JSON.stringify(body) });
    try {
      if (origin && !allowed.includes(origin)) fail4("\u6B64\u9875\u9762\u672A\u83B7\u51C6\u8C03\u7528\u6D4B\u8BD5\u670D\u52A1", 403);
      if ((event.httpMethod || "").toUpperCase() !== "POST") fail4("\u8BF7\u6C42\u65B9\u5F0F\u4E0D\u652F\u6301", 405);
      const invite = env2.MEME_WEB_INVITE_CODE;
      if ((!invite || invite.length < 24) && !resolveAccount) fail4("\u7F51\u9875\u6D4B\u8BD5\u670D\u52A1\u5C1A\u672A\u542F\u7528", 503);
      const raw = event.isBase64Encoded ? Buffer.from(event.body || "", "base64").toString() : event.body || "{}";
      if (Buffer.byteLength(raw) > 3e4) fail4("\u53C2\u6570\u8FC7\u5927\uFF0C\u8BF7\u91CD\u65B0\u9009\u62E9\u7D20\u6750", 413);
      let data;
      try {
        data = JSON.parse(raw);
      } catch {
        fail4("\u53C2\u6570\u683C\u5F0F\u65E0\u6548", 400);
      }
      if (!data || Array.isArray(data) || typeof data !== "object") fail4("\u53C2\u6570\u683C\u5F0F\u65E0\u6548", 400);
      const token = (headers.authorization || "").replace(/^Bearer /, "");
      if (op === "web-login") {
        if (!invite || !equal(token, invite)) fail4("\u9080\u8BF7\u7801\u4E0D\u6B63\u786E\uFF0C\u8BF7\u68C0\u67E5\u5B8C\u6574\u6D4B\u8BD5\u94FE\u63A5", 401);
        if (!/^[a-f0-9]{8}(?:-[a-f0-9]{4}){3}-[a-f0-9]{12}$/i.test(data.clientId || "")) fail4("\u6D4F\u89C8\u5668\u6807\u8BC6\u65E0\u6548\uFF0C\u8BF7\u91CD\u65B0\u6253\u5F00\u9875\u9762", 400);
        const uid = "web:" + (0, import_node_crypto7.createHmac)("sha256", env2.MEME_SECURITY_SECRET).update(invite + ":" + data.clientId).digest("hex").slice(0, 40);
        const session2 = import_security_core4.default.sign({ kind: "web-motion-session", uid, invite: digest(invite), exp: Date.now() + 30 * 24 * 36e5 }, env2);
        return json(200, { session: session2 });
      }
      let session;
      let kind;
      try {
        kind = JSON.parse(Buffer.from(token.split(".")[0], "base64url")).kind;
      } catch {
      }
      if (kind === "account-session" && resolveAccount) session = { uid: await resolveAccount(token) };
      else {
        session = import_security_core4.default.verify(token, env2, "web-motion-session");
        if (session.invite !== digest(invite) || !session.uid?.startsWith("web:")) fail4("\u6D4B\u8BD5\u767B\u5F55\u5DF2\u5931\u6548\uFF0C\u8BF7\u91CD\u65B0\u6253\u5F00\u9080\u8BF7\u94FE\u63A5", 401);
      }
      if (op === "web-config") return json(200, { ...await service2.info(session.uid), configured: true });
      if (op === "web-prepare") return json(200, await service2.prepare(session.uid, data));
      if (op === "web-create") return json(200, await service2.create(session.uid, data));
      if (op === "web-query") return json(200, await service2.query(session.uid, data.id));
      if (op === "web-result") return json(200, await service2.result(session.uid, data.id));
      return json(404, { error: "\u64CD\u4F5C\u4E0D\u5B58\u5728" });
    } catch (e) {
      return json(e.status || 422, { error: e.status === 401 && op !== "web-login" ? "\u6D4B\u8BD5\u767B\u5F55\u5DF2\u5931\u6548\uFF0C\u8BF7\u91CD\u65B0\u6253\u5F00\u9080\u8BF7\u94FE\u63A5" : e.message || "\u6D4B\u8BD5\u670D\u52A1\u6682\u65F6\u4E0D\u53EF\u7528\uFF0C\u8BF7\u67E5\u8BE2\u539F\u4EFB\u52A1" });
    }
  };
}

// cloudfunctions/meme-motion/transaction.mjs
async function retryTransaction(operation, sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms))) {
  for (let attempt = 0; ; attempt++) try {
    return await operation();
  } catch (error) {
    if (attempt >= 3 || !/TransactionBusy|TransactionConflict/.test(String(error.code || "") + " " + String(error.message || ""))) throw error;
    await sleep(100 * (attempt + 1));
  }
}

// cloudfunctions/meme-motion/store.mjs
var import_node_crypto8 = require("node:crypto");
var import_node_sdk = __toESM(require("@cloudbase/node-sdk"), 1);
function cloudStore(env2 = process.env) {
  const app = import_node_sdk.default.init({ env: env2.TCB_ENV || env2.CLOUDBASE_ENV_ID }), db = app.database();
  let initialized;
  const base = () => ({ count: Number(env2.MOTION_BASE_COUNT || 0), cost: Number(env2.MOTION_BASE_COST || 0) });
  const ready = () => initialized ??= (async () => {
    for (const n of ["meme_motion_jobs", "meme_motion_quota", "meme_accounts", "meme_wallets", "meme_orders", "meme_wallet_events", "meme_login_challenges", "meme_login_limits", "meme_account_sessions"]) try {
      await db.createCollection(n);
    } catch (e) {
      if (!/exist|已存在/i.test(e.message || "")) throw e;
    }
  })().catch((e) => {
    initialized = null;
    throw e;
  });
  const runTransaction = (fn) => retryTransaction(() => db.runTransaction(fn));
  const get = async (c, id2) => (await c.where({ _id: id2 }).get()).data[0];
  const accountCollections = /* @__PURE__ */ new Set(["meme_accounts", "meme_wallets", "meme_orders", "meme_wallet_events", "meme_login_challenges", "meme_login_limits", "meme_account_sessions"]);
  const store2 = {
    async readOnly(fn) {
      await ready();
      return fn({ async get(c, id2) {
        if (!accountCollections.has(c)) throw Error("\u8D26\u6237\u96C6\u5408\u65E0\u6548");
        return get(db.collection(c), id2);
      } });
    },
    async transaction(fn) {
      await ready();
      return runTransaction(async (tx) => fn({
        async get(c, id2) {
          if (!accountCollections.has(c)) throw Error("\u8D26\u6237\u96C6\u5408\u65E0\u6548");
          return get(tx.collection(c), id2);
        },
        async set(c, id2, row) {
          if (!accountCollections.has(c)) throw Error("\u8D26\u6237\u96C6\u5408\u65E0\u6548");
          const { _id, ...safe } = row;
          return tx.collection(c).doc(id2).set(safe);
        }
      }));
    },
    async read(id2) {
      await ready();
      return get(db.collection("meme_motion_jobs"), id2);
    },
    async info() {
      await ready();
      return await get(db.collection("meme_motion_quota"), "global") || base();
    },
    async atomic(id2, fn) {
      await ready();
      return runTransaction(async (tx) => {
        const jobs = tx.collection("meme_motion_jobs"), quotas = tx.collection("meme_motion_quota");
        const row = await get(jobs, id2), accountId2 = row?.uid ? (0, import_node_crypto8.createHash)("sha256").update("wechat:" + row.uid).digest("hex") : null;
        const wallets = tx.collection("meme_wallets"), events = tx.collection("meme_wallet_events");
        const wallet = accountId2 ? await get(wallets, accountId2) : void 0, usage = await get(events, "usage:" + id2);
        const data = { row, quota: await get(quotas, "global") || base(), wallet, usage };
        const result = fn(data);
        if (data.wallet && data.wallet !== wallet) {
          if (data.wallet.accountId !== accountId2) throw Error("\u4EFB\u52A1\u8D26\u6237\u70B9\u6570\u5F52\u5C5E\u5F02\u5E38");
          const { _id: _id2, ...safe } = data.wallet;
          await wallets.doc(accountId2).set(safe);
        }
        if (data.usage && data.usage !== usage) {
          if (data.usage.id !== id2 || data.usage.accountId !== accountId2) throw Error("\u4EFB\u52A1\u6263\u8D39\u5F52\u5C5E\u5F02\u5E38");
          const { _id: _id2, ...safe } = data.usage;
          await events.doc("usage:" + id2).set(safe);
        }
        if (data.row) {
          const { _id: _id2, ...row2 } = data.row;
          await jobs.doc(id2).set(row2);
        }
        const { _id, ...quota } = data.quota;
        await quotas.doc("global").set(quota);
        return result;
      });
    },
    async cleanup() {
      await ready();
      const rows = (await db.collection("meme_motion_jobs").where({ expires: db.command.lt(Date.now()), cleaned: db.command.neq(true) }).limit(30).get()).data;
      for (const r of rows) {
        await storage2.remove([r.imageFile, r.referenceFile, r.resultFile].filter(Boolean));
        await db.collection("meme_motion_jobs").doc(r.id).update({ cleaned: true });
      }
      return rows.length;
    }
  };
  const storage2 = {
    async ticket(cloudPath) {
      const { data } = await app.getUploadMetadata({ cloudPath });
      if (!data?.fileId || !data?.authorization || !data?.token || !data?.cosFileId || !data.url?.startsWith("https://")) throw Error("\u7D20\u6750\u4E0A\u4F20\u670D\u52A1\u6682\u4E0D\u53EF\u7528");
      return { fileId: data.fileId, url: data.url, cloudPath, method: "PUT", headers: { key: encodeURIComponent(cloudPath), Signature: data.authorization, authorization: data.authorization, "x-cos-security-token": data.token, "x-cos-meta-fileid": data.cosFileId } };
    },
    async url(fileID) {
      const r = await app.getTempFileURL({ fileList: [{ fileID, maxAge: 600, urlType: "COS_URL" }] });
      const url = r.fileList?.[0]?.tempFileURL;
      if (!url?.startsWith("https://")) throw Error("\u7D20\u6750\u5730\u5740\u6682\u4E0D\u53EF\u7528");
      return url;
    },
    async read(fileID, max) {
      const url = await this.url(fileID), r = await fetch(url, { signal: AbortSignal.timeout(6e4), redirect: "error" });
      if (!r.ok || Number(r.headers.get("content-length")) > max) throw Error("\u7D20\u6750\u8FC7\u5927\u6216\u4E0A\u4F20\u5C1A\u672A\u5B8C\u6210");
      const reader = r.body.getReader(), parts = [];
      let total = 0;
      try {
        for (; ; ) {
          const { done, value } = await reader.read();
          if (done) break;
          total += value.length;
          if (total > max) throw Error("\u7D20\u6750\u8D85\u8FC7\u5927\u5C0F\u9650\u5236");
          parts.push(value);
        }
      } finally {
        await reader.cancel();
      }
      return Buffer.concat(parts);
    },
    async save(cloudPath, fileContent) {
      const r = await app.uploadFile({ cloudPath, fileContent });
      if (!r.fileID) throw Error("\u751F\u6210\u89C6\u9891\u4FDD\u5B58\u5931\u8D25\uFF0C\u8BF7\u91CD\u8BD5\u83B7\u53D6\u539F\u4EFB\u52A1");
      return r.fileID;
    },
    async remove(fileList) {
      if (fileList.length) await app.deleteFile({ fileList });
    }
  };
  return { store: store2, storage: storage2 };
}

// cloudfunctions/meme-motion/media.mjs
var import_image_size = require("image-size");
var import_mp4box = require("mp4box");
function videoInfo(bytes) {
  return new Promise((resolve, reject) => {
    const file = (0, import_mp4box.createFile)(false);
    let done = false;
    const end = (error, value) => {
      if (done) return;
      done = true;
      clearTimeout(timer);
      error ? reject(error) : resolve(value);
    };
    const timer = setTimeout(() => end(Error("\u89C6\u9891\u4FE1\u606F\u8BFB\u53D6\u8D85\u65F6")), 5e3);
    file.onError = () => end(Error("\u65E0\u6CD5\u8BFB\u53D6MP4\u89C6\u9891\uFF0C\u8BF7\u6362\u4E00\u4E2A\u89C6\u9891"));
    file.onReady = (info) => {
      const v = info.videoTracks?.[0], width = Number(v?.video?.width || v?.track_width), height = Number(v?.video?.height || v?.track_height), duration = Number(v?.duration) / Number(v?.timescale);
      if (!width || !height || !Number.isFinite(duration) || duration <= 0) return end(Error("MP4\u6CA1\u6709\u53EF\u7528\u7684\u89C6\u9891\u753B\u9762"));
      end(null, { width, height, duration });
    };
    try {
      const buffer = bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength);
      buffer.fileStart = 0;
      file.appendBuffer(buffer);
      file.flush();
      if (!done) end(Error("\u65E0\u6CD5\u8BFB\u53D6\u5B8C\u6574MP4\u89C6\u9891"));
    } catch {
      end(Error("\u65E0\u6CD5\u8BFB\u53D6MP4\u89C6\u9891\uFF0C\u8BF7\u6362\u4E00\u4E2A\u89C6\u9891"));
    }
  });
}
var dims = (d, max) => d.width >= 200 && d.height >= 200 && d.width <= max && d.height <= max && d.width / d.height >= 1 / 3 && d.width / d.height <= 3;
function imageInfo(bytes) {
  let info;
  try {
    info = (0, import_image_size.imageSize)(bytes);
  } catch {
    throw Error("\u751F\u6210\u56FE\u7247\u65E0\u6CD5\u8BFB\u53D6\uFF0C\u8BF7\u91CD\u65B0\u83B7\u53D6\u539F\u4EFB\u52A1");
  }
  if (info.type !== "png" || !dims(info, 4096) || bytes.length > 10 * 1024 * 1024) throw Error("\u751F\u6210\u56FE\u7247\u683C\u5F0F\u6216\u5C3A\u5BF8\u4E0D\u652F\u6301");
  return { width: info.width, height: info.height };
}
async function validateMedia({ mode, prompt, imageBytes, referenceBytes }) {
  if (mode === "draw") return { mode, prompt, cost: 0.2 };
  let im;
  try {
    im = (0, import_image_size.imageSize)(imageBytes);
  } catch {
    throw Error("\u7167\u7247\u8BFB\u53D6\u5931\u8D25\uFF0C\u8BF7\u91CD\u65B0\u9009\u62E9");
  }
  const imageType = { jpg: "image/jpeg", png: "image/png", webp: "image/webp" }[im.type];
  if (!imageType || !dims(im, 4096) || imageBytes.length > 1024 * 1024) throw Error("\u8BF7\u4F7F\u7528200\uFF5E4096\u50CF\u7D20\u30011MB\u4EE5\u5185\u7684JPG/PNG\u7167\u7247");
  if (mode === "edit" && (im.width < 240 || im.height < 240)) throw Error("AI\u6539\u56FE\u7167\u7247\u7684\u5BBD\u9AD8\u81F3\u5C11240\u50CF\u7D20");
  const result = { mode, prompt, imageBytes, imageType, image: "data:" + imageType + ";base64," + imageBytes.toString("base64"), cost: mode === "edit" ? 0.2 : 0.3 };
  if (mode === "imitate") {
    if (!referenceBytes?.length || referenceBytes.length > 20 * 1024 * 1024) throw Error("\u53C2\u8003\u89C6\u9891\u6700\u592720MB");
    const v = await videoInfo(referenceBytes);
    if (!dims(v, 2048) || v.duration < 2 || v.duration > 6.05) throw Error("\u53C2\u8003\u89C6\u9891\u9700\u4E3A2\uFF5E6\u79D2\u3001\u5BBD\u9AD8200\uFF5E2048\u50CF\u7D20\u7684MP4");
    result.referenceBytes = referenceBytes;
    result.duration = v.duration;
    result.cost = Math.ceil(v.duration) * 0.4;
  }
  return result;
}

// cloudfunctions/meme-motion/entry.mjs
var import_security_core5 = __toESM(require_security_core(), 1);
var env = process.env;
var { store, storage } = cloudStore(env);
var wechat = accountWechat(env);
var payments = createPayments({ store, env, wxSession: (code) => wechat.session(code), accessToken: () => wechat.token() });
var policy = billingPolicy(env, payments.catalog().enabled);
var billingEnabled = policy.enabled;
var accounts = createAccounts({ store, env, billingEnabled, billingExempt: policy.exempt });
var accountHandler = createAccountHandler({ accounts, payments, env });
var shared = { store, storage, billingEnabled, billingExempt: policy.exempt, provider: createProvider({ key: env.DASHSCOPE_API_KEY, base: env.DASHSCOPE_BASE_URL || "https://dashscope.aliyuncs.com" }), budgetEnforced: env.MOTION_TEST_UNLIMITED !== "true", budget: Number(env.MOTION_BUDGET_CNY || 3), maxJobs: Number(env.MOTION_MAX_JOBS || 4), validate: validateMedia, inspectResult: videoInfo, inspectImage: imageInfo };
var webService = createMotion({ ...shared, activeScope: "user", verifyInput: async (uid) => {
  if (!uid) throw Error("\u7F51\u9875\u767B\u5F55\u65E0\u6548");
} });
var webHandler = createWebMotionHandler({ service: webService, env, resolveAccount: (token) => accounts.resolve(token) });
var service = createMotion({ ...shared, verifyInput: async (uid, { receipt, prompt, imageBytes }) => {
  const checked = import_security_core5.default.receiptMatches(receipt, prompt, imageBytes ? [{ buffer: imageBytes }] : [], env);
  if (checked.uid !== uid) throw Error("\u68C0\u6D4B\u51ED\u8BC1\u4E0D\u5C5E\u4E8E\u5F53\u524D\u7528\u6237\uFF0C\u8BF7\u91CD\u65B0\u68C0\u6D4B");
} });
async function main(event) {
  if (event.Type === "Timer") {
    await service.reconcile();
    return { cleaned: await store.cleanup() };
  }
  const json = (statusCode, body) => ({ statusCode, headers: { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store", "X-Content-Type-Options": "nosniff" }, body: JSON.stringify(body) });
  const requestHeaders = Object.fromEntries(Object.entries(event.headers || {}).map(([k, v]) => [k.toLowerCase(), String(v)]));
  if ((event.httpMethod || "").toUpperCase() === "OPTIONS") {
    const origin = requestHeaders.origin, allowed = (env.MEME_WEB_ORIGINS || "").split(",").map((x) => x.trim()).filter(Boolean);
    if (!origin || !allowed.includes(origin)) return { statusCode: 403, headers: { "Cache-Control": "no-store" }, body: "" };
    return { statusCode: 204, headers: { "Access-Control-Allow-Origin": origin, "Access-Control-Allow-Methods": "POST, OPTIONS", "Access-Control-Allow-Headers": "content-type, authorization", "Access-Control-Max-Age": "600", Vary: "Origin", "Cache-Control": "no-store" }, body: "" };
  }
  const op = (event.queryStringParameters || event.queryString || {}).op;
  if (op === "health") return json(200, { configured: Boolean(env.DASHSCOPE_API_KEY), service: "meme-motion", version: "0.3.0" });
  if (op === "pay-callback") return payments.callback(event);
  if (typeof op === "string" && op.startsWith("account-")) return accountHandler(event, op);
  if (!env.DASHSCOPE_API_KEY) return json(503, { error: "AI\u52A8\u4F5C\u670D\u52A1\u5C1A\u672A\u914D\u7F6E" });
  if (typeof op === "string" && op.startsWith("web-")) return webHandler(event, op);
  try {
    if ((event.httpMethod || "").toUpperCase() !== "POST") return json(405, { error: "\u8BF7\u6C42\u65B9\u5F0F\u4E0D\u652F\u6301" });
    const headers = Object.fromEntries(Object.entries(event.headers || {}).map(([k, v]) => [k.toLowerCase(), v]));
    const session = import_security_core5.default.verify(String(headers.authorization || "").replace(/^Bearer /, ""), env, "session");
    const raw = event.isBase64Encoded ? Buffer.from(event.body || "", "base64").toString() : event.body || "{}";
    if (Buffer.byteLength(raw) > 3e4) return json(413, { error: "\u53C2\u6570\u8FC7\u5927\uFF0C\u8BF7\u91CD\u65B0\u9009\u62E9\u7D20\u6750" });
    const data = JSON.parse(raw);
    if (op === "config") {
      const account = await accounts.me(session.uid);
      return json(200, { ...await service.info(session.uid), developer: account.developer, billingEnabled: billingEnabled(session.uid) && !policy.exempt(session.uid) });
    }
    if (op === "prepare") return json(200, await service.prepare(session.uid, data));
    if (op === "create") return json(200, await service.create(session.uid, data));
    if (op === "query") return json(200, await service.query(session.uid, data.id));
    if (op === "result") return json(200, await service.result(session.uid, data.id));
    return json(404, { error: "\u64CD\u4F5C\u4E0D\u5B58\u5728" });
  } catch (e) {
    const known = /任务|额度|照片|视频|素材|描述|凭证|内容|MP4|JPG|生成|参数/.test(e.message || "");
    return json(e.status || 422, { error: known ? e.message : "\u52A8\u4F5C\u670D\u52A1\u6682\u65F6\u4E0D\u53EF\u7528\uFF0C\u8BF7\u4FDD\u7559\u4EFB\u52A1\u8BB0\u5F55\u7A0D\u540E\u91CD\u8BD5" });
  }
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  main
});
