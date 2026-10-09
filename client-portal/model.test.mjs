import test from 'node:test';
import assert from 'node:assert/strict';
import { demoState, validateState, summary, progress, money, blankState } from './lib/model.mjs';

test('sample workspace has consistent references, budgets and summary totals',()=>{
  const state=validateState(demoState());
  assert.deepEqual(summary(state),{active:3,paid:187500,outstanding:147500,milestones:4});
  assert.equal(progress(state,'project-moss'),33);assert.equal(progress(state,'project-orbit'),100);
  assert.equal(money(1025),'$10.25');assert.equal(money(1000),'$10');
});
test('money is stored as integer cents and milestone allocations cannot exceed budget',()=>{
  const state=demoState();state.projects[0].budgetCents=1;
  assert.throws(()=>validateState(state),/exceed/);
  state.projects[0].budgetCents=140000.5;assert.throws(()=>validateState(state),/Invalid amount/);
});
test('invalid dates, duplicate records and foreign references are rejected',()=>{
  let state=demoState();state.projects[0].due='2026-02-30';assert.throws(()=>validateState(state),/Invalid deadline/);
  state=demoState();state.clients.push(state.clients[0]);assert.throws(()=>validateState(state),/Duplicate/);
  state=demoState();state.projects[0].clientId='missing';assert.throws(()=>validateState(state),/client does not exist/);
  state=demoState();state.milestones[0].projectId='missing';assert.throws(()=>validateState(state),/Project does not exist/);
  assert.deepEqual(validateState(blankState()),blankState());
});
