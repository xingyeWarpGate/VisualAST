'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

type StreamCase = { id: string; title: string; intent: string; prompt: string; image?: string; status: 'queued' | 'streaming' | 'complete'; audit?: Record<string, string | number>; visualReview?: { status: string; score: number; observations: string[] }; structure?: Record<string, unknown> };
const initialCases: StreamCase[] = [
  ['case-a', '雨夜修车巷'], ['case-b', '贝壳茶会'], ['case-c', '轨道温室'], ['case-d', '天文台木刻'], ['case-e', '沙漠单轨站'],
].map(([id, title]) => ({ id, title, intent: '', prompt: '', status: 'queued' }));

export default function Home() {
  const [cases, setCases] = useState<StreamCase[]>(initialCases);
  const [activeId, setActiveId] = useState('case-a');
  const [running, setRunning] = useState(false);
  const [complete, setComplete] = useState(0);
  const [tab, setTab] = useState<'prompt' | 'contract' | 'plan'>('prompt');
  const sourceRef = useRef<EventSource | null>(null);

  const start = useCallback(() => {
    sourceRef.current?.close();
    setCases(initialCases);
    setComplete(0);
    setRunning(true);
    const source = new EventSource(`/api/stream?run=${Date.now()}`);
    sourceRef.current = source;
    source.addEventListener('case-start', (event) => {
      const data = JSON.parse((event as MessageEvent).data);
      setActiveId(data.id);
      setCases((items) => items.map((item) => item.id === data.id ? { ...item, title: data.title, intent: data.intent, audit: data.audit, visualReview: data.visualReview, status: 'streaming', prompt: '', image: undefined } : item));
    });
    source.addEventListener('prompt-chunk', (event) => {
      const data = JSON.parse((event as MessageEvent).data);
      setCases((items) => items.map((item) => item.id === data.id ? { ...item, prompt: item.prompt + data.chunk } : item));
    });
    source.addEventListener('structure', (event) => {
      const data = JSON.parse((event as MessageEvent).data);
      setCases((items) => items.map((item) => item.id === data.id ? { ...item, structure: data } : item));
    });
    source.addEventListener('image', (event) => {
      const data = JSON.parse((event as MessageEvent).data);
      setCases((items) => items.map((item) => item.id === data.id ? { ...item, image: data.image } : item));
    });
    source.addEventListener('case-complete', (event) => {
      const data = JSON.parse((event as MessageEvent).data);
      setComplete((value) => value + 1);
      setCases((items) => items.map((item) => item.id === data.id ? { ...item, status: 'complete' } : item));
    });
    source.addEventListener('complete', () => { setRunning(false); source.close(); });
    source.onerror = () => { setRunning(false); source.close(); };
  }, []);

  useEffect(() => { start(); return () => sourceRef.current?.close(); }, [start]);
  const active = useMemo(() => cases.find((item) => item.id === activeId) ?? cases[0], [cases, activeId]);
  const structured = tab === 'contract' ? active.structure?.contract : active.structure?.aestheticPlan;

  return (
    <main className="app-shell">
      <header className="topbar">
        <div><p className="eyebrow">VAST 2.2.1 · LIVE AUDIT</p><h1>视觉编译流式测试台</h1></div>
        <div className="run-meta"><span className={running ? 'pulse' : 'dot'} />{running ? '正在随机执行' : '本轮完成'}<strong>{complete}/5</strong><button onClick={start} disabled={running}>{running ? '运行中' : '随机重跑'}</button></div>
      </header>
      <section className="progress"><span style={{ width: `${complete * 20}%` }} /></section>
      <div className="workspace">
        <aside className="queue-panel">
          <div className="panel-heading"><span>测试队列</span><small>随机顺序</small></div>
          <div className="case-list">{cases.map((item, index) => <button key={item.id} className={`case-item ${item.id === activeId ? 'active' : ''}`} onClick={() => setActiveId(item.id)}><span className="case-index">0{index + 1}</span><span><b>{item.title}</b><small>{item.status === 'complete' ? '完成' : item.status === 'streaming' ? '流式生成中' : '等待'}</small></span><i className={`status ${item.status}`} /></button>)}</div>
          <div className="spec-note"><span>规格状态</span><strong>STRUCTURAL</strong><p>真实图片已生成；自动视觉 Evaluator 与 holdout 仍未达到完整门槛。</p></div>
        </aside>
        <section className="visual-panel">
          <div className="visual-header"><div><p className="eyebrow">CURRENT OUTPUT</p><h2>{active.title}</h2></div><div className="chips"><span>{active.audit?.complexity ?? 'waiting'}</span><span>{active.audit?.validation ?? '—'}</span>{active.visualReview && <span>{active.visualReview.status} · {Math.round(active.visualReview.score * 100)}</span>}</div></div>
          <div className="image-stage">{active.image ? <img src={active.image} alt={`${active.title} 测试生成图`} /> : <div className="image-loader"><span /><p>等待图片事件</p></div>}<div className="scanline" /></div>
          <div className="intent-card"><span>原始意图</span><div><p>{active.intent || '等待流式输入…'}</p>{active.visualReview && <ul>{active.visualReview.observations.map((observation) => <li key={observation}>{observation}</li>)}</ul>}</div></div>
        </section>
        <aside className="structure-panel">
          <div className="tabs"><button className={tab === 'prompt' ? 'selected' : ''} onClick={() => setTab('prompt')}>Prompt</button><button className={tab === 'contract' ? 'selected' : ''} onClick={() => setTab('contract')}>Contract</button><button className={tab === 'plan' ? 'selected' : ''} onClick={() => setTab('plan')}>Plan</button></div>
          {tab === 'prompt' ? <div className="prompt-stream"><div className="stream-label"><span className="pulse" />structured prompt</div><p>{active.prompt || '等待编译器输出…'}{active.status === 'streaming' && <i className="cursor" />}</p></div> : <pre>{structured ? JSON.stringify(structured, null, 2) : '等待结构化数据…'}</pre>}
          <div className="metrics"><div><span>实体</span><b>{active.audit?.extractedEntityCount ?? '—'}</b></div><div><span>关系</span><b>{active.audit?.relationCount ?? '—'}</b></div><div><span>硬约束</span><b>{active.audit?.hardConstraintCount ?? '—'}</b></div></div>
        </aside>
      </div>
    </main>
  );
}
