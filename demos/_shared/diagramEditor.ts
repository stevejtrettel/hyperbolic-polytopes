// An interactive Coxeter-diagram editor.
//
// The canonical data is the COMPLETE set of pairwise orders (`CoxeterPairData`).
// "Coxeter" and "Artin" are two VIEWS of that same data: Coxeter hides the
// order-2 edges, Artin hides the order-∞ edges (see coxeter/pairData). Switching
// the view only re-renders which edges are drawn; the data — and any tiling built
// from it — is unchanged. The editor emits the full pair data on every
// structural/order change (NOT on a view switch).
//
// Controls: "+ node" to add · drag to move · click node then node to connect ·
// click an edge's number for a dropdown (2…10, ∞) · select a node and click its ✕
// (or press Delete) to remove it.

import {
  hiddenOrder,
  type CoxeterOrder,
  type CoxeterPairData,
  type DiagramEdge,
  type DiagramView,
} from '../../src/coxeter/pairData';

/** The editor's seed: a generator list and the edges drawn in the initial view. */
export interface DiagramSeed {
  generators: string[];
  edges: DiagramEdge[];
}

interface Node {
  id: string;
  x: number;
  y: number;
}

const SVG_NS = 'http://www.w3.org/2000/svg';
const ORDER_CHOICES: CoxeterOrder[] = [2, 3, 4, 5, 6, 7, 8, 9, 10, 'infinity'];
const NODE_R = 15;
const DRAG_THRESHOLD = 4;
const orderLabel = (o: CoxeterOrder): string => (o === 'infinity' ? '∞' : String(o));

function svgEl<K extends keyof SVGElementTagNameMap>(tag: K, attrs: Record<string, string | number>): SVGElementTagNameMap[K] {
  const node = document.createElementNS(SVG_NS, tag);
  for (const [k, v] of Object.entries(attrs)) node.setAttribute(k, String(v));
  return node;
}

export class DiagramEditor {
  private nodes: Node[] = [];
  private order = new Map<string, CoxeterOrder>(); // complete: every pair keyed "a|b"
  private view: DiagramView;
  private selected: string | null = null;
  private readonly onChange: (data: CoxeterPairData) => void;

  private readonly width = 360;
  private readonly height = 320;
  private readonly svg: SVGSVGElement;
  private readonly footer: HTMLDivElement;
  private readonly viewSelect: HTMLSelectElement;

  constructor(opts: { initial: DiagramSeed; view?: DiagramView; onChange: (data: CoxeterPairData) => void }) {
    this.onChange = opts.onChange;
    this.view = opts.view ?? 'artin';
    this.layout(opts.initial);

    const panel = document.createElement('div');
    Object.assign(panel.style, {
      position: 'fixed', top: '12px', left: '12px', width: `${this.width}px`,
      background: 'rgba(252,252,252,0.95)', border: '1px solid #cfcfcf', borderRadius: '6px',
      boxShadow: '0 2px 10px rgba(0,0,0,0.12)', font: '12px system-ui, sans-serif', color: '#333',
      userSelect: 'none', zIndex: '20',
    });

    const header = document.createElement('div');
    Object.assign(header.style, { display: 'flex', alignItems: 'center', gap: '8px', padding: '6px 10px', borderBottom: '1px solid #e6e6e6' });
    const title = document.createElement('span');
    title.textContent = 'Coxeter diagram';
    title.style.fontWeight = '600';
    title.style.flex = '1';

    this.viewSelect = document.createElement('select');
    for (const [label, v] of [['Coxeter view', 'coxeter'], ['Artin view', 'artin']] as const) {
      const o = document.createElement('option');
      o.value = v;
      o.textContent = label;
      this.viewSelect.append(o);
    }
    this.viewSelect.value = this.view;
    this.viewSelect.style.font = 'inherit';
    this.viewSelect.addEventListener('change', () => {
      this.view = this.viewSelect.value as DiagramView; // view switch: redraw only, data unchanged
      this.render();
    });

    const addBtn = document.createElement('button');
    addBtn.textContent = '+ node';
    addBtn.style.font = 'inherit';
    addBtn.style.cursor = 'pointer';
    addBtn.addEventListener('click', () => this.addNode());

    header.append(title, this.viewSelect, addBtn);

    this.svg = svgEl('svg', { width: this.width, height: this.height, viewBox: `0 0 ${this.width} ${this.height}` });
    this.svg.style.display = 'block';

    this.footer = document.createElement('div');
    Object.assign(this.footer.style, { padding: '6px 10px', borderTop: '1px solid #e6e6e6', color: '#777', lineHeight: '1.5' });

    panel.append(header, this.svg, this.footer);
    document.body.append(panel);

    window.addEventListener('keydown', (e) => this.onKey(e));
    this.render();
    this.setStatus('');
    queueMicrotask(() => this.emit());
  }

  setStatus(message: string): void {
    this.footer.innerHTML = message
      ? `<span style="color:#c0392b">${message}</span>`
      : 'drag: move · node→node: connect · click number: order · select + ✕ / ⌫: delete';
  }

  private key(a: string, b: string): string {
    return a < b ? `${a}|${b}` : `${b}|${a}`;
  }
  private getOrder(a: string, b: string): CoxeterOrder {
    return this.order.get(this.key(a, b)) ?? hiddenOrder(this.view);
  }

  private layout(seed: DiagramSeed): void {
    const n = seed.generators.length;
    const cx = this.width / 2;
    const cy = this.height / 2;
    const r = Math.min(cx, cy) - 2 * NODE_R;
    this.nodes = seed.generators.map((id, i) => {
      const a = (2 * Math.PI * i) / n - Math.PI / 2;
      return { id, x: cx + r * Math.cos(a), y: cy + r * Math.sin(a) };
    });
    // Seed every pair with the view's hidden value, then apply the given edges.
    const h = hiddenOrder(this.view);
    for (let i = 0; i < this.nodes.length; i++)
      for (let j = i + 1; j < this.nodes.length; j++) this.order.set(this.key(this.nodes[i].id, this.nodes[j].id), h);
    for (const e of seed.edges) this.order.set(this.key(e.a, e.b), e.order);
  }

  /** Emit the canonical complete pair data (every pair with its order). */
  private emit(): void {
    const relations = [];
    for (let i = 0; i < this.nodes.length; i++)
      for (let j = i + 1; j < this.nodes.length; j++) {
        const a = this.nodes[i].id;
        const b = this.nodes[j].id;
        relations.push({ a, b, order: this.getOrder(a, b) });
      }
    this.onChange({ generators: this.nodes.map((n) => n.id), relations });
  }

  private nextId(): string {
    for (let i = 0; ; i++) if (!this.nodes.some((n) => n.id === `s${i}`)) return `s${i}`;
  }

  // ── structural edits ──────────────────────────────────────────────────────
  private addNode(): void {
    const id = this.nextId();
    const k = this.nodes.length;
    this.nodes.push({ id, x: this.width / 2 + 28 * Math.cos(k), y: this.height / 2 + 28 * Math.sin(k) });
    const h = hiddenOrder(this.view);
    for (const n of this.nodes) if (n.id !== id) this.order.set(this.key(id, n.id), h);
    this.selected = null;
    this.render();
    this.emit();
  }
  private removeNode(id: string): void {
    this.nodes = this.nodes.filter((n) => n.id !== id);
    for (const k of [...this.order.keys()]) if (k.split('|').includes(id)) this.order.delete(k);
    this.selected = null;
    this.render();
    this.emit();
  }
  private connectToggle(a: string, b: string): void {
    // Toggle visibility in this view: hidden → a visible default (3); visible → hidden.
    const visible = this.getOrder(a, b) !== hiddenOrder(this.view);
    this.order.set(this.key(a, b), visible ? hiddenOrder(this.view) : 3);
    this.render();
    this.emit();
  }
  private setEdgeOrder(a: string, b: string, o: CoxeterOrder): void {
    this.order.set(this.key(a, b), o);
    this.render();
    this.emit();
  }

  private onKey(e: KeyboardEvent): void {
    const active = document.activeElement;
    if (active && (active.tagName === 'INPUT' || active.tagName === 'SELECT')) return;
    if ((e.key === 'Delete' || e.key === 'Backspace') && this.selected) {
      e.preventDefault();
      this.removeNode(this.selected);
    }
  }

  // ── node click vs drag ────────────────────────────────────────────────────
  private svgPoint(e: PointerEvent): { x: number; y: number } {
    const r = this.svg.getBoundingClientRect();
    return { x: e.clientX - r.left, y: e.clientY - r.top };
  }
  private beginNodePointer(node: Node, down: Event): void {
    const ev = down as PointerEvent;
    ev.stopPropagation();
    const start = this.svgPoint(ev);
    let dragged = false;
    const move = (m: PointerEvent) => {
      const p = this.svgPoint(m);
      if (!dragged && Math.hypot(p.x - start.x, p.y - start.y) > DRAG_THRESHOLD) dragged = true;
      if (dragged) {
        node.x = p.x;
        node.y = p.y;
        this.render(); // visual only
      }
    };
    const up = () => {
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', up);
      if (dragged) return;
      if (this.selected === null) this.selected = node.id;
      else if (this.selected === node.id) this.selected = null;
      else {
        const a = this.selected;
        this.selected = null;
        this.connectToggle(a, node.id);
        return;
      }
      this.render();
    };
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', up);
  }

  // ── rendering ─────────────────────────────────────────────────────────────
  private render(): void {
    while (this.svg.firstChild) this.svg.removeChild(this.svg.firstChild);
    const h = hiddenOrder(this.view);

    // Edges: only those visible in the current view (order ≠ hidden value).
    for (let i = 0; i < this.nodes.length; i++)
      for (let j = i + 1; j < this.nodes.length; j++) {
        const a = this.nodes[i];
        const b = this.nodes[j];
        const o = this.getOrder(a.id, b.id);
        if (o === h) continue;
        this.svg.append(svgEl('line', { x1: a.x, y1: a.y, x2: b.x, y2: b.y, stroke: '#555', 'stroke-width': 2 }));
        this.svg.append(this.edgeDropdown(a, b, o));
      }

    // Nodes on top, with a ✕ delete badge on the selected one.
    for (const n of this.nodes) {
      const sel = n.id === this.selected;
      const circle = svgEl('circle', {
        cx: n.x, cy: n.y, r: NODE_R,
        fill: sel ? '#fdebd0' : '#eef2f7', stroke: sel ? '#e08a4b' : '#4c72b0', 'stroke-width': sel ? 3 : 2,
      });
      const label = svgEl('text', { x: n.x, y: n.y + 4, 'text-anchor': 'middle', 'font-size': 11, fill: '#333' });
      label.textContent = n.id;
      const grab = (e: Event) => this.beginNodePointer(n, e);
      circle.style.cursor = 'grab';
      circle.addEventListener('pointerdown', grab);
      label.addEventListener('pointerdown', grab);
      this.svg.append(circle, label);
      if (sel) this.svg.append(this.deleteBadge(n));
    }
  }

  private edgeDropdown(a: Node, b: Node, o: CoxeterOrder): SVGForeignObjectElement {
    const mx = (a.x + b.x) / 2;
    const my = (a.y + b.y) / 2;
    const fo = svgEl('foreignObject', { x: mx - 24, y: my - 13, width: 48, height: 26 });
    const sel = document.createElement('select');
    Object.assign(sel.style, { font: '12px system-ui, sans-serif', width: '46px', textAlign: 'center', background: '#fff', border: '1px solid #bbb', borderRadius: '4px' });
    for (const choice of ORDER_CHOICES) {
      const opt = document.createElement('option');
      opt.value = String(choice);
      opt.textContent = orderLabel(choice);
      sel.append(opt);
    }
    sel.value = String(o);
    sel.addEventListener('pointerdown', (e) => e.stopPropagation());
    sel.addEventListener('change', () => {
      const v: CoxeterOrder = sel.value === 'infinity' ? 'infinity' : Number(sel.value);
      this.setEdgeOrder(a.id, b.id, v);
    });
    fo.append(sel);
    return fo;
  }

  private deleteBadge(n: Node): SVGGElement {
    const g = svgEl('g', {});
    const bx = n.x + NODE_R - 2;
    const by = n.y - NODE_R + 2;
    const c = svgEl('circle', { cx: bx, cy: by, r: 7, fill: '#c0392b', stroke: '#fff', 'stroke-width': 1 });
    const x = svgEl('text', { x: bx, y: by + 3, 'text-anchor': 'middle', 'font-size': 9, fill: '#fff' });
    x.textContent = '✕';
    const del = (e: Event) => {
      e.stopPropagation();
      this.removeNode(n.id);
    };
    for (const node of [c, x]) {
      node.style.cursor = 'pointer';
      node.addEventListener('pointerdown', del);
    }
    g.append(c, x);
    return g;
  }
}
