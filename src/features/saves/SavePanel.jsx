import React, { useRef, useState } from 'react';
import { SAVE_KEY, SLOT_KEYS, readSave, writeSave, encodeSave, migrateSave } from '../../game/saves.js';

export default function SavePanel({ snapshot, options, onLoad, onClose, notice }) {
  const [message, setMessage] = useState(notice || '自动存档独立保存；手动槽位只在你点“保存”时更新。');
  const [revision, setRevision] = useState(0);
  const file = useRef(null);
  const [pending, setPending] = useState(null);
  const run = task => { try { task(); setRevision(n => n + 1); } catch (error) { setMessage(`未完成：${error.message}`); } };
  const save = key => run(() => { writeSave(localStorage, snapshot(), key, options); setMessage('已保存。'); setPending(null); });
  const restore = key => run(() => { const result = readSave(localStorage, key, options); if (!result) throw new Error('此槽位没有存档。'); onLoad(result.state); });
  const inspect = key => { try { return readSave(localStorage, key, options); } catch { return { invalid: true }; } };
  const exportFile = () => run(() => {
    const url = URL.createObjectURL(new Blob([encodeSave(snapshot())], { type: 'application/json' }));
    const a = document.createElement('a'); a.href = url; a.download = `jianghu-${new Date().toISOString().slice(0, 10)}.json`; a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    setMessage('存档已导出，可在另一浏览器导入。');
  });
  const importFile = async event => {
    const selected = event.target.files?.[0]; event.target.value = '';
    if (!selected) return;
    try {
      if (selected.size > 2_000_000) throw new Error('存档文件过大。');
      const state = migrateSave(await selected.text(), options);
      setPending({ type: 'import', state });
      setMessage(`已检查导入存档：${state.name}，等级 ${Math.floor(state.expTotal / 100) + 1}。确认后将替换当前进度。`);
    } catch (error) { setMessage(`导入失败：${error.message}`); }
  };
  return <div className="story-mask save-mask"><section className="save-panel" role="dialog" aria-modal="true" aria-labelledby="save-title">
    <div className="combat-heading"><h2 id="save-title">江湖存档</h2><button onClick={onClose} aria-label="关闭存档">✕</button></div>
    <p className="save-status" role="status">{message}</p>
    <p>整理存档期间暂停计时。读档前会把当前角色写入自动存档；手动槽位不会被重开清除。</p>
    {[SAVE_KEY, ...SLOT_KEYS].map((key, i) => {
      const saved = inspect(key);
      return <div className="save-slot" key={`${key}-${revision}`}><div><b>{i ? `手动存档 ${i}` : '自动存档'}</b><small>{saved?.state ? `${saved.state.name} · 等级 ${Math.floor(saved.state.expTotal / 100) + 1}${saved.state.battle?.status === 'active' ? ` · 交手第 ${saved.state.battle.round} 回合` : ''}${saved.recovered ? ' · 备用恢复' : ''}` : saved?.invalid ? '存档损坏，无法读取' : '空槽位'}</small>{saved?.savedAt && <small>{new Date(saved.savedAt).toLocaleString()}</small>}</div>
        <div className="save-buttons"><button onClick={() => saved ? setPending({ type: 'save', key }) : save(key)}>保存</button><button disabled={!saved?.state} onClick={() => setPending({ type: 'load', key })}>读取</button></div></div>;
    })}
    {pending && <div className="combat-result"><p>{pending.type === 'save' ? '覆盖此槽位？原存档将保留一份备用。' : '确认读取？当前进度会先写入自动存档。'}</p><div className="save-buttons"><button onClick={() => setPending(null)}>取消</button><button onClick={() => pending.type === 'save' ? save(pending.key) : pending.type === 'load' ? restore(pending.key) : run(() => onLoad(pending.state))}>确认</button></div></div>}
    <div className="combat-actions"><button onClick={exportFile}>导出存档</button><button onClick={() => file.current.click()}>导入存档</button></div>
    <input ref={file} type="file" accept=".json,application/json" hidden onChange={importFile} />
  </section></div>;
}
