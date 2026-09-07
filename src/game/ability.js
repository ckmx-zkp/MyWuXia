import { SKILLS } from '../content/martial.js';
import { trainingAbility } from './training.js';
import { ownsStyle } from './progression.js';

const level = state => Math.floor(state.expTotal / 100) + 1;
export function abilityParts(state) {
  return {
    root: Math.round(level(state) * (0.35 + state.hp / 100)),
    learned: SKILLS.filter(skill => ownsStyle(state, skill.name)).reduce((sum, skill) => sum + skill.bonus, 0),
    origin: (state.attrAb || 0) + (state.bonusSkill?.bonus || 0),
    training: trainingAbility(state).total,
  };
}
export const ability = state => Object.values(abilityParts(state)).reduce((sum, value) => sum + value, 0);
