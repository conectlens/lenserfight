var __defProp = Object.defineProperty;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __esm = (fn, res) => function __init() {
  return fn && (res = (0, fn[__getOwnPropNames(fn)[0]])(fn = 0)), res;
};
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};

// node_modules/.pnpm/consola@3.4.2/node_modules/consola/dist/chunks/prompt.mjs
var prompt_exports = {};
__export(prompt_exports, {
  kCancel: () => kCancel,
  prompt: () => prompt
});
import g, { stdin, stdout } from "node:process";
import f from "node:readline";
import { WriteStream } from "node:tty";
function getDefaultExportFromCjs(x2) {
  return x2 && x2.__esModule && Object.prototype.hasOwnProperty.call(x2, "default") ? x2["default"] : x2;
}
function requireSrc() {
  if (hasRequiredSrc) return src;
  hasRequiredSrc = 1;
  const ESC = "\x1B";
  const CSI = `${ESC}[`;
  const beep = "\x07";
  const cursor = {
    to(x2, y3) {
      if (!y3) return `${CSI}${x2 + 1}G`;
      return `${CSI}${y3 + 1};${x2 + 1}H`;
    },
    move(x2, y3) {
      let ret = "";
      if (x2 < 0) ret += `${CSI}${-x2}D`;
      else if (x2 > 0) ret += `${CSI}${x2}C`;
      if (y3 < 0) ret += `${CSI}${-y3}A`;
      else if (y3 > 0) ret += `${CSI}${y3}B`;
      return ret;
    },
    up: (count = 1) => `${CSI}${count}A`,
    down: (count = 1) => `${CSI}${count}B`,
    forward: (count = 1) => `${CSI}${count}C`,
    backward: (count = 1) => `${CSI}${count}D`,
    nextLine: (count = 1) => `${CSI}E`.repeat(count),
    prevLine: (count = 1) => `${CSI}F`.repeat(count),
    left: `${CSI}G`,
    hide: `${CSI}?25l`,
    show: `${CSI}?25h`,
    save: `${ESC}7`,
    restore: `${ESC}8`
  };
  const scroll = {
    up: (count = 1) => `${CSI}S`.repeat(count),
    down: (count = 1) => `${CSI}T`.repeat(count)
  };
  const erase = {
    screen: `${CSI}2J`,
    up: (count = 1) => `${CSI}1J`.repeat(count),
    down: (count = 1) => `${CSI}J`.repeat(count),
    line: `${CSI}2K`,
    lineEnd: `${CSI}K`,
    lineStart: `${CSI}1K`,
    lines(count) {
      let clear = "";
      for (let i2 = 0; i2 < count; i2++)
        clear += this.line + (i2 < count - 1 ? cursor.up() : "");
      if (count)
        clear += cursor.left;
      return clear;
    }
  };
  src = { cursor, scroll, erase, beep };
  return src;
}
function requirePicocolors() {
  if (hasRequiredPicocolors) return picocolors.exports;
  hasRequiredPicocolors = 1;
  let p = process || {}, argv2 = p.argv || [], env2 = p.env || {};
  let isColorSupported2 = !(!!env2.NO_COLOR || argv2.includes("--no-color")) && (!!env2.FORCE_COLOR || argv2.includes("--color") || p.platform === "win32" || (p.stdout || {}).isTTY && env2.TERM !== "dumb" || !!env2.CI);
  let formatter = (open, close, replace = open) => (input) => {
    let string = "" + input, index = string.indexOf(close, open.length);
    return ~index ? open + replaceClose2(string, close, replace, index) + close : open + string + close;
  };
  let replaceClose2 = (string, close, replace, index) => {
    let result = "", cursor = 0;
    do {
      result += string.substring(cursor, index) + replace;
      cursor = index + close.length;
      index = string.indexOf(close, cursor);
    } while (~index);
    return result + string.substring(cursor);
  };
  let createColors2 = (enabled = isColorSupported2) => {
    let f3 = enabled ? formatter : () => String;
    return {
      isColorSupported: enabled,
      reset: f3("\x1B[0m", "\x1B[0m"),
      bold: f3("\x1B[1m", "\x1B[22m", "\x1B[22m\x1B[1m"),
      dim: f3("\x1B[2m", "\x1B[22m", "\x1B[22m\x1B[2m"),
      italic: f3("\x1B[3m", "\x1B[23m"),
      underline: f3("\x1B[4m", "\x1B[24m"),
      inverse: f3("\x1B[7m", "\x1B[27m"),
      hidden: f3("\x1B[8m", "\x1B[28m"),
      strikethrough: f3("\x1B[9m", "\x1B[29m"),
      black: f3("\x1B[30m", "\x1B[39m"),
      red: f3("\x1B[31m", "\x1B[39m"),
      green: f3("\x1B[32m", "\x1B[39m"),
      yellow: f3("\x1B[33m", "\x1B[39m"),
      blue: f3("\x1B[34m", "\x1B[39m"),
      magenta: f3("\x1B[35m", "\x1B[39m"),
      cyan: f3("\x1B[36m", "\x1B[39m"),
      white: f3("\x1B[37m", "\x1B[39m"),
      gray: f3("\x1B[90m", "\x1B[39m"),
      bgBlack: f3("\x1B[40m", "\x1B[49m"),
      bgRed: f3("\x1B[41m", "\x1B[49m"),
      bgGreen: f3("\x1B[42m", "\x1B[49m"),
      bgYellow: f3("\x1B[43m", "\x1B[49m"),
      bgBlue: f3("\x1B[44m", "\x1B[49m"),
      bgMagenta: f3("\x1B[45m", "\x1B[49m"),
      bgCyan: f3("\x1B[46m", "\x1B[49m"),
      bgWhite: f3("\x1B[47m", "\x1B[49m"),
      blackBright: f3("\x1B[90m", "\x1B[39m"),
      redBright: f3("\x1B[91m", "\x1B[39m"),
      greenBright: f3("\x1B[92m", "\x1B[39m"),
      yellowBright: f3("\x1B[93m", "\x1B[39m"),
      blueBright: f3("\x1B[94m", "\x1B[39m"),
      magentaBright: f3("\x1B[95m", "\x1B[39m"),
      cyanBright: f3("\x1B[96m", "\x1B[39m"),
      whiteBright: f3("\x1B[97m", "\x1B[39m"),
      bgBlackBright: f3("\x1B[100m", "\x1B[49m"),
      bgRedBright: f3("\x1B[101m", "\x1B[49m"),
      bgGreenBright: f3("\x1B[102m", "\x1B[49m"),
      bgYellowBright: f3("\x1B[103m", "\x1B[49m"),
      bgBlueBright: f3("\x1B[104m", "\x1B[49m"),
      bgMagentaBright: f3("\x1B[105m", "\x1B[49m"),
      bgCyanBright: f3("\x1B[106m", "\x1B[49m"),
      bgWhiteBright: f3("\x1B[107m", "\x1B[49m")
    };
  };
  picocolors.exports = createColors2();
  picocolors.exports.createColors = createColors2;
  return picocolors.exports;
}
function J({ onlyFirst: t2 = false } = {}) {
  const F3 = ["[\\u001B\\u009B][[\\]()#;?]*(?:(?:(?:(?:;[-a-zA-Z\\d\\/#&.:=?%@~_]+)*|[a-zA-Z\\d]+(?:;[-a-zA-Z\\d\\/#&.:=?%@~_]*)*)?(?:\\u0007|\\u001B\\u005C|\\u009C))", "(?:(?:\\d{1,4}(?:;\\d{0,4})*)?[\\dA-PR-TZcf-nq-uy=><~]))"].join("|");
  return new RegExp(F3, t2 ? void 0 : "g");
}
function T$1(t2) {
  if (typeof t2 != "string") throw new TypeError(`Expected a \`string\`, got \`${typeof t2}\``);
  return t2.replace(Q, "");
}
function O(t2) {
  return t2 && t2.__esModule && Object.prototype.hasOwnProperty.call(t2, "default") ? t2.default : t2;
}
function A$1(t2, u3 = {}) {
  if (typeof t2 != "string" || t2.length === 0 || (u3 = { ambiguousIsNarrow: true, ...u3 }, t2 = T$1(t2), t2.length === 0)) return 0;
  t2 = t2.replace(FD(), "  ");
  const F3 = u3.ambiguousIsNarrow ? 1 : 2;
  let e2 = 0;
  for (const s2 of t2) {
    const i2 = s2.codePointAt(0);
    if (i2 <= 31 || i2 >= 127 && i2 <= 159 || i2 >= 768 && i2 <= 879) continue;
    switch (DD.eastAsianWidth(s2)) {
      case "F":
      case "W":
        e2 += 2;
        break;
      case "A":
        e2 += F3;
        break;
      default:
        e2 += 1;
    }
  }
  return e2;
}
function sD() {
  const t2 = /* @__PURE__ */ new Map();
  for (const [u3, F3] of Object.entries(r)) {
    for (const [e2, s2] of Object.entries(F3)) r[e2] = { open: `\x1B[${s2[0]}m`, close: `\x1B[${s2[1]}m` }, F3[e2] = r[e2], t2.set(s2[0], s2[1]);
    Object.defineProperty(r, u3, { value: F3, enumerable: false });
  }
  return Object.defineProperty(r, "codes", { value: t2, enumerable: false }), r.color.close = "\x1B[39m", r.bgColor.close = "\x1B[49m", r.color.ansi = L$1(), r.color.ansi256 = N(), r.color.ansi16m = I(), r.bgColor.ansi = L$1(m), r.bgColor.ansi256 = N(m), r.bgColor.ansi16m = I(m), Object.defineProperties(r, { rgbToAnsi256: { value: (u3, F3, e2) => u3 === F3 && F3 === e2 ? u3 < 8 ? 16 : u3 > 248 ? 231 : Math.round((u3 - 8) / 247 * 24) + 232 : 16 + 36 * Math.round(u3 / 255 * 5) + 6 * Math.round(F3 / 255 * 5) + Math.round(e2 / 255 * 5), enumerable: false }, hexToRgb: { value: (u3) => {
    const F3 = /[a-f\d]{6}|[a-f\d]{3}/i.exec(u3.toString(16));
    if (!F3) return [0, 0, 0];
    let [e2] = F3;
    e2.length === 3 && (e2 = [...e2].map((i2) => i2 + i2).join(""));
    const s2 = Number.parseInt(e2, 16);
    return [s2 >> 16 & 255, s2 >> 8 & 255, s2 & 255];
  }, enumerable: false }, hexToAnsi256: { value: (u3) => r.rgbToAnsi256(...r.hexToRgb(u3)), enumerable: false }, ansi256ToAnsi: { value: (u3) => {
    if (u3 < 8) return 30 + u3;
    if (u3 < 16) return 90 + (u3 - 8);
    let F3, e2, s2;
    if (u3 >= 232) F3 = ((u3 - 232) * 10 + 8) / 255, e2 = F3, s2 = F3;
    else {
      u3 -= 16;
      const C3 = u3 % 36;
      F3 = Math.floor(u3 / 36) / 5, e2 = Math.floor(C3 / 6) / 5, s2 = C3 % 6 / 5;
    }
    const i2 = Math.max(F3, e2, s2) * 2;
    if (i2 === 0) return 30;
    let D2 = 30 + (Math.round(s2) << 2 | Math.round(e2) << 1 | Math.round(F3));
    return i2 === 2 && (D2 += 60), D2;
  }, enumerable: false }, rgbToAnsi: { value: (u3, F3, e2) => r.ansi256ToAnsi(r.rgbToAnsi256(u3, F3, e2)), enumerable: false }, hexToAnsi: { value: (u3) => r.ansi256ToAnsi(r.hexToAnsi256(u3)), enumerable: false } }), r;
}
function G(t2, u3, F3) {
  return String(t2).normalize().replace(/\r\n/g, `
`).split(`
`).map((e2) => oD(e2, u3, F3)).join(`
`);
}
function k$1(t2, u3) {
  if (typeof t2 == "string") return c.aliases.get(t2) === u3;
  for (const F3 of t2) if (F3 !== void 0 && k$1(F3, u3)) return true;
  return false;
}
function lD(t2, u3) {
  if (t2 === u3) return;
  const F3 = t2.split(`
`), e2 = u3.split(`
`), s2 = [];
  for (let i2 = 0; i2 < Math.max(F3.length, e2.length); i2++) F3[i2] !== e2[i2] && s2.push(i2);
  return s2;
}
function d$1(t2, u3) {
  const F3 = t2;
  F3.isTTY && F3.setRawMode(u3);
}
function ce() {
  return g.platform !== "win32" ? g.env.TERM !== "linux" : !!g.env.CI || !!g.env.WT_SESSION || !!g.env.TERMINUS_SUBLIME || g.env.ConEmuTask === "{cmd::Cmder}" || g.env.TERM_PROGRAM === "Terminus-Sublime" || g.env.TERM_PROGRAM === "vscode" || g.env.TERM === "xterm-256color" || g.env.TERM === "alacritty" || g.env.TERMINAL_EMULATOR === "JetBrains-JediTerm";
}
async function prompt(message, opts = {}) {
  const handleCancel = (value) => {
    if (typeof value !== "symbol" || value.toString() !== "Symbol(clack:cancel)") {
      return value;
    }
    switch (opts.cancel) {
      case "reject": {
        const error = new Error("Prompt cancelled.");
        error.name = "ConsolaPromptCancelledError";
        if (Error.captureStackTrace) {
          Error.captureStackTrace(error, prompt);
        }
        throw error;
      }
      case "undefined": {
        return void 0;
      }
      case "null": {
        return null;
      }
      case "symbol": {
        return kCancel;
      }
      default:
      case "default": {
        return opts.default ?? opts.initial;
      }
    }
  };
  if (!opts.type || opts.type === "text") {
    return await he({
      message,
      defaultValue: opts.default,
      placeholder: opts.placeholder,
      initialValue: opts.initial
    }).then(handleCancel);
  }
  if (opts.type === "confirm") {
    return await ye({
      message,
      initialValue: opts.initial
    }).then(handleCancel);
  }
  if (opts.type === "select") {
    return await ve({
      message,
      options: opts.options.map(
        (o3) => typeof o3 === "string" ? { value: o3, label: o3 } : o3
      ),
      initialValue: opts.initial
    }).then(handleCancel);
  }
  if (opts.type === "multiselect") {
    return await fe({
      message,
      options: opts.options.map(
        (o3) => typeof o3 === "string" ? { value: o3, label: o3 } : o3
      ),
      required: opts.required,
      initialValues: opts.initial
    }).then(handleCancel);
  }
  throw new Error(`Unknown prompt type: ${opts.type}`);
}
var src, hasRequiredSrc, srcExports, picocolors, hasRequiredPicocolors, picocolorsExports, e, Q, P$1, X, DD, uD, FD, m, L$1, N, I, r, tD, eD, iD, v, CD, w$1, W$1, rD, R, y, V$1, z, ED, _, nD, oD, aD, c, S, AD, pD, h, x, fD, bD, mD, Y, wD, SD, $D, q, jD, PD, V, u, le, L, W, C, o, d, k, P, A, T, F, w, B, he, ye, ve, fe, kCancel;
var init_prompt = __esm({
  "node_modules/.pnpm/consola@3.4.2/node_modules/consola/dist/chunks/prompt.mjs"() {
    "use strict";
    srcExports = requireSrc();
    picocolors = { exports: {} };
    picocolorsExports = /* @__PURE__ */ requirePicocolors();
    e = /* @__PURE__ */ getDefaultExportFromCjs(picocolorsExports);
    Q = J();
    P$1 = { exports: {} };
    (function(t2) {
      var u3 = {};
      t2.exports = u3, u3.eastAsianWidth = function(e2) {
        var s2 = e2.charCodeAt(0), i2 = e2.length == 2 ? e2.charCodeAt(1) : 0, D2 = s2;
        return 55296 <= s2 && s2 <= 56319 && 56320 <= i2 && i2 <= 57343 && (s2 &= 1023, i2 &= 1023, D2 = s2 << 10 | i2, D2 += 65536), D2 == 12288 || 65281 <= D2 && D2 <= 65376 || 65504 <= D2 && D2 <= 65510 ? "F" : D2 == 8361 || 65377 <= D2 && D2 <= 65470 || 65474 <= D2 && D2 <= 65479 || 65482 <= D2 && D2 <= 65487 || 65490 <= D2 && D2 <= 65495 || 65498 <= D2 && D2 <= 65500 || 65512 <= D2 && D2 <= 65518 ? "H" : 4352 <= D2 && D2 <= 4447 || 4515 <= D2 && D2 <= 4519 || 4602 <= D2 && D2 <= 4607 || 9001 <= D2 && D2 <= 9002 || 11904 <= D2 && D2 <= 11929 || 11931 <= D2 && D2 <= 12019 || 12032 <= D2 && D2 <= 12245 || 12272 <= D2 && D2 <= 12283 || 12289 <= D2 && D2 <= 12350 || 12353 <= D2 && D2 <= 12438 || 12441 <= D2 && D2 <= 12543 || 12549 <= D2 && D2 <= 12589 || 12593 <= D2 && D2 <= 12686 || 12688 <= D2 && D2 <= 12730 || 12736 <= D2 && D2 <= 12771 || 12784 <= D2 && D2 <= 12830 || 12832 <= D2 && D2 <= 12871 || 12880 <= D2 && D2 <= 13054 || 13056 <= D2 && D2 <= 19903 || 19968 <= D2 && D2 <= 42124 || 42128 <= D2 && D2 <= 42182 || 43360 <= D2 && D2 <= 43388 || 44032 <= D2 && D2 <= 55203 || 55216 <= D2 && D2 <= 55238 || 55243 <= D2 && D2 <= 55291 || 63744 <= D2 && D2 <= 64255 || 65040 <= D2 && D2 <= 65049 || 65072 <= D2 && D2 <= 65106 || 65108 <= D2 && D2 <= 65126 || 65128 <= D2 && D2 <= 65131 || 110592 <= D2 && D2 <= 110593 || 127488 <= D2 && D2 <= 127490 || 127504 <= D2 && D2 <= 127546 || 127552 <= D2 && D2 <= 127560 || 127568 <= D2 && D2 <= 127569 || 131072 <= D2 && D2 <= 194367 || 177984 <= D2 && D2 <= 196605 || 196608 <= D2 && D2 <= 262141 ? "W" : 32 <= D2 && D2 <= 126 || 162 <= D2 && D2 <= 163 || 165 <= D2 && D2 <= 166 || D2 == 172 || D2 == 175 || 10214 <= D2 && D2 <= 10221 || 10629 <= D2 && D2 <= 10630 ? "Na" : D2 == 161 || D2 == 164 || 167 <= D2 && D2 <= 168 || D2 == 170 || 173 <= D2 && D2 <= 174 || 176 <= D2 && D2 <= 180 || 182 <= D2 && D2 <= 186 || 188 <= D2 && D2 <= 191 || D2 == 198 || D2 == 208 || 215 <= D2 && D2 <= 216 || 222 <= D2 && D2 <= 225 || D2 == 230 || 232 <= D2 && D2 <= 234 || 236 <= D2 && D2 <= 237 || D2 == 240 || 242 <= D2 && D2 <= 243 || 247 <= D2 && D2 <= 250 || D2 == 252 || D2 == 254 || D2 == 257 || D2 == 273 || D2 == 275 || D2 == 283 || 294 <= D2 && D2 <= 295 || D2 == 299 || 305 <= D2 && D2 <= 307 || D2 == 312 || 319 <= D2 && D2 <= 322 || D2 == 324 || 328 <= D2 && D2 <= 331 || D2 == 333 || 338 <= D2 && D2 <= 339 || 358 <= D2 && D2 <= 359 || D2 == 363 || D2 == 462 || D2 == 464 || D2 == 466 || D2 == 468 || D2 == 470 || D2 == 472 || D2 == 474 || D2 == 476 || D2 == 593 || D2 == 609 || D2 == 708 || D2 == 711 || 713 <= D2 && D2 <= 715 || D2 == 717 || D2 == 720 || 728 <= D2 && D2 <= 731 || D2 == 733 || D2 == 735 || 768 <= D2 && D2 <= 879 || 913 <= D2 && D2 <= 929 || 931 <= D2 && D2 <= 937 || 945 <= D2 && D2 <= 961 || 963 <= D2 && D2 <= 969 || D2 == 1025 || 1040 <= D2 && D2 <= 1103 || D2 == 1105 || D2 == 8208 || 8211 <= D2 && D2 <= 8214 || 8216 <= D2 && D2 <= 8217 || 8220 <= D2 && D2 <= 8221 || 8224 <= D2 && D2 <= 8226 || 8228 <= D2 && D2 <= 8231 || D2 == 8240 || 8242 <= D2 && D2 <= 8243 || D2 == 8245 || D2 == 8251 || D2 == 8254 || D2 == 8308 || D2 == 8319 || 8321 <= D2 && D2 <= 8324 || D2 == 8364 || D2 == 8451 || D2 == 8453 || D2 == 8457 || D2 == 8467 || D2 == 8470 || 8481 <= D2 && D2 <= 8482 || D2 == 8486 || D2 == 8491 || 8531 <= D2 && D2 <= 8532 || 8539 <= D2 && D2 <= 8542 || 8544 <= D2 && D2 <= 8555 || 8560 <= D2 && D2 <= 8569 || D2 == 8585 || 8592 <= D2 && D2 <= 8601 || 8632 <= D2 && D2 <= 8633 || D2 == 8658 || D2 == 8660 || D2 == 8679 || D2 == 8704 || 8706 <= D2 && D2 <= 8707 || 8711 <= D2 && D2 <= 8712 || D2 == 8715 || D2 == 8719 || D2 == 8721 || D2 == 8725 || D2 == 8730 || 8733 <= D2 && D2 <= 8736 || D2 == 8739 || D2 == 8741 || 8743 <= D2 && D2 <= 8748 || D2 == 8750 || 8756 <= D2 && D2 <= 8759 || 8764 <= D2 && D2 <= 8765 || D2 == 8776 || D2 == 8780 || D2 == 8786 || 8800 <= D2 && D2 <= 8801 || 8804 <= D2 && D2 <= 8807 || 8810 <= D2 && D2 <= 8811 || 8814 <= D2 && D2 <= 8815 || 8834 <= D2 && D2 <= 8835 || 8838 <= D2 && D2 <= 8839 || D2 == 8853 || D2 == 8857 || D2 == 8869 || D2 == 8895 || D2 == 8978 || 9312 <= D2 && D2 <= 9449 || 9451 <= D2 && D2 <= 9547 || 9552 <= D2 && D2 <= 9587 || 9600 <= D2 && D2 <= 9615 || 9618 <= D2 && D2 <= 9621 || 9632 <= D2 && D2 <= 9633 || 9635 <= D2 && D2 <= 9641 || 9650 <= D2 && D2 <= 9651 || 9654 <= D2 && D2 <= 9655 || 9660 <= D2 && D2 <= 9661 || 9664 <= D2 && D2 <= 9665 || 9670 <= D2 && D2 <= 9672 || D2 == 9675 || 9678 <= D2 && D2 <= 9681 || 9698 <= D2 && D2 <= 9701 || D2 == 9711 || 9733 <= D2 && D2 <= 9734 || D2 == 9737 || 9742 <= D2 && D2 <= 9743 || 9748 <= D2 && D2 <= 9749 || D2 == 9756 || D2 == 9758 || D2 == 9792 || D2 == 9794 || 9824 <= D2 && D2 <= 9825 || 9827 <= D2 && D2 <= 9829 || 9831 <= D2 && D2 <= 9834 || 9836 <= D2 && D2 <= 9837 || D2 == 9839 || 9886 <= D2 && D2 <= 9887 || 9918 <= D2 && D2 <= 9919 || 9924 <= D2 && D2 <= 9933 || 9935 <= D2 && D2 <= 9953 || D2 == 9955 || 9960 <= D2 && D2 <= 9983 || D2 == 10045 || D2 == 10071 || 10102 <= D2 && D2 <= 10111 || 11093 <= D2 && D2 <= 11097 || 12872 <= D2 && D2 <= 12879 || 57344 <= D2 && D2 <= 63743 || 65024 <= D2 && D2 <= 65039 || D2 == 65533 || 127232 <= D2 && D2 <= 127242 || 127248 <= D2 && D2 <= 127277 || 127280 <= D2 && D2 <= 127337 || 127344 <= D2 && D2 <= 127386 || 917760 <= D2 && D2 <= 917999 || 983040 <= D2 && D2 <= 1048573 || 1048576 <= D2 && D2 <= 1114109 ? "A" : "N";
      }, u3.characterLength = function(e2) {
        var s2 = this.eastAsianWidth(e2);
        return s2 == "F" || s2 == "W" || s2 == "A" ? 2 : 1;
      };
      function F3(e2) {
        return e2.match(/[\uD800-\uDBFF][\uDC00-\uDFFF]|[^\uD800-\uDFFF]/g) || [];
      }
      u3.length = function(e2) {
        for (var s2 = F3(e2), i2 = 0, D2 = 0; D2 < s2.length; D2++) i2 = i2 + this.characterLength(s2[D2]);
        return i2;
      }, u3.slice = function(e2, s2, i2) {
        textLen = u3.length(e2), s2 = s2 || 0, i2 = i2 || 1, s2 < 0 && (s2 = textLen + s2), i2 < 0 && (i2 = textLen + i2);
        for (var D2 = "", C3 = 0, o3 = F3(e2), E = 0; E < o3.length; E++) {
          var a2 = o3[E], n2 = u3.length(a2);
          if (C3 >= s2 - (n2 == 2 ? 1 : 0)) if (C3 + n2 <= i2) D2 += a2;
          else break;
          C3 += n2;
        }
        return D2;
      };
    })(P$1);
    X = P$1.exports;
    DD = O(X);
    uD = function() {
      return /\uD83C\uDFF4\uDB40\uDC67\uDB40\uDC62(?:\uDB40\uDC77\uDB40\uDC6C\uDB40\uDC73|\uDB40\uDC73\uDB40\uDC63\uDB40\uDC74|\uDB40\uDC65\uDB40\uDC6E\uDB40\uDC67)\uDB40\uDC7F|(?:\uD83E\uDDD1\uD83C\uDFFF\u200D\u2764\uFE0F\u200D(?:\uD83D\uDC8B\u200D)?\uD83E\uDDD1|\uD83D\uDC69\uD83C\uDFFF\u200D\uD83E\uDD1D\u200D(?:\uD83D[\uDC68\uDC69]))(?:\uD83C[\uDFFB-\uDFFE])|(?:\uD83E\uDDD1\uD83C\uDFFE\u200D\u2764\uFE0F\u200D(?:\uD83D\uDC8B\u200D)?\uD83E\uDDD1|\uD83D\uDC69\uD83C\uDFFE\u200D\uD83E\uDD1D\u200D(?:\uD83D[\uDC68\uDC69]))(?:\uD83C[\uDFFB-\uDFFD\uDFFF])|(?:\uD83E\uDDD1\uD83C\uDFFD\u200D\u2764\uFE0F\u200D(?:\uD83D\uDC8B\u200D)?\uD83E\uDDD1|\uD83D\uDC69\uD83C\uDFFD\u200D\uD83E\uDD1D\u200D(?:\uD83D[\uDC68\uDC69]))(?:\uD83C[\uDFFB\uDFFC\uDFFE\uDFFF])|(?:\uD83E\uDDD1\uD83C\uDFFC\u200D\u2764\uFE0F\u200D(?:\uD83D\uDC8B\u200D)?\uD83E\uDDD1|\uD83D\uDC69\uD83C\uDFFC\u200D\uD83E\uDD1D\u200D(?:\uD83D[\uDC68\uDC69]))(?:\uD83C[\uDFFB\uDFFD-\uDFFF])|(?:\uD83E\uDDD1\uD83C\uDFFB\u200D\u2764\uFE0F\u200D(?:\uD83D\uDC8B\u200D)?\uD83E\uDDD1|\uD83D\uDC69\uD83C\uDFFB\u200D\uD83E\uDD1D\u200D(?:\uD83D[\uDC68\uDC69]))(?:\uD83C[\uDFFC-\uDFFF])|\uD83D\uDC68(?:\uD83C\uDFFB(?:\u200D(?:\u2764\uFE0F\u200D(?:\uD83D\uDC8B\u200D\uD83D\uDC68(?:\uD83C[\uDFFB-\uDFFF])|\uD83D\uDC68(?:\uD83C[\uDFFB-\uDFFF]))|\uD83E\uDD1D\u200D\uD83D\uDC68(?:\uD83C[\uDFFC-\uDFFF])|[\u2695\u2696\u2708]\uFE0F|\uD83C[\uDF3E\uDF73\uDF7C\uDF93\uDFA4\uDFA8\uDFEB\uDFED]|\uD83D[\uDCBB\uDCBC\uDD27\uDD2C\uDE80\uDE92]|\uD83E[\uDDAF-\uDDB3\uDDBC\uDDBD]))?|(?:\uD83C[\uDFFC-\uDFFF])\u200D\u2764\uFE0F\u200D(?:\uD83D\uDC8B\u200D\uD83D\uDC68(?:\uD83C[\uDFFB-\uDFFF])|\uD83D\uDC68(?:\uD83C[\uDFFB-\uDFFF]))|\u200D(?:\u2764\uFE0F\u200D(?:\uD83D\uDC8B\u200D)?\uD83D\uDC68|(?:\uD83D[\uDC68\uDC69])\u200D(?:\uD83D\uDC66\u200D\uD83D\uDC66|\uD83D\uDC67\u200D(?:\uD83D[\uDC66\uDC67]))|\uD83D\uDC66\u200D\uD83D\uDC66|\uD83D\uDC67\u200D(?:\uD83D[\uDC66\uDC67])|\uD83C[\uDF3E\uDF73\uDF7C\uDF93\uDFA4\uDFA8\uDFEB\uDFED]|\uD83D[\uDCBB\uDCBC\uDD27\uDD2C\uDE80\uDE92]|\uD83E[\uDDAF-\uDDB3\uDDBC\uDDBD])|\uD83C\uDFFF\u200D(?:\uD83E\uDD1D\u200D\uD83D\uDC68(?:\uD83C[\uDFFB-\uDFFE])|\uD83C[\uDF3E\uDF73\uDF7C\uDF93\uDFA4\uDFA8\uDFEB\uDFED]|\uD83D[\uDCBB\uDCBC\uDD27\uDD2C\uDE80\uDE92]|\uD83E[\uDDAF-\uDDB3\uDDBC\uDDBD])|\uD83C\uDFFE\u200D(?:\uD83E\uDD1D\u200D\uD83D\uDC68(?:\uD83C[\uDFFB-\uDFFD\uDFFF])|\uD83C[\uDF3E\uDF73\uDF7C\uDF93\uDFA4\uDFA8\uDFEB\uDFED]|\uD83D[\uDCBB\uDCBC\uDD27\uDD2C\uDE80\uDE92]|\uD83E[\uDDAF-\uDDB3\uDDBC\uDDBD])|\uD83C\uDFFD\u200D(?:\uD83E\uDD1D\u200D\uD83D\uDC68(?:\uD83C[\uDFFB\uDFFC\uDFFE\uDFFF])|\uD83C[\uDF3E\uDF73\uDF7C\uDF93\uDFA4\uDFA8\uDFEB\uDFED]|\uD83D[\uDCBB\uDCBC\uDD27\uDD2C\uDE80\uDE92]|\uD83E[\uDDAF-\uDDB3\uDDBC\uDDBD])|\uD83C\uDFFC\u200D(?:\uD83E\uDD1D\u200D\uD83D\uDC68(?:\uD83C[\uDFFB\uDFFD-\uDFFF])|\uD83C[\uDF3E\uDF73\uDF7C\uDF93\uDFA4\uDFA8\uDFEB\uDFED]|\uD83D[\uDCBB\uDCBC\uDD27\uDD2C\uDE80\uDE92]|\uD83E[\uDDAF-\uDDB3\uDDBC\uDDBD])|(?:\uD83C\uDFFF\u200D[\u2695\u2696\u2708]|\uD83C\uDFFE\u200D[\u2695\u2696\u2708]|\uD83C\uDFFD\u200D[\u2695\u2696\u2708]|\uD83C\uDFFC\u200D[\u2695\u2696\u2708]|\u200D[\u2695\u2696\u2708])\uFE0F|\u200D(?:(?:\uD83D[\uDC68\uDC69])\u200D(?:\uD83D[\uDC66\uDC67])|\uD83D[\uDC66\uDC67])|\uD83C\uDFFF|\uD83C\uDFFE|\uD83C\uDFFD|\uD83C\uDFFC)?|(?:\uD83D\uDC69(?:\uD83C\uDFFB\u200D\u2764\uFE0F\u200D(?:\uD83D\uDC8B\u200D(?:\uD83D[\uDC68\uDC69])|\uD83D[\uDC68\uDC69])|(?:\uD83C[\uDFFC-\uDFFF])\u200D\u2764\uFE0F\u200D(?:\uD83D\uDC8B\u200D(?:\uD83D[\uDC68\uDC69])|\uD83D[\uDC68\uDC69]))|\uD83E\uDDD1(?:\uD83C[\uDFFB-\uDFFF])\u200D\uD83E\uDD1D\u200D\uD83E\uDDD1)(?:\uD83C[\uDFFB-\uDFFF])|\uD83D\uDC69\u200D\uD83D\uDC69\u200D(?:\uD83D\uDC66\u200D\uD83D\uDC66|\uD83D\uDC67\u200D(?:\uD83D[\uDC66\uDC67]))|\uD83D\uDC69(?:\u200D(?:\u2764\uFE0F\u200D(?:\uD83D\uDC8B\u200D(?:\uD83D[\uDC68\uDC69])|\uD83D[\uDC68\uDC69])|\uD83C[\uDF3E\uDF73\uDF7C\uDF93\uDFA4\uDFA8\uDFEB\uDFED]|\uD83D[\uDCBB\uDCBC\uDD27\uDD2C\uDE80\uDE92]|\uD83E[\uDDAF-\uDDB3\uDDBC\uDDBD])|\uD83C\uDFFF\u200D(?:\uD83C[\uDF3E\uDF73\uDF7C\uDF93\uDFA4\uDFA8\uDFEB\uDFED]|\uD83D[\uDCBB\uDCBC\uDD27\uDD2C\uDE80\uDE92]|\uD83E[\uDDAF-\uDDB3\uDDBC\uDDBD])|\uD83C\uDFFE\u200D(?:\uD83C[\uDF3E\uDF73\uDF7C\uDF93\uDFA4\uDFA8\uDFEB\uDFED]|\uD83D[\uDCBB\uDCBC\uDD27\uDD2C\uDE80\uDE92]|\uD83E[\uDDAF-\uDDB3\uDDBC\uDDBD])|\uD83C\uDFFD\u200D(?:\uD83C[\uDF3E\uDF73\uDF7C\uDF93\uDFA4\uDFA8\uDFEB\uDFED]|\uD83D[\uDCBB\uDCBC\uDD27\uDD2C\uDE80\uDE92]|\uD83E[\uDDAF-\uDDB3\uDDBC\uDDBD])|\uD83C\uDFFC\u200D(?:\uD83C[\uDF3E\uDF73\uDF7C\uDF93\uDFA4\uDFA8\uDFEB\uDFED]|\uD83D[\uDCBB\uDCBC\uDD27\uDD2C\uDE80\uDE92]|\uD83E[\uDDAF-\uDDB3\uDDBC\uDDBD])|\uD83C\uDFFB\u200D(?:\uD83C[\uDF3E\uDF73\uDF7C\uDF93\uDFA4\uDFA8\uDFEB\uDFED]|\uD83D[\uDCBB\uDCBC\uDD27\uDD2C\uDE80\uDE92]|\uD83E[\uDDAF-\uDDB3\uDDBC\uDDBD]))|\uD83E\uDDD1(?:\u200D(?:\uD83E\uDD1D\u200D\uD83E\uDDD1|\uD83C[\uDF3E\uDF73\uDF7C\uDF84\uDF93\uDFA4\uDFA8\uDFEB\uDFED]|\uD83D[\uDCBB\uDCBC\uDD27\uDD2C\uDE80\uDE92]|\uD83E[\uDDAF-\uDDB3\uDDBC\uDDBD])|\uD83C\uDFFF\u200D(?:\uD83C[\uDF3E\uDF73\uDF7C\uDF84\uDF93\uDFA4\uDFA8\uDFEB\uDFED]|\uD83D[\uDCBB\uDCBC\uDD27\uDD2C\uDE80\uDE92]|\uD83E[\uDDAF-\uDDB3\uDDBC\uDDBD])|\uD83C\uDFFE\u200D(?:\uD83C[\uDF3E\uDF73\uDF7C\uDF84\uDF93\uDFA4\uDFA8\uDFEB\uDFED]|\uD83D[\uDCBB\uDCBC\uDD27\uDD2C\uDE80\uDE92]|\uD83E[\uDDAF-\uDDB3\uDDBC\uDDBD])|\uD83C\uDFFD\u200D(?:\uD83C[\uDF3E\uDF73\uDF7C\uDF84\uDF93\uDFA4\uDFA8\uDFEB\uDFED]|\uD83D[\uDCBB\uDCBC\uDD27\uDD2C\uDE80\uDE92]|\uD83E[\uDDAF-\uDDB3\uDDBC\uDDBD])|\uD83C\uDFFC\u200D(?:\uD83C[\uDF3E\uDF73\uDF7C\uDF84\uDF93\uDFA4\uDFA8\uDFEB\uDFED]|\uD83D[\uDCBB\uDCBC\uDD27\uDD2C\uDE80\uDE92]|\uD83E[\uDDAF-\uDDB3\uDDBC\uDDBD])|\uD83C\uDFFB\u200D(?:\uD83C[\uDF3E\uDF73\uDF7C\uDF84\uDF93\uDFA4\uDFA8\uDFEB\uDFED]|\uD83D[\uDCBB\uDCBC\uDD27\uDD2C\uDE80\uDE92]|\uD83E[\uDDAF-\uDDB3\uDDBC\uDDBD]))|\uD83D\uDC69\u200D\uD83D\uDC66\u200D\uD83D\uDC66|\uD83D\uDC69\u200D\uD83D\uDC69\u200D(?:\uD83D[\uDC66\uDC67])|\uD83D\uDC69\u200D\uD83D\uDC67\u200D(?:\uD83D[\uDC66\uDC67])|(?:\uD83D\uDC41\uFE0F\u200D\uD83D\uDDE8|\uD83E\uDDD1(?:\uD83C\uDFFF\u200D[\u2695\u2696\u2708]|\uD83C\uDFFE\u200D[\u2695\u2696\u2708]|\uD83C\uDFFD\u200D[\u2695\u2696\u2708]|\uD83C\uDFFC\u200D[\u2695\u2696\u2708]|\uD83C\uDFFB\u200D[\u2695\u2696\u2708]|\u200D[\u2695\u2696\u2708])|\uD83D\uDC69(?:\uD83C\uDFFF\u200D[\u2695\u2696\u2708]|\uD83C\uDFFE\u200D[\u2695\u2696\u2708]|\uD83C\uDFFD\u200D[\u2695\u2696\u2708]|\uD83C\uDFFC\u200D[\u2695\u2696\u2708]|\uD83C\uDFFB\u200D[\u2695\u2696\u2708]|\u200D[\u2695\u2696\u2708])|\uD83D\uDE36\u200D\uD83C\uDF2B|\uD83C\uDFF3\uFE0F\u200D\u26A7|\uD83D\uDC3B\u200D\u2744|(?:(?:\uD83C[\uDFC3\uDFC4\uDFCA]|\uD83D[\uDC6E\uDC70\uDC71\uDC73\uDC77\uDC81\uDC82\uDC86\uDC87\uDE45-\uDE47\uDE4B\uDE4D\uDE4E\uDEA3\uDEB4-\uDEB6]|\uD83E[\uDD26\uDD35\uDD37-\uDD39\uDD3D\uDD3E\uDDB8\uDDB9\uDDCD-\uDDCF\uDDD4\uDDD6-\uDDDD])(?:\uD83C[\uDFFB-\uDFFF])|\uD83D\uDC6F|\uD83E[\uDD3C\uDDDE\uDDDF])\u200D[\u2640\u2642]|(?:\u26F9|\uD83C[\uDFCB\uDFCC]|\uD83D\uDD75)(?:\uFE0F|\uD83C[\uDFFB-\uDFFF])\u200D[\u2640\u2642]|\uD83C\uDFF4\u200D\u2620|(?:\uD83C[\uDFC3\uDFC4\uDFCA]|\uD83D[\uDC6E\uDC70\uDC71\uDC73\uDC77\uDC81\uDC82\uDC86\uDC87\uDE45-\uDE47\uDE4B\uDE4D\uDE4E\uDEA3\uDEB4-\uDEB6]|\uD83E[\uDD26\uDD35\uDD37-\uDD39\uDD3D\uDD3E\uDDB8\uDDB9\uDDCD-\uDDCF\uDDD4\uDDD6-\uDDDD])\u200D[\u2640\u2642]|[\xA9\xAE\u203C\u2049\u2122\u2139\u2194-\u2199\u21A9\u21AA\u2328\u23CF\u23ED-\u23EF\u23F1\u23F2\u23F8-\u23FA\u24C2\u25AA\u25AB\u25B6\u25C0\u25FB\u25FC\u2600-\u2604\u260E\u2611\u2618\u2620\u2622\u2623\u2626\u262A\u262E\u262F\u2638-\u263A\u2640\u2642\u265F\u2660\u2663\u2665\u2666\u2668\u267B\u267E\u2692\u2694-\u2697\u2699\u269B\u269C\u26A0\u26A7\u26B0\u26B1\u26C8\u26CF\u26D1\u26D3\u26E9\u26F0\u26F1\u26F4\u26F7\u26F8\u2702\u2708\u2709\u270F\u2712\u2714\u2716\u271D\u2721\u2733\u2734\u2744\u2747\u2763\u27A1\u2934\u2935\u2B05-\u2B07\u3030\u303D\u3297\u3299]|\uD83C[\uDD70\uDD71\uDD7E\uDD7F\uDE02\uDE37\uDF21\uDF24-\uDF2C\uDF36\uDF7D\uDF96\uDF97\uDF99-\uDF9B\uDF9E\uDF9F\uDFCD\uDFCE\uDFD4-\uDFDF\uDFF5\uDFF7]|\uD83D[\uDC3F\uDCFD\uDD49\uDD4A\uDD6F\uDD70\uDD73\uDD76-\uDD79\uDD87\uDD8A-\uDD8D\uDDA5\uDDA8\uDDB1\uDDB2\uDDBC\uDDC2-\uDDC4\uDDD1-\uDDD3\uDDDC-\uDDDE\uDDE1\uDDE3\uDDE8\uDDEF\uDDF3\uDDFA\uDECB\uDECD-\uDECF\uDEE0-\uDEE5\uDEE9\uDEF0\uDEF3])\uFE0F|\uD83C\uDFF3\uFE0F\u200D\uD83C\uDF08|\uD83D\uDC69\u200D\uD83D\uDC67|\uD83D\uDC69\u200D\uD83D\uDC66|\uD83D\uDE35\u200D\uD83D\uDCAB|\uD83D\uDE2E\u200D\uD83D\uDCA8|\uD83D\uDC15\u200D\uD83E\uDDBA|\uD83E\uDDD1(?:\uD83C\uDFFF|\uD83C\uDFFE|\uD83C\uDFFD|\uD83C\uDFFC|\uD83C\uDFFB)?|\uD83D\uDC69(?:\uD83C\uDFFF|\uD83C\uDFFE|\uD83C\uDFFD|\uD83C\uDFFC|\uD83C\uDFFB)?|\uD83C\uDDFD\uD83C\uDDF0|\uD83C\uDDF6\uD83C\uDDE6|\uD83C\uDDF4\uD83C\uDDF2|\uD83D\uDC08\u200D\u2B1B|\u2764\uFE0F\u200D(?:\uD83D\uDD25|\uD83E\uDE79)|\uD83D\uDC41\uFE0F|\uD83C\uDFF3\uFE0F|\uD83C\uDDFF(?:\uD83C[\uDDE6\uDDF2\uDDFC])|\uD83C\uDDFE(?:\uD83C[\uDDEA\uDDF9])|\uD83C\uDDFC(?:\uD83C[\uDDEB\uDDF8])|\uD83C\uDDFB(?:\uD83C[\uDDE6\uDDE8\uDDEA\uDDEC\uDDEE\uDDF3\uDDFA])|\uD83C\uDDFA(?:\uD83C[\uDDE6\uDDEC\uDDF2\uDDF3\uDDF8\uDDFE\uDDFF])|\uD83C\uDDF9(?:\uD83C[\uDDE6\uDDE8\uDDE9\uDDEB-\uDDED\uDDEF-\uDDF4\uDDF7\uDDF9\uDDFB\uDDFC\uDDFF])|\uD83C\uDDF8(?:\uD83C[\uDDE6-\uDDEA\uDDEC-\uDDF4\uDDF7-\uDDF9\uDDFB\uDDFD-\uDDFF])|\uD83C\uDDF7(?:\uD83C[\uDDEA\uDDF4\uDDF8\uDDFA\uDDFC])|\uD83C\uDDF5(?:\uD83C[\uDDE6\uDDEA-\uDDED\uDDF0-\uDDF3\uDDF7-\uDDF9\uDDFC\uDDFE])|\uD83C\uDDF3(?:\uD83C[\uDDE6\uDDE8\uDDEA-\uDDEC\uDDEE\uDDF1\uDDF4\uDDF5\uDDF7\uDDFA\uDDFF])|\uD83C\uDDF2(?:\uD83C[\uDDE6\uDDE8-\uDDED\uDDF0-\uDDFF])|\uD83C\uDDF1(?:\uD83C[\uDDE6-\uDDE8\uDDEE\uDDF0\uDDF7-\uDDFB\uDDFE])|\uD83C\uDDF0(?:\uD83C[\uDDEA\uDDEC-\uDDEE\uDDF2\uDDF3\uDDF5\uDDF7\uDDFC\uDDFE\uDDFF])|\uD83C\uDDEF(?:\uD83C[\uDDEA\uDDF2\uDDF4\uDDF5])|\uD83C\uDDEE(?:\uD83C[\uDDE8-\uDDEA\uDDF1-\uDDF4\uDDF6-\uDDF9])|\uD83C\uDDED(?:\uD83C[\uDDF0\uDDF2\uDDF3\uDDF7\uDDF9\uDDFA])|\uD83C\uDDEC(?:\uD83C[\uDDE6\uDDE7\uDDE9-\uDDEE\uDDF1-\uDDF3\uDDF5-\uDDFA\uDDFC\uDDFE])|\uD83C\uDDEB(?:\uD83C[\uDDEE-\uDDF0\uDDF2\uDDF4\uDDF7])|\uD83C\uDDEA(?:\uD83C[\uDDE6\uDDE8\uDDEA\uDDEC\uDDED\uDDF7-\uDDFA])|\uD83C\uDDE9(?:\uD83C[\uDDEA\uDDEC\uDDEF\uDDF0\uDDF2\uDDF4\uDDFF])|\uD83C\uDDE8(?:\uD83C[\uDDE6\uDDE8\uDDE9\uDDEB-\uDDEE\uDDF0-\uDDF5\uDDF7\uDDFA-\uDDFF])|\uD83C\uDDE7(?:\uD83C[\uDDE6\uDDE7\uDDE9-\uDDEF\uDDF1-\uDDF4\uDDF6-\uDDF9\uDDFB\uDDFC\uDDFE\uDDFF])|\uD83C\uDDE6(?:\uD83C[\uDDE8-\uDDEC\uDDEE\uDDF1\uDDF2\uDDF4\uDDF6-\uDDFA\uDDFC\uDDFD\uDDFF])|[#\*0-9]\uFE0F\u20E3|\u2764\uFE0F|(?:\uD83C[\uDFC3\uDFC4\uDFCA]|\uD83D[\uDC6E\uDC70\uDC71\uDC73\uDC77\uDC81\uDC82\uDC86\uDC87\uDE45-\uDE47\uDE4B\uDE4D\uDE4E\uDEA3\uDEB4-\uDEB6]|\uD83E[\uDD26\uDD35\uDD37-\uDD39\uDD3D\uDD3E\uDDB8\uDDB9\uDDCD-\uDDCF\uDDD4\uDDD6-\uDDDD])(?:\uD83C[\uDFFB-\uDFFF])|(?:\u26F9|\uD83C[\uDFCB\uDFCC]|\uD83D\uDD75)(?:\uFE0F|\uD83C[\uDFFB-\uDFFF])|\uD83C\uDFF4|(?:[\u270A\u270B]|\uD83C[\uDF85\uDFC2\uDFC7]|\uD83D[\uDC42\uDC43\uDC46-\uDC50\uDC66\uDC67\uDC6B-\uDC6D\uDC72\uDC74-\uDC76\uDC78\uDC7C\uDC83\uDC85\uDC8F\uDC91\uDCAA\uDD7A\uDD95\uDD96\uDE4C\uDE4F\uDEC0\uDECC]|\uD83E[\uDD0C\uDD0F\uDD18-\uDD1C\uDD1E\uDD1F\uDD30-\uDD34\uDD36\uDD77\uDDB5\uDDB6\uDDBB\uDDD2\uDDD3\uDDD5])(?:\uD83C[\uDFFB-\uDFFF])|(?:[\u261D\u270C\u270D]|\uD83D[\uDD74\uDD90])(?:\uFE0F|\uD83C[\uDFFB-\uDFFF])|[\u270A\u270B]|\uD83C[\uDF85\uDFC2\uDFC7]|\uD83D[\uDC08\uDC15\uDC3B\uDC42\uDC43\uDC46-\uDC50\uDC66\uDC67\uDC6B-\uDC6D\uDC72\uDC74-\uDC76\uDC78\uDC7C\uDC83\uDC85\uDC8F\uDC91\uDCAA\uDD7A\uDD95\uDD96\uDE2E\uDE35\uDE36\uDE4C\uDE4F\uDEC0\uDECC]|\uD83E[\uDD0C\uDD0F\uDD18-\uDD1C\uDD1E\uDD1F\uDD30-\uDD34\uDD36\uDD77\uDDB5\uDDB6\uDDBB\uDDD2\uDDD3\uDDD5]|\uD83C[\uDFC3\uDFC4\uDFCA]|\uD83D[\uDC6E\uDC70\uDC71\uDC73\uDC77\uDC81\uDC82\uDC86\uDC87\uDE45-\uDE47\uDE4B\uDE4D\uDE4E\uDEA3\uDEB4-\uDEB6]|\uD83E[\uDD26\uDD35\uDD37-\uDD39\uDD3D\uDD3E\uDDB8\uDDB9\uDDCD-\uDDCF\uDDD4\uDDD6-\uDDDD]|\uD83D\uDC6F|\uD83E[\uDD3C\uDDDE\uDDDF]|[\u231A\u231B\u23E9-\u23EC\u23F0\u23F3\u25FD\u25FE\u2614\u2615\u2648-\u2653\u267F\u2693\u26A1\u26AA\u26AB\u26BD\u26BE\u26C4\u26C5\u26CE\u26D4\u26EA\u26F2\u26F3\u26F5\u26FA\u26FD\u2705\u2728\u274C\u274E\u2753-\u2755\u2757\u2795-\u2797\u27B0\u27BF\u2B1B\u2B1C\u2B50\u2B55]|\uD83C[\uDC04\uDCCF\uDD8E\uDD91-\uDD9A\uDE01\uDE1A\uDE2F\uDE32-\uDE36\uDE38-\uDE3A\uDE50\uDE51\uDF00-\uDF20\uDF2D-\uDF35\uDF37-\uDF7C\uDF7E-\uDF84\uDF86-\uDF93\uDFA0-\uDFC1\uDFC5\uDFC6\uDFC8\uDFC9\uDFCF-\uDFD3\uDFE0-\uDFF0\uDFF8-\uDFFF]|\uD83D[\uDC00-\uDC07\uDC09-\uDC14\uDC16-\uDC3A\uDC3C-\uDC3E\uDC40\uDC44\uDC45\uDC51-\uDC65\uDC6A\uDC79-\uDC7B\uDC7D-\uDC80\uDC84\uDC88-\uDC8E\uDC90\uDC92-\uDCA9\uDCAB-\uDCFC\uDCFF-\uDD3D\uDD4B-\uDD4E\uDD50-\uDD67\uDDA4\uDDFB-\uDE2D\uDE2F-\uDE34\uDE37-\uDE44\uDE48-\uDE4A\uDE80-\uDEA2\uDEA4-\uDEB3\uDEB7-\uDEBF\uDEC1-\uDEC5\uDED0-\uDED2\uDED5-\uDED7\uDEEB\uDEEC\uDEF4-\uDEFC\uDFE0-\uDFEB]|\uD83E[\uDD0D\uDD0E\uDD10-\uDD17\uDD1D\uDD20-\uDD25\uDD27-\uDD2F\uDD3A\uDD3F-\uDD45\uDD47-\uDD76\uDD78\uDD7A-\uDDB4\uDDB7\uDDBA\uDDBC-\uDDCB\uDDD0\uDDE0-\uDDFF\uDE70-\uDE74\uDE78-\uDE7A\uDE80-\uDE86\uDE90-\uDEA8\uDEB0-\uDEB6\uDEC0-\uDEC2\uDED0-\uDED6]|(?:[\u231A\u231B\u23E9-\u23EC\u23F0\u23F3\u25FD\u25FE\u2614\u2615\u2648-\u2653\u267F\u2693\u26A1\u26AA\u26AB\u26BD\u26BE\u26C4\u26C5\u26CE\u26D4\u26EA\u26F2\u26F3\u26F5\u26FA\u26FD\u2705\u270A\u270B\u2728\u274C\u274E\u2753-\u2755\u2757\u2795-\u2797\u27B0\u27BF\u2B1B\u2B1C\u2B50\u2B55]|\uD83C[\uDC04\uDCCF\uDD8E\uDD91-\uDD9A\uDDE6-\uDDFF\uDE01\uDE1A\uDE2F\uDE32-\uDE36\uDE38-\uDE3A\uDE50\uDE51\uDF00-\uDF20\uDF2D-\uDF35\uDF37-\uDF7C\uDF7E-\uDF93\uDFA0-\uDFCA\uDFCF-\uDFD3\uDFE0-\uDFF0\uDFF4\uDFF8-\uDFFF]|\uD83D[\uDC00-\uDC3E\uDC40\uDC42-\uDCFC\uDCFF-\uDD3D\uDD4B-\uDD4E\uDD50-\uDD67\uDD7A\uDD95\uDD96\uDDA4\uDDFB-\uDE4F\uDE80-\uDEC5\uDECC\uDED0-\uDED2\uDED5-\uDED7\uDEEB\uDEEC\uDEF4-\uDEFC\uDFE0-\uDFEB]|\uD83E[\uDD0C-\uDD3A\uDD3C-\uDD45\uDD47-\uDD78\uDD7A-\uDDCB\uDDCD-\uDDFF\uDE70-\uDE74\uDE78-\uDE7A\uDE80-\uDE86\uDE90-\uDEA8\uDEB0-\uDEB6\uDEC0-\uDEC2\uDED0-\uDED6])|(?:[#\*0-9\xA9\xAE\u203C\u2049\u2122\u2139\u2194-\u2199\u21A9\u21AA\u231A\u231B\u2328\u23CF\u23E9-\u23F3\u23F8-\u23FA\u24C2\u25AA\u25AB\u25B6\u25C0\u25FB-\u25FE\u2600-\u2604\u260E\u2611\u2614\u2615\u2618\u261D\u2620\u2622\u2623\u2626\u262A\u262E\u262F\u2638-\u263A\u2640\u2642\u2648-\u2653\u265F\u2660\u2663\u2665\u2666\u2668\u267B\u267E\u267F\u2692-\u2697\u2699\u269B\u269C\u26A0\u26A1\u26A7\u26AA\u26AB\u26B0\u26B1\u26BD\u26BE\u26C4\u26C5\u26C8\u26CE\u26CF\u26D1\u26D3\u26D4\u26E9\u26EA\u26F0-\u26F5\u26F7-\u26FA\u26FD\u2702\u2705\u2708-\u270D\u270F\u2712\u2714\u2716\u271D\u2721\u2728\u2733\u2734\u2744\u2747\u274C\u274E\u2753-\u2755\u2757\u2763\u2764\u2795-\u2797\u27A1\u27B0\u27BF\u2934\u2935\u2B05-\u2B07\u2B1B\u2B1C\u2B50\u2B55\u3030\u303D\u3297\u3299]|\uD83C[\uDC04\uDCCF\uDD70\uDD71\uDD7E\uDD7F\uDD8E\uDD91-\uDD9A\uDDE6-\uDDFF\uDE01\uDE02\uDE1A\uDE2F\uDE32-\uDE3A\uDE50\uDE51\uDF00-\uDF21\uDF24-\uDF93\uDF96\uDF97\uDF99-\uDF9B\uDF9E-\uDFF0\uDFF3-\uDFF5\uDFF7-\uDFFF]|\uD83D[\uDC00-\uDCFD\uDCFF-\uDD3D\uDD49-\uDD4E\uDD50-\uDD67\uDD6F\uDD70\uDD73-\uDD7A\uDD87\uDD8A-\uDD8D\uDD90\uDD95\uDD96\uDDA4\uDDA5\uDDA8\uDDB1\uDDB2\uDDBC\uDDC2-\uDDC4\uDDD1-\uDDD3\uDDDC-\uDDDE\uDDE1\uDDE3\uDDE8\uDDEF\uDDF3\uDDFA-\uDE4F\uDE80-\uDEC5\uDECB-\uDED2\uDED5-\uDED7\uDEE0-\uDEE5\uDEE9\uDEEB\uDEEC\uDEF0\uDEF3-\uDEFC\uDFE0-\uDFEB]|\uD83E[\uDD0C-\uDD3A\uDD3C-\uDD45\uDD47-\uDD78\uDD7A-\uDDCB\uDDCD-\uDDFF\uDE70-\uDE74\uDE78-\uDE7A\uDE80-\uDE86\uDE90-\uDEA8\uDEB0-\uDEB6\uDEC0-\uDEC2\uDED0-\uDED6])\uFE0F|(?:[\u261D\u26F9\u270A-\u270D]|\uD83C[\uDF85\uDFC2-\uDFC4\uDFC7\uDFCA-\uDFCC]|\uD83D[\uDC42\uDC43\uDC46-\uDC50\uDC66-\uDC78\uDC7C\uDC81-\uDC83\uDC85-\uDC87\uDC8F\uDC91\uDCAA\uDD74\uDD75\uDD7A\uDD90\uDD95\uDD96\uDE45-\uDE47\uDE4B-\uDE4F\uDEA3\uDEB4-\uDEB6\uDEC0\uDECC]|\uD83E[\uDD0C\uDD0F\uDD18-\uDD1F\uDD26\uDD30-\uDD39\uDD3C-\uDD3E\uDD77\uDDB5\uDDB6\uDDB8\uDDB9\uDDBB\uDDCD-\uDDCF\uDDD1-\uDDDD])/g;
    };
    FD = O(uD);
    m = 10;
    L$1 = (t2 = 0) => (u3) => `\x1B[${u3 + t2}m`;
    N = (t2 = 0) => (u3) => `\x1B[${38 + t2};5;${u3}m`;
    I = (t2 = 0) => (u3, F3, e2) => `\x1B[${38 + t2};2;${u3};${F3};${e2}m`;
    r = { modifier: { reset: [0, 0], bold: [1, 22], dim: [2, 22], italic: [3, 23], underline: [4, 24], overline: [53, 55], inverse: [7, 27], hidden: [8, 28], strikethrough: [9, 29] }, color: { black: [30, 39], red: [31, 39], green: [32, 39], yellow: [33, 39], blue: [34, 39], magenta: [35, 39], cyan: [36, 39], white: [37, 39], blackBright: [90, 39], gray: [90, 39], grey: [90, 39], redBright: [91, 39], greenBright: [92, 39], yellowBright: [93, 39], blueBright: [94, 39], magentaBright: [95, 39], cyanBright: [96, 39], whiteBright: [97, 39] }, bgColor: { bgBlack: [40, 49], bgRed: [41, 49], bgGreen: [42, 49], bgYellow: [43, 49], bgBlue: [44, 49], bgMagenta: [45, 49], bgCyan: [46, 49], bgWhite: [47, 49], bgBlackBright: [100, 49], bgGray: [100, 49], bgGrey: [100, 49], bgRedBright: [101, 49], bgGreenBright: [102, 49], bgYellowBright: [103, 49], bgBlueBright: [104, 49], bgMagentaBright: [105, 49], bgCyanBright: [106, 49], bgWhiteBright: [107, 49] } };
    Object.keys(r.modifier);
    tD = Object.keys(r.color);
    eD = Object.keys(r.bgColor);
    [...tD, ...eD];
    iD = sD();
    v = /* @__PURE__ */ new Set(["\x1B", "\x9B"]);
    CD = 39;
    w$1 = "\x07";
    W$1 = "[";
    rD = "]";
    R = "m";
    y = `${rD}8;;`;
    V$1 = (t2) => `${v.values().next().value}${W$1}${t2}${R}`;
    z = (t2) => `${v.values().next().value}${y}${t2}${w$1}`;
    ED = (t2) => t2.split(" ").map((u3) => A$1(u3));
    _ = (t2, u3, F3) => {
      const e2 = [...u3];
      let s2 = false, i2 = false, D2 = A$1(T$1(t2[t2.length - 1]));
      for (const [C3, o3] of e2.entries()) {
        const E = A$1(o3);
        if (D2 + E <= F3 ? t2[t2.length - 1] += o3 : (t2.push(o3), D2 = 0), v.has(o3) && (s2 = true, i2 = e2.slice(C3 + 1).join("").startsWith(y)), s2) {
          i2 ? o3 === w$1 && (s2 = false, i2 = false) : o3 === R && (s2 = false);
          continue;
        }
        D2 += E, D2 === F3 && C3 < e2.length - 1 && (t2.push(""), D2 = 0);
      }
      !D2 && t2[t2.length - 1].length > 0 && t2.length > 1 && (t2[t2.length - 2] += t2.pop());
    };
    nD = (t2) => {
      const u3 = t2.split(" ");
      let F3 = u3.length;
      for (; F3 > 0 && !(A$1(u3[F3 - 1]) > 0); ) F3--;
      return F3 === u3.length ? t2 : u3.slice(0, F3).join(" ") + u3.slice(F3).join("");
    };
    oD = (t2, u3, F3 = {}) => {
      if (F3.trim !== false && t2.trim() === "") return "";
      let e2 = "", s2, i2;
      const D2 = ED(t2);
      let C3 = [""];
      for (const [E, a2] of t2.split(" ").entries()) {
        F3.trim !== false && (C3[C3.length - 1] = C3[C3.length - 1].trimStart());
        let n2 = A$1(C3[C3.length - 1]);
        if (E !== 0 && (n2 >= u3 && (F3.wordWrap === false || F3.trim === false) && (C3.push(""), n2 = 0), (n2 > 0 || F3.trim === false) && (C3[C3.length - 1] += " ", n2++)), F3.hard && D2[E] > u3) {
          const B2 = u3 - n2, p = 1 + Math.floor((D2[E] - B2 - 1) / u3);
          Math.floor((D2[E] - 1) / u3) < p && C3.push(""), _(C3, a2, u3);
          continue;
        }
        if (n2 + D2[E] > u3 && n2 > 0 && D2[E] > 0) {
          if (F3.wordWrap === false && n2 < u3) {
            _(C3, a2, u3);
            continue;
          }
          C3.push("");
        }
        if (n2 + D2[E] > u3 && F3.wordWrap === false) {
          _(C3, a2, u3);
          continue;
        }
        C3[C3.length - 1] += a2;
      }
      F3.trim !== false && (C3 = C3.map((E) => nD(E)));
      const o3 = [...C3.join(`
`)];
      for (const [E, a2] of o3.entries()) {
        if (e2 += a2, v.has(a2)) {
          const { groups: B2 } = new RegExp(`(?:\\${W$1}(?<code>\\d+)m|\\${y}(?<uri>.*)${w$1})`).exec(o3.slice(E).join("")) || { groups: {} };
          if (B2.code !== void 0) {
            const p = Number.parseFloat(B2.code);
            s2 = p === CD ? void 0 : p;
          } else B2.uri !== void 0 && (i2 = B2.uri.length === 0 ? void 0 : B2.uri);
        }
        const n2 = iD.codes.get(Number(s2));
        o3[E + 1] === `
` ? (i2 && (e2 += z("")), s2 && n2 && (e2 += V$1(n2))) : a2 === `
` && (s2 && n2 && (e2 += V$1(s2)), i2 && (e2 += z(i2)));
      }
      return e2;
    };
    aD = ["up", "down", "left", "right", "space", "enter", "cancel"];
    c = { actions: new Set(aD), aliases: /* @__PURE__ */ new Map([["k", "up"], ["j", "down"], ["h", "left"], ["l", "right"], ["", "cancel"], ["escape", "cancel"]]) };
    globalThis.process.platform.startsWith("win");
    S = /* @__PURE__ */ Symbol("clack:cancel");
    AD = Object.defineProperty;
    pD = (t2, u3, F3) => u3 in t2 ? AD(t2, u3, { enumerable: true, configurable: true, writable: true, value: F3 }) : t2[u3] = F3;
    h = (t2, u3, F3) => (pD(t2, typeof u3 != "symbol" ? u3 + "" : u3, F3), F3);
    x = class {
      constructor(u3, F3 = true) {
        h(this, "input"), h(this, "output"), h(this, "_abortSignal"), h(this, "rl"), h(this, "opts"), h(this, "_render"), h(this, "_track", false), h(this, "_prevFrame", ""), h(this, "_subscribers", /* @__PURE__ */ new Map()), h(this, "_cursor", 0), h(this, "state", "initial"), h(this, "error", ""), h(this, "value");
        const { input: e2 = stdin, output: s2 = stdout, render: i2, signal: D2, ...C3 } = u3;
        this.opts = C3, this.onKeypress = this.onKeypress.bind(this), this.close = this.close.bind(this), this.render = this.render.bind(this), this._render = i2.bind(this), this._track = F3, this._abortSignal = D2, this.input = e2, this.output = s2;
      }
      unsubscribe() {
        this._subscribers.clear();
      }
      setSubscriber(u3, F3) {
        const e2 = this._subscribers.get(u3) ?? [];
        e2.push(F3), this._subscribers.set(u3, e2);
      }
      on(u3, F3) {
        this.setSubscriber(u3, { cb: F3 });
      }
      once(u3, F3) {
        this.setSubscriber(u3, { cb: F3, once: true });
      }
      emit(u3, ...F3) {
        const e2 = this._subscribers.get(u3) ?? [], s2 = [];
        for (const i2 of e2) i2.cb(...F3), i2.once && s2.push(() => e2.splice(e2.indexOf(i2), 1));
        for (const i2 of s2) i2();
      }
      prompt() {
        return new Promise((u3, F3) => {
          if (this._abortSignal) {
            if (this._abortSignal.aborted) return this.state = "cancel", this.close(), u3(S);
            this._abortSignal.addEventListener("abort", () => {
              this.state = "cancel", this.close();
            }, { once: true });
          }
          const e2 = new WriteStream(0);
          e2._write = (s2, i2, D2) => {
            this._track && (this.value = this.rl?.line.replace(/\t/g, ""), this._cursor = this.rl?.cursor ?? 0, this.emit("value", this.value)), D2();
          }, this.input.pipe(e2), this.rl = f.createInterface({ input: this.input, output: e2, tabSize: 2, prompt: "", escapeCodeTimeout: 50 }), f.emitKeypressEvents(this.input, this.rl), this.rl.prompt(), this.opts.initialValue !== void 0 && this._track && this.rl.write(this.opts.initialValue), this.input.on("keypress", this.onKeypress), d$1(this.input, true), this.output.on("resize", this.render), this.render(), this.once("submit", () => {
            this.output.write(srcExports.cursor.show), this.output.off("resize", this.render), d$1(this.input, false), u3(this.value);
          }), this.once("cancel", () => {
            this.output.write(srcExports.cursor.show), this.output.off("resize", this.render), d$1(this.input, false), u3(S);
          });
        });
      }
      onKeypress(u3, F3) {
        if (this.state === "error" && (this.state = "active"), F3?.name && (!this._track && c.aliases.has(F3.name) && this.emit("cursor", c.aliases.get(F3.name)), c.actions.has(F3.name) && this.emit("cursor", F3.name)), u3 && (u3.toLowerCase() === "y" || u3.toLowerCase() === "n") && this.emit("confirm", u3.toLowerCase() === "y"), u3 === "	" && this.opts.placeholder && (this.value || (this.rl?.write(this.opts.placeholder), this.emit("value", this.opts.placeholder))), u3 && this.emit("key", u3.toLowerCase()), F3?.name === "return") {
          if (this.opts.validate) {
            const e2 = this.opts.validate(this.value);
            e2 && (this.error = e2 instanceof Error ? e2.message : e2, this.state = "error", this.rl?.write(this.value));
          }
          this.state !== "error" && (this.state = "submit");
        }
        k$1([u3, F3?.name, F3?.sequence], "cancel") && (this.state = "cancel"), (this.state === "submit" || this.state === "cancel") && this.emit("finalize"), this.render(), (this.state === "submit" || this.state === "cancel") && this.close();
      }
      close() {
        this.input.unpipe(), this.input.removeListener("keypress", this.onKeypress), this.output.write(`
`), d$1(this.input, false), this.rl?.close(), this.rl = void 0, this.emit(`${this.state}`, this.value), this.unsubscribe();
      }
      restoreCursor() {
        const u3 = G(this._prevFrame, process.stdout.columns, { hard: true }).split(`
`).length - 1;
        this.output.write(srcExports.cursor.move(-999, u3 * -1));
      }
      render() {
        const u3 = G(this._render(this) ?? "", process.stdout.columns, { hard: true });
        if (u3 !== this._prevFrame) {
          if (this.state === "initial") this.output.write(srcExports.cursor.hide);
          else {
            const F3 = lD(this._prevFrame, u3);
            if (this.restoreCursor(), F3 && F3?.length === 1) {
              const e2 = F3[0];
              this.output.write(srcExports.cursor.move(0, e2)), this.output.write(srcExports.erase.lines(1));
              const s2 = u3.split(`
`);
              this.output.write(s2[e2]), this._prevFrame = u3, this.output.write(srcExports.cursor.move(0, s2.length - e2 - 1));
              return;
            }
            if (F3 && F3?.length > 1) {
              const e2 = F3[0];
              this.output.write(srcExports.cursor.move(0, e2)), this.output.write(srcExports.erase.down());
              const s2 = u3.split(`
`).slice(e2);
              this.output.write(s2.join(`
`)), this._prevFrame = u3;
              return;
            }
            this.output.write(srcExports.erase.down());
          }
          this.output.write(u3), this.state === "initial" && (this.state = "active"), this._prevFrame = u3;
        }
      }
    };
    fD = class extends x {
      get cursor() {
        return this.value ? 0 : 1;
      }
      get _value() {
        return this.cursor === 0;
      }
      constructor(u3) {
        super(u3, false), this.value = !!u3.initialValue, this.on("value", () => {
          this.value = this._value;
        }), this.on("confirm", (F3) => {
          this.output.write(srcExports.cursor.move(0, -1)), this.value = F3, this.state = "submit", this.close();
        }), this.on("cursor", () => {
          this.value = !this.value;
        });
      }
    };
    bD = Object.defineProperty;
    mD = (t2, u3, F3) => u3 in t2 ? bD(t2, u3, { enumerable: true, configurable: true, writable: true, value: F3 }) : t2[u3] = F3;
    Y = (t2, u3, F3) => (mD(t2, typeof u3 != "symbol" ? u3 + "" : u3, F3), F3);
    wD = class extends x {
      constructor(u3) {
        super(u3, false), Y(this, "options"), Y(this, "cursor", 0), this.options = u3.options, this.value = [...u3.initialValues ?? []], this.cursor = Math.max(this.options.findIndex(({ value: F3 }) => F3 === u3.cursorAt), 0), this.on("key", (F3) => {
          F3 === "a" && this.toggleAll();
        }), this.on("cursor", (F3) => {
          switch (F3) {
            case "left":
            case "up":
              this.cursor = this.cursor === 0 ? this.options.length - 1 : this.cursor - 1;
              break;
            case "down":
            case "right":
              this.cursor = this.cursor === this.options.length - 1 ? 0 : this.cursor + 1;
              break;
            case "space":
              this.toggleValue();
              break;
          }
        });
      }
      get _value() {
        return this.options[this.cursor].value;
      }
      toggleAll() {
        const u3 = this.value.length === this.options.length;
        this.value = u3 ? [] : this.options.map((F3) => F3.value);
      }
      toggleValue() {
        const u3 = this.value.includes(this._value);
        this.value = u3 ? this.value.filter((F3) => F3 !== this._value) : [...this.value, this._value];
      }
    };
    SD = Object.defineProperty;
    $D = (t2, u3, F3) => u3 in t2 ? SD(t2, u3, { enumerable: true, configurable: true, writable: true, value: F3 }) : t2[u3] = F3;
    q = (t2, u3, F3) => ($D(t2, typeof u3 != "symbol" ? u3 + "" : u3, F3), F3);
    jD = class extends x {
      constructor(u3) {
        super(u3, false), q(this, "options"), q(this, "cursor", 0), this.options = u3.options, this.cursor = this.options.findIndex(({ value: F3 }) => F3 === u3.initialValue), this.cursor === -1 && (this.cursor = 0), this.changeValue(), this.on("cursor", (F3) => {
          switch (F3) {
            case "left":
            case "up":
              this.cursor = this.cursor === 0 ? this.options.length - 1 : this.cursor - 1;
              break;
            case "down":
            case "right":
              this.cursor = this.cursor === this.options.length - 1 ? 0 : this.cursor + 1;
              break;
          }
          this.changeValue();
        });
      }
      get _value() {
        return this.options[this.cursor];
      }
      changeValue() {
        this.value = this._value.value;
      }
    };
    PD = class extends x {
      get valueWithCursor() {
        if (this.state === "submit") return this.value;
        if (this.cursor >= this.value.length) return `${this.value}\u2588`;
        const u3 = this.value.slice(0, this.cursor), [F3, ...e$1] = this.value.slice(this.cursor);
        return `${u3}${e.inverse(F3)}${e$1.join("")}`;
      }
      get cursor() {
        return this._cursor;
      }
      constructor(u3) {
        super(u3), this.on("finalize", () => {
          this.value || (this.value = u3.defaultValue);
        });
      }
    };
    V = ce();
    u = (t2, n2) => V ? t2 : n2;
    le = u("\u276F", ">");
    L = u("\u25A0", "x");
    W = u("\u25B2", "x");
    C = u("\u2714", "\u221A");
    o = u("");
    d = u("");
    k = u("\u25CF", ">");
    P = u("\u25CB", " ");
    A = u("\u25FB", "[\u2022]");
    T = u("\u25FC", "[+]");
    F = u("\u25FB", "[ ]");
    w = (t2) => {
      switch (t2) {
        case "initial":
        case "active":
          return e.cyan(le);
        case "cancel":
          return e.red(L);
        case "error":
          return e.yellow(W);
        case "submit":
          return e.green(C);
      }
    };
    B = (t2) => {
      const { cursor: n2, options: s2, style: r3 } = t2, i2 = t2.maxItems ?? Number.POSITIVE_INFINITY, a2 = Math.max(process.stdout.rows - 4, 0), c3 = Math.min(a2, Math.max(i2, 5));
      let l2 = 0;
      n2 >= l2 + c3 - 3 ? l2 = Math.max(Math.min(n2 - c3 + 3, s2.length - c3), 0) : n2 < l2 + 2 && (l2 = Math.max(n2 - 2, 0));
      const $ = c3 < s2.length && l2 > 0, p = c3 < s2.length && l2 + c3 < s2.length;
      return s2.slice(l2, l2 + c3).map((M, v2, x2) => {
        const j = v2 === 0 && $, E = v2 === x2.length - 1 && p;
        return j || E ? e.dim("...") : r3(M, v2 + l2 === n2);
      });
    };
    he = (t2) => new PD({ validate: t2.validate, placeholder: t2.placeholder, defaultValue: t2.defaultValue, initialValue: t2.initialValue, render() {
      const n2 = `${e.gray(o)}
${w(this.state)} ${t2.message}
`, s2 = t2.placeholder ? e.inverse(t2.placeholder[0]) + e.dim(t2.placeholder.slice(1)) : e.inverse(e.hidden("_")), r3 = this.value ? this.valueWithCursor : s2;
      switch (this.state) {
        case "error":
          return `${n2.trim()}
${e.yellow(o)} ${r3}
${e.yellow(d)} ${e.yellow(this.error)}
`;
        case "submit":
          return `${n2}${e.gray(o)} ${e.dim(this.value || t2.placeholder)}`;
        case "cancel":
          return `${n2}${e.gray(o)} ${e.strikethrough(e.dim(this.value ?? ""))}${this.value?.trim() ? `
${e.gray(o)}` : ""}`;
        default:
          return `${n2}${e.cyan(o)} ${r3}
${e.cyan(d)}
`;
      }
    } }).prompt();
    ye = (t2) => {
      const n2 = t2.active ?? "Yes", s2 = t2.inactive ?? "No";
      return new fD({ active: n2, inactive: s2, initialValue: t2.initialValue ?? true, render() {
        const r3 = `${e.gray(o)}
${w(this.state)} ${t2.message}
`, i2 = this.value ? n2 : s2;
        switch (this.state) {
          case "submit":
            return `${r3}${e.gray(o)} ${e.dim(i2)}`;
          case "cancel":
            return `${r3}${e.gray(o)} ${e.strikethrough(e.dim(i2))}
${e.gray(o)}`;
          default:
            return `${r3}${e.cyan(o)} ${this.value ? `${e.green(k)} ${n2}` : `${e.dim(P)} ${e.dim(n2)}`} ${e.dim("/")} ${this.value ? `${e.dim(P)} ${e.dim(s2)}` : `${e.green(k)} ${s2}`}
${e.cyan(d)}
`;
        }
      } }).prompt();
    };
    ve = (t2) => {
      const n2 = (s2, r3) => {
        const i2 = s2.label ?? String(s2.value);
        switch (r3) {
          case "selected":
            return `${e.dim(i2)}`;
          case "active":
            return `${e.green(k)} ${i2} ${s2.hint ? e.dim(`(${s2.hint})`) : ""}`;
          case "cancelled":
            return `${e.strikethrough(e.dim(i2))}`;
          default:
            return `${e.dim(P)} ${e.dim(i2)}`;
        }
      };
      return new jD({ options: t2.options, initialValue: t2.initialValue, render() {
        const s2 = `${e.gray(o)}
${w(this.state)} ${t2.message}
`;
        switch (this.state) {
          case "submit":
            return `${s2}${e.gray(o)} ${n2(this.options[this.cursor], "selected")}`;
          case "cancel":
            return `${s2}${e.gray(o)} ${n2(this.options[this.cursor], "cancelled")}
${e.gray(o)}`;
          default:
            return `${s2}${e.cyan(o)} ${B({ cursor: this.cursor, options: this.options, maxItems: t2.maxItems, style: (r3, i2) => n2(r3, i2 ? "active" : "inactive") }).join(`
${e.cyan(o)}  `)}
${e.cyan(d)}
`;
        }
      } }).prompt();
    };
    fe = (t2) => {
      const n2 = (s2, r3) => {
        const i2 = s2.label ?? String(s2.value);
        return r3 === "active" ? `${e.cyan(A)} ${i2} ${s2.hint ? e.dim(`(${s2.hint})`) : ""}` : r3 === "selected" ? `${e.green(T)} ${e.dim(i2)}` : r3 === "cancelled" ? `${e.strikethrough(e.dim(i2))}` : r3 === "active-selected" ? `${e.green(T)} ${i2} ${s2.hint ? e.dim(`(${s2.hint})`) : ""}` : r3 === "submitted" ? `${e.dim(i2)}` : `${e.dim(F)} ${e.dim(i2)}`;
      };
      return new wD({ options: t2.options, initialValues: t2.initialValues, required: t2.required ?? true, cursorAt: t2.cursorAt, validate(s2) {
        if (this.required && s2.length === 0) return `Please select at least one option.
${e.reset(e.dim(`Press ${e.gray(e.bgWhite(e.inverse(" space ")))} to select, ${e.gray(e.bgWhite(e.inverse(" enter ")))} to submit`))}`;
      }, render() {
        const s2 = `${e.gray(o)}
${w(this.state)} ${t2.message}
`, r3 = (i2, a2) => {
          const c3 = this.value.includes(i2.value);
          return a2 && c3 ? n2(i2, "active-selected") : c3 ? n2(i2, "selected") : n2(i2, a2 ? "active" : "inactive");
        };
        switch (this.state) {
          case "submit":
            return `${s2}${e.gray(o)} ${this.options.filter(({ value: i2 }) => this.value.includes(i2)).map((i2) => n2(i2, "submitted")).join(e.dim(", ")) || e.dim("none")}`;
          case "cancel": {
            const i2 = this.options.filter(({ value: a2 }) => this.value.includes(a2)).map((a2) => n2(a2, "cancelled")).join(e.dim(", "));
            return `${s2}${e.gray(o)} ${i2.trim() ? `${i2}
${e.gray(o)}` : ""}`;
          }
          case "error": {
            const i2 = this.error.split(`
`).map((a2, c3) => c3 === 0 ? `${e.yellow(d)} ${e.yellow(a2)}` : `   ${a2}`).join(`
`);
            return `${s2 + e.yellow(o)} ${B({ options: this.options, cursor: this.cursor, maxItems: t2.maxItems, style: r3 }).join(`
${e.yellow(o)}  `)}
${i2}
`;
          }
          default:
            return `${s2}${e.cyan(o)} ${B({ options: this.options, cursor: this.cursor, maxItems: t2.maxItems, style: r3 }).join(`
${e.cyan(o)}  `)}
${e.cyan(d)}
`;
        }
      } }).prompt();
    };
    `${e.gray(o)}  `;
    kCancel = /* @__PURE__ */ Symbol.for("cancel");
  }
});

// libs/adapters/opencode/src/lib/lf-plugin.ts
import { readFileSync as readFileSync3 } from "node:fs";

// libs/cli/client/src/lib/api.ts
import { existsSync as existsSync2, readFileSync as readFileSync2 } from "node:fs";
import path from "node:path";

// node_modules/.pnpm/consola@3.4.2/node_modules/consola/dist/core.mjs
var LogLevels = {
  silent: Number.NEGATIVE_INFINITY,
  fatal: 0,
  error: 0,
  warn: 1,
  log: 2,
  info: 3,
  success: 3,
  fail: 3,
  ready: 3,
  start: 3,
  box: 3,
  debug: 4,
  trace: 5,
  verbose: Number.POSITIVE_INFINITY
};
var LogTypes = {
  // Silent
  silent: {
    level: -1
  },
  // Level 0
  fatal: {
    level: LogLevels.fatal
  },
  error: {
    level: LogLevels.error
  },
  // Level 1
  warn: {
    level: LogLevels.warn
  },
  // Level 2
  log: {
    level: LogLevels.log
  },
  // Level 3
  info: {
    level: LogLevels.info
  },
  success: {
    level: LogLevels.success
  },
  fail: {
    level: LogLevels.fail
  },
  ready: {
    level: LogLevels.info
  },
  start: {
    level: LogLevels.info
  },
  box: {
    level: LogLevels.info
  },
  // Level 4
  debug: {
    level: LogLevels.debug
  },
  // Level 5
  trace: {
    level: LogLevels.trace
  },
  // Verbose
  verbose: {
    level: LogLevels.verbose
  }
};
function isPlainObject$1(value) {
  if (value === null || typeof value !== "object") {
    return false;
  }
  const prototype = Object.getPrototypeOf(value);
  if (prototype !== null && prototype !== Object.prototype && Object.getPrototypeOf(prototype) !== null) {
    return false;
  }
  if (Symbol.iterator in value) {
    return false;
  }
  if (Symbol.toStringTag in value) {
    return Object.prototype.toString.call(value) === "[object Module]";
  }
  return true;
}
function _defu(baseObject, defaults, namespace = ".", merger) {
  if (!isPlainObject$1(defaults)) {
    return _defu(baseObject, {}, namespace, merger);
  }
  const object = Object.assign({}, defaults);
  for (const key in baseObject) {
    if (key === "__proto__" || key === "constructor") {
      continue;
    }
    const value = baseObject[key];
    if (value === null || value === void 0) {
      continue;
    }
    if (merger && merger(object, key, value, namespace)) {
      continue;
    }
    if (Array.isArray(value) && Array.isArray(object[key])) {
      object[key] = [...value, ...object[key]];
    } else if (isPlainObject$1(value) && isPlainObject$1(object[key])) {
      object[key] = _defu(
        value,
        object[key],
        (namespace ? `${namespace}.` : "") + key.toString(),
        merger
      );
    } else {
      object[key] = value;
    }
  }
  return object;
}
function createDefu(merger) {
  return (...arguments_) => (
    // eslint-disable-next-line unicorn/no-array-reduce
    arguments_.reduce((p, c3) => _defu(p, c3, "", merger), {})
  );
}
var defu = createDefu();
function isPlainObject(obj) {
  return Object.prototype.toString.call(obj) === "[object Object]";
}
function isLogObj(arg) {
  if (!isPlainObject(arg)) {
    return false;
  }
  if (!arg.message && !arg.args) {
    return false;
  }
  if (arg.stack) {
    return false;
  }
  return true;
}
var paused = false;
var queue = [];
var Consola = class _Consola {
  options;
  _lastLog;
  _mockFn;
  /**
   * Creates an instance of Consola with specified options or defaults.
   *
   * @param {Partial<ConsolaOptions>} [options={}] - Configuration options for the Consola instance.
   */
  constructor(options = {}) {
    const types = options.types || LogTypes;
    this.options = defu(
      {
        ...options,
        defaults: { ...options.defaults },
        level: _normalizeLogLevel(options.level, types),
        reporters: [...options.reporters || []]
      },
      {
        types: LogTypes,
        throttle: 1e3,
        throttleMin: 5,
        formatOptions: {
          date: true,
          colors: false,
          compact: true
        }
      }
    );
    for (const type in types) {
      const defaults = {
        type,
        ...this.options.defaults,
        ...types[type]
      };
      this[type] = this._wrapLogFn(defaults);
      this[type].raw = this._wrapLogFn(
        defaults,
        true
      );
    }
    if (this.options.mockFn) {
      this.mockTypes();
    }
    this._lastLog = {};
  }
  /**
   * Gets the current log level of the Consola instance.
   *
   * @returns {number} The current log level.
   */
  get level() {
    return this.options.level;
  }
  /**
   * Sets the minimum log level that will be output by the instance.
   *
   * @param {number} level - The new log level to set.
   */
  set level(level) {
    this.options.level = _normalizeLogLevel(
      level,
      this.options.types,
      this.options.level
    );
  }
  /**
   * Displays a prompt to the user and returns the response.
   * Throw an error if `prompt` is not supported by the current configuration.
   *
   * @template T
   * @param {string} message - The message to display in the prompt.
   * @param {T} [opts] - Optional options for the prompt. See {@link PromptOptions}.
   * @returns {promise<T>} A promise that infer with the prompt options. See {@link PromptOptions}.
   */
  prompt(message, opts) {
    if (!this.options.prompt) {
      throw new Error("prompt is not supported!");
    }
    return this.options.prompt(message, opts);
  }
  /**
   * Creates a new instance of Consola, inheriting options from the current instance, with possible overrides.
   *
   * @param {Partial<ConsolaOptions>} options - Optional overrides for the new instance. See {@link ConsolaOptions}.
   * @returns {ConsolaInstance} A new Consola instance. See {@link ConsolaInstance}.
   */
  create(options) {
    const instance = new _Consola({
      ...this.options,
      ...options
    });
    if (this._mockFn) {
      instance.mockTypes(this._mockFn);
    }
    return instance;
  }
  /**
   * Creates a new Consola instance with the specified default log object properties.
   *
   * @param {InputLogObject} defaults - Default properties to include in any log from the new instance. See {@link InputLogObject}.
   * @returns {ConsolaInstance} A new Consola instance. See {@link ConsolaInstance}.
   */
  withDefaults(defaults) {
    return this.create({
      ...this.options,
      defaults: {
        ...this.options.defaults,
        ...defaults
      }
    });
  }
  /**
   * Creates a new Consola instance with a specified tag, which will be included in every log.
   *
   * @param {string} tag - The tag to include in each log of the new instance.
   * @returns {ConsolaInstance} A new Consola instance. See {@link ConsolaInstance}.
   */
  withTag(tag) {
    return this.withDefaults({
      tag: this.options.defaults.tag ? this.options.defaults.tag + ":" + tag : tag
    });
  }
  /**
   * Adds a custom reporter to the Consola instance.
   * Reporters will be called for each log message, depending on their implementation and log level.
   *
   * @param {ConsolaReporter} reporter - The reporter to add. See {@link ConsolaReporter}.
   * @returns {Consola} The current Consola instance.
   */
  addReporter(reporter) {
    this.options.reporters.push(reporter);
    return this;
  }
  /**
   * Removes a custom reporter from the Consola instance.
   * If no reporter is specified, all reporters will be removed.
   *
   * @param {ConsolaReporter} reporter - The reporter to remove. See {@link ConsolaReporter}.
   * @returns {Consola} The current Consola instance.
   */
  removeReporter(reporter) {
    if (reporter) {
      const i2 = this.options.reporters.indexOf(reporter);
      if (i2 !== -1) {
        return this.options.reporters.splice(i2, 1);
      }
    } else {
      this.options.reporters.splice(0);
    }
    return this;
  }
  /**
   * Replaces all reporters of the Consola instance with the specified array of reporters.
   *
   * @param {ConsolaReporter[]} reporters - The new reporters to set. See {@link ConsolaReporter}.
   * @returns {Consola} The current Consola instance.
   */
  setReporters(reporters) {
    this.options.reporters = Array.isArray(reporters) ? reporters : [reporters];
    return this;
  }
  wrapAll() {
    this.wrapConsole();
    this.wrapStd();
  }
  restoreAll() {
    this.restoreConsole();
    this.restoreStd();
  }
  /**
   * Overrides console methods with Consola logging methods for consistent logging.
   */
  wrapConsole() {
    for (const type in this.options.types) {
      if (!console["__" + type]) {
        console["__" + type] = console[type];
      }
      console[type] = this[type].raw;
    }
  }
  /**
   * Restores the original console methods, removing Consola overrides.
   */
  restoreConsole() {
    for (const type in this.options.types) {
      if (console["__" + type]) {
        console[type] = console["__" + type];
        delete console["__" + type];
      }
    }
  }
  /**
   * Overrides standard output and error streams to redirect them through Consola.
   */
  wrapStd() {
    this._wrapStream(this.options.stdout, "log");
    this._wrapStream(this.options.stderr, "log");
  }
  _wrapStream(stream, type) {
    if (!stream) {
      return;
    }
    if (!stream.__write) {
      stream.__write = stream.write;
    }
    stream.write = (data) => {
      this[type].raw(String(data).trim());
    };
  }
  /**
   * Restores the original standard output and error streams, removing the Consola redirection.
   */
  restoreStd() {
    this._restoreStream(this.options.stdout);
    this._restoreStream(this.options.stderr);
  }
  _restoreStream(stream) {
    if (!stream) {
      return;
    }
    if (stream.__write) {
      stream.write = stream.__write;
      delete stream.__write;
    }
  }
  /**
   * Pauses logging, queues incoming logs until resumed.
   */
  pauseLogs() {
    paused = true;
  }
  /**
   * Resumes logging, processing any queued logs.
   */
  resumeLogs() {
    paused = false;
    const _queue = queue.splice(0);
    for (const item of _queue) {
      item[0]._logFn(item[1], item[2]);
    }
  }
  /**
   * Replaces logging methods with mocks if a mock function is provided.
   *
   * @param {ConsolaOptions["mockFn"]} mockFn - The function to use for mocking logging methods. See {@link ConsolaOptions["mockFn"]}.
   */
  mockTypes(mockFn) {
    const _mockFn = mockFn || this.options.mockFn;
    this._mockFn = _mockFn;
    if (typeof _mockFn !== "function") {
      return;
    }
    for (const type in this.options.types) {
      this[type] = _mockFn(type, this.options.types[type]) || this[type];
      this[type].raw = this[type];
    }
  }
  _wrapLogFn(defaults, isRaw) {
    return (...args) => {
      if (paused) {
        queue.push([this, defaults, args, isRaw]);
        return;
      }
      return this._logFn(defaults, args, isRaw);
    };
  }
  _logFn(defaults, args, isRaw) {
    if ((defaults.level || 0) > this.level) {
      return false;
    }
    const logObj = {
      date: /* @__PURE__ */ new Date(),
      args: [],
      ...defaults,
      level: _normalizeLogLevel(defaults.level, this.options.types)
    };
    if (!isRaw && args.length === 1 && isLogObj(args[0])) {
      Object.assign(logObj, args[0]);
    } else {
      logObj.args = [...args];
    }
    if (logObj.message) {
      logObj.args.unshift(logObj.message);
      delete logObj.message;
    }
    if (logObj.additional) {
      if (!Array.isArray(logObj.additional)) {
        logObj.additional = logObj.additional.split("\n");
      }
      logObj.args.push("\n" + logObj.additional.join("\n"));
      delete logObj.additional;
    }
    logObj.type = typeof logObj.type === "string" ? logObj.type.toLowerCase() : "log";
    logObj.tag = typeof logObj.tag === "string" ? logObj.tag : "";
    const resolveLog = (newLog = false) => {
      const repeated = (this._lastLog.count || 0) - this.options.throttleMin;
      if (this._lastLog.object && repeated > 0) {
        const args2 = [...this._lastLog.object.args];
        if (repeated > 1) {
          args2.push(`(repeated ${repeated} times)`);
        }
        this._log({ ...this._lastLog.object, args: args2 });
        this._lastLog.count = 1;
      }
      if (newLog) {
        this._lastLog.object = logObj;
        this._log(logObj);
      }
    };
    clearTimeout(this._lastLog.timeout);
    const diffTime = this._lastLog.time && logObj.date ? logObj.date.getTime() - this._lastLog.time.getTime() : 0;
    this._lastLog.time = logObj.date;
    if (diffTime < this.options.throttle) {
      try {
        const serializedLog = JSON.stringify([
          logObj.type,
          logObj.tag,
          logObj.args
        ]);
        const isSameLog = this._lastLog.serialized === serializedLog;
        this._lastLog.serialized = serializedLog;
        if (isSameLog) {
          this._lastLog.count = (this._lastLog.count || 0) + 1;
          if (this._lastLog.count > this.options.throttleMin) {
            this._lastLog.timeout = setTimeout(
              resolveLog,
              this.options.throttle
            );
            return;
          }
        }
      } catch {
      }
    }
    resolveLog(true);
  }
  _log(logObj) {
    for (const reporter of this.options.reporters) {
      reporter.log(logObj, {
        options: this.options
      });
    }
  }
};
function _normalizeLogLevel(input, types = {}, defaultLevel = 3) {
  if (input === void 0) {
    return defaultLevel;
  }
  if (typeof input === "number") {
    return input;
  }
  if (types[input] && types[input].level !== void 0) {
    return types[input].level;
  }
  return defaultLevel;
}
Consola.prototype.add = Consola.prototype.addReporter;
Consola.prototype.remove = Consola.prototype.removeReporter;
Consola.prototype.clear = Consola.prototype.removeReporter;
Consola.prototype.withScope = Consola.prototype.withTag;
Consola.prototype.mock = Consola.prototype.mockTypes;
Consola.prototype.pause = Consola.prototype.pauseLogs;
Consola.prototype.resume = Consola.prototype.resumeLogs;
function createConsola(options = {}) {
  return new Consola(options);
}

// node_modules/.pnpm/consola@3.4.2/node_modules/consola/dist/shared/consola.DRwqZj3T.mjs
import { formatWithOptions } from "node:util";
import { sep } from "node:path";
function parseStack(stack, message) {
  const cwd = process.cwd() + sep;
  const lines = stack.split("\n").splice(message.split("\n").length).map((l2) => l2.trim().replace("file://", "").replace(cwd, ""));
  return lines;
}
function writeStream(data, stream) {
  const write = stream.__write || stream.write;
  return write.call(stream, data);
}
var bracket = (x2) => x2 ? `[${x2}]` : "";
var BasicReporter = class {
  formatStack(stack, message, opts) {
    const indent = "  ".repeat((opts?.errorLevel || 0) + 1);
    return indent + parseStack(stack, message).join(`
${indent}`);
  }
  formatError(err, opts) {
    const message = err.message ?? formatWithOptions(opts, err);
    const stack = err.stack ? this.formatStack(err.stack, message, opts) : "";
    const level = opts?.errorLevel || 0;
    const causedPrefix = level > 0 ? `${"  ".repeat(level)}[cause]: ` : "";
    const causedError = err.cause ? "\n\n" + this.formatError(err.cause, { ...opts, errorLevel: level + 1 }) : "";
    return causedPrefix + message + "\n" + stack + causedError;
  }
  formatArgs(args, opts) {
    const _args = args.map((arg) => {
      if (arg && typeof arg.stack === "string") {
        return this.formatError(arg, opts);
      }
      return arg;
    });
    return formatWithOptions(opts, ..._args);
  }
  formatDate(date, opts) {
    return opts.date ? date.toLocaleTimeString() : "";
  }
  filterAndJoin(arr) {
    return arr.filter(Boolean).join(" ");
  }
  formatLogObj(logObj, opts) {
    const message = this.formatArgs(logObj.args, opts);
    if (logObj.type === "box") {
      return "\n" + [
        bracket(logObj.tag),
        logObj.title && logObj.title,
        ...message.split("\n")
      ].filter(Boolean).map((l2) => " > " + l2).join("\n") + "\n";
    }
    return this.filterAndJoin([
      bracket(logObj.type),
      bracket(logObj.tag),
      message
    ]);
  }
  log(logObj, ctx2) {
    const line = this.formatLogObj(logObj, {
      columns: ctx2.options.stdout.columns || 0,
      ...ctx2.options.formatOptions
    });
    return writeStream(
      line + "\n",
      logObj.level < 2 ? ctx2.options.stderr || process.stderr : ctx2.options.stdout || process.stdout
    );
  }
};

// node_modules/.pnpm/consola@3.4.2/node_modules/consola/dist/index.mjs
import g$1 from "node:process";

// node_modules/.pnpm/consola@3.4.2/node_modules/consola/dist/shared/consola.DXBYu-KD.mjs
import * as tty from "node:tty";
var {
  env = {},
  argv = [],
  platform = ""
} = typeof process === "undefined" ? {} : process;
var isDisabled = "NO_COLOR" in env || argv.includes("--no-color");
var isForced = "FORCE_COLOR" in env || argv.includes("--color");
var isWindows = platform === "win32";
var isDumbTerminal = env.TERM === "dumb";
var isCompatibleTerminal = tty && tty.isatty && tty.isatty(1) && env.TERM && !isDumbTerminal;
var isCI = "CI" in env && ("GITHUB_ACTIONS" in env || "GITLAB_CI" in env || "CIRCLECI" in env);
var isColorSupported = !isDisabled && (isForced || isWindows && !isDumbTerminal || isCompatibleTerminal || isCI);
function replaceClose(index, string, close, replace, head = string.slice(0, Math.max(0, index)) + replace, tail = string.slice(Math.max(0, index + close.length)), next = tail.indexOf(close)) {
  return head + (next < 0 ? tail : replaceClose(next, tail, close, replace));
}
function clearBleed(index, string, open, close, replace) {
  return index < 0 ? open + string + close : open + replaceClose(index, string, close, replace) + close;
}
function filterEmpty(open, close, replace = open, at = open.length + 1) {
  return (string) => string || !(string === "" || string === void 0) ? clearBleed(
    ("" + string).indexOf(close, at),
    string,
    open,
    close,
    replace
  ) : "";
}
function init(open, close, replace) {
  return filterEmpty(`\x1B[${open}m`, `\x1B[${close}m`, replace);
}
var colorDefs = {
  reset: init(0, 0),
  bold: init(1, 22, "\x1B[22m\x1B[1m"),
  dim: init(2, 22, "\x1B[22m\x1B[2m"),
  italic: init(3, 23),
  underline: init(4, 24),
  inverse: init(7, 27),
  hidden: init(8, 28),
  strikethrough: init(9, 29),
  black: init(30, 39),
  red: init(31, 39),
  green: init(32, 39),
  yellow: init(33, 39),
  blue: init(34, 39),
  magenta: init(35, 39),
  cyan: init(36, 39),
  white: init(37, 39),
  gray: init(90, 39),
  bgBlack: init(40, 49),
  bgRed: init(41, 49),
  bgGreen: init(42, 49),
  bgYellow: init(43, 49),
  bgBlue: init(44, 49),
  bgMagenta: init(45, 49),
  bgCyan: init(46, 49),
  bgWhite: init(47, 49),
  blackBright: init(90, 39),
  redBright: init(91, 39),
  greenBright: init(92, 39),
  yellowBright: init(93, 39),
  blueBright: init(94, 39),
  magentaBright: init(95, 39),
  cyanBright: init(96, 39),
  whiteBright: init(97, 39),
  bgBlackBright: init(100, 49),
  bgRedBright: init(101, 49),
  bgGreenBright: init(102, 49),
  bgYellowBright: init(103, 49),
  bgBlueBright: init(104, 49),
  bgMagentaBright: init(105, 49),
  bgCyanBright: init(106, 49),
  bgWhiteBright: init(107, 49)
};
function createColors(useColor = isColorSupported) {
  return useColor ? colorDefs : Object.fromEntries(Object.keys(colorDefs).map((key) => [key, String]));
}
var colors = createColors();
function getColor(color, fallback = "reset") {
  return colors[color] || colors[fallback];
}
var ansiRegex = [
  String.raw`[\u001B\u009B][[\]()#;?]*(?:(?:(?:(?:;[-a-zA-Z\d\/#&.:=?%@~_]+)*|[a-zA-Z\d]+(?:;[-a-zA-Z\d\/#&.:=?%@~_]*)*)?\u0007)`,
  String.raw`(?:(?:\d{1,4}(?:;\d{0,4})*)?[\dA-PR-TZcf-nq-uy=><~]))`
].join("|");
function stripAnsi(text) {
  return text.replace(new RegExp(ansiRegex, "g"), "");
}
var boxStylePresets = {
  solid: {
    tl: "\u250C",
    tr: "\u2510",
    bl: "\u2514",
    br: "\u2518",
    h: "\u2500",
    v: "\u2502"
  },
  double: {
    tl: "\u2554",
    tr: "\u2557",
    bl: "\u255A",
    br: "\u255D",
    h: "\u2550",
    v: "\u2551"
  },
  doubleSingle: {
    tl: "\u2553",
    tr: "\u2556",
    bl: "\u2559",
    br: "\u255C",
    h: "\u2500",
    v: "\u2551"
  },
  doubleSingleRounded: {
    tl: "\u256D",
    tr: "\u256E",
    bl: "\u2570",
    br: "\u256F",
    h: "\u2500",
    v: "\u2551"
  },
  singleThick: {
    tl: "\u250F",
    tr: "\u2513",
    bl: "\u2517",
    br: "\u251B",
    h: "\u2501",
    v: "\u2503"
  },
  singleDouble: {
    tl: "\u2552",
    tr: "\u2555",
    bl: "\u2558",
    br: "\u255B",
    h: "\u2550",
    v: "\u2502"
  },
  singleDoubleRounded: {
    tl: "\u256D",
    tr: "\u256E",
    bl: "\u2570",
    br: "\u256F",
    h: "\u2550",
    v: "\u2502"
  },
  rounded: {
    tl: "\u256D",
    tr: "\u256E",
    bl: "\u2570",
    br: "\u256F",
    h: "\u2500",
    v: "\u2502"
  }
};
var defaultStyle = {
  borderColor: "white",
  borderStyle: "rounded",
  valign: "center",
  padding: 2,
  marginLeft: 1,
  marginTop: 1,
  marginBottom: 1
};
function box(text, _opts = {}) {
  const opts = {
    ..._opts,
    style: {
      ...defaultStyle,
      ..._opts.style
    }
  };
  const textLines = text.split("\n");
  const boxLines = [];
  const _color = getColor(opts.style.borderColor);
  const borderStyle = {
    ...typeof opts.style.borderStyle === "string" ? boxStylePresets[opts.style.borderStyle] || boxStylePresets.solid : opts.style.borderStyle
  };
  if (_color) {
    for (const key in borderStyle) {
      borderStyle[key] = _color(
        borderStyle[key]
      );
    }
  }
  const paddingOffset = opts.style.padding % 2 === 0 ? opts.style.padding : opts.style.padding + 1;
  const height = textLines.length + paddingOffset;
  const width = Math.max(
    ...textLines.map((line) => stripAnsi(line).length),
    opts.title ? stripAnsi(opts.title).length : 0
  ) + paddingOffset;
  const widthOffset = width + paddingOffset;
  const leftSpace = opts.style.marginLeft > 0 ? " ".repeat(opts.style.marginLeft) : "";
  if (opts.style.marginTop > 0) {
    boxLines.push("".repeat(opts.style.marginTop));
  }
  if (opts.title) {
    const title = _color ? _color(opts.title) : opts.title;
    const left = borderStyle.h.repeat(
      Math.floor((width - stripAnsi(opts.title).length) / 2)
    );
    const right = borderStyle.h.repeat(
      width - stripAnsi(opts.title).length - stripAnsi(left).length + paddingOffset
    );
    boxLines.push(
      `${leftSpace}${borderStyle.tl}${left}${title}${right}${borderStyle.tr}`
    );
  } else {
    boxLines.push(
      `${leftSpace}${borderStyle.tl}${borderStyle.h.repeat(widthOffset)}${borderStyle.tr}`
    );
  }
  const valignOffset = opts.style.valign === "center" ? Math.floor((height - textLines.length) / 2) : opts.style.valign === "top" ? height - textLines.length - paddingOffset : height - textLines.length;
  for (let i2 = 0; i2 < height; i2++) {
    if (i2 < valignOffset || i2 >= valignOffset + textLines.length) {
      boxLines.push(
        `${leftSpace}${borderStyle.v}${" ".repeat(widthOffset)}${borderStyle.v}`
      );
    } else {
      const line = textLines[i2 - valignOffset];
      const left = " ".repeat(paddingOffset);
      const right = " ".repeat(width - stripAnsi(line).length);
      boxLines.push(
        `${leftSpace}${borderStyle.v}${left}${line}${right}${borderStyle.v}`
      );
    }
  }
  boxLines.push(
    `${leftSpace}${borderStyle.bl}${borderStyle.h.repeat(widthOffset)}${borderStyle.br}`
  );
  if (opts.style.marginBottom > 0) {
    boxLines.push("".repeat(opts.style.marginBottom));
  }
  return boxLines.join("\n");
}

// node_modules/.pnpm/consola@3.4.2/node_modules/consola/dist/index.mjs
var r2 = /* @__PURE__ */ Object.create(null);
var i = (e2) => globalThis.process?.env || import.meta.env || globalThis.Deno?.env.toObject() || globalThis.__env__ || (e2 ? r2 : globalThis);
var o2 = new Proxy(r2, { get(e2, s2) {
  return i()[s2] ?? r2[s2];
}, has(e2, s2) {
  const E = i();
  return s2 in E || s2 in r2;
}, set(e2, s2, E) {
  const B2 = i(true);
  return B2[s2] = E, true;
}, deleteProperty(e2, s2) {
  if (!s2) return false;
  const E = i(true);
  return delete E[s2], true;
}, ownKeys() {
  const e2 = i(true);
  return Object.keys(e2);
} });
var t = typeof process < "u" && process.env && process.env.NODE_ENV || "";
var f2 = [["APPVEYOR"], ["AWS_AMPLIFY", "AWS_APP_ID", { ci: true }], ["AZURE_PIPELINES", "SYSTEM_TEAMFOUNDATIONCOLLECTIONURI"], ["AZURE_STATIC", "INPUT_AZURE_STATIC_WEB_APPS_API_TOKEN"], ["APPCIRCLE", "AC_APPCIRCLE"], ["BAMBOO", "bamboo_planKey"], ["BITBUCKET", "BITBUCKET_COMMIT"], ["BITRISE", "BITRISE_IO"], ["BUDDY", "BUDDY_WORKSPACE_ID"], ["BUILDKITE"], ["CIRCLE", "CIRCLECI"], ["CIRRUS", "CIRRUS_CI"], ["CLOUDFLARE_PAGES", "CF_PAGES", { ci: true }], ["CODEBUILD", "CODEBUILD_BUILD_ARN"], ["CODEFRESH", "CF_BUILD_ID"], ["DRONE"], ["DRONE", "DRONE_BUILD_EVENT"], ["DSARI"], ["GITHUB_ACTIONS"], ["GITLAB", "GITLAB_CI"], ["GITLAB", "CI_MERGE_REQUEST_ID"], ["GOCD", "GO_PIPELINE_LABEL"], ["LAYERCI"], ["HUDSON", "HUDSON_URL"], ["JENKINS", "JENKINS_URL"], ["MAGNUM"], ["NETLIFY"], ["NETLIFY", "NETLIFY_LOCAL", { ci: false }], ["NEVERCODE"], ["RENDER"], ["SAIL", "SAILCI"], ["SEMAPHORE"], ["SCREWDRIVER"], ["SHIPPABLE"], ["SOLANO", "TDDIUM"], ["STRIDER"], ["TEAMCITY", "TEAMCITY_VERSION"], ["TRAVIS"], ["VERCEL", "NOW_BUILDER"], ["VERCEL", "VERCEL", { ci: false }], ["VERCEL", "VERCEL_ENV", { ci: false }], ["APPCENTER", "APPCENTER_BUILD_ID"], ["CODESANDBOX", "CODESANDBOX_SSE", { ci: false }], ["CODESANDBOX", "CODESANDBOX_HOST", { ci: false }], ["STACKBLITZ"], ["STORMKIT"], ["CLEAVR"], ["ZEABUR"], ["CODESPHERE", "CODESPHERE_APP_ID", { ci: true }], ["RAILWAY", "RAILWAY_PROJECT_ID"], ["RAILWAY", "RAILWAY_SERVICE_ID"], ["DENO-DEPLOY", "DENO_DEPLOYMENT_ID"], ["FIREBASE_APP_HOSTING", "FIREBASE_APP_HOSTING", { ci: true }]];
function b() {
  if (globalThis.process?.env) for (const e2 of f2) {
    const s2 = e2[1] || e2[0];
    if (globalThis.process?.env[s2]) return { name: e2[0].toLowerCase(), ...e2[2] };
  }
  return globalThis.process?.env?.SHELL === "/bin/jsh" && globalThis.process?.versions?.webcontainer ? { name: "stackblitz", ci: false } : { name: "", ci: false };
}
var l = b();
l.name;
function n(e2) {
  return e2 ? e2 !== "false" : false;
}
var I2 = globalThis.process?.platform || "";
var T2 = n(o2.CI) || l.ci !== false;
var a = n(globalThis.process?.stdout && globalThis.process?.stdout.isTTY);
var g2 = n(o2.DEBUG);
var R2 = t === "test" || n(o2.TEST);
n(o2.MINIMAL) || T2 || R2 || !a;
var A2 = /^win/i.test(I2);
!n(o2.NO_COLOR) && (n(o2.FORCE_COLOR) || (a || A2) && o2.TERM !== "dumb" || T2);
var C2 = (globalThis.process?.versions?.node || "").replace(/^v/, "") || null;
Number(C2?.split(".")[0]) || null;
var y2 = globalThis.process || /* @__PURE__ */ Object.create(null);
var _2 = { versions: {} };
new Proxy(y2, { get(e2, s2) {
  if (s2 === "env") return o2;
  if (s2 in e2) return e2[s2];
  if (s2 in _2) return _2[s2];
} });
var c2 = globalThis.process?.release?.name === "node";
var O2 = !!globalThis.Bun || !!globalThis.process?.versions?.bun;
var D = !!globalThis.Deno;
var L2 = !!globalThis.fastly;
var S2 = !!globalThis.Netlify;
var u2 = !!globalThis.EdgeRuntime;
var N2 = globalThis.navigator?.userAgent === "Cloudflare-Workers";
var F2 = [[S2, "netlify"], [u2, "edge-light"], [N2, "workerd"], [L2, "fastly"], [D, "deno"], [O2, "bun"], [c2, "node"]];
function G2() {
  const e2 = F2.find((s2) => s2[0]);
  if (e2) return { name: e2[1] };
}
var P2 = G2();
P2?.name || "";
function ansiRegex2({ onlyFirst = false } = {}) {
  const ST = "(?:\\u0007|\\u001B\\u005C|\\u009C)";
  const pattern = [
    `[\\u001B\\u009B][[\\]()#;?]*(?:(?:(?:(?:;[-a-zA-Z\\d\\/#&.:=?%@~_]+)*|[a-zA-Z\\d]+(?:;[-a-zA-Z\\d\\/#&.:=?%@~_]*)*)?${ST})`,
    "(?:(?:\\d{1,4}(?:;\\d{0,4})*)?[\\dA-PR-TZcf-nq-uy=><~]))"
  ].join("|");
  return new RegExp(pattern, onlyFirst ? void 0 : "g");
}
var regex = ansiRegex2();
function stripAnsi2(string) {
  if (typeof string !== "string") {
    throw new TypeError(`Expected a \`string\`, got \`${typeof string}\``);
  }
  return string.replace(regex, "");
}
function isAmbiguous(x2) {
  return x2 === 161 || x2 === 164 || x2 === 167 || x2 === 168 || x2 === 170 || x2 === 173 || x2 === 174 || x2 >= 176 && x2 <= 180 || x2 >= 182 && x2 <= 186 || x2 >= 188 && x2 <= 191 || x2 === 198 || x2 === 208 || x2 === 215 || x2 === 216 || x2 >= 222 && x2 <= 225 || x2 === 230 || x2 >= 232 && x2 <= 234 || x2 === 236 || x2 === 237 || x2 === 240 || x2 === 242 || x2 === 243 || x2 >= 247 && x2 <= 250 || x2 === 252 || x2 === 254 || x2 === 257 || x2 === 273 || x2 === 275 || x2 === 283 || x2 === 294 || x2 === 295 || x2 === 299 || x2 >= 305 && x2 <= 307 || x2 === 312 || x2 >= 319 && x2 <= 322 || x2 === 324 || x2 >= 328 && x2 <= 331 || x2 === 333 || x2 === 338 || x2 === 339 || x2 === 358 || x2 === 359 || x2 === 363 || x2 === 462 || x2 === 464 || x2 === 466 || x2 === 468 || x2 === 470 || x2 === 472 || x2 === 474 || x2 === 476 || x2 === 593 || x2 === 609 || x2 === 708 || x2 === 711 || x2 >= 713 && x2 <= 715 || x2 === 717 || x2 === 720 || x2 >= 728 && x2 <= 731 || x2 === 733 || x2 === 735 || x2 >= 768 && x2 <= 879 || x2 >= 913 && x2 <= 929 || x2 >= 931 && x2 <= 937 || x2 >= 945 && x2 <= 961 || x2 >= 963 && x2 <= 969 || x2 === 1025 || x2 >= 1040 && x2 <= 1103 || x2 === 1105 || x2 === 8208 || x2 >= 8211 && x2 <= 8214 || x2 === 8216 || x2 === 8217 || x2 === 8220 || x2 === 8221 || x2 >= 8224 && x2 <= 8226 || x2 >= 8228 && x2 <= 8231 || x2 === 8240 || x2 === 8242 || x2 === 8243 || x2 === 8245 || x2 === 8251 || x2 === 8254 || x2 === 8308 || x2 === 8319 || x2 >= 8321 && x2 <= 8324 || x2 === 8364 || x2 === 8451 || x2 === 8453 || x2 === 8457 || x2 === 8467 || x2 === 8470 || x2 === 8481 || x2 === 8482 || x2 === 8486 || x2 === 8491 || x2 === 8531 || x2 === 8532 || x2 >= 8539 && x2 <= 8542 || x2 >= 8544 && x2 <= 8555 || x2 >= 8560 && x2 <= 8569 || x2 === 8585 || x2 >= 8592 && x2 <= 8601 || x2 === 8632 || x2 === 8633 || x2 === 8658 || x2 === 8660 || x2 === 8679 || x2 === 8704 || x2 === 8706 || x2 === 8707 || x2 === 8711 || x2 === 8712 || x2 === 8715 || x2 === 8719 || x2 === 8721 || x2 === 8725 || x2 === 8730 || x2 >= 8733 && x2 <= 8736 || x2 === 8739 || x2 === 8741 || x2 >= 8743 && x2 <= 8748 || x2 === 8750 || x2 >= 8756 && x2 <= 8759 || x2 === 8764 || x2 === 8765 || x2 === 8776 || x2 === 8780 || x2 === 8786 || x2 === 8800 || x2 === 8801 || x2 >= 8804 && x2 <= 8807 || x2 === 8810 || x2 === 8811 || x2 === 8814 || x2 === 8815 || x2 === 8834 || x2 === 8835 || x2 === 8838 || x2 === 8839 || x2 === 8853 || x2 === 8857 || x2 === 8869 || x2 === 8895 || x2 === 8978 || x2 >= 9312 && x2 <= 9449 || x2 >= 9451 && x2 <= 9547 || x2 >= 9552 && x2 <= 9587 || x2 >= 9600 && x2 <= 9615 || x2 >= 9618 && x2 <= 9621 || x2 === 9632 || x2 === 9633 || x2 >= 9635 && x2 <= 9641 || x2 === 9650 || x2 === 9651 || x2 === 9654 || x2 === 9655 || x2 === 9660 || x2 === 9661 || x2 === 9664 || x2 === 9665 || x2 >= 9670 && x2 <= 9672 || x2 === 9675 || x2 >= 9678 && x2 <= 9681 || x2 >= 9698 && x2 <= 9701 || x2 === 9711 || x2 === 9733 || x2 === 9734 || x2 === 9737 || x2 === 9742 || x2 === 9743 || x2 === 9756 || x2 === 9758 || x2 === 9792 || x2 === 9794 || x2 === 9824 || x2 === 9825 || x2 >= 9827 && x2 <= 9829 || x2 >= 9831 && x2 <= 9834 || x2 === 9836 || x2 === 9837 || x2 === 9839 || x2 === 9886 || x2 === 9887 || x2 === 9919 || x2 >= 9926 && x2 <= 9933 || x2 >= 9935 && x2 <= 9939 || x2 >= 9941 && x2 <= 9953 || x2 === 9955 || x2 === 9960 || x2 === 9961 || x2 >= 9963 && x2 <= 9969 || x2 === 9972 || x2 >= 9974 && x2 <= 9977 || x2 === 9979 || x2 === 9980 || x2 === 9982 || x2 === 9983 || x2 === 10045 || x2 >= 10102 && x2 <= 10111 || x2 >= 11094 && x2 <= 11097 || x2 >= 12872 && x2 <= 12879 || x2 >= 57344 && x2 <= 63743 || x2 >= 65024 && x2 <= 65039 || x2 === 65533 || x2 >= 127232 && x2 <= 127242 || x2 >= 127248 && x2 <= 127277 || x2 >= 127280 && x2 <= 127337 || x2 >= 127344 && x2 <= 127373 || x2 === 127375 || x2 === 127376 || x2 >= 127387 && x2 <= 127404 || x2 >= 917760 && x2 <= 917999 || x2 >= 983040 && x2 <= 1048573 || x2 >= 1048576 && x2 <= 1114109;
}
function isFullWidth(x2) {
  return x2 === 12288 || x2 >= 65281 && x2 <= 65376 || x2 >= 65504 && x2 <= 65510;
}
function isWide(x2) {
  return x2 >= 4352 && x2 <= 4447 || x2 === 8986 || x2 === 8987 || x2 === 9001 || x2 === 9002 || x2 >= 9193 && x2 <= 9196 || x2 === 9200 || x2 === 9203 || x2 === 9725 || x2 === 9726 || x2 === 9748 || x2 === 9749 || x2 >= 9776 && x2 <= 9783 || x2 >= 9800 && x2 <= 9811 || x2 === 9855 || x2 >= 9866 && x2 <= 9871 || x2 === 9875 || x2 === 9889 || x2 === 9898 || x2 === 9899 || x2 === 9917 || x2 === 9918 || x2 === 9924 || x2 === 9925 || x2 === 9934 || x2 === 9940 || x2 === 9962 || x2 === 9970 || x2 === 9971 || x2 === 9973 || x2 === 9978 || x2 === 9981 || x2 === 9989 || x2 === 9994 || x2 === 9995 || x2 === 10024 || x2 === 10060 || x2 === 10062 || x2 >= 10067 && x2 <= 10069 || x2 === 10071 || x2 >= 10133 && x2 <= 10135 || x2 === 10160 || x2 === 10175 || x2 === 11035 || x2 === 11036 || x2 === 11088 || x2 === 11093 || x2 >= 11904 && x2 <= 11929 || x2 >= 11931 && x2 <= 12019 || x2 >= 12032 && x2 <= 12245 || x2 >= 12272 && x2 <= 12287 || x2 >= 12289 && x2 <= 12350 || x2 >= 12353 && x2 <= 12438 || x2 >= 12441 && x2 <= 12543 || x2 >= 12549 && x2 <= 12591 || x2 >= 12593 && x2 <= 12686 || x2 >= 12688 && x2 <= 12773 || x2 >= 12783 && x2 <= 12830 || x2 >= 12832 && x2 <= 12871 || x2 >= 12880 && x2 <= 42124 || x2 >= 42128 && x2 <= 42182 || x2 >= 43360 && x2 <= 43388 || x2 >= 44032 && x2 <= 55203 || x2 >= 63744 && x2 <= 64255 || x2 >= 65040 && x2 <= 65049 || x2 >= 65072 && x2 <= 65106 || x2 >= 65108 && x2 <= 65126 || x2 >= 65128 && x2 <= 65131 || x2 >= 94176 && x2 <= 94180 || x2 === 94192 || x2 === 94193 || x2 >= 94208 && x2 <= 100343 || x2 >= 100352 && x2 <= 101589 || x2 >= 101631 && x2 <= 101640 || x2 >= 110576 && x2 <= 110579 || x2 >= 110581 && x2 <= 110587 || x2 === 110589 || x2 === 110590 || x2 >= 110592 && x2 <= 110882 || x2 === 110898 || x2 >= 110928 && x2 <= 110930 || x2 === 110933 || x2 >= 110948 && x2 <= 110951 || x2 >= 110960 && x2 <= 111355 || x2 >= 119552 && x2 <= 119638 || x2 >= 119648 && x2 <= 119670 || x2 === 126980 || x2 === 127183 || x2 === 127374 || x2 >= 127377 && x2 <= 127386 || x2 >= 127488 && x2 <= 127490 || x2 >= 127504 && x2 <= 127547 || x2 >= 127552 && x2 <= 127560 || x2 === 127568 || x2 === 127569 || x2 >= 127584 && x2 <= 127589 || x2 >= 127744 && x2 <= 127776 || x2 >= 127789 && x2 <= 127797 || x2 >= 127799 && x2 <= 127868 || x2 >= 127870 && x2 <= 127891 || x2 >= 127904 && x2 <= 127946 || x2 >= 127951 && x2 <= 127955 || x2 >= 127968 && x2 <= 127984 || x2 === 127988 || x2 >= 127992 && x2 <= 128062 || x2 === 128064 || x2 >= 128066 && x2 <= 128252 || x2 >= 128255 && x2 <= 128317 || x2 >= 128331 && x2 <= 128334 || x2 >= 128336 && x2 <= 128359 || x2 === 128378 || x2 === 128405 || x2 === 128406 || x2 === 128420 || x2 >= 128507 && x2 <= 128591 || x2 >= 128640 && x2 <= 128709 || x2 === 128716 || x2 >= 128720 && x2 <= 128722 || x2 >= 128725 && x2 <= 128727 || x2 >= 128732 && x2 <= 128735 || x2 === 128747 || x2 === 128748 || x2 >= 128756 && x2 <= 128764 || x2 >= 128992 && x2 <= 129003 || x2 === 129008 || x2 >= 129292 && x2 <= 129338 || x2 >= 129340 && x2 <= 129349 || x2 >= 129351 && x2 <= 129535 || x2 >= 129648 && x2 <= 129660 || x2 >= 129664 && x2 <= 129673 || x2 >= 129679 && x2 <= 129734 || x2 >= 129742 && x2 <= 129756 || x2 >= 129759 && x2 <= 129769 || x2 >= 129776 && x2 <= 129784 || x2 >= 131072 && x2 <= 196605 || x2 >= 196608 && x2 <= 262141;
}
function validate(codePoint) {
  if (!Number.isSafeInteger(codePoint)) {
    throw new TypeError(`Expected a code point, got \`${typeof codePoint}\`.`);
  }
}
function eastAsianWidth(codePoint, { ambiguousAsWide = false } = {}) {
  validate(codePoint);
  if (isFullWidth(codePoint) || isWide(codePoint) || ambiguousAsWide && isAmbiguous(codePoint)) {
    return 2;
  }
  return 1;
}
var emojiRegex = () => {
  return /[#*0-9]\uFE0F?\u20E3|[\xA9\xAE\u203C\u2049\u2122\u2139\u2194-\u2199\u21A9\u21AA\u231A\u231B\u2328\u23CF\u23ED-\u23EF\u23F1\u23F2\u23F8-\u23FA\u24C2\u25AA\u25AB\u25B6\u25C0\u25FB\u25FC\u25FE\u2600-\u2604\u260E\u2611\u2614\u2615\u2618\u2620\u2622\u2623\u2626\u262A\u262E\u262F\u2638-\u263A\u2640\u2642\u2648-\u2653\u265F\u2660\u2663\u2665\u2666\u2668\u267B\u267E\u267F\u2692\u2694-\u2697\u2699\u269B\u269C\u26A0\u26A7\u26AA\u26B0\u26B1\u26BD\u26BE\u26C4\u26C8\u26CF\u26D1\u26E9\u26F0-\u26F5\u26F7\u26F8\u26FA\u2702\u2708\u2709\u270F\u2712\u2714\u2716\u271D\u2721\u2733\u2734\u2744\u2747\u2757\u2763\u27A1\u2934\u2935\u2B05-\u2B07\u2B1B\u2B1C\u2B55\u3030\u303D\u3297\u3299]\uFE0F?|[\u261D\u270C\u270D](?:\uD83C[\uDFFB-\uDFFF]|\uFE0F)?|[\u270A\u270B](?:\uD83C[\uDFFB-\uDFFF])?|[\u23E9-\u23EC\u23F0\u23F3\u25FD\u2693\u26A1\u26AB\u26C5\u26CE\u26D4\u26EA\u26FD\u2705\u2728\u274C\u274E\u2753-\u2755\u2795-\u2797\u27B0\u27BF\u2B50]|\u26D3\uFE0F?(?:\u200D\uD83D\uDCA5)?|\u26F9(?:\uD83C[\uDFFB-\uDFFF]|\uFE0F)?(?:\u200D[\u2640\u2642]\uFE0F?)?|\u2764\uFE0F?(?:\u200D(?:\uD83D\uDD25|\uD83E\uDE79))?|\uD83C(?:[\uDC04\uDD70\uDD71\uDD7E\uDD7F\uDE02\uDE37\uDF21\uDF24-\uDF2C\uDF36\uDF7D\uDF96\uDF97\uDF99-\uDF9B\uDF9E\uDF9F\uDFCD\uDFCE\uDFD4-\uDFDF\uDFF5\uDFF7]\uFE0F?|[\uDF85\uDFC2\uDFC7](?:\uD83C[\uDFFB-\uDFFF])?|[\uDFC4\uDFCA](?:\uD83C[\uDFFB-\uDFFF])?(?:\u200D[\u2640\u2642]\uFE0F?)?|[\uDFCB\uDFCC](?:\uD83C[\uDFFB-\uDFFF]|\uFE0F)?(?:\u200D[\u2640\u2642]\uFE0F?)?|[\uDCCF\uDD8E\uDD91-\uDD9A\uDE01\uDE1A\uDE2F\uDE32-\uDE36\uDE38-\uDE3A\uDE50\uDE51\uDF00-\uDF20\uDF2D-\uDF35\uDF37-\uDF43\uDF45-\uDF4A\uDF4C-\uDF7C\uDF7E-\uDF84\uDF86-\uDF93\uDFA0-\uDFC1\uDFC5\uDFC6\uDFC8\uDFC9\uDFCF-\uDFD3\uDFE0-\uDFF0\uDFF8-\uDFFF]|\uDDE6\uD83C[\uDDE8-\uDDEC\uDDEE\uDDF1\uDDF2\uDDF4\uDDF6-\uDDFA\uDDFC\uDDFD\uDDFF]|\uDDE7\uD83C[\uDDE6\uDDE7\uDDE9-\uDDEF\uDDF1-\uDDF4\uDDF6-\uDDF9\uDDFB\uDDFC\uDDFE\uDDFF]|\uDDE8\uD83C[\uDDE6\uDDE8\uDDE9\uDDEB-\uDDEE\uDDF0-\uDDF7\uDDFA-\uDDFF]|\uDDE9\uD83C[\uDDEA\uDDEC\uDDEF\uDDF0\uDDF2\uDDF4\uDDFF]|\uDDEA\uD83C[\uDDE6\uDDE8\uDDEA\uDDEC\uDDED\uDDF7-\uDDFA]|\uDDEB\uD83C[\uDDEE-\uDDF0\uDDF2\uDDF4\uDDF7]|\uDDEC\uD83C[\uDDE6\uDDE7\uDDE9-\uDDEE\uDDF1-\uDDF3\uDDF5-\uDDFA\uDDFC\uDDFE]|\uDDED\uD83C[\uDDF0\uDDF2\uDDF3\uDDF7\uDDF9\uDDFA]|\uDDEE\uD83C[\uDDE8-\uDDEA\uDDF1-\uDDF4\uDDF6-\uDDF9]|\uDDEF\uD83C[\uDDEA\uDDF2\uDDF4\uDDF5]|\uDDF0\uD83C[\uDDEA\uDDEC-\uDDEE\uDDF2\uDDF3\uDDF5\uDDF7\uDDFC\uDDFE\uDDFF]|\uDDF1\uD83C[\uDDE6-\uDDE8\uDDEE\uDDF0\uDDF7-\uDDFB\uDDFE]|\uDDF2\uD83C[\uDDE6\uDDE8-\uDDED\uDDF0-\uDDFF]|\uDDF3\uD83C[\uDDE6\uDDE8\uDDEA-\uDDEC\uDDEE\uDDF1\uDDF4\uDDF5\uDDF7\uDDFA\uDDFF]|\uDDF4\uD83C\uDDF2|\uDDF5\uD83C[\uDDE6\uDDEA-\uDDED\uDDF0-\uDDF3\uDDF7-\uDDF9\uDDFC\uDDFE]|\uDDF6\uD83C\uDDE6|\uDDF7\uD83C[\uDDEA\uDDF4\uDDF8\uDDFA\uDDFC]|\uDDF8\uD83C[\uDDE6-\uDDEA\uDDEC-\uDDF4\uDDF7-\uDDF9\uDDFB\uDDFD-\uDDFF]|\uDDF9\uD83C[\uDDE6\uDDE8\uDDE9\uDDEB-\uDDED\uDDEF-\uDDF4\uDDF7\uDDF9\uDDFB\uDDFC\uDDFF]|\uDDFA\uD83C[\uDDE6\uDDEC\uDDF2\uDDF3\uDDF8\uDDFE\uDDFF]|\uDDFB\uD83C[\uDDE6\uDDE8\uDDEA\uDDEC\uDDEE\uDDF3\uDDFA]|\uDDFC\uD83C[\uDDEB\uDDF8]|\uDDFD\uD83C\uDDF0|\uDDFE\uD83C[\uDDEA\uDDF9]|\uDDFF\uD83C[\uDDE6\uDDF2\uDDFC]|\uDF44(?:\u200D\uD83D\uDFEB)?|\uDF4B(?:\u200D\uD83D\uDFE9)?|\uDFC3(?:\uD83C[\uDFFB-\uDFFF])?(?:\u200D(?:[\u2640\u2642]\uFE0F?(?:\u200D\u27A1\uFE0F?)?|\u27A1\uFE0F?))?|\uDFF3\uFE0F?(?:\u200D(?:\u26A7\uFE0F?|\uD83C\uDF08))?|\uDFF4(?:\u200D\u2620\uFE0F?|\uDB40\uDC67\uDB40\uDC62\uDB40(?:\uDC65\uDB40\uDC6E\uDB40\uDC67|\uDC73\uDB40\uDC63\uDB40\uDC74|\uDC77\uDB40\uDC6C\uDB40\uDC73)\uDB40\uDC7F)?)|\uD83D(?:[\uDC3F\uDCFD\uDD49\uDD4A\uDD6F\uDD70\uDD73\uDD76-\uDD79\uDD87\uDD8A-\uDD8D\uDDA5\uDDA8\uDDB1\uDDB2\uDDBC\uDDC2-\uDDC4\uDDD1-\uDDD3\uDDDC-\uDDDE\uDDE1\uDDE3\uDDE8\uDDEF\uDDF3\uDDFA\uDECB\uDECD-\uDECF\uDEE0-\uDEE5\uDEE9\uDEF0\uDEF3]\uFE0F?|[\uDC42\uDC43\uDC46-\uDC50\uDC66\uDC67\uDC6B-\uDC6D\uDC72\uDC74-\uDC76\uDC78\uDC7C\uDC83\uDC85\uDC8F\uDC91\uDCAA\uDD7A\uDD95\uDD96\uDE4C\uDE4F\uDEC0\uDECC](?:\uD83C[\uDFFB-\uDFFF])?|[\uDC6E\uDC70\uDC71\uDC73\uDC77\uDC81\uDC82\uDC86\uDC87\uDE45-\uDE47\uDE4B\uDE4D\uDE4E\uDEA3\uDEB4\uDEB5](?:\uD83C[\uDFFB-\uDFFF])?(?:\u200D[\u2640\u2642]\uFE0F?)?|[\uDD74\uDD90](?:\uD83C[\uDFFB-\uDFFF]|\uFE0F)?|[\uDC00-\uDC07\uDC09-\uDC14\uDC16-\uDC25\uDC27-\uDC3A\uDC3C-\uDC3E\uDC40\uDC44\uDC45\uDC51-\uDC65\uDC6A\uDC79-\uDC7B\uDC7D-\uDC80\uDC84\uDC88-\uDC8E\uDC90\uDC92-\uDCA9\uDCAB-\uDCFC\uDCFF-\uDD3D\uDD4B-\uDD4E\uDD50-\uDD67\uDDA4\uDDFB-\uDE2D\uDE2F-\uDE34\uDE37-\uDE41\uDE43\uDE44\uDE48-\uDE4A\uDE80-\uDEA2\uDEA4-\uDEB3\uDEB7-\uDEBF\uDEC1-\uDEC5\uDED0-\uDED2\uDED5-\uDED7\uDEDC-\uDEDF\uDEEB\uDEEC\uDEF4-\uDEFC\uDFE0-\uDFEB\uDFF0]|\uDC08(?:\u200D\u2B1B)?|\uDC15(?:\u200D\uD83E\uDDBA)?|\uDC26(?:\u200D(?:\u2B1B|\uD83D\uDD25))?|\uDC3B(?:\u200D\u2744\uFE0F?)?|\uDC41\uFE0F?(?:\u200D\uD83D\uDDE8\uFE0F?)?|\uDC68(?:\u200D(?:[\u2695\u2696\u2708]\uFE0F?|\u2764\uFE0F?\u200D\uD83D(?:\uDC8B\u200D\uD83D)?\uDC68|\uD83C[\uDF3E\uDF73\uDF7C\uDF93\uDFA4\uDFA8\uDFEB\uDFED]|\uD83D(?:[\uDC68\uDC69]\u200D\uD83D(?:\uDC66(?:\u200D\uD83D\uDC66)?|\uDC67(?:\u200D\uD83D[\uDC66\uDC67])?)|[\uDCBB\uDCBC\uDD27\uDD2C\uDE80\uDE92]|\uDC66(?:\u200D\uD83D\uDC66)?|\uDC67(?:\u200D\uD83D[\uDC66\uDC67])?)|\uD83E(?:[\uDDAF\uDDBC\uDDBD](?:\u200D\u27A1\uFE0F?)?|[\uDDB0-\uDDB3]))|\uD83C(?:\uDFFB(?:\u200D(?:[\u2695\u2696\u2708]\uFE0F?|\u2764\uFE0F?\u200D\uD83D(?:\uDC8B\u200D\uD83D)?\uDC68\uD83C[\uDFFB-\uDFFF]|\uD83C[\uDF3E\uDF73\uDF7C\uDF93\uDFA4\uDFA8\uDFEB\uDFED]|\uD83D[\uDCBB\uDCBC\uDD27\uDD2C\uDE80\uDE92]|\uD83E(?:[\uDDAF\uDDBC\uDDBD](?:\u200D\u27A1\uFE0F?)?|[\uDDB0-\uDDB3]|\uDD1D\u200D\uD83D\uDC68\uD83C[\uDFFC-\uDFFF])))?|\uDFFC(?:\u200D(?:[\u2695\u2696\u2708]\uFE0F?|\u2764\uFE0F?\u200D\uD83D(?:\uDC8B\u200D\uD83D)?\uDC68\uD83C[\uDFFB-\uDFFF]|\uD83C[\uDF3E\uDF73\uDF7C\uDF93\uDFA4\uDFA8\uDFEB\uDFED]|\uD83D[\uDCBB\uDCBC\uDD27\uDD2C\uDE80\uDE92]|\uD83E(?:[\uDDAF\uDDBC\uDDBD](?:\u200D\u27A1\uFE0F?)?|[\uDDB0-\uDDB3]|\uDD1D\u200D\uD83D\uDC68\uD83C[\uDFFB\uDFFD-\uDFFF])))?|\uDFFD(?:\u200D(?:[\u2695\u2696\u2708]\uFE0F?|\u2764\uFE0F?\u200D\uD83D(?:\uDC8B\u200D\uD83D)?\uDC68\uD83C[\uDFFB-\uDFFF]|\uD83C[\uDF3E\uDF73\uDF7C\uDF93\uDFA4\uDFA8\uDFEB\uDFED]|\uD83D[\uDCBB\uDCBC\uDD27\uDD2C\uDE80\uDE92]|\uD83E(?:[\uDDAF\uDDBC\uDDBD](?:\u200D\u27A1\uFE0F?)?|[\uDDB0-\uDDB3]|\uDD1D\u200D\uD83D\uDC68\uD83C[\uDFFB\uDFFC\uDFFE\uDFFF])))?|\uDFFE(?:\u200D(?:[\u2695\u2696\u2708]\uFE0F?|\u2764\uFE0F?\u200D\uD83D(?:\uDC8B\u200D\uD83D)?\uDC68\uD83C[\uDFFB-\uDFFF]|\uD83C[\uDF3E\uDF73\uDF7C\uDF93\uDFA4\uDFA8\uDFEB\uDFED]|\uD83D[\uDCBB\uDCBC\uDD27\uDD2C\uDE80\uDE92]|\uD83E(?:[\uDDAF\uDDBC\uDDBD](?:\u200D\u27A1\uFE0F?)?|[\uDDB0-\uDDB3]|\uDD1D\u200D\uD83D\uDC68\uD83C[\uDFFB-\uDFFD\uDFFF])))?|\uDFFF(?:\u200D(?:[\u2695\u2696\u2708]\uFE0F?|\u2764\uFE0F?\u200D\uD83D(?:\uDC8B\u200D\uD83D)?\uDC68\uD83C[\uDFFB-\uDFFF]|\uD83C[\uDF3E\uDF73\uDF7C\uDF93\uDFA4\uDFA8\uDFEB\uDFED]|\uD83D[\uDCBB\uDCBC\uDD27\uDD2C\uDE80\uDE92]|\uD83E(?:[\uDDAF\uDDBC\uDDBD](?:\u200D\u27A1\uFE0F?)?|[\uDDB0-\uDDB3]|\uDD1D\u200D\uD83D\uDC68\uD83C[\uDFFB-\uDFFE])))?))?|\uDC69(?:\u200D(?:[\u2695\u2696\u2708]\uFE0F?|\u2764\uFE0F?\u200D\uD83D(?:\uDC8B\u200D\uD83D)?[\uDC68\uDC69]|\uD83C[\uDF3E\uDF73\uDF7C\uDF93\uDFA4\uDFA8\uDFEB\uDFED]|\uD83D(?:[\uDCBB\uDCBC\uDD27\uDD2C\uDE80\uDE92]|\uDC66(?:\u200D\uD83D\uDC66)?|\uDC67(?:\u200D\uD83D[\uDC66\uDC67])?|\uDC69\u200D\uD83D(?:\uDC66(?:\u200D\uD83D\uDC66)?|\uDC67(?:\u200D\uD83D[\uDC66\uDC67])?))|\uD83E(?:[\uDDAF\uDDBC\uDDBD](?:\u200D\u27A1\uFE0F?)?|[\uDDB0-\uDDB3]))|\uD83C(?:\uDFFB(?:\u200D(?:[\u2695\u2696\u2708]\uFE0F?|\u2764\uFE0F?\u200D\uD83D(?:[\uDC68\uDC69]|\uDC8B\u200D\uD83D[\uDC68\uDC69])\uD83C[\uDFFB-\uDFFF]|\uD83C[\uDF3E\uDF73\uDF7C\uDF93\uDFA4\uDFA8\uDFEB\uDFED]|\uD83D[\uDCBB\uDCBC\uDD27\uDD2C\uDE80\uDE92]|\uD83E(?:[\uDDAF\uDDBC\uDDBD](?:\u200D\u27A1\uFE0F?)?|[\uDDB0-\uDDB3]|\uDD1D\u200D\uD83D[\uDC68\uDC69]\uD83C[\uDFFC-\uDFFF])))?|\uDFFC(?:\u200D(?:[\u2695\u2696\u2708]\uFE0F?|\u2764\uFE0F?\u200D\uD83D(?:[\uDC68\uDC69]|\uDC8B\u200D\uD83D[\uDC68\uDC69])\uD83C[\uDFFB-\uDFFF]|\uD83C[\uDF3E\uDF73\uDF7C\uDF93\uDFA4\uDFA8\uDFEB\uDFED]|\uD83D[\uDCBB\uDCBC\uDD27\uDD2C\uDE80\uDE92]|\uD83E(?:[\uDDAF\uDDBC\uDDBD](?:\u200D\u27A1\uFE0F?)?|[\uDDB0-\uDDB3]|\uDD1D\u200D\uD83D[\uDC68\uDC69]\uD83C[\uDFFB\uDFFD-\uDFFF])))?|\uDFFD(?:\u200D(?:[\u2695\u2696\u2708]\uFE0F?|\u2764\uFE0F?\u200D\uD83D(?:[\uDC68\uDC69]|\uDC8B\u200D\uD83D[\uDC68\uDC69])\uD83C[\uDFFB-\uDFFF]|\uD83C[\uDF3E\uDF73\uDF7C\uDF93\uDFA4\uDFA8\uDFEB\uDFED]|\uD83D[\uDCBB\uDCBC\uDD27\uDD2C\uDE80\uDE92]|\uD83E(?:[\uDDAF\uDDBC\uDDBD](?:\u200D\u27A1\uFE0F?)?|[\uDDB0-\uDDB3]|\uDD1D\u200D\uD83D[\uDC68\uDC69]\uD83C[\uDFFB\uDFFC\uDFFE\uDFFF])))?|\uDFFE(?:\u200D(?:[\u2695\u2696\u2708]\uFE0F?|\u2764\uFE0F?\u200D\uD83D(?:[\uDC68\uDC69]|\uDC8B\u200D\uD83D[\uDC68\uDC69])\uD83C[\uDFFB-\uDFFF]|\uD83C[\uDF3E\uDF73\uDF7C\uDF93\uDFA4\uDFA8\uDFEB\uDFED]|\uD83D[\uDCBB\uDCBC\uDD27\uDD2C\uDE80\uDE92]|\uD83E(?:[\uDDAF\uDDBC\uDDBD](?:\u200D\u27A1\uFE0F?)?|[\uDDB0-\uDDB3]|\uDD1D\u200D\uD83D[\uDC68\uDC69]\uD83C[\uDFFB-\uDFFD\uDFFF])))?|\uDFFF(?:\u200D(?:[\u2695\u2696\u2708]\uFE0F?|\u2764\uFE0F?\u200D\uD83D(?:[\uDC68\uDC69]|\uDC8B\u200D\uD83D[\uDC68\uDC69])\uD83C[\uDFFB-\uDFFF]|\uD83C[\uDF3E\uDF73\uDF7C\uDF93\uDFA4\uDFA8\uDFEB\uDFED]|\uD83D[\uDCBB\uDCBC\uDD27\uDD2C\uDE80\uDE92]|\uD83E(?:[\uDDAF\uDDBC\uDDBD](?:\u200D\u27A1\uFE0F?)?|[\uDDB0-\uDDB3]|\uDD1D\u200D\uD83D[\uDC68\uDC69]\uD83C[\uDFFB-\uDFFE])))?))?|\uDC6F(?:\u200D[\u2640\u2642]\uFE0F?)?|\uDD75(?:\uD83C[\uDFFB-\uDFFF]|\uFE0F)?(?:\u200D[\u2640\u2642]\uFE0F?)?|\uDE2E(?:\u200D\uD83D\uDCA8)?|\uDE35(?:\u200D\uD83D\uDCAB)?|\uDE36(?:\u200D\uD83C\uDF2B\uFE0F?)?|\uDE42(?:\u200D[\u2194\u2195]\uFE0F?)?|\uDEB6(?:\uD83C[\uDFFB-\uDFFF])?(?:\u200D(?:[\u2640\u2642]\uFE0F?(?:\u200D\u27A1\uFE0F?)?|\u27A1\uFE0F?))?)|\uD83E(?:[\uDD0C\uDD0F\uDD18-\uDD1F\uDD30-\uDD34\uDD36\uDD77\uDDB5\uDDB6\uDDBB\uDDD2\uDDD3\uDDD5\uDEC3-\uDEC5\uDEF0\uDEF2-\uDEF8](?:\uD83C[\uDFFB-\uDFFF])?|[\uDD26\uDD35\uDD37-\uDD39\uDD3D\uDD3E\uDDB8\uDDB9\uDDCD\uDDCF\uDDD4\uDDD6-\uDDDD](?:\uD83C[\uDFFB-\uDFFF])?(?:\u200D[\u2640\u2642]\uFE0F?)?|[\uDDDE\uDDDF](?:\u200D[\u2640\u2642]\uFE0F?)?|[\uDD0D\uDD0E\uDD10-\uDD17\uDD20-\uDD25\uDD27-\uDD2F\uDD3A\uDD3F-\uDD45\uDD47-\uDD76\uDD78-\uDDB4\uDDB7\uDDBA\uDDBC-\uDDCC\uDDD0\uDDE0-\uDDFF\uDE70-\uDE7C\uDE80-\uDE89\uDE8F-\uDEC2\uDEC6\uDECE-\uDEDC\uDEDF-\uDEE9]|\uDD3C(?:\u200D[\u2640\u2642]\uFE0F?|\uD83C[\uDFFB-\uDFFF])?|\uDDCE(?:\uD83C[\uDFFB-\uDFFF])?(?:\u200D(?:[\u2640\u2642]\uFE0F?(?:\u200D\u27A1\uFE0F?)?|\u27A1\uFE0F?))?|\uDDD1(?:\u200D(?:[\u2695\u2696\u2708]\uFE0F?|\uD83C[\uDF3E\uDF73\uDF7C\uDF84\uDF93\uDFA4\uDFA8\uDFEB\uDFED]|\uD83D[\uDCBB\uDCBC\uDD27\uDD2C\uDE80\uDE92]|\uD83E(?:[\uDDAF\uDDBC\uDDBD](?:\u200D\u27A1\uFE0F?)?|[\uDDB0-\uDDB3]|\uDD1D\u200D\uD83E\uDDD1|\uDDD1\u200D\uD83E\uDDD2(?:\u200D\uD83E\uDDD2)?|\uDDD2(?:\u200D\uD83E\uDDD2)?))|\uD83C(?:\uDFFB(?:\u200D(?:[\u2695\u2696\u2708]\uFE0F?|\u2764\uFE0F?\u200D(?:\uD83D\uDC8B\u200D)?\uD83E\uDDD1\uD83C[\uDFFC-\uDFFF]|\uD83C[\uDF3E\uDF73\uDF7C\uDF84\uDF93\uDFA4\uDFA8\uDFEB\uDFED]|\uD83D[\uDCBB\uDCBC\uDD27\uDD2C\uDE80\uDE92]|\uD83E(?:[\uDDAF\uDDBC\uDDBD](?:\u200D\u27A1\uFE0F?)?|[\uDDB0-\uDDB3]|\uDD1D\u200D\uD83E\uDDD1\uD83C[\uDFFB-\uDFFF])))?|\uDFFC(?:\u200D(?:[\u2695\u2696\u2708]\uFE0F?|\u2764\uFE0F?\u200D(?:\uD83D\uDC8B\u200D)?\uD83E\uDDD1\uD83C[\uDFFB\uDFFD-\uDFFF]|\uD83C[\uDF3E\uDF73\uDF7C\uDF84\uDF93\uDFA4\uDFA8\uDFEB\uDFED]|\uD83D[\uDCBB\uDCBC\uDD27\uDD2C\uDE80\uDE92]|\uD83E(?:[\uDDAF\uDDBC\uDDBD](?:\u200D\u27A1\uFE0F?)?|[\uDDB0-\uDDB3]|\uDD1D\u200D\uD83E\uDDD1\uD83C[\uDFFB-\uDFFF])))?|\uDFFD(?:\u200D(?:[\u2695\u2696\u2708]\uFE0F?|\u2764\uFE0F?\u200D(?:\uD83D\uDC8B\u200D)?\uD83E\uDDD1\uD83C[\uDFFB\uDFFC\uDFFE\uDFFF]|\uD83C[\uDF3E\uDF73\uDF7C\uDF84\uDF93\uDFA4\uDFA8\uDFEB\uDFED]|\uD83D[\uDCBB\uDCBC\uDD27\uDD2C\uDE80\uDE92]|\uD83E(?:[\uDDAF\uDDBC\uDDBD](?:\u200D\u27A1\uFE0F?)?|[\uDDB0-\uDDB3]|\uDD1D\u200D\uD83E\uDDD1\uD83C[\uDFFB-\uDFFF])))?|\uDFFE(?:\u200D(?:[\u2695\u2696\u2708]\uFE0F?|\u2764\uFE0F?\u200D(?:\uD83D\uDC8B\u200D)?\uD83E\uDDD1\uD83C[\uDFFB-\uDFFD\uDFFF]|\uD83C[\uDF3E\uDF73\uDF7C\uDF84\uDF93\uDFA4\uDFA8\uDFEB\uDFED]|\uD83D[\uDCBB\uDCBC\uDD27\uDD2C\uDE80\uDE92]|\uD83E(?:[\uDDAF\uDDBC\uDDBD](?:\u200D\u27A1\uFE0F?)?|[\uDDB0-\uDDB3]|\uDD1D\u200D\uD83E\uDDD1\uD83C[\uDFFB-\uDFFF])))?|\uDFFF(?:\u200D(?:[\u2695\u2696\u2708]\uFE0F?|\u2764\uFE0F?\u200D(?:\uD83D\uDC8B\u200D)?\uD83E\uDDD1\uD83C[\uDFFB-\uDFFE]|\uD83C[\uDF3E\uDF73\uDF7C\uDF84\uDF93\uDFA4\uDFA8\uDFEB\uDFED]|\uD83D[\uDCBB\uDCBC\uDD27\uDD2C\uDE80\uDE92]|\uD83E(?:[\uDDAF\uDDBC\uDDBD](?:\u200D\u27A1\uFE0F?)?|[\uDDB0-\uDDB3]|\uDD1D\u200D\uD83E\uDDD1\uD83C[\uDFFB-\uDFFF])))?))?|\uDEF1(?:\uD83C(?:\uDFFB(?:\u200D\uD83E\uDEF2\uD83C[\uDFFC-\uDFFF])?|\uDFFC(?:\u200D\uD83E\uDEF2\uD83C[\uDFFB\uDFFD-\uDFFF])?|\uDFFD(?:\u200D\uD83E\uDEF2\uD83C[\uDFFB\uDFFC\uDFFE\uDFFF])?|\uDFFE(?:\u200D\uD83E\uDEF2\uD83C[\uDFFB-\uDFFD\uDFFF])?|\uDFFF(?:\u200D\uD83E\uDEF2\uD83C[\uDFFB-\uDFFE])?))?)/g;
};
var segmenter = globalThis.Intl?.Segmenter ? new Intl.Segmenter() : { segment: (str) => str.split("") };
var defaultIgnorableCodePointRegex = /^\p{Default_Ignorable_Code_Point}$/u;
function stringWidth$1(string, options = {}) {
  if (typeof string !== "string" || string.length === 0) {
    return 0;
  }
  const {
    ambiguousIsNarrow = true,
    countAnsiEscapeCodes = false
  } = options;
  if (!countAnsiEscapeCodes) {
    string = stripAnsi2(string);
  }
  if (string.length === 0) {
    return 0;
  }
  let width = 0;
  const eastAsianWidthOptions = { ambiguousAsWide: !ambiguousIsNarrow };
  for (const { segment: character } of segmenter.segment(string)) {
    const codePoint = character.codePointAt(0);
    if (codePoint <= 31 || codePoint >= 127 && codePoint <= 159) {
      continue;
    }
    if (codePoint >= 8203 && codePoint <= 8207 || codePoint === 65279) {
      continue;
    }
    if (codePoint >= 768 && codePoint <= 879 || codePoint >= 6832 && codePoint <= 6911 || codePoint >= 7616 && codePoint <= 7679 || codePoint >= 8400 && codePoint <= 8447 || codePoint >= 65056 && codePoint <= 65071) {
      continue;
    }
    if (codePoint >= 55296 && codePoint <= 57343) {
      continue;
    }
    if (codePoint >= 65024 && codePoint <= 65039) {
      continue;
    }
    if (defaultIgnorableCodePointRegex.test(character)) {
      continue;
    }
    if (emojiRegex().test(character)) {
      width += 2;
      continue;
    }
    width += eastAsianWidth(codePoint, eastAsianWidthOptions);
  }
  return width;
}
function isUnicodeSupported() {
  const { env: env2 } = g$1;
  const { TERM, TERM_PROGRAM } = env2;
  if (g$1.platform !== "win32") {
    return TERM !== "linux";
  }
  return Boolean(env2.WT_SESSION) || Boolean(env2.TERMINUS_SUBLIME) || env2.ConEmuTask === "{cmd::Cmder}" || TERM_PROGRAM === "Terminus-Sublime" || TERM_PROGRAM === "vscode" || TERM === "xterm-256color" || TERM === "alacritty" || TERM === "rxvt-unicode" || TERM === "rxvt-unicode-256color" || env2.TERMINAL_EMULATOR === "JetBrains-JediTerm";
}
var TYPE_COLOR_MAP = {
  info: "cyan",
  fail: "red",
  success: "green",
  ready: "green",
  start: "magenta"
};
var LEVEL_COLOR_MAP = {
  0: "red",
  1: "yellow"
};
var unicode = isUnicodeSupported();
var s = (c3, fallback) => unicode ? c3 : fallback;
var TYPE_ICONS = {
  error: s("\u2716", "\xD7"),
  fatal: s("\u2716", "\xD7"),
  ready: s("\u2714", "\u221A"),
  warn: s("\u26A0", "\u203C"),
  info: s("\u2139", "i"),
  success: s("\u2714", "\u221A"),
  debug: s("\u2699", "D"),
  trace: s("\u2192", "\u2192"),
  fail: s("\u2716", "\xD7"),
  start: s("\u25D0", "o"),
  log: ""
};
function stringWidth(str) {
  const hasICU = typeof Intl === "object";
  if (!hasICU || !Intl.Segmenter) {
    return stripAnsi(str).length;
  }
  return stringWidth$1(str);
}
var FancyReporter = class extends BasicReporter {
  formatStack(stack, message, opts) {
    const indent = "  ".repeat((opts?.errorLevel || 0) + 1);
    return `
${indent}` + parseStack(stack, message).map(
      (line) => "  " + line.replace(/^at +/, (m2) => colors.gray(m2)).replace(/\((.+)\)/, (_3, m2) => `(${colors.cyan(m2)})`)
    ).join(`
${indent}`);
  }
  formatType(logObj, isBadge, opts) {
    const typeColor = TYPE_COLOR_MAP[logObj.type] || LEVEL_COLOR_MAP[logObj.level] || "gray";
    if (isBadge) {
      return getBgColor(typeColor)(
        colors.black(` ${logObj.type.toUpperCase()} `)
      );
    }
    const _type = typeof TYPE_ICONS[logObj.type] === "string" ? TYPE_ICONS[logObj.type] : logObj.icon || logObj.type;
    return _type ? getColor2(typeColor)(_type) : "";
  }
  formatLogObj(logObj, opts) {
    const [message, ...additional] = this.formatArgs(logObj.args, opts).split(
      "\n"
    );
    if (logObj.type === "box") {
      return box(
        characterFormat(
          message + (additional.length > 0 ? "\n" + additional.join("\n") : "")
        ),
        {
          title: logObj.title ? characterFormat(logObj.title) : void 0,
          style: logObj.style
        }
      );
    }
    const date = this.formatDate(logObj.date, opts);
    const coloredDate = date && colors.gray(date);
    const isBadge = logObj.badge ?? logObj.level < 2;
    const type = this.formatType(logObj, isBadge, opts);
    const tag = logObj.tag ? colors.gray(logObj.tag) : "";
    let line;
    const left = this.filterAndJoin([type, characterFormat(message)]);
    const right = this.filterAndJoin(opts.columns ? [tag, coloredDate] : [tag]);
    const space = (opts.columns || 0) - stringWidth(left) - stringWidth(right) - 2;
    line = space > 0 && (opts.columns || 0) >= 80 ? left + " ".repeat(space) + right : (right ? `${colors.gray(`[${right}]`)} ` : "") + left;
    line += characterFormat(
      additional.length > 0 ? "\n" + additional.join("\n") : ""
    );
    if (logObj.type === "trace") {
      const _err = new Error("Trace: " + logObj.message);
      line += this.formatStack(_err.stack || "", _err.message);
    }
    return isBadge ? "\n" + line + "\n" : line;
  }
};
function characterFormat(str) {
  return str.replace(/`([^`]+)`/gm, (_3, m2) => colors.cyan(m2)).replace(/\s+_([^_]+)_\s+/gm, (_3, m2) => ` ${colors.underline(m2)} `);
}
function getColor2(color = "white") {
  return colors[color] || colors.white;
}
function getBgColor(color = "bgWhite") {
  return colors[`bg${color[0].toUpperCase()}${color.slice(1)}`] || colors.bgWhite;
}
function createConsola2(options = {}) {
  let level = _getDefaultLogLevel();
  if (process.env.CONSOLA_LEVEL) {
    level = Number.parseInt(process.env.CONSOLA_LEVEL) ?? level;
  }
  const consola2 = createConsola({
    level,
    defaults: { level },
    stdout: process.stdout,
    stderr: process.stderr,
    prompt: (...args) => Promise.resolve().then(() => (init_prompt(), prompt_exports)).then((m2) => m2.prompt(...args)),
    reporters: options.reporters || [
      options.fancy ?? !(T2 || R2) ? new FancyReporter() : new BasicReporter()
    ],
    ...options
  });
  return consola2;
}
function _getDefaultLogLevel() {
  if (g2) {
    return LogLevels.debug;
  }
  if (R2) {
    return LogLevels.warn;
  }
  return LogLevels.info;
}
var consola = createConsola2();

// libs/utils/text/src/lib/keyTransform.ts
function hasAlphabeticCharacter(key) {
  return /[A-Za-z]/.test(key);
}
function isPlainObject2(value) {
  if (value === null || typeof value !== "object") return false;
  const prototype = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
}
function transformArrayItems(items, transform) {
  let result;
  for (let index = 0; index < items.length; index += 1) {
    const originalItem = items[index];
    const transformedItem = transform(originalItem);
    if (!result && transformedItem === originalItem) continue;
    if (!result) {
      result = items.slice(0, index);
    }
    result.push(transformedItem);
  }
  return result ?? items;
}
function transformObjectKeys(input, transformKey, transformValue) {
  const entries = Object.entries(input);
  let result;
  for (let index = 0; index < entries.length; index += 1) {
    const [originalKey, originalValue] = entries[index];
    const nextKey = transformKey(originalKey);
    const nextValue = transformValue(originalValue);
    if (!result && nextKey === originalKey && nextValue === originalValue) continue;
    if (!result) {
      result = {};
      for (let copyIndex = 0; copyIndex < index; copyIndex += 1) {
        const [previousKey, previousValue] = entries[copyIndex];
        result[previousKey] = previousValue;
      }
    }
    result[nextKey] = nextValue;
  }
  return result ?? input;
}
function transformKeysDeep(value, transformKey) {
  if (Array.isArray(value)) {
    return transformArrayItems(value, (item) => transformKeysDeep(item, transformKey));
  }
  if (isPlainObject2(value)) {
    return transformObjectKeys(value, transformKey, (item) => transformKeysDeep(item, transformKey));
  }
  return value;
}
function camelToSnake(key) {
  if (!hasAlphabeticCharacter(key)) return key;
  if (/^[a-z\d_]+$/.test(key)) return key;
  if (/^[A-Z\d_]+$/.test(key)) return key;
  if (/[^A-Za-z\d_]/.test(key)) return key;
  return key.replace(/([a-z\d])([A-Z])/g, "$1_$2").replace(/([A-Z]+)([A-Z][a-z])/g, "$1_$2").toLowerCase();
}
function toSnakeCaseKeys(value) {
  return transformKeysDeep(value, camelToSnake);
}

// libs/cli/client/src/lib/project-config.ts
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import { resolve } from "node:path";
var LOCAL_SUPABASE_URL = "http://127.0.0.1:54321";
var LOCAL_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRFA0NiK7kyqHDkAkEXER0xnuvvidGu0XP2yJZCqMnY";
var LOCAL_SERVICE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hj04zWl196z2-SBc0";
var SUPABASE_EDGE_FUNCTIONS_SUFFIX = "/functions/v1";
var PRODUCTION_AUTH_BASE_URL = "https://auth.lenserfight.com";
var PRODUCTION_SUPABASE_URL = "https://jrjlbycxihqqbwmsmpjn.supabase.co";
var PRODUCTION_SUPABASE_ANON_KEY = "sb_publishable_L1H6fuj1jULbxhWBrfze2Q_vUyb7cB6";
function supabaseEdgeFunctionsBaseUrl(supabaseUrl) {
  const base = supabaseUrl.trim().replace(/\/$/, "");
  if (base.endsWith(SUPABASE_EDGE_FUNCTIONS_SUFFIX)) {
    return base;
  }
  return `${base}${SUPABASE_EDGE_FUNCTIONS_SUFFIX}`;
}
function resolveCloudApiUrl(mode, supabaseUrl, explicitUrl) {
  const explicit = explicitUrl?.trim();
  if (explicit && !(mode === "cloud" && isDevOnlyHostUrl(explicit))) {
    return explicit.replace(/\/$/, "");
  }
  if (supabaseUrl?.trim()) {
    return supabaseEdgeFunctionsBaseUrl(supabaseUrl);
  }
  return "";
}
function isDevOnlyHostUrl(url) {
  try {
    const { hostname } = new URL(url);
    if (hostname === "localhost" || hostname === "127.0.0.1" || hostname === "::1") {
      return true;
    }
    if (hostname.endsWith(".local")) return true;
    const parts = hostname.split(".").map((p) => Number(p));
    if (parts.length === 4 && parts.every((n2) => !Number.isNaN(n2))) {
      const [a2, b2] = parts;
      if (a2 === 10) return true;
      if (a2 === 192 && b2 === 168) return true;
      if (a2 === 172 && b2 >= 16 && b2 <= 31) return true;
      if (a2 === 100 && b2 >= 64 && b2 <= 127) return true;
    }
    return false;
  } catch {
    return false;
  }
}
var isDevOnlyAuthBaseUrl = isDevOnlyHostUrl;
function isLocalSupabaseAnonKey(key) {
  const trimmed = key?.trim();
  return !!trimmed && trimmed === LOCAL_ANON_KEY;
}
function pickFirstCloudHostUrl(...candidates) {
  for (const candidate of candidates) {
    const value = candidate?.trim();
    if (!value) continue;
    if (!isDevOnlyHostUrl(value)) return value;
  }
  return "";
}
function resolveSupabaseUrl(mode, envUrl, projectUrl) {
  if (mode === "local") {
    return envUrl?.trim() || projectUrl?.trim() || LOCAL_SUPABASE_URL;
  }
  return pickFirstCloudHostUrl(envUrl, projectUrl) || PRODUCTION_SUPABASE_URL;
}
function isEnvKeyBoundToDevSupabase(envKey, envUrl) {
  return !!(envKey?.trim() && envUrl?.trim() && isDevOnlyHostUrl(envUrl));
}
function resolveSupabaseAnonKey(mode, envKey, userKey, envUrl) {
  if (mode === "local") {
    return envKey?.trim() || userKey?.trim() || LOCAL_ANON_KEY;
  }
  const envKeyTrimmed = envKey?.trim();
  const envKeyUsable = envKeyTrimmed && !isLocalSupabaseAnonKey(envKey) && !isEnvKeyBoundToDevSupabase(envKey, envUrl);
  if (envKeyUsable) return envKeyTrimmed;
  for (const key of [userKey]) {
    const value = key?.trim();
    if (value && !isLocalSupabaseAnonKey(value)) return value;
  }
  return PRODUCTION_SUPABASE_ANON_KEY;
}
function isLocalSupabaseServiceRoleKey(key) {
  const trimmed = key?.trim();
  return !!trimmed && trimmed === LOCAL_SERVICE_KEY;
}
function resolveSupabaseServiceRoleKey(mode, envKey, userKey) {
  if (mode === "local") {
    return envKey?.trim() || userKey?.trim() || LOCAL_SERVICE_KEY;
  }
  for (const key of [envKey, userKey]) {
    const value = key?.trim();
    if (value && !isLocalSupabaseServiceRoleKey(value)) return value;
  }
  return void 0;
}
function resolveAuthBaseUrl(mode, envAuthBaseUrl) {
  if (mode === "cloud") {
    if (envAuthBaseUrl && isDevOnlyHostUrl(envAuthBaseUrl)) {
      return PRODUCTION_AUTH_BASE_URL;
    }
    return envAuthBaseUrl || PRODUCTION_AUTH_BASE_URL;
  }
  return envAuthBaseUrl;
}
function assertCloudSupabaseConfigured(config) {
  if (config.mode !== "cloud") return;
  if (!config.supabaseUrl?.trim() || isDevOnlyHostUrl(config.supabaseUrl)) {
    throw new Error(
      "Cloud mode could not resolve a hosted Supabase URL. Run `lf use cloud` and retry, or `lf init --mode cloud --url https://<project-ref>.supabase.co`."
    );
  }
  if (!config.supabaseAnonKey?.trim() || isLocalSupabaseAnonKey(config.supabaseAnonKey)) {
    throw new Error(
      "Cloud mode could not resolve a hosted Supabase anon/publishable key. Set SUPABASE_ANON_KEY for a custom project or use the default cloud target."
    );
  }
}
function getDeviceConfigDir() {
  if (process.platform === "win32") {
    const appData = process.env["APPDATA"] ?? resolve(homedir(), "AppData", "Roaming");
    return resolve(appData, "lenserfight");
  }
  if (process.platform === "darwin") {
    return resolve(homedir(), "Library", "Application Support", "lenserfight");
  }
  const xdgConfig = process.env["XDG_CONFIG_HOME"] ?? resolve(homedir(), ".config");
  return resolve(xdgConfig, "lenserfight");
}
function getDeviceConfigPath() {
  return resolve(getDeviceConfigDir(), "config.json");
}
function getUserPreferencesPath() {
  return resolve(getDeviceConfigDir(), "lenserfight.json");
}
var LEGACY_DEVICE_CONFIG_DIR = resolve(homedir(), ".lenserfight");
var LEGACY_DEVICE_CONFIG_PATH = resolve(LEGACY_DEVICE_CONFIG_DIR, "lenserfight.json");
var PROJECT_CONFIG_DIR_NAME = ".lenserfight";
var PROJECT_CONFIG_FILE_IN_DIR = "lenserfight.json";
var PROJECT_CONFIG_LEGACY_FILE = ".lenserfight.json";
var DEFAULT_PROJECT_CONFIG = {
  mode: "cloud",
  dbPort: 54322,
  apiPort: 54321
};
function findConfigPath(cwd = process.cwd()) {
  return resolve(cwd, PROJECT_CONFIG_DIR_NAME, PROJECT_CONFIG_FILE_IN_DIR);
}
function findLegacyConfigPath(cwd = process.cwd()) {
  return resolve(cwd, PROJECT_CONFIG_LEGACY_FILE);
}
function projectConfigExists(cwd = process.cwd()) {
  return existsSync(findConfigPath(cwd)) || existsSync(findLegacyConfigPath(cwd));
}
function userPreferencesExist() {
  if (existsSync(getUserPreferencesPath())) return true;
  if (!existsSync(LEGACY_DEVICE_CONFIG_PATH)) return false;
  try {
    const raw = JSON.parse(readFileSync(LEGACY_DEVICE_CONFIG_PATH, "utf-8"));
    return typeof raw["mode"] === "string" || typeof raw["supabaseUrl"] === "string";
  } catch {
    return false;
  }
}
function readProjectConfigFile(activePath) {
  try {
    const raw = JSON.parse(readFileSync(activePath, "utf-8"));
    return { ...DEFAULT_PROJECT_CONFIG, ...stripSecrets(raw) };
  } catch {
    return { ...DEFAULT_PROJECT_CONFIG };
  }
}
function readUserPreferences() {
  const candidates = [getUserPreferencesPath(), LEGACY_DEVICE_CONFIG_PATH];
  for (const path2 of candidates) {
    if (!existsSync(path2)) continue;
    try {
      const raw = JSON.parse(readFileSync(path2, "utf-8"));
      if (path2 === LEGACY_DEVICE_CONFIG_PATH && !raw["mode"] && !raw["supabaseUrl"]) {
        continue;
      }
      return { ...DEFAULT_PROJECT_CONFIG, ...stripSecrets(raw) };
    } catch {
    }
  }
  return { ...DEFAULT_PROJECT_CONFIG };
}
function stripSecrets(raw) {
  const {
    supabaseAnonKey: _a,
    supabaseServiceRoleKey: _s,
    authToken: _t,
    authRefreshToken: _r,
    authExpiresAt: _e,
    developerTokenId: _dti,
    developerToken: _dt,
    developerTokenExpiresAt: _dte,
    ...safe
  } = raw;
  return safe;
}
function readProjectConfigAt(cwd = process.cwd()) {
  const dirPath = findConfigPath(cwd);
  const legacyPath = findLegacyConfigPath(cwd);
  const activePath = existsSync(dirPath) ? dirPath : existsSync(legacyPath) ? legacyPath : null;
  if (!activePath) return { ...DEFAULT_PROJECT_CONFIG };
  return readProjectConfigFile(activePath);
}
function loadConfig(cwd = process.cwd()) {
  const user = readUserPreferences();
  if (!projectConfigExists(cwd)) return user;
  const project = readProjectConfigAt(cwd);
  return { ...project, ...user };
}
function loadUserConfig() {
  const primary = getDeviceConfigPath();
  for (const path2 of [primary, LEGACY_DEVICE_CONFIG_PATH]) {
    if (existsSync(path2)) {
      try {
        return JSON.parse(readFileSync(path2, "utf-8"));
      } catch {
      }
    }
  }
  return {};
}
function saveUserConfig(partial) {
  const dir = getDeviceConfigDir();
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
  }
  const existing = loadUserConfig();
  const merged = { ...existing };
  for (const [k2, v2] of Object.entries(partial)) {
    if (v2 === void 0) {
      delete merged[k2];
    } else {
      merged[k2] = v2;
    }
  }
  const primary = getDeviceConfigPath();
  writeFileSync(primary, JSON.stringify(merged, null, 2) + "\n");
  if (existsSync(LEGACY_DEVICE_CONFIG_PATH)) {
    try {
      writeFileSync(
        LEGACY_DEVICE_CONFIG_PATH,
        JSON.stringify(merged, null, 2) + "\n"
      );
    } catch {
    }
  }
}
function parseEnvFile(filePath) {
  if (!existsSync(filePath)) return {};
  try {
    const lines = readFileSync(filePath, "utf-8").split("\n");
    const result = {};
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;
      const eqIdx = trimmed.indexOf("=");
      if (eqIdx < 1) continue;
      const key = trimmed.slice(0, eqIdx).trim();
      const value = trimmed.slice(eqIdx + 1).trim().replace(/^["']|["']$/g, "");
      result[key] = value;
    }
    return result;
  } catch {
    return {};
  }
}
function loadEnvConfig(cwd = process.cwd()) {
  const envBase = parseEnvFile(resolve(cwd, ".env"));
  const envLocal = parseEnvFile(resolve(cwd, ".env.local"));
  const file = { ...envBase, ...envLocal };
  const url = process.env["SUPABASE_URL"] || file["SUPABASE_URL"];
  const cloudApiUrl = process.env["LENSERFIGHT_CLOUD_API_URL"] || process.env["API_URL"] || file["LENSERFIGHT_CLOUD_API_URL"] || file["API_URL"];
  const anonKey = process.env["SUPABASE_ANON_KEY"] || process.env["SUPABASE_PUBLISHABLE_KEY"] || file["SUPABASE_ANON_KEY"] || file["SUPABASE_PUBLISHABLE_KEY"];
  const serviceKey = process.env["SUPABASE_SERVICE_ROLE_KEY"] || file["SUPABASE_SERVICE_ROLE_KEY"];
  const defaultStorageAdapterRaw = process.env["DEFAULT_STORAGE_ADAPTER"] || file["DEFAULT_STORAGE_ADAPTER"];
  const ollamaBaseUrl = process.env["LENSERFIGHT_OLLAMA_BASE_URL"] || process.env["OLLAMA_BASE_URL"] || file["LENSERFIGHT_OLLAMA_BASE_URL"] || file["OLLAMA_BASE_URL"];
  const apiKey = process.env["LENSERFIGHT_API_KEY"] || file["LENSERFIGHT_API_KEY"];
  const developerToken = process.env["LENSERFIGHT_DEVELOPER_TOKEN"] || file["LENSERFIGHT_DEVELOPER_TOKEN"];
  const developerTokenExpiresAt = process.env["LENSERFIGHT_DEVELOPER_TOKEN_EXPIRES_AT"] || file["LENSERFIGHT_DEVELOPER_TOKEN_EXPIRES_AT"];
  const authBaseUrl = process.env["AUTH_BASE_URL"] || file["AUTH_BASE_URL"];
  return {
    supabaseUrl: url || void 0,
    cloudApiUrl: cloudApiUrl || void 0,
    supabaseAnonKey: anonKey || void 0,
    supabaseServiceRoleKey: serviceKey || void 0,
    defaultStorageAdapter: defaultStorageAdapterRaw === "local" || defaultStorageAdapterRaw === "supabase" ? defaultStorageAdapterRaw : void 0,
    ollamaBaseUrl: ollamaBaseUrl || void 0,
    apiKey: apiKey || void 0,
    developerToken: developerToken || void 0,
    developerTokenExpiresAt: developerTokenExpiresAt || void 0,
    authBaseUrl: authBaseUrl || void 0
  };
}
function getEffectiveMode(cwd = process.cwd()) {
  if (process.env["LF_LOCAL"] === "1") {
    return { mode: "local", source: "env-local" };
  }
  if (process.env["LF_CLOUD"] === "1") {
    return { mode: "cloud", source: "env-cloud" };
  }
  if (userPreferencesExist()) {
    return { mode: readUserPreferences().mode, source: "user" };
  }
  if (projectConfigExists(cwd)) {
    return { mode: readProjectConfigAt(cwd).mode, source: "project" };
  }
  return { mode: "cloud", source: "default" };
}
function resolveConfig(cwd = process.cwd()) {
  const project = loadConfig(cwd);
  const user = loadUserConfig();
  const env2 = loadEnvConfig(cwd);
  const { mode } = getEffectiveMode(cwd);
  const isLocal = mode === "local";
  const supabaseUrl = resolveSupabaseUrl(mode, env2.supabaseUrl, project.supabaseUrl);
  const result = {
    mode,
    supabaseUrl,
    cloudApiUrl: resolveCloudApiUrl(
      mode,
      supabaseUrl || void 0,
      env2.cloudApiUrl || project.cloudApiUrl
    ),
    cloudId: project.cloudId,
    defaultStorageAdapter: env2.defaultStorageAdapter || project.defaultStorageAdapter || (isLocal ? "supabase" : void 0),
    autoOpenBrowser: project.autoOpenBrowser,
    enabledApps: project.enabledApps,
    supabaseAnonKey: resolveSupabaseAnonKey(
      mode,
      env2.supabaseAnonKey,
      user.supabaseAnonKey,
      env2.supabaseUrl
    ),
    supabaseServiceRoleKey: resolveSupabaseServiceRoleKey(
      mode,
      env2.supabaseServiceRoleKey,
      user.supabaseServiceRoleKey
    ),
    apiKey: env2.apiKey,
    developerToken: env2.developerToken || user.developerToken,
    developerTokenExpiresAt: env2.developerTokenExpiresAt || user.developerTokenExpiresAt,
    developerTokenId: user.developerTokenId,
    ollamaBaseUrl: env2.ollamaBaseUrl,
    authBaseUrl: resolveAuthBaseUrl(mode, env2.authBaseUrl),
    dbPort: project.dbPort,
    apiPort: project.apiPort,
    authToken: user.authToken,
    authRefreshToken: user.authRefreshToken,
    authExpiresAt: user.authExpiresAt,
    defaultAdapterId: user.defaultAdapterId
  };
  if (process.env["LF_DEBUG"] === "1") {
    const ts = (/* @__PURE__ */ new Date()).toISOString().slice(11, 23);
    const loaded = [".env", ".env.local"].filter((f3) => existsSync(resolve(cwd, f3)));
    process.stderr.write(`[${ts}] config: mode=${result.mode} supabaseUrl=${result.supabaseUrl} cloudApiUrl=${result.cloudApiUrl}
`);
    process.stderr.write(`[${ts}] device config: ${getDeviceConfigPath()}
`);
    process.stderr.write(`[${ts}] env files: ${loaded.length ? loaded.join(", ") : "none"}
`);
  }
  return result;
}

// libs/cli/client/src/lib/ansi.ts
var A3 = {
  reset: "\x1B[0m",
  bold: "\x1B[1m",
  dim: "\x1B[2m",
  // Standard foreground colors
  black: "\x1B[30m",
  red: "\x1B[31m",
  green: "\x1B[32m",
  yellow: "\x1B[33m",
  blue: "\x1B[34m",
  magenta: "\x1B[35m",
  cyan: "\x1B[36m",
  white: "\x1B[37m",
  // Bright (vivid) foreground variants
  gray: "\x1B[90m",
  brightRed: "\x1B[91m",
  brightGreen: "\x1B[92m",
  brightYellow: "\x1B[93m",
  brightBlue: "\x1B[94m",
  brightMagenta: "\x1B[95m",
  brightCyan: "\x1B[96m",
  brightWhite: "\x1B[97m",
  // Background colors
  bgRed: "\x1B[41m",
  bgGreen: "\x1B[42m",
  bgYellow: "\x1B[43m",
  bgBlue: "\x1B[44m",
  bgMagenta: "\x1B[45m",
  bgBlack: "\x1B[40m",
  // Cursor / screen control
  hideCursor: "\x1B[?25l",
  showCursor: "\x1B[?25h",
  clearScreen: "\x1B[2J",
  homeCursor: "\x1B[H",
  altScreenOn: "\x1B[?1049h",
  altScreenOff: "\x1B[?1049l"
};

// libs/cli/client/src/lib/docs-registry.ts
var BASE = "https://docs.lenserfight.com";
var DOCS_REGISTRY = {
  // Auth
  "auth-login": `${BASE}/reference/cli/auth`,
  "auth-tokens": `${BASE}/reference/cli/auth#developer-tokens`,
  "permissions": `${BASE}/tutorials/local/authentication#role-and-permission-model`,
  // Setup & config
  "configuration": `${BASE}/reference/cli/configuration`,
  "local-setup": `${BASE}/how-to/dev/local-setup`,
  "gateway-setup": `${BASE}/reference/cli/gateway`,
  "local-models": `${BASE}/tutorials/integrations/ollama`,
  // API & connectivity
  "connectivity": `${BASE}/tutorials/troubleshooting/database-issues`,
  "rate-limits": `${BASE}/reference/platform-api/api-overview#rate-limits`,
  "resources": `${BASE}/reference/community-api/index`,
  // Providers
  "providers": `${BASE}/reference/ai-providers`,
  "provider-keys": `${BASE}/reference/cli/keys`,
  "multimodal": `${BASE}/reference/ai-models`,
  // Workflow
  "workflow-nodes": `${BASE}/reference/workflows/workflow-node-catalog`,
  "workflow-dsl": `${BASE}/reference/workflows/execution-engine`,
  "workflow-debug": `${BASE}/tutorials/troubleshooting/workflow-issues`,
  // Battle
  "battle-lifecycle": `${BASE}/reference/battles/index`,
  "battle-replay": `${BASE}/reference/battles/index`,
  "battle-templates": `${BASE}/reference/battles/index`,
  // Schemas & validation
  "schemas": `${BASE}/reference/database/schema-overview`,
  "schema-drift": `${BASE}/reference/database/schema-overview`,
  // General troubleshooting
  "troubleshooting": `${BASE}/reference/known-limitations`,
  "doctor": `${BASE}/reference/cli/doctor`,
  "byok": `${BASE}/reference/cli/byok`,
  "cli-reference": `${BASE}/reference/cli`
};

// libs/cli/client/src/lib/exec-context.ts
var ctx = { isLocal: false, isDebug: false, commandStartMs: Date.now() };
function getExecContext() {
  return ctx;
}

// libs/cli/client/src/lib/error-reporter.ts
var RESET = A3.reset;
var BOLD = A3.bold;
var DIM = A3.dim;
var COLOR = {
  unauthorized: A3.brightRed,
  forbidden: A3.brightRed,
  not_found: A3.yellow,
  rate_limited: A3.brightYellow,
  network: A3.brightYellow,
  gateway: A3.brightYellow,
  provider: A3.brightYellow,
  multimodal: A3.cyan,
  workflow: A3.cyan,
  battle: A3.brightRed,
  schema: A3.cyan,
  config: A3.brightYellow,
  local_model: A3.yellow,
  unknown: A3.gray
};

// libs/cli/client/src/lib/redact.ts
var SENSITIVE_HEADERS = /* @__PURE__ */ new Set([
  "authorization",
  "x-api-key",
  "apikey",
  "cookie",
  "set-cookie"
]);
var SENSITIVE_PARAMS = /* @__PURE__ */ new Set([
  "key",
  "token",
  "secret",
  "access_token",
  "api_key",
  "refresh_token",
  "apikey"
]);
function redactHeaders(headers) {
  const result = {};
  for (const [k2, v2] of Object.entries(headers)) {
    result[k2] = SENSITIVE_HEADERS.has(k2.toLowerCase()) ? "[REDACTED]" : v2;
  }
  return result;
}
function redactUrl(url) {
  try {
    const parsed = new URL(url);
    if (parsed.password) parsed.password = "[REDACTED]";
    for (const key of [...parsed.searchParams.keys()]) {
      if (SENSITIVE_PARAMS.has(key.toLowerCase())) {
        parsed.searchParams.set(key, "[REDACTED]");
      }
    }
    return parsed.toString();
  } catch {
    return url;
  }
}

// libs/cli/client/src/lib/env-inspector.ts
function isCI2() {
  return !!(process.env["CI"] || process.env["GITHUB_ACTIONS"] || process.env["GITLAB_CI"] || process.env["CIRCLECI"] || process.env["TRAVIS"] || process.env["JENKINS_URL"] || process.env["BUILDKITE"] || process.env["DRONE"] || process.env["CODEBUILD_BUILD_ID"] || process.env["TF_BUILD"]);
}
function isInteractiveTTY() {
  return !!process.stdin.isTTY && !!process.stdout.isTTY;
}

// libs/cli/client/src/lib/auth.ts
import { exec } from "node:child_process";
function saveAuthTokens(tokens) {
  saveUserConfig({
    authToken: tokens.accessToken,
    authRefreshToken: tokens.refreshToken,
    authExpiresAt: tokens.expiresAt
  });
}
var warnedDevAuthBaseIgnored = false;
function buildAuthAppUrl(pathname = "/") {
  const config = resolveConfig();
  const base = config.authBaseUrl ?? PRODUCTION_AUTH_BASE_URL;
  if (config.mode === "cloud" && !warnedDevAuthBaseIgnored) {
    const envAuth = loadEnvConfig().authBaseUrl;
    if (envAuth && isDevOnlyAuthBaseUrl(envAuth) && base === PRODUCTION_AUTH_BASE_URL) {
      warnedDevAuthBaseIgnored = true;
      consola.warn(
        "Cloud login: ignoring AUTH_BASE_URL=%s from .env \u2014 using %s",
        envAuth,
        PRODUCTION_AUTH_BASE_URL
      );
    }
  }
  return new URL(pathname, base).toString();
}
function openBrowser(url) {
  const cmd = process.platform === "win32" ? `start "" "${url}"` : process.platform === "darwin" ? `open "${url}"` : `xdg-open "${url}"`;
  exec(cmd);
}
async function requestDeviceLogin() {
  assertCloudSupabaseConfigured(resolveConfig());
  return callRpc(
    "fn_auth_request_device_login",
    { p_request_ttl_minutes: 10 },
    { noAuth: true }
    // anon — never attach a stale/expired token
  );
}
async function exchangeDeviceLogin(dto) {
  return callRpc(
    "fn_auth_exchange_device_login",
    { p_request_id: dto.requestId, p_request_secret: dto.requestSecret },
    { noAuth: true }
    // anon — never attach a stale/expired token
  );
}
async function waitForSessionLogin(request, onStatus) {
  const pollMs = Math.max(request.pollIntervalSeconds, 3) * 1e3;
  const deadline = new Date(request.expiresAt).getTime();
  while (Date.now() <= deadline) {
    const status = await exchangeDeviceLogin({
      requestId: request.requestId,
      requestSecret: request.requestSecret
    });
    onStatus?.(status);
    if (status.status === "approved" && status.accessToken && status.refreshToken) {
      const tokens = {
        accessToken: status.accessToken,
        refreshToken: status.refreshToken,
        expiresAt: new Date(Date.now() + 3600 * 1e3).toISOString()
      };
      saveAuthTokens(tokens);
      return tokens;
    }
    if (status.status === "expired" || status.status === "invalid") {
      throw new Error("Login request expired or became invalid.");
    }
    await new Promise((resolve2) => setTimeout(resolve2, pollMs));
  }
  throw new Error("Login request expired before browser approval.");
}

// libs/cli/client/src/lib/auth-recovery.ts
var RESET2 = "\x1B[0m";
var BOLD2 = "\x1B[1m";
var DIM2 = "\x1B[2m";
var GREEN = "\x1B[32m";
var CYAN = "\x1B[36m";
var RED = "\x1B[31m";
var recoveryInProgress = false;
function canOpenBrowser() {
  if (process.platform === "win32" || process.platform === "darwin") return true;
  return !!(process.env["DISPLAY"] || process.env["WAYLAND_DISPLAY"] || process.env["XDG_CURRENT_DESKTOP"]);
}
async function trySilentRefresh() {
  const user = loadUserConfig();
  if (!user.authRefreshToken) return false;
  const config = resolveConfig();
  if (!config.supabaseUrl || !config.supabaseAnonKey) return false;
  try {
    const res = await fetch(
      `${config.supabaseUrl}/auth/v1/token?grant_type=refresh_token`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          apikey: config.supabaseAnonKey
        },
        body: JSON.stringify({ refresh_token: user.authRefreshToken })
      }
    );
    if (!res.ok) return false;
    const data = await res.json();
    saveUserConfig({
      authToken: data.access_token,
      authRefreshToken: data.refresh_token,
      authExpiresAt: new Date(Date.now() + data.expires_in * 1e3).toISOString()
    });
    return true;
  } catch {
    return false;
  }
}
async function runBrowserLoginFlow() {
  process.stderr.write(
    `
${CYAN}${BOLD2}  Authentication required${RESET2}
${DIM2}  No active session found. Starting browser login...${RESET2}

`
  );
  let request;
  try {
    request = await requestDeviceLogin();
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    process.stderr.write(`  ${RED}\u2717${RESET2}  Could not initiate login: ${msg}

`);
    return false;
  }
  const loginUrl = buildAuthAppUrl(request.verificationUri);
  if (canOpenBrowser()) {
    openBrowser(loginUrl);
    process.stderr.write(`${DIM2}  Browser opened.${RESET2}
`);
  }
  process.stderr.write(
    `  Approval code:  ${BOLD2}${request.userCode}${RESET2}
  ${DIM2}URL: ${CYAN}${loginUrl}${RESET2}

`
  );
  const spinFrames = ["\u280B", "\u2819", "\u2838", "\u2834", "\u2826", "\u2807"];
  let spinIdx = 0;
  const spin = setInterval(() => {
    const frame = spinFrames[spinIdx++ % spinFrames.length];
    process.stderr.write(`\r  ${CYAN}${frame}${RESET2}  Waiting for browser approval...  `);
  }, 120);
  try {
    await waitForSessionLogin(request);
    clearInterval(spin);
    process.stderr.write(
      `\r  ${GREEN}\u2713${RESET2}  Authenticated. Resuming command...${" ".repeat(20)}

`
    );
    return true;
  } catch {
    clearInterval(spin);
    process.stderr.write(
      `\r  ${RED}\u2717${RESET2}  Login cancelled or timed out.${" ".repeat(20)}

`
    );
    return false;
  }
}
async function attemptAuthRecovery() {
  if (recoveryInProgress) return false;
  recoveryInProgress = true;
  try {
    if (await trySilentRefresh()) return true;
    if (isCI2() || !isInteractiveTTY()) {
      process.stderr.write(
        `
${RED}${BOLD2}  Authentication required${RESET2}
${DIM2}  Set LF_API_KEY or run \`lf auth login\` on an interactive terminal.${RESET2}

`
      );
      return false;
    }
    return await runBrowserLoginFlow();
  } finally {
    recoveryInProgress = false;
  }
}

// libs/cli/client/src/lib/api.ts
function readActiveProfileSync() {
  try {
    const dir = path.join(getDeviceConfigDir(), "profiles");
    const activeFile = path.join(dir, ".active");
    let name;
    if (existsSync2(activeFile)) {
      const raw = readFileSync2(activeFile, "utf-8").trim();
      if (raw) name = raw;
    }
    if (!name && process.env["LF_PROFILE"]) name = process.env["LF_PROFILE"];
    if (!name) return null;
    const file = path.join(dir, `${name}.json`);
    if (!existsSync2(file)) return null;
    return JSON.parse(readFileSync2(file, "utf-8"));
  } catch {
    return null;
  }
}
function resolveConfig2(cwd) {
  const base = resolveConfig(cwd);
  const profile = readActiveProfileSync();
  if (!profile) return base;
  return {
    ...base,
    supabaseUrl: profile.supabase_url || base.supabaseUrl,
    supabaseAnonKey: profile.supabase_anon_key || base.supabaseAnonKey,
    authToken: profile.access_token ?? base.authToken,
    authRefreshToken: profile.refresh_token ?? base.authRefreshToken
  };
}
function resolveBearerToken(config, options = {}) {
  if (options.noAuth) return void 0;
  if (options.useServiceRole) {
    return config.supabaseServiceRoleKey;
  }
  const developerTokenIsActive = !!config.developerToken && (!config.developerTokenExpiresAt || new Date(config.developerTokenExpiresAt).getTime() >= Date.now());
  if (config.apiKey) return config.apiKey;
  if (options.useDeveloperToken && developerTokenIsActive) {
    return config.developerToken;
  }
  if (config.authToken) return config.authToken;
  if (developerTokenIsActive) {
    return config.developerToken;
  }
  return void 0;
}
async function tryRefreshToken(config) {
  const user = loadUserConfig();
  if (!user.authRefreshToken) return;
  const res = await fetch(
    `${config.supabaseUrl}/auth/v1/token?grant_type=refresh_token`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        apikey: config.supabaseAnonKey
      },
      body: JSON.stringify({ refresh_token: user.authRefreshToken })
    }
  );
  if (!res.ok) return;
  const data = await res.json();
  saveUserConfig({
    authToken: data.access_token,
    authRefreshToken: data.refresh_token,
    authExpiresAt: new Date(Date.now() + data.expires_in * 1e3).toISOString()
  });
}
var warnedCloudDevEnvIgnored = false;
function warnIfModeConfigMismatch(config) {
  const { mode } = getEffectiveMode();
  if (mode === "local") {
    if (config.supabaseUrl.includes("supabase.co"))
      consola.warn(`Supabase local mode active but supabaseUrl points to production: ${config.supabaseUrl}`);
    if (config.cloudApiUrl.includes("supabase.co"))
      consola.warn(`Supabase local mode active but cloudApiUrl points to production: ${config.cloudApiUrl}`);
    return;
  }
  if (mode !== "cloud" || warnedCloudDevEnvIgnored) return;
  const env2 = loadEnvConfig();
  const ignored = env2.supabaseUrl && isDevOnlyHostUrl(env2.supabaseUrl) || env2.cloudApiUrl && isDevOnlyHostUrl(env2.cloudApiUrl);
  if (!ignored) return;
  warnedCloudDevEnvIgnored = true;
  consola.warn(
    "Cloud mode: ignoring local dev SUPABASE_URL/API_URL from .env \u2014 using official LenserFight Cloud Supabase"
  );
}
function warnIfProductionInLocalMode(config) {
  warnIfModeConfigMismatch(config);
}
async function callRpcInner(functionName, params, options, retried) {
  let config = resolveConfig2();
  warnIfProductionInLocalMode(config);
  assertCloudSupabaseConfigured(config);
  if (!config.supabaseAnonKey) {
    throw new Error(
      "Supabase anon key not found. Set SUPABASE_ANON_KEY in your environment or run `lenserfight init --mode cloud`."
    );
  }
  if (!options.noAuth && !options.useServiceRole && config.authToken && config.authExpiresAt) {
    if (new Date(config.authExpiresAt) <= /* @__PURE__ */ new Date()) {
      await tryRefreshToken(config);
      config = resolveConfig2();
    }
  }
  const headers = {
    "Content-Type": "application/json",
    apikey: config.supabaseAnonKey
  };
  if (options.schema) {
    headers["Content-Profile"] = options.schema;
    headers["Accept-Profile"] = options.schema;
  }
  const bearerToken = resolveBearerToken(config, options);
  if (options.useServiceRole) {
    if (!config.supabaseServiceRoleKey) {
      throw new Error(
        "Service role key not found. Set SUPABASE_SERVICE_ROLE_KEY in your environment or the device config (run `lf doctor` to see the path)."
      );
    }
    headers["Authorization"] = `Bearer ${config.supabaseServiceRoleKey}`;
  } else if (bearerToken) {
    headers["Authorization"] = `Bearer ${bearerToken}`;
  } else if (options.requireAuth) {
    if (!retried && await attemptAuthRecovery()) {
      return callRpcInner(functionName, params, options, true);
    }
    throw new Error("Authentication required. Run `lf auth login` to sign in.");
  }
  const url = `${config.supabaseUrl}/rest/v1/rpc/${functionName}`;
  const { isDebug } = getExecContext();
  const ts = () => (/* @__PURE__ */ new Date()).toISOString().slice(11, 23);
  const t0 = isDebug ? performance.now() : 0;
  if (isDebug) {
    consola.debug(`[${ts()}] RPC POST ${redactUrl(url)}`);
    consola.debug(`[${ts()}] headers: ${JSON.stringify(redactHeaders({ ...headers }))}`);
  }
  const res = await fetch(url, {
    method: "POST",
    headers,
    body: JSON.stringify(toSnakeCaseKeys(params))
  });
  if (isDebug) consola.debug(`[${ts()}] \u2192 ${res.status} in ${(performance.now() - t0).toFixed(1)}ms`);
  if (!res.ok) {
    if (res.status === 401 && !retried && options.requireAuth && await attemptAuthRecovery()) {
      return callRpcInner(functionName, params, options, true);
    }
    const err = await res.json().catch(() => ({ message: res.statusText }));
    const httpError = Object.assign(
      new Error(err.message || err.error || res.statusText),
      { status: res.status, code: err.code }
    );
    throw httpError;
  }
  return res.json();
}
async function callRpc(functionName, params = {}, options = {}) {
  return callRpcInner(functionName, params, options, false);
}

// libs/adapters/opencode/src/lib/battle-adapter.ts
import { tool } from "@opencode-ai/plugin";
var z2 = tool.schema;
function slugify(title) {
  const base = title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 60);
  return `${base}-${Math.random().toString(36).slice(2, 7)}`;
}
var BATTLE_TYPES = [
  "ai_vs_ai",
  "human_vs_human_ai_votes",
  "human_vs_human_open_votes",
  "human_vs_ai",
  "workflow_battle",
  "lenser_battle"
];
var JUDGING_MODES = ["community_vote", "ai_judge", "rubric_score", "auto_score"];
function createBattleCreateAdapter() {
  const metadata = {
    description: "Create a new LenserFight battle to compare lens/agent outputs.",
    mirrorsMcpTool: "create_battle"
  };
  return {
    id: () => "lf_battle_create",
    metadata: () => metadata,
    toToolDefinition: () => tool({
      description: metadata.description,
      args: {
        title: z2.string().min(1).max(200).describe("Battle title."),
        task_prompt: z2.string().min(1).max(32e3).describe("The task/prompt contenders will respond to."),
        battle_type: z2.enum(BATTLE_TYPES).optional().describe("Defaults to ai_vs_ai."),
        judging_mode: z2.enum(JUDGING_MODES).optional().describe("Defaults to ai_judge."),
        max_contenders: z2.number().int().min(2).max(26).optional().describe("Defaults to 2."),
        ai_judge_model_key: z2.string().optional()
      },
      async execute(rawArgs) {
        const {
          title,
          task_prompt: taskPrompt,
          battle_type: battleType,
          judging_mode: judgingMode,
          max_contenders: maxContenders,
          ai_judge_model_key: aiJudgeModelKey
        } = rawArgs;
        const battleId = await callRpc(
          "fn_battles_create",
          {
            p_title: title,
            p_slug: slugify(title),
            p_task_prompt: taskPrompt,
            p_rubric_id: null
          },
          { requireAuth: true }
        );
        const hasConfig = battleType || judgingMode || maxContenders || aiJudgeModelKey;
        if (hasConfig) {
          await callRpc(
            "fn_mcp_battle_update_config",
            {
              p_battle_id: battleId,
              p_battle_type: battleType ?? null,
              p_judging_mode: judgingMode ?? null,
              p_max_contenders: maxContenders ?? null,
              p_ai_judge_model_key: aiJudgeModelKey ?? null
            },
            { requireAuth: true }
          );
        }
        return {
          title: `Created battle: ${title}`,
          output: `Battle "${title}" created with id ${battleId}.`,
          metadata: { id: battleId, title }
        };
      }
    })
  };
}

// libs/adapters/opencode/src/lib/cli-bridge-adapter.ts
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { tool as tool2 } from "@opencode-ai/plugin";
var z3 = tool2.schema;
var execFileAsync = promisify(execFile);
var EXECUTE_TIMEOUT_MS = 6e4;
var MAX_BUFFER_BYTES = 5 * 1024 * 1024;
function argSpecToZodField(spec) {
  const base = spec.type === "boolean" ? z3.boolean() : spec.type === "enum" && spec.options && spec.options.length > 0 ? z3.enum(spec.options) : z3.string();
  const described = base.describe(spec.description ?? spec.name);
  return spec.required ? described : described.optional();
}
function buildArgv(entry, rawArgs) {
  const positionals = [];
  const flags = [];
  for (const spec of entry.args) {
    const value = rawArgs[spec.name];
    if (value === void 0 || value === null || value === "") continue;
    if (spec.type === "positional") {
      positionals.push(String(value));
    } else if (spec.type === "boolean") {
      if (value) flags.push(`--${spec.name}`);
    } else {
      flags.push(`--${spec.name}`, String(value));
    }
  }
  return [...entry.commandPath, ...positionals, ...flags];
}
function createCliBridgeAdapter(entry, cliBinaryPath) {
  const metadata = {
    description: entry.description,
    mirrorsMcpTool: `lf ${entry.commandPath.join(" ")}`
  };
  const argsSchema = {};
  for (const spec of entry.args) argsSchema[spec.name] = argSpecToZodField(spec);
  return {
    id: () => entry.id,
    metadata: () => metadata,
    toToolDefinition: () => tool2({
      description: `Runs \`lf ${entry.commandPath.join(" ")}\`. ${entry.description}`,
      args: argsSchema,
      async execute(rawArgs) {
        const argv2 = buildArgv(entry, rawArgs);
        const label = `lf ${argv2.join(" ")}`;
        try {
          const { stdout: stdout2, stderr } = await execFileAsync(process.execPath, [cliBinaryPath, ...argv2], {
            timeout: EXECUTE_TIMEOUT_MS,
            maxBuffer: MAX_BUFFER_BYTES
          });
          return { title: label, output: stdout2 || stderr || "(no output)" };
        } catch (err) {
          const e2 = err;
          if (e2.killed || e2.signal === "SIGTERM") {
            return `${label} timed out after ${EXECUTE_TIMEOUT_MS / 1e3}s and was killed.`;
          }
          return `${label} failed: ${e2.stderr || e2.message}`;
        }
      }
    })
  };
}

// libs/adapters/opencode/src/lib/lens-adapter.ts
import { tool as tool3 } from "@opencode-ai/plugin";
var z4 = tool3.schema;
var zUuid = z4.string().regex(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i, "must be a valid UUID");
function resolveTemplate(body, params, values) {
  let resolved = body;
  const missing = [];
  for (const param of params) {
    const token = `[[:${param.id}]]`;
    const value = values[param.label] ?? values[param.label.toLowerCase()] ?? Object.entries(values).find(([k2]) => k2.toLowerCase() === param.label.toLowerCase())?.[1];
    if (value !== void 0) {
      resolved = resolved.split(token).join(value);
    } else if (!param.optional) {
      missing.push(param.label);
    } else {
      resolved = resolved.split(token).join("");
    }
  }
  return { resolved, missing };
}
function createLensRunAdapter() {
  const metadata = {
    description: "Resolve a LenserFight lens template into a ready-to-run prompt.",
    mirrorsMcpTool: "run_lens"
  };
  return {
    id: () => "lf_lens_run",
    metadata: () => metadata,
    toToolDefinition: () => tool3({
      description: metadata.description,
      args: {
        lens_id: zUuid.describe("UUID of the lens to run."),
        version_id: zUuid.optional().describe("UUID of a specific lens version; omit for the head version."),
        param_values: z4.record(z4.string(), z4.string()).default({}).describe("Values for the lens template parameters, keyed by parameter label.")
      },
      async execute(rawArgs) {
        const { lens_id: lensId, version_id: versionId, param_values: paramValues } = rawArgs;
        const data = await callRpc(
          "fn_mcp_lens_resolve_template",
          { p_lens_id: lensId, p_version_id: versionId ?? null },
          { requireAuth: true }
        );
        if (!data) return `Lens ${lensId} not found.`;
        const { resolved, missing } = resolveTemplate(data.template_body, data.parameters ?? [], paramValues);
        if (missing.length > 0) {
          return `Lens "${data.title ?? lensId}" needs ${missing.length} more parameter(s): ${missing.join(", ")}.`;
        }
        return {
          title: `Resolved lens: ${data.title ?? lensId}`,
          output: resolved,
          metadata: { lens_id: lensId, version_id: data.version_id }
        };
      }
    })
  };
}

// libs/adapters/opencode/src/lib/opencode.registry.ts
var ADAPTERS = /* @__PURE__ */ new Map();
function registerOpencodeToolAdapter(id, factory) {
  if (!id) throw new Error("Opencode tool adapter id must be a non-empty string");
  ADAPTERS.set(id, factory);
}
function getOpencodeToolAdapter(id) {
  const factory = ADAPTERS.get(id);
  if (!factory) throw new Error(`Unknown opencode tool adapter: ${id}`);
  return factory();
}
function listOpencodeToolAdapters() {
  return Array.from(ADAPTERS.keys());
}

// libs/adapters/opencode/src/lib/lf-plugin.ts
registerOpencodeToolAdapter("lf_lens_run", createLensRunAdapter);
registerOpencodeToolAdapter("lf_battle_create", createBattleCreateAdapter);
function registerCliBridgeTools() {
  const manifestPath = process.env["LF_OPENCODE_MANIFEST_PATH"];
  if (!manifestPath) return;
  let manifest;
  try {
    manifest = JSON.parse(readFileSync3(manifestPath, "utf8"));
  } catch {
    return;
  }
  for (const entry of manifest.tools) {
    registerOpencodeToolAdapter(entry.id, () => createCliBridgeAdapter(entry, manifest.cliBinaryPath));
  }
}
var LenserFightPlugin = async () => {
  registerCliBridgeTools();
  const tool4 = {};
  for (const id of listOpencodeToolAdapters()) {
    tool4[id] = getOpencodeToolAdapter(id).toToolDefinition();
  }
  return { tool: tool4 };
};
var lf_plugin_default = LenserFightPlugin;
export {
  LenserFightPlugin,
  lf_plugin_default as default
};
