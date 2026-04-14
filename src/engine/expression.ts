/**
 * Safe declarative expression DSL for ISO 9606-1 rule tables.
 *
 * Grammar (recursive descent):
 *   expr      := orExpr
 *   orExpr    := andExpr ("||" andExpr)*
 *   andExpr   := cmpExpr ("&&" cmpExpr)*
 *   cmpExpr   := addExpr ( ("==" | "!=" | "<=" | ">=" | "<" | ">") addExpr )?
 *   addExpr   := mulExpr ( ("+" | "-") mulExpr )*
 *   mulExpr   := unary ( ("*" | "/") unary )*
 *               | unary ident                  // implicit multiply (e.g. 2t)
 *   unary     := ("-" | "!") unary | primary
 *   primary   := number | string | ident | call | "(" expr ")"
 *   call      := ident "(" (expr ("," expr)*)? ")"
 *
 * Allowed identifiers (variables): t, D, productType
 * Allowed function calls: max, min
 * No `eval`, `Function`, or `vm` is used. Pure tokenizer + parser.
 */

export class ExpressionError extends Error {
  constructor(message: string) {
    super(`[ExpressionError] ${message}`);
    this.name = 'ExpressionError';
  }
}

// ---------------------------------------------------------------------------
// Tokenizer
// ---------------------------------------------------------------------------

type TokenType =
  | 'number'
  | 'ident'
  | 'string'
  | 'op'
  | 'lparen'
  | 'rparen'
  | 'comma';

interface Token {
  type: TokenType;
  value: string;
  pos: number;
}

const ALLOWED_IDENTS = new Set(['t', 'D', 'productType', 'true', 'false', 'null']);
const ALLOWED_FUNCS = new Set(['max', 'min']);
const MULTI_CHAR_OPS = ['==', '!=', '<=', '>=', '&&', '||'];
const SINGLE_CHAR_OPS = new Set(['+', '-', '*', '/', '<', '>', '!']);

function tokenize(src: string): Token[] {
  const tokens: Token[] = [];
  let i = 0;
  const n = src.length;

  while (i < n) {
    const ch = src[i];

    // Whitespace
    if (ch === ' ' || ch === '\t' || ch === '\n' || ch === '\r') {
      i++;
      continue;
    }

    // Numbers (integer or float)
    if ((ch >= '0' && ch <= '9') || (ch === '.' && /[0-9]/.test(src[i + 1] ?? ''))) {
      const start = i;
      while (i < n && /[0-9]/.test(src[i])) i++;
      if (src[i] === '.') {
        i++;
        while (i < n && /[0-9]/.test(src[i])) i++;
      }
      tokens.push({ type: 'number', value: src.slice(start, i), pos: start });
      continue;
    }

    // Identifiers
    if ((ch >= 'a' && ch <= 'z') || (ch >= 'A' && ch <= 'Z') || ch === '_') {
      const start = i;
      while (i < n && /[a-zA-Z0-9_]/.test(src[i])) i++;
      const word = src.slice(start, i);
      tokens.push({ type: 'ident', value: word, pos: start });
      continue;
    }

    // String literal (single quotes only — declarative DSL convention)
    if (ch === "'") {
      const start = i;
      i++;
      let buf = '';
      while (i < n && src[i] !== "'") {
        if (src[i] === '\\' && i + 1 < n) {
          buf += src[i + 1];
          i += 2;
        } else {
          buf += src[i];
          i++;
        }
      }
      if (i >= n) throw new ExpressionError(`Unterminated string starting at ${start}`);
      i++; // skip closing quote
      tokens.push({ type: 'string', value: buf, pos: start });
      continue;
    }

    // Punctuation
    if (ch === '(') {
      tokens.push({ type: 'lparen', value: '(', pos: i });
      i++;
      continue;
    }
    if (ch === ')') {
      tokens.push({ type: 'rparen', value: ')', pos: i });
      i++;
      continue;
    }
    if (ch === ',') {
      tokens.push({ type: 'comma', value: ',', pos: i });
      i++;
      continue;
    }

    // Multi-char operators
    const two = src.slice(i, i + 2);
    if (MULTI_CHAR_OPS.includes(two)) {
      tokens.push({ type: 'op', value: two, pos: i });
      i += 2;
      continue;
    }

    // Single-char operators
    if (SINGLE_CHAR_OPS.has(ch)) {
      tokens.push({ type: 'op', value: ch, pos: i });
      i++;
      continue;
    }

    throw new ExpressionError(`Illegal character '${ch}' at position ${i}`);
  }

  return tokens;
}

// ---------------------------------------------------------------------------
// AST
// ---------------------------------------------------------------------------

type Node =
  | { kind: 'num'; value: number }
  | { kind: 'str'; value: string }
  | { kind: 'bool'; value: boolean }
  | { kind: 'null' }
  | { kind: 'var'; name: string }
  | { kind: 'unary'; op: string; arg: Node }
  | { kind: 'binary'; op: string; left: Node; right: Node }
  | { kind: 'logical'; op: string; left: Node; right: Node }
  | { kind: 'call'; name: string; args: Node[] };

// ---------------------------------------------------------------------------
// Parser (recursive descent)
// ---------------------------------------------------------------------------

class Parser {
  private pos = 0;
  constructor(private readonly tokens: Token[]) {}

  parse(): Node {
    const node = this.parseOr();
    if (this.pos < this.tokens.length) {
      const t = this.tokens[this.pos];
      throw new ExpressionError(`Unexpected token '${t.value}' at position ${t.pos}`);
    }
    return node;
  }

  private peek(): Token | undefined {
    return this.tokens[this.pos];
  }
  private eat(): Token {
    const t = this.tokens[this.pos];
    if (!t) throw new ExpressionError('Unexpected end of expression');
    this.pos++;
    return t;
  }
  private match(type: TokenType, value?: string): boolean {
    const t = this.peek();
    if (!t) return false;
    if (t.type !== type) return false;
    if (value !== undefined && t.value !== value) return false;
    return true;
  }

  private parseOr(): Node {
    let left = this.parseAnd();
    while (this.match('op', '||')) {
      this.eat();
      const right = this.parseAnd();
      left = { kind: 'logical', op: '||', left, right };
    }
    return left;
  }

  private parseAnd(): Node {
    let left = this.parseCmp();
    while (this.match('op', '&&')) {
      this.eat();
      const right = this.parseCmp();
      left = { kind: 'logical', op: '&&', left, right };
    }
    return left;
  }

  private parseCmp(): Node {
    const left = this.parseAdd();
    const t = this.peek();
    if (t && t.type === 'op' && ['==', '!=', '<=', '>=', '<', '>'].includes(t.value)) {
      this.eat();
      const right = this.parseAdd();
      return { kind: 'binary', op: t.value, left, right };
    }
    return left;
  }

  private parseAdd(): Node {
    let left = this.parseMul();
    while (this.match('op', '+') || this.match('op', '-')) {
      const op = this.eat().value;
      const right = this.parseMul();
      left = { kind: 'binary', op, left, right };
    }
    return left;
  }

  private parseMul(): Node {
    let left = this.parseUnary();
    while (true) {
      if (this.match('op', '*') || this.match('op', '/')) {
        const op = this.eat().value;
        const right = this.parseUnary();
        left = { kind: 'binary', op, left, right };
        continue;
      }
      // Implicit multiply: number followed by ident or '(' (e.g. 2t, 2D, 2(t))
      // Only apply when left is a numeric primary AND next is an ident/lparen
      // and left was the immediately preceding numeric token (no other intervening op).
      const next = this.peek();
      if (
        next &&
        (next.type === 'ident' || next.type === 'lparen') &&
        this.isNumericPrimary(left)
      ) {
        const right = this.parseUnary();
        left = { kind: 'binary', op: '*', left, right };
        continue;
      }
      break;
    }
    return left;
  }

  private isNumericPrimary(n: Node): boolean {
    return n.kind === 'num';
  }

  private parseUnary(): Node {
    if (this.match('op', '-')) {
      this.eat();
      const arg = this.parseUnary();
      return { kind: 'unary', op: '-', arg };
    }
    if (this.match('op', '!')) {
      this.eat();
      const arg = this.parseUnary();
      return { kind: 'unary', op: '!', arg };
    }
    return this.parsePrimary();
  }

  private parsePrimary(): Node {
    const t = this.peek();
    if (!t) throw new ExpressionError('Unexpected end of expression');

    if (t.type === 'number') {
      this.eat();
      return { kind: 'num', value: parseFloat(t.value) };
    }
    if (t.type === 'string') {
      this.eat();
      return { kind: 'str', value: t.value };
    }
    if (t.type === 'lparen') {
      this.eat();
      const inner = this.parseOr();
      if (!this.match('rparen')) {
        throw new ExpressionError(`Expected ')' at position ${this.peek()?.pos ?? '?'}`);
      }
      this.eat();
      return inner;
    }
    if (t.type === 'ident') {
      this.eat();
      // Function call?
      if (this.match('lparen')) {
        if (!ALLOWED_FUNCS.has(t.value)) {
          throw new ExpressionError(`Disallowed function '${t.value}' at position ${t.pos}`);
        }
        this.eat(); // lparen
        const args: Node[] = [];
        if (!this.match('rparen')) {
          args.push(this.parseOr());
          while (this.match('comma')) {
            this.eat();
            args.push(this.parseOr());
          }
        }
        if (!this.match('rparen')) {
          throw new ExpressionError(`Expected ')' after args of '${t.value}'`);
        }
        this.eat();
        return { kind: 'call', name: t.value, args };
      }
      // Variable / literal keyword
      if (t.value === 'true') return { kind: 'bool', value: true };
      if (t.value === 'false') return { kind: 'bool', value: false };
      if (t.value === 'null') return { kind: 'null' };
      if (!ALLOWED_IDENTS.has(t.value)) {
        throw new ExpressionError(`Disallowed identifier '${t.value}' at position ${t.pos}`);
      }
      return { kind: 'var', name: t.value };
    }

    throw new ExpressionError(`Unexpected token '${t.value}' at position ${t.pos}`);
  }
}

// ---------------------------------------------------------------------------
// Evaluator
// ---------------------------------------------------------------------------

type Value = number | string | boolean | null;

function evalNode(node: Node, vars: Record<string, number | string>): Value {
  switch (node.kind) {
    case 'num':
      return node.value;
    case 'str':
      return node.value;
    case 'bool':
      return node.value;
    case 'null':
      return null;
    case 'var': {
      if (!(node.name in vars)) {
        throw new ExpressionError(`Variable '${node.name}' not provided`);
      }
      return vars[node.name];
    }
    case 'unary': {
      const v = evalNode(node.arg, vars);
      if (node.op === '-') {
        if (typeof v !== 'number') {
          throw new ExpressionError(`Unary '-' requires number, got ${typeof v}`);
        }
        return -v;
      }
      if (node.op === '!') {
        return !truthy(v);
      }
      throw new ExpressionError(`Unknown unary op '${node.op}'`);
    }
    case 'binary': {
      const l = evalNode(node.left, vars);
      const r = evalNode(node.right, vars);
      return evalBinary(node.op, l, r);
    }
    case 'logical': {
      const l = evalNode(node.left, vars);
      if (node.op === '&&') return truthy(l) ? evalNode(node.right, vars) : l;
      if (node.op === '||') return truthy(l) ? l : evalNode(node.right, vars);
      throw new ExpressionError(`Unknown logical op '${node.op}'`);
    }
    case 'call': {
      const args = node.args.map((a) => evalNode(a, vars));
      if (node.name === 'max' || node.name === 'min') {
        if (args.length === 0) throw new ExpressionError(`'${node.name}' requires args`);
        const nums = args.map((a) => {
          if (typeof a !== 'number') throw new ExpressionError(`'${node.name}' args must be numeric`);
          return a;
        });
        return node.name === 'max' ? Math.max(...nums) : Math.min(...nums);
      }
      throw new ExpressionError(`Unknown function '${node.name}'`);
    }
  }
}

function truthy(v: Value): boolean {
  if (v === null || v === undefined) return false;
  if (typeof v === 'boolean') return v;
  if (typeof v === 'number') return v !== 0;
  if (typeof v === 'string') return v.length > 0;
  return Boolean(v);
}

function evalBinary(op: string, l: Value, r: Value): Value {
  switch (op) {
    case '+':
    case '-':
    case '*':
    case '/': {
      if (typeof l !== 'number' || typeof r !== 'number') {
        throw new ExpressionError(`Arithmetic '${op}' requires numbers`);
      }
      if (op === '+') return l + r;
      if (op === '-') return l - r;
      if (op === '*') return l * r;
      if (op === '/') {
        if (r === 0) throw new ExpressionError('Division by zero');
        return l / r;
      }
      return 0;
    }
    case '==':
      return l === r;
    case '!=':
      return l !== r;
    case '<':
    case '<=':
    case '>':
    case '>=': {
      if (typeof l !== 'number' || typeof r !== 'number') {
        throw new ExpressionError(`Comparison '${op}' requires numbers`);
      }
      if (op === '<') return l < r;
      if (op === '<=') return l <= r;
      if (op === '>') return l > r;
      return l >= r;
    }
    default:
      throw new ExpressionError(`Unknown binary op '${op}'`);
  }
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

function parse(expr: string): Node {
  const tokens = tokenize(expr);
  if (tokens.length === 0) throw new ExpressionError('Empty expression');
  return new Parser(tokens).parse();
}

export function evaluatePredicate(
  expr: string,
  vars: Record<string, number | string>,
): boolean {
  const result = evalNode(parse(expr), vars);
  return truthy(result);
}

export function evaluateExpression(
  expr: string | number | null,
  vars: Record<string, number | string>,
): number | null {
  if (expr === null || expr === undefined) return null;
  if (typeof expr === 'number') return expr;
  const result = evalNode(parse(expr), vars);
  if (result === null) return null;
  if (typeof result !== 'number') {
    throw new ExpressionError(`Expression did not evaluate to number: ${String(result)}`);
  }
  return result;
}
