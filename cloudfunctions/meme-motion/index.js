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
    var { createHash: createHash3, createHmac: createHmac2, timingSafeEqual: timingSafeEqual2, createDecipheriv } = require("node:crypto");
    function fail2(message, status = 503) {
      throw Object.assign(new Error(message), { status });
    }
    function equal2(a, b) {
      const x = Buffer.from(String(a)), y = Buffer.from(String(b));
      return x.length === y.length && timingSafeEqual2(x, y);
    }
    function secret(env2) {
      if (!env2.MEME_SECURITY_SECRET || env2.MEME_SECURITY_SECRET.length < 32) fail2("\u5185\u5BB9\u5B89\u5168\u670D\u52A1\u5C1A\u672A\u914D\u7F6E");
      return env2.MEME_SECURITY_SECRET;
    }
    function sign(data, env2) {
      const text = Buffer.from(JSON.stringify(data)).toString("base64url");
      return text + "." + createHmac2("sha256", secret(env2)).update(text).digest("base64url");
    }
    function verify(token, env2, kind) {
      const [text, mac, ...extra] = String(token || "").split(".");
      if (extra.length || !text || !mac || !equal2(mac, createHmac2("sha256", secret(env2)).update(text).digest("base64url"))) fail2("\u68C0\u6D4B\u51ED\u8BC1\u65E0\u6548\uFF0C\u8BF7\u91CD\u65B0\u68C0\u6D4B", 401);
      let data;
      try {
        data = JSON.parse(Buffer.from(text, "base64url"));
      } catch {
        fail2("\u68C0\u6D4B\u51ED\u8BC1\u65E0\u6548", 401);
      }
      if (data.kind !== kind || !Number.isFinite(data.exp) || data.exp < Date.now()) fail2("\u68C0\u6D4B\u51ED\u8BC1\u5DF2\u8FC7\u671F\uFF0C\u8BF7\u91CD\u65B0\u68C0\u6D4B", 401);
      return data;
    }
    function digest2(text, images) {
      const h = createHash3("sha256").update(JSON.stringify(String(text)));
      for (const image of images) {
        const b = image.buffer || Buffer.from(image.data, "base64");
        h.update(String(b.length) + ":").update(b);
      }
      return h.digest("hex");
    }
    async function checkText(call, uid, text) {
      if (!text.trim()) return;
      const r = await call("msg_sec_check", { openid: uid, scene: 4, version: 2, content: text });
      if (r.errcode !== 0 || r.result?.suggest !== "pass") fail2(r.result?.suggest === "risky" || r.errcode === 87014 ? "\u5185\u5BB9\u5305\u542B\u8FDD\u89C4\u4FE1\u606F\uFF0C\u8BF7\u4FEE\u6539\u540E\u91CD\u8BD5" : "\u6587\u5B57\u672A\u901A\u8FC7\u68C0\u6D4B\uFF0C\u8BF7\u4FEE\u6539\u5185\u5BB9\u6216\u7A0D\u540E\u91CD\u8BD5", 422);
    }
    function signature(q, env2, encrypted) {
      if (!env2.WECHAT_CALLBACK_TOKEN || env2.WECHAT_CALLBACK_TOKEN.length < 3 || env2.WECHAT_CALLBACK_TOKEN.length > 32) fail2("\u56DE\u8C03Token\u987B\u4E3A3\u81F332\u4F4D");
      if (!/^\d+$/.test(q.timestamp || "") || Math.abs(Date.now() / 1e3 - Number(q.timestamp)) > 600 || !q.nonce) fail2("\u65E0\u6548\u56DE\u8C03", 403);
      const values = [env2.WECHAT_CALLBACK_TOKEN, q.timestamp, q.nonce];
      if (encrypted) values.push(encrypted);
      const hash2 = createHash3("sha1").update(values.sort().join("")).digest("hex");
      if (!equal2(hash2, encrypted ? q.msg_signature : q.signature)) fail2("\u56DE\u8C03\u7B7E\u540D\u4E0D\u7B26", 403);
    }
    function callbackMessage(q, body, env2) {
      const encrypted = body.Encrypt || body.encrypt;
      signature(q, env2, encrypted);
      if (!encrypted) fail2("\u8BF7\u4F7F\u7528\u5B89\u5168\u6A21\u5F0F\u6D88\u606F\u63A8\u9001", 403);
      const key = Buffer.from((env2.WECHAT_CALLBACK_AES_KEY || "") + "=", "base64");
      if (key.length !== 32) fail2("\u56DE\u8C03AES\u5BC6\u94A5\u65E0\u6548");
      const decipher = createDecipheriv("aes-256-cbc", key, key.subarray(0, 16));
      decipher.setAutoPadding(false);
      let data;
      try {
        data = Buffer.concat([decipher.update(Buffer.from(encrypted, "base64")), decipher.final()]);
      } catch {
        fail2("\u56DE\u8C03\u89E3\u5BC6\u5931\u8D25", 403);
      }
      const pad = data[data.length - 1];
      if (pad < 1 || pad > 32 || !data.subarray(data.length - pad).every((x) => x === pad)) fail2("\u56DE\u8C03\u586B\u5145\u9519\u8BEF", 403);
      data = data.subarray(0, data.length - pad);
      if (data.length < 20) fail2("\u56DE\u8C03\u683C\u5F0F\u9519\u8BEF", 403);
      const n = data.readUInt32BE(16);
      if (n > data.length - 20 || data.subarray(20 + n).toString() !== env2.WECHAT_APP_ID) fail2("\u56DE\u8C03AppID\u4E0D\u5339\u914D", 403);
      try {
        return JSON.parse(data.subarray(20, 20 + n).toString());
      } catch {
        fail2("\u8BF7\u914D\u7F6EJSON\u6D88\u606F\u63A8\u9001", 400);
      }
    }
    function receiptMatches(ticket, text, images, env2) {
      const r = verify(ticket, env2, "receipt");
      if (r.hash !== digest2(text, images)) fail2("\u63D0\u4EA4\u5185\u5BB9\u5DF2\u53D8\u5316\uFF0C\u8BF7\u91CD\u65B0\u68C0\u6D4B", 403);
      return r;
    }
    module2.exports = { fail: fail2, sign, verify, digest: digest2, checkText, callbackMessage, signature, receiptMatches };
  }
});

// cloudfunctions/meme-motion/entry.mjs
var entry_exports = {};
__export(entry_exports, {
  main: () => main
});
module.exports = __toCommonJS(entry_exports);

// cloudfunctions/meme-motion/service.mjs
var import_node_crypto2 = require("node:crypto");

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

// server/motion/provider.mjs
var import_node_crypto = require("node:crypto");
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
      const filename = (0, import_node_crypto.randomUUID)() + "." + ext, keyname = p.upload_dir + "/" + filename, f = new FormData();
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
    async query(id) {
      return parseTask(await api("/tasks/" + encodeURIComponent(id)));
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
var hash = (s) => (0, import_node_crypto2.createHash)("sha256").update(s).digest("hex");
var uuid = (s) => /^[a-f0-9]{8}(?:-[a-f0-9]{4}){3}-[a-f0-9]{12}$/i.test(s || "");
function createMotion({ store: store2, storage: storage2, provider, validate, verifyInput, inspectResult, inspectImage, budget = 3, maxJobs = 4, budgetEnforced = true, activeScope = "global", now = Date.now }) {
  const activeKey = (uid) => activeScope === "user" ? "active_" + hash(uid) : "active";
  const publicRow = (r) => ({ id: r.id, mode: r.mode, status: r.status, error: r.error, created: r.created });
  async function owned(uid, id) {
    if (!uuid(id)) throw Object.assign(Error("\u4EFB\u52A1\u4E0D\u5B58\u5728"), { status: 404 });
    const r = await store2.read(id);
    if (!r || r.uid !== uid) throw Object.assign(Error("\u4EFB\u52A1\u4E0D\u5B58\u5728"), { status: 404 });
    if (r.expires < now()) throw Object.assign(Error("\u4EFB\u52A1\u5DF2\u8FC7\u671F\uFF0C\u8BF7\u91CD\u65B0\u5236\u4F5C"), { status: 410 });
    return r;
  }
  async function finish(id, changes) {
    return store2.atomic(id, (s) => {
      Object.assign(s.row, changes);
      const key = activeKey(s.row.uid);
      if (["success", "failed"].includes(s.row.status) && s.quota[key] === id) delete s.quota[key];
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
    async info() {
      const q = await store2.info();
      return { budgetEnforced, available: !budgetEnforced || Number.isFinite(budget) && budget > 0 && q.count < maxJobs && q.cost + 0.2 <= budget + 1e-6, remaining: budgetEnforced ? Math.max(0, Math.min(maxJobs - q.count, Math.floor((budget - q.cost + 1e-6) / 0.2))) : null, models: MODELS, pricing: catalog() };
    },
    async prepare(uid, { id, mode }) {
      if (!uuid(id) || !Object.hasOwn(MODELS, mode)) throw Error("\u5236\u4F5C\u53C2\u6570\u65E0\u6548");
      await store2.atomic(id, (s) => {
        if (s.row) {
          if (s.row.uid !== uid) throw Error("\u4EFB\u52A1\u4E0D\u5B58\u5728");
          if (s.row.mode !== mode) throw Error("\u4EFB\u52A1\u5185\u5BB9\u5DF2\u53D8\u5316");
          return;
        }
        s.row = { id, uid, mode, status: "draft", created: now(), expires: now() + 24 * 36e5 };
      });
      const row = await owned(uid, id);
      if (row.status !== "draft") return publicRow(row);
      const prefix = `meme-motion/${hash(uid).slice(0, 24)}/${id}`;
      const image = mode === "draw" ? void 0 : await storage2.ticket(prefix + "/input.jpg");
      const reference = mode === "imitate" ? await storage2.ticket(prefix + "/reference.mp4") : void 0;
      await store2.atomic(id, (s) => {
        if (s.row.status === "draft") {
          if (image) s.row.imageFile = image.fileId;
          if (reference) s.row.referenceFile = reference.fileId;
          s.row.prefix = prefix;
        }
      });
      return { ...publicRow(row), uploads: { ...image ? { image } : {}, ...reference ? { reference } : {} } };
    },
    async create(uid, data) {
      const row = await owned(uid, data.id);
      const prompt = typeof data.prompt === "string" ? data.prompt.trim() : "";
      if (prompt.length > 800 || row.mode !== "imitate" && !prompt) throw Error("\u8BF7\u7528800\u5B57\u4EE5\u5185\u63CF\u8FF0\u521B\u610F");
      if (row.status !== "draft") {
        if (row.promptHash !== hash(prompt)) throw Error("\u4EFB\u52A1\u5185\u5BB9\u5DF2\u53D8\u5316\uFF0C\u8BF7\u65B0\u5EFA\u4EFB\u52A1");
        return publicRow(row);
      }
      await reconcile(uid);
      if (row.mode !== "draw" && !row.imageFile) throw Error("\u8BF7\u5148\u4E0A\u4F20\u7167\u7247");
      const imageBytes = row.mode === "draw" ? void 0 : await storage2.read(row.imageFile, 1024 * 1024);
      await verifyInput(uid, { ...data, prompt, imageBytes });
      const input = await validate({ mode: row.mode, prompt, imageBytes, ...row.mode === "imitate" ? { referenceBytes: await storage2.read(row.referenceFile, 20 * 1024 * 1024) } : {} });
      const claimed = await store2.atomic(row.id, (s) => {
        if (s.row.status !== "draft") {
          if (s.row.promptHash !== hash(prompt)) throw Error("\u4EFB\u52A1\u5185\u5BB9\u5DF2\u53D8\u5316");
          return false;
        }
        if (s.quota[activeKey(uid)]) throw Error("\u5DF2\u6709\u52A8\u4F5C\u4EFB\u52A1\u8FDB\u884C\u4E2D\uFF0C\u8BF7\u5148\u67E5\u8BE2\u539F\u4EFB\u52A1");
        if (!Number.isFinite(input.cost) || input.cost < 0 || budgetEnforced && (!Number.isFinite(budget) || !Number.isSafeInteger(maxJobs) || maxJobs < 1 || s.quota.count >= maxJobs || s.quota.cost + input.cost > budget + 1e-6)) throw Error("\u514D\u8D39\u4F53\u9A8C\u989D\u5EA6\u6682\u65F6\u7528\u5B8C\uFF0C\u8BF7\u7A0D\u540E\u518D\u6765");
        s.quota.count++;
        s.quota.cost += input.cost;
        s.quota[activeKey(uid)] = row.id;
        Object.assign(s.row, { status: "submitting", cost: input.cost, model: MODELS[row.mode], priceVersion: PRICE_VERSION, priceFen: quote(row.mode, input.duration).priceFen, promptHash: hash(prompt), submitted: now() });
        return true;
      });
      if (!claimed) return publicRow(await owned(uid, row.id));
      try {
        const taskId = await provider.create(input);
        await finish(row.id, { taskId, status: "queued" });
      } catch (e) {
        await store2.atomic(row.id, (s) => {
          if (e.rejected) {
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
    async query(uid, id) {
      const row = await owned(uid, id);
      if (row.taskId && !["success", "failed"].includes(row.status)) return finish(id, await provider.query(row.taskId));
      if (row.status === "submitting" && now() - row.submitted > 12e4) return finish(id, { status: "unknown", error: "\u63D0\u4EA4\u7ED3\u679C\u5F85\u786E\u8BA4\uFF0C\u8BF7\u8054\u7CFB\u5F00\u53D1\u8005\u67E5\u8BE2\u539F\u4EFB\u52A1\uFF0C\u6682\u52FF\u91CD\u590D\u751F\u6210" });
      return publicRow(row);
    },
    async result(uid, id) {
      let row = await owned(uid, id);
      const image = ["draw", "edit"].includes(row.mode);
      if (row.status !== "success" || !(image ? row.imageUrl : row.videoUrl)) throw Error("\u4F5C\u54C1\u5C1A\u672A\u5B8C\u6210\uFF0C\u8BF7\u7EE7\u7EED\u67E5\u8BE2");
      if (!row.resultFile) {
        const bytes = image ? await provider.downloadImage(row.imageUrl) : await provider.download(row.videoUrl);
        const info = image ? await inspectImage(bytes) : await inspectResult(bytes);
        const resultFile = await storage2.save(row.prefix + (image ? "/result.png" : "/result.mp4"), bytes);
        await store2.atomic(id, (s) => {
          s.row.resultFile = resultFile;
          s.row.resultInfo = info;
        });
        row = await owned(uid, id);
      }
      return { ...row.resultInfo, kind: image ? "image" : "video", url: await storage2.url(row.resultFile) };
    }
  };
}

// cloudfunctions/meme-motion/web.mjs
var import_node_crypto3 = require("node:crypto");
var import_security_core = __toESM(require_security_core(), 1);
var digest = (x) => (0, import_node_crypto3.createHash)("sha256").update(x).digest("hex");
var equal = (a, b) => {
  const x = Buffer.from(a), y = Buffer.from(b);
  return x.length === y.length && (0, import_node_crypto3.timingSafeEqual)(x, y);
};
var fail = (message, status) => {
  throw Object.assign(Error(message), { status });
};
function createWebMotionHandler({ service: service2, env: env2 }) {
  return async (event, op) => {
    const headers = Object.fromEntries(Object.entries(event.headers || {}).map(([k, v]) => [k.toLowerCase(), String(v)])), origin = headers.origin;
    const allowed = (env2.MEME_WEB_ORIGINS || "").split(",").map((x) => x.trim()).filter(Boolean), cors = origin && allowed.includes(origin) ? { "Access-Control-Allow-Origin": origin, Vary: "Origin" } : {};
    const json = (statusCode, body) => ({ statusCode, headers: { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store", "X-Content-Type-Options": "nosniff", ...cors }, body: JSON.stringify(body) });
    try {
      if (origin && !allowed.includes(origin)) fail("\u6B64\u9875\u9762\u672A\u83B7\u51C6\u8C03\u7528\u6D4B\u8BD5\u670D\u52A1", 403);
      if ((event.httpMethod || "").toUpperCase() !== "POST") fail("\u8BF7\u6C42\u65B9\u5F0F\u4E0D\u652F\u6301", 405);
      const invite = env2.MEME_WEB_INVITE_CODE;
      if (!invite || invite.length < 24) fail("\u7F51\u9875\u6D4B\u8BD5\u670D\u52A1\u5C1A\u672A\u542F\u7528", 503);
      const raw = event.isBase64Encoded ? Buffer.from(event.body || "", "base64").toString() : event.body || "{}";
      if (Buffer.byteLength(raw) > 3e4) fail("\u53C2\u6570\u8FC7\u5927\uFF0C\u8BF7\u91CD\u65B0\u9009\u62E9\u7D20\u6750", 413);
      let data;
      try {
        data = JSON.parse(raw);
      } catch {
        fail("\u53C2\u6570\u683C\u5F0F\u65E0\u6548", 400);
      }
      if (!data || Array.isArray(data) || typeof data !== "object") fail("\u53C2\u6570\u683C\u5F0F\u65E0\u6548", 400);
      const token = (headers.authorization || "").replace(/^Bearer /, "");
      if (op === "web-login") {
        if (!equal(token, invite)) fail("\u9080\u8BF7\u7801\u4E0D\u6B63\u786E\uFF0C\u8BF7\u68C0\u67E5\u5B8C\u6574\u6D4B\u8BD5\u94FE\u63A5", 401);
        if (!/^[a-f0-9]{8}(?:-[a-f0-9]{4}){3}-[a-f0-9]{12}$/i.test(data.clientId || "")) fail("\u6D4F\u89C8\u5668\u6807\u8BC6\u65E0\u6548\uFF0C\u8BF7\u91CD\u65B0\u6253\u5F00\u9875\u9762", 400);
        const uid = "web:" + (0, import_node_crypto3.createHmac)("sha256", env2.MEME_SECURITY_SECRET).update(invite + ":" + data.clientId).digest("hex").slice(0, 40);
        const session2 = import_security_core.default.sign({ kind: "web-motion-session", uid, invite: digest(invite), exp: Date.now() + 30 * 24 * 36e5 }, env2);
        return json(200, { session: session2 });
      }
      const session = import_security_core.default.verify(token, env2, "web-motion-session");
      if (session.invite !== digest(invite) || !session.uid?.startsWith("web:")) fail("\u6D4B\u8BD5\u767B\u5F55\u5DF2\u5931\u6548\uFF0C\u8BF7\u91CD\u65B0\u6253\u5F00\u9080\u8BF7\u94FE\u63A5", 401);
      if (op === "web-config") return json(200, { ...await service2.info(), configured: true });
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

// cloudfunctions/meme-motion/store.mjs
var import_node_sdk = __toESM(require("@cloudbase/node-sdk"), 1);
function cloudStore(env2 = process.env) {
  const app = import_node_sdk.default.init({ env: env2.TCB_ENV || env2.CLOUDBASE_ENV_ID }), db = app.database();
  let initialized;
  const base = () => ({ count: Number(env2.MOTION_BASE_COUNT || 0), cost: Number(env2.MOTION_BASE_COST || 0) });
  const ready = () => initialized ??= (async () => {
    for (const n of ["meme_motion_jobs", "meme_motion_quota"]) try {
      await db.createCollection(n);
    } catch (e) {
      if (!/exist|已存在/i.test(e.message || "")) throw e;
    }
  })().catch((e) => {
    initialized = null;
    throw e;
  });
  const get = async (c, id) => (await c.where({ _id: id }).get()).data[0];
  const store2 = {
    async read(id) {
      await ready();
      return get(db.collection("meme_motion_jobs"), id);
    },
    async info() {
      await ready();
      return await get(db.collection("meme_motion_quota"), "global") || base();
    },
    async atomic(id, fn) {
      await ready();
      return db.runTransaction(async (tx) => {
        const jobs = tx.collection("meme_motion_jobs"), quotas = tx.collection("meme_motion_quota");
        const data = { row: await get(jobs, id), quota: await get(quotas, "global") || base() };
        const result = fn(data);
        if (data.row) {
          const { _id: _id2, ...row } = data.row;
          await jobs.doc(id).set(row);
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
var import_security_core2 = __toESM(require_security_core(), 1);
var env = process.env;
var { store, storage } = cloudStore(env);
var shared = { store, storage, provider: createProvider({ key: env.DASHSCOPE_API_KEY, base: env.DASHSCOPE_BASE_URL || "https://dashscope.aliyuncs.com" }), budgetEnforced: env.MOTION_TEST_UNLIMITED !== "true", budget: Number(env.MOTION_BUDGET_CNY || 3), maxJobs: Number(env.MOTION_MAX_JOBS || 4), validate: validateMedia, inspectResult: videoInfo, inspectImage: imageInfo };
var webService = createMotion({ ...shared, activeScope: "user", verifyInput: async (uid) => {
  if (!uid?.startsWith("web:")) throw Error("\u7F51\u9875\u6D4B\u8BD5\u8EAB\u4EFD\u65E0\u6548");
} });
var webHandler = createWebMotionHandler({ service: webService, env });
var service = createMotion({ ...shared, verifyInput: async (uid, { receipt, prompt, imageBytes }) => {
  const checked = import_security_core2.default.receiptMatches(receipt, prompt, imageBytes ? [{ buffer: imageBytes }] : [], env);
  if (checked.uid !== uid) throw Error("\u68C0\u6D4B\u51ED\u8BC1\u4E0D\u5C5E\u4E8E\u5F53\u524D\u7528\u6237\uFF0C\u8BF7\u91CD\u65B0\u68C0\u6D4B");
} });
async function main(event) {
  if (event.Type === "Timer") {
    await service.reconcile();
    return { cleaned: await store.cleanup() };
  }
  const json = (statusCode, body) => ({ statusCode, headers: { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store", "X-Content-Type-Options": "nosniff" }, body: JSON.stringify(body) });
  const op = (event.queryStringParameters || event.queryString || {}).op;
  if (op === "health") return json(200, { configured: Boolean(env.DASHSCOPE_API_KEY), service: "meme-motion", version: "0.3.0" });
  if (!env.DASHSCOPE_API_KEY) return json(503, { error: "AI\u52A8\u4F5C\u670D\u52A1\u5C1A\u672A\u914D\u7F6E" });
  if (typeof op === "string" && op.startsWith("web-")) return webHandler(event, op);
  try {
    if ((event.httpMethod || "").toUpperCase() !== "POST") return json(405, { error: "\u8BF7\u6C42\u65B9\u5F0F\u4E0D\u652F\u6301" });
    const headers = Object.fromEntries(Object.entries(event.headers || {}).map(([k, v]) => [k.toLowerCase(), v]));
    const session = import_security_core2.default.verify(String(headers.authorization || "").replace(/^Bearer /, ""), env, "session");
    const raw = event.isBase64Encoded ? Buffer.from(event.body || "", "base64").toString() : event.body || "{}";
    if (Buffer.byteLength(raw) > 3e4) return json(413, { error: "\u53C2\u6570\u8FC7\u5927\uFF0C\u8BF7\u91CD\u65B0\u9009\u62E9\u7D20\u6750" });
    const data = JSON.parse(raw);
    if (op === "config") return json(200, await service.info());
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
