/**
 * @file 尖括号块语法的 micromark 扩展（词法层）
 * @description 在行首遇到 `<` 时尝试识别 `<Name ...>` 块容器，内容区以 `concrete` 子文档
 *   递归走标准 Markdown 流，遇行首 `</Name>` 闭合。
 *   之所以写在词法层：CommonMark 的 HTML block 规则要求标签前后有空行，且标签紧贴上一段时
 *   开标签会被吞进段落；只有 flow 构造能绕开这些限制（详见 docs/markdown/03-引擎设计.md）。
 * @created 2026-10-24 20:16
 * @updated 2026-10-24 20:16
 */

import type {
  Code,
  Construct,
  Effects,
  Extension,
  State,
  Token,
  TokenizeContext,
} from "micromark-util-types";
// 副作用导入：注册自定义 token 名的 declaration merging。
// 必须显式引入，否则按入口做依赖分析的工具（如 tsup 的 dts）会漏掉这个文件，
// 导致 TokenTypeMap 未扩展、构建期类型报错。
import "./jsx-types";
import { asciiAlpha, asciiAlphanumeric, markdownLineEnding } from "micromark-util-character";
import { COMPONENTS, ITEMS } from "../registry";

const LT = 60; // <
const GT = 62; // >
const SLASH = 47; // /
const DQUOTE = 34; // "
const SQUOTE = 39; // '
const SPACE = 32; // 空格
const TAB = 9; // 制表符

/**
 * 判断标签名是否受支持（容器组件或子项组件）
 * @param name 标签名
 * @returns 受支持返回 true
 */
function isKnownName(name: string): boolean {
  return Boolean(COMPONENTS[name]) || Boolean(ITEMS[name]);
}

/**
 * 判断组件是否允许自闭合写法（`<Image />`、`<File />`）
 * @param name 标签名
 * @returns 允许自闭合返回 true
 */
function isSelfCloseAllowed(name: string): boolean {
  return COMPONENTS[name]?.selfClosing === true || ITEMS[name]?.selfClosing === true;
}

/** 每个 parser 的"打开中的块"栈：存自增 id，用于同名嵌套时判断哪一层该闭合 */
interface OpenState {
  seq: number;
  stack: number[];
}

/** 以 tokenize 上下文（parser）为键，避免多次解析之间互相污染 */
const OPEN_STATE = new WeakMap<object, OpenState>();

/**
 * 取当前 parser 的打开栈（首次访问时创建）
 * @description 以 `context.parser` 为键而不是 tokenize 上下文：容器内容在子 document 中解析，
 *   嵌套层拿到的上下文不同，只有 parser 实例是全程共享的。
 * @param context tokenize 上下文
 * @returns 打开栈状态
 */
function stateOf(context: { parser: object }): OpenState {
  let state = OPEN_STATE.get(context.parser);
  if (!state) {
    state = { seq: 0, stack: [] };
    OPEN_STATE.set(context.parser, state);
  }
  return state;
}

/** 尖括号块 construct：行首 `<` 触发 */
export const jsxBlock: Construct = {
  tokenize: tokenizeJsxBlock,
  concrete: true,
};

/**
 * 生成 micromark 扩展
 * @returns flow 扩展，键为 `<` 的字符码
 */
export function jsxBlocks(): Extension {
  return {
    flow: {
      [LT]: jsxBlock,
    },
  };
}

/**
 * 尖括号块 tokenizer
 * @description 开标签（名字 + 属性扫描）→ 行尾 → 内容区（chunkDocument 逐行）→ 行首闭合标签
 * @param this tokenize 上下文
 * @param effects token 事件接口
 * @param ok 匹配成功回调
 * @param nok 匹配失败回调（事件自动回滚，交回内置 flow）
 * @returns 起始状态
 */
function tokenizeJsxBlock(
  this: TokenizeContext,
  effects: Effects,
  ok: State,
  nok: State,
): State {
  // micromark tokenizer 的状态函数是闭包，必须在入口保存上下文（同官方插件的写法）
  // eslint-disable-next-line @typescript-eslint/no-this-alias
  const self = this;
  let name = "";
  let closingName = "";
  let prevCode: Code = null;
  let quote: Code = null;
  let hasAttributes = false;
  let previous: Token | undefined;
  /** 本次构造对应的块 id（-1 表示还没登记） */
  const state = stateOf(self);
  let myId = -1;

  /** 从打开栈移除本层（只有栈顶是自己时才移除，避免误删外层） */
  function popSelf(): void {
    if (state.stack[state.stack.length - 1] === myId) state.stack.pop();
  }

  /** 非惰性行 construct（attempt/check 需要 Construct 对象而非裸函数） */
  const nonLazyLine: Construct = { tokenize: tokenizeNonLazyLine, partial: true };
  /** 同名嵌套深度：内容区里还开着几层同名容器 */
  let nestedDepth = 0;
  /** 闭合标签探测（check 会回滚，不消费内容） */
  const closeConstruct: Construct = { tokenize: tokenizeCloseTag, partial: true };
  /** 同名开标签探测：用于深度计数，避免把内层的 `</Name>` 当成本层闭合 */
  const openConstruct: Construct = { tokenize: tokenizeOpenProbe, partial: true };
  /** 行首缩进探测：缩进 + 已知标签名时，把缩进移出内容区（见 lineStart） */
  const indentConstruct: Construct = { tokenize: tokenizeIndentTag, partial: true };

  return start;

  /**
   * 起始：消费 `<`
   * @description 容器必须顶格书写。缩进 ≥4 空格会被 CommonMark 判为缩进代码块，
   *   而嵌套容器天然 ≥4 空格，因此本方案不支持缩进排版（与 fumadocs 的 MDX 解析器不同）。
   */
  function start(code: Code): State | undefined {
    if (code !== LT) return nok(code);
    effects.enter("jsxBlock");
    effects.enter("jsxBlockOpenTag");
    effects.enter("jsxBlockOpenTagMarker");
    effects.consume(code);
    effects.exit("jsxBlockOpenTagMarker");
    return openName;
  }

  /** 开标签名字起始 */
  function openName(code: Code): State | undefined {
    if (code !== null && asciiAlpha(code)) {
      effects.enter("jsxBlockName");
      effects.consume(code);
      return inName;
    }
    return nok(code);
  }

  /** 开标签名字后续字符 */
  function inName(code: Code): State | undefined {
    if (code !== null && asciiAlphanumeric(code)) {
      effects.consume(code);
      return inName;
    }
    name = self.sliceSerialize(effects.exit("jsxBlockName"), true);
    if (!isKnownName(name)) return nok(code);
    return afterName(code);
  }

  /** 名字之后：`>` 起内容区，`/>` 自闭合，其余进入属性扫描 */
  function afterName(code: Code): State | undefined {
    if (code === GT) return closeOpenTag(code, false);
    if (code === null || markdownLineEnding(code)) return nok(code);
    hasAttributes = true;
    effects.enter("jsxBlockAttributes");
    return attributes(code);
  }

  /** 属性扫描：忽略引号内的 `>`，用前一字符判断自闭合 */
  function attributes(code: Code): State | undefined {
    if (code === null || markdownLineEnding(code)) return nok(code);
    if (quote !== null) {
      effects.consume(code);
      if (code === quote) quote = null;
      prevCode = code;
      return attributes;
    }
    if (code === DQUOTE || code === SQUOTE) {
      quote = code;
      effects.consume(code);
      prevCode = code;
      return attributes;
    }
    if (code === GT) return closeOpenTag(code, prevCode === SLASH);
    effects.consume(code);
    prevCode = code;
    return attributes;
  }

  /**
   * 结束开标签
   * @description 必须先 `enter` 一个 token 再 `consume`：micromark 要求 consume 时
   *   最后一个 token 处于打开状态，直接跟在 `exit` 之后 consume 会在 development
   *   条件触发 `expected last token to be open` 断言。
   * @param code 当前字符（`>`）
   * @param selfClosing 是否 `/>` 形式
   * @returns 下一个状态
   */
  function closeOpenTag(code: Code, selfClosing: boolean): State | undefined {
    if (selfClosing && !isSelfCloseAllowed(name)) return nok(code);
    effects.enter("jsxBlockOpenTagEnd");
    effects.consume(code as number);
    effects.exit("jsxBlockOpenTagEnd");
    if (hasAttributes) effects.exit("jsxBlockAttributes");
    effects.exit("jsxBlockOpenTag");
    // 登记本层：非自闭合的块进入打开栈，用于同名嵌套时判定闭合归属
    if (!selfClosing) {
      myId = state.seq + 1;
      state.seq = myId;
      state.stack.push(myId);
    }
    return selfClosing ? finishBlock : openAfter;
  }

  /**
   * 开标签后必须是行尾（同一行有正文一律不支持）
   * @description interrupt 表示当前尝试发生在段落延续中：此处返回 ok 才能打断段落
   *   （`<Callout>` 紧贴上一段时仍成块，靠的就是这一支）。
   */
  function openAfter(code: Code): State | undefined {
    if (code === null) return unclosed(code);
    if (markdownLineEnding(code)) {
      if (self.interrupt) {
        popSelf();
        effects.exit("jsxBlock");
        return ok(code);
      }
      return effects.attempt(nonLazyLine, contentStart, unclosed)(code);
    }
    // 同行有正文：撤销已登记的打开记录后再失败回滚
    popSelf();
    return nok(code);
  }

  /** 进入内容区 */
  function contentStart(code: Code): State | undefined {
    effects.enter("jsxBlockContent");
    return lineStart(code);
  }

  /**
   * 行首：先探测闭合标签形态，再决定是"本层闭合"还是"属于内层、并入内容"
   * @description 容器内容由 `chunkDocument` 在**后处理阶段**作为子文档解析，tokenize 阶段
   *   看不到里面的嵌套块，因此必须自己数同名深度，否则会把内层的 `</Name>` 当成本层闭合。
   */
  function lineStart(code: Code): State | undefined {
    // 缩进排版：容器内再缩进 4 空格会被 CommonMark 判成缩进代码块（README 的 Files 示例即如此），
    // 因此行首若为「缩进 + 已知标签」就把缩进移出内容区，标签回到列 0 再判定闭合/开标签。
    // 只对标签生效：缩进代码块（缩进后是普通文本）、未知标签（如 <div>）一律不受影响。
    return effects.check(indentConstruct, indentDetected, plainLineStart)(code);
  }

  /** 缩进已确认属于标签：消费掉缩进（不进入内容区），回到行首重新判定 */
  function indentDetected(code: Code): State | undefined {
    effects.enter("jsxBlockIndent");
    return consumeIndent(code);
  }

  /** 消费行首缩进 */
  function consumeIndent(code: Code): State | undefined {
    if (code === SPACE || code === TAB) {
      effects.consume(code);
      return consumeIndent;
    }
    effects.exit("jsxBlockIndent");
    return plainLineStart(code);
  }

  /** 无缩进的行首判定 */
  function plainLineStart(code: Code): State | undefined {
    return effects.check(closeConstruct, closeDetected, notClose)(code);
  }

  /** 是本层名字的闭合标签 */
  function closeDetected(code: Code): State | undefined {
    if (nestedDepth > 0) {
      nestedDepth -= 1;
      return chunkStart(code);
    }
    return effects.attempt(closeConstruct, afterContent, chunkStart)(code);
  }

  /** 不是闭合标签：探测是否同名开标签 */
  function notClose(code: Code): State | undefined {
    return effects.check(openConstruct, openDetected, chunkStart)(code);
  }

  /** 同名开标签：深度 +1，整行并入内容 */
  function openDetected(code: Code): State | undefined {
    nestedDepth += 1;
    return chunkStart(code);
  }

  /** 子文档行起始 */
  function chunkStart(code: Code): State | undefined {
    if (code === null) return afterContent(code);
    // 空行也属于内容；不做惰性判定（惰性判定会让内层容器提前收尾）
    return chunkNonLazyStart(code);
  }

  /** 开启一行子文档 */
  function chunkNonLazyStart(code: Code): State | undefined {
    const token = effects.enter("chunkDocument", { contentType: "document", previous });
    if (previous) previous.next = token;
    previous = token;
    return contentContinue(code);
  }

  /** 消费一行内容直到行尾 */
  function contentContinue(code: Code): State | undefined {
    if (code === null) {
      const t = effects.exit("chunkDocument");
      self.parser.lazy[t.start.line] = false;
      return afterContent(code);
    }
    if (markdownLineEnding(code)) {
      // 每行结束都回到 lineStart 重新判定闭合。
      // 不能在这里做"惰性行"判定：嵌套同名容器时，内层的 `</Name>` 会被当成惰性续行，
      // 导致内层内容提前结束、闭合标签被外层吃掉。
      return nonLazyLineAfter(code);
    }
    effects.consume(code);
    return contentContinue;
  }

  /** 非惰性行：吃掉换行后结束该行子文档 */
  function nonLazyLineAfter(code: Code): State | undefined {
    effects.consume(code);
    const t = effects.exit("chunkDocument");
    self.parser.lazy[t.start.line] = false;
    return lineStart;
  }



  /** 内容区结束（遇到闭合标签） */
  function afterContent(code: Code): State | undefined {
    effects.exit("jsxBlockContent");
    return finishBlock(code);
  }

  /** 块结束 */
  function finishBlock(code: Code): State | undefined {
    popSelf();
    effects.exit("jsxBlock");
    return ok(code);
  }

  /** 未闭合到文件末尾：按延伸到末尾处理（openTag 已在进入本状态前退出） */
  function unclosed(code: Code): State | undefined {
    popSelf();
    effects.exit("jsxBlock");
    return ok(code);
  }

  /** 闭合标签检测：`</Name>`，名字必须与开标签一致（需顶格） */
  function tokenizeCloseTag(effects2: Effects, ok2: State, nok2: State): State {
    return closeStart;

    /** `<` */
    function closeStart(code: Code): State | undefined {
      if (code !== LT) return nok2(code);
      effects2.enter("jsxBlockCloseTag");
      effects2.enter("jsxBlockCloseTagMarker");
      effects2.consume(code);
      return closeSlash;
    }

    /** `/` */
    function closeSlash(code: Code): State | undefined {
      if (code !== SLASH) return nok2(code);
      effects2.consume(code);
      effects2.exit("jsxBlockCloseTagMarker");
      return closeNameStart;
    }

    /** 闭合名字起始 */
    function closeNameStart(code: Code): State | undefined {
      if (code !== null && asciiAlpha(code)) {
        effects2.enter("jsxBlockCloseName");
        effects2.consume(code);
        return closeNameRest;
      }
      return nok2(code);
    }

    /** 闭合名字后续 */
    function closeNameRest(code: Code): State | undefined {
      if (code !== null && asciiAlphanumeric(code)) {
        effects2.consume(code);
        return closeNameRest;
      }
      closingName = self.sliceSerialize(effects2.exit("jsxBlockCloseName"), true);
      if (closingName !== name) return nok2(code);
      // 只有最内层才能闭合：同名的外层必须让位给内层，否则内层会被外层"抢答"
      if (state.stack[state.stack.length - 1] !== myId) return nok2(code);
      if (code !== GT) return nok2(code);
      effects2.enter("jsxBlockCloseTagEnd");
      effects2.consume(code);
      effects2.exit("jsxBlockCloseTagEnd");
      effects2.exit("jsxBlockCloseTag");
      return ok2(code);
    }
  }

  /**
   * 同名开标签探测：判断"行首是否 `<Name …>` 且非自闭合"
   * @description 用 `check` 调用，事件会整体回滚，因此这里可以放心 enter/consume；
   *   仅用于同名嵌套深度计数，不产生任何节点。
   */
  function tokenizeOpenProbe(effects2: Effects, ok2: State, nok2: State): State {
    let index = 0;
    let probeQuote: Code = null;
    let probePrev: Code = null;
    return probeStart;

    /** `<` */
    function probeStart(code: Code): State | undefined {
      if (code !== LT) return nok2(code);
      effects2.enter("jsxBlockProbe");
      effects2.consume(code);
      return probeName;
    }

    /** 名字必须与当前层一致 */
    function probeName(code: Code): State | undefined {
      if (index < name.length) {
        if (code !== name.charCodeAt(index)) return nok2(code);
        effects2.consume(code as number);
        index += 1;
        return probeName;
      }
      if (code === SPACE) {
        effects2.consume(code);
        return probeAttrs;
      }
      if (code === GT) {
        effects2.consume(code);
        effects2.exit("jsxBlockProbe");
        return ok2(code);
      }
      return nok2(code);
    }

    /** 属性扫描：引号内忽略 `>`；结尾 `/` 表示自闭合，不算嵌套开始 */
    function probeAttrs(code: Code): State | undefined {
      if (code === null || markdownLineEnding(code)) return nok2(code);
      if (probeQuote !== null) {
        effects2.consume(code);
        if (code === probeQuote) probeQuote = null;
        return probeAttrs;
      }
      if (code === DQUOTE || code === SQUOTE) {
        probeQuote = code;
        effects2.consume(code);
        return probeAttrs;
      }
      if (code === GT) {
        effects2.consume(code);
        effects2.exit("jsxBlockProbe");
        return probePrev === SLASH ? nok2(code) : ok2(code);
      }
      probePrev = code;
      effects2.consume(code);
      return probeAttrs;
    }
  }

  /**
   * 行首缩进探测：`[ \t]+<[/]Name`
   * @description 只在名字属于 registry 时成立，避免把「缩进代码块里的普通文本」误当标签去缩进。
   *   用 `check` 调用，事件会回滚，不消费任何字符。
   */
  function tokenizeIndentTag(effects2: Effects, ok2: State, nok2: State): State {
    let probe = "";
    return indentStart;

    /** 起始：进入缩进 token 后开始吃空白 */
    function indentStart(): State | undefined {
      effects2.enter("jsxBlockIndent");
      return indentSpace;
    }

    /** 行首空白 */
    function indentSpace(code: Code): State | undefined {
      if (code === SPACE || code === TAB) {
        effects2.consume(code);
        return indentSpace;
      }
      if (code === LT) {
        effects2.consume(code);
        return indentLt;
      }
      return nok2(code);
    }

    /** `<` 之后可以是 `/`（闭合标签） */
    function indentLt(code: Code): State | undefined {
      if (code === SLASH) {
        effects2.consume(code);
        return indentNameStart;
      }
      return indentNameStart(code);
    }

    /** 名字首字符 */
    function indentNameStart(code: Code): State | undefined {
      if (code !== null && asciiAlpha(code)) {
        probe = String.fromCharCode(code);
        effects2.consume(code);
        return indentNameRest;
      }
      return nok2(code);
    }

    /** 名字后续字符：读全后校验注册表 */
    function indentNameRest(code: Code): State | undefined {
      if (code !== null && asciiAlphanumeric(code)) {
        probe += String.fromCharCode(code);
        effects2.consume(code);
        return indentNameRest;
      }
      effects2.exit("jsxBlockIndent");
      return isKnownName(probe) ? ok2(code) : nok2(code);
    }
  }

  /** 非惰性行检测（懒续行不接管） */
  function tokenizeNonLazyLine(effects2: Effects, ok2: State, nok2: State): State {
    return nonLazyStart;

    /** 吃掉换行 */
    function nonLazyStart(code: Code): State | undefined {
      effects2.enter("lineEnding");
      effects2.consume(code as number);
      effects2.exit("lineEnding");
      return nonLazyAfter;
    }

    /** 下一行是否非惰性 */
    function nonLazyAfter(code: Code): State | undefined {
      return self.parser.lazy[self.now().line] ? nok2(code) : ok2(code);
    }
  }
}
