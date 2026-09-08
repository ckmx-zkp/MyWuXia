import { buildMemoryDocument } from '../src/game/memory-doc.js';
import { extractTemplate, factHash, mergeOverlay } from '../src/game/narrative-overlay.js';
import { isSaveId } from '../src/game/save-id.js';

const FORBIDDEN = '段誉、乔峰、萧峰、虚竹、慕容复、韦小宝、康熙、令狐冲、岳不群、林平之、郭靖、黄蓉、杨过、小龙女、张无忌、赵敏、胡斐、袁承志、石破天';

function clipId(value, max = 64) {
  return typeof value === 'string' && /^[a-zA-Z][\w-]{0,63}$/.test(value) ? value.slice(0, max) : '';
}

export function narrativePrompt({ memory, eventName, template, character }) {
  return [
    '你是《江湖长夜》的文案改写。程序已经决定事实、奖励、后继和战斗，你只改写允许的文字。',
    '铁律：玩家是独立江湖行人，不是任何原著主角替身；禁止用下列名字指代玩家本人：' + FORBIDDEN + '。',
    '不得增删奖励、死生、武学秘籍、神兵或选项去向；不得出现叮、宿主、暴击、经验+9999 等网文系统腔。',
    '必须改写字面，禁止原样照抄模板。场景、对白、传闻、选项措辞都要换成这个人听来的说法，可点出名号或近事，但事件骨架、地点和行动含义不变。',
    '对白条数、选项 id 必须与模板完全相同。只输出 JSON。',
    `记忆：${memory.summary}`,
    `事件：${eventName || '无名江湖事'}。角色名号：${character.name}。`,
    `模板：${JSON.stringify(template)}`,
    '输出形状：{"scene":"...","dialogues":[["谁","台词"]],"hearsay":"...","choices":{"选项id":{"text":"...","outcome":"...","failText":"..."}}}',
  ].join('\n');
}

export function createNarrativeService({ store, completeChat, model = 'MiniMax-M2.5-highspeed' }) {
  const inflight = new Map();
  return {
    remember(saveId, character = {}) {
      if (!isSaveId(saveId)) throw new Error('invalid_save');
      const document = buildMemoryDocument({ saveId, ...character });
      store.touchSave(saveId, document.name);
      store.saveMemory(saveId, document);
      return document;
    },
    memory(saveId) {
      if (!isSaveId(saveId)) throw new Error('invalid_save');
      return store.loadMemory(saveId);
    },
    async personalize({ saveId, eventId, nodeId, eventName, character = {}, template }) {
      if (!isSaveId(saveId)) throw new Error('invalid_save');
      const event = clipId(eventId), node = clipId(nodeId);
      if (!event || !node) throw new Error('invalid_event');
      const canon = extractTemplate(template);
      if (!canon.scene || !canon.hearsay) throw new Error('invalid_template');
      const document = this.remember(saveId, character);
      const hash = factHash({ name: character.name, loc: character.loc, facts: {...character.facts,template:JSON.stringify(canon)}, journal: character.journal });
      const cached = store.loadGenerated(saveId, event, node, hash);
      if (cached?.overlay) return { source: 'cache', overlay: cached.overlay, hash };
      if (!completeChat) return { source: 'template', overlay: null, hash };
      const key = `${saveId}:${event}:${node}:${hash}`;
      if (inflight.has(key)) return inflight.get(key);
      const work = (async () => {
        const result = await completeChat([
          { role: 'system', content: '你只输出符合约束的 JSON 文案覆盖，不解释。' },
          { role: 'user', content: narrativePrompt({ memory: document, eventName, template: canon, character }) },
        ]);
        const overlay = mergeOverlay(canon, result.parsed);
        if (!overlay) {
          console.error('narrative merge_failed', event, node);
          return { source: 'template', overlay: null, hash };
        }
        store.saveGenerated(saveId, event, node, hash, overlay, result.model || model);
        return { source: 'generated', overlay, hash };
      })().finally(() => inflight.delete(key));
      inflight.set(key, work);
      return work;
    },
  };
}
