export const statuses = ['In progress', 'In review', 'Completed', 'On hold'];
export const palette = ['sage', 'peach', 'lavender', 'sand', 'sky'];
export const uid = () => crypto.randomUUID();
export const money = cents => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: cents % 100 ? 2 : 0 }).format(cents / 100);
export const dateLabel = value => value ? new Date(`${value}T12:00:00`).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : 'No deadline';
export const today = () => localDate(new Date());
export function localDate(date) { return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`; }
export function dueLabel(date) { if (!date) return 'No deadline'; const day = Math.round((new Date(`${date}T12:00:00`) - new Date(`${today()}T12:00:00`)) / 86400000); return day < 0 ? `${Math.abs(day)}d overdue` : day === 0 ? 'Due today' : day === 1 ? 'Tomorrow' : `In ${day} days`; }
export function blankState(name = 'My studio') { return { name, clients: [], projects: [], milestones: [], notes: [], files: [] }; }
export function demoState() {
  const after = days => { const date = new Date(); date.setDate(date.getDate() + days); return localDate(date); };
  const state = blankState('Wild Strokes');
  state.clients = [
    { id: 'client-northstar', name: 'Alex Morgan', company: 'Northstar Games', email: 'alex@example.com', color: 'sage' },
    { id: 'client-juniper', name: 'Avery Bloom', company: 'Juniper Studio', email: 'avery@example.com', color: 'peach' },
    { id: 'client-isla', name: 'Isla Reed', company: 'Independent author', email: 'isla@example.com', color: 'lavender' },
    { id: 'client-orbit', name: 'Sam Ellis', company: 'Orbit Collective', email: 'sam@example.com', color: 'sky' }
  ];
  state.projects = [
    { id: 'project-moss', clientId: 'client-northstar', title: 'Moss & Moon', category: 'Game art', status: 'In progress', due: after(8), budgetCents: 140000, brief: 'A small forest world for a cozy adventure. Character sprites, environment tiles and a matching UI kit.', color: 'sage' },
    { id: 'project-juniper', clientId: 'client-juniper', title: 'Juniper identity', category: 'Branding', status: 'In review', due: after(4), budgetCents: 90000, brief: 'A warm, minimal identity for an independent creative studio. Wordmark, color system and launch assets.', color: 'peach' },
    { id: 'project-cover', clientId: 'client-isla', title: 'A quieter kind of magic', category: 'Illustration', status: 'In progress', due: after(12), budgetCents: 65000, brief: 'An illustrated book cover with a soft nocturnal palette, thoughtful typography and print-ready artwork.', color: 'lavender' },
    { id: 'project-orbit', clientId: 'client-orbit', title: 'Orbit sound pack', category: 'Game audio', status: 'Completed', due: after(-3), budgetCents: 40000, brief: 'Twelve interface and movement sounds, with alternate variations and organized WAV delivery.', color: 'sky' }
  ];
  state.milestones = [
    { id: 'm1', projectId: 'project-moss', title: 'Deposit & creative direction', due: after(-7), amountCents: 70000, done: true, paid: true },
    { id: 'm2', projectId: 'project-moss', title: 'Characters & tile set', due: after(2), amountCents: 40000, done: false, paid: false },
    { id: 'm3', projectId: 'project-moss', title: 'Final files & handoff', due: after(8), amountCents: 30000, done: false, paid: false },
    { id: 'm4', projectId: 'project-juniper', title: 'Initial concepts', due: after(-4), amountCents: 45000, done: true, paid: true },
    { id: 'm5', projectId: 'project-juniper', title: 'Refinement & brand guide', due: after(4), amountCents: 45000, done: false, paid: false },
    { id: 'm6', projectId: 'project-cover', title: 'Cover concepts', due: after(-2), amountCents: 32500, done: true, paid: true },
    { id: 'm7', projectId: 'project-cover', title: 'Print-ready delivery', due: after(12), amountCents: 32500, done: false, paid: false },
    { id: 'm8', projectId: 'project-orbit', title: 'Sound pack delivery', due: after(-3), amountCents: 40000, done: true, paid: true }
  ];
  state.notes = [{ id: 'note1', projectId: 'project-moss', text: 'Keep the world gentle and a little mysterious. First character silhouettes are ready for feedback.', date: new Date().toISOString() }, { id: 'note2', projectId: 'project-juniper', text: 'The second wordmark direction has been selected. Preparing the refined palette and usage examples.', date: new Date().toISOString() }];
  return state;
}
export function summary(state) {
  return { active: state.projects.filter(p => !['Completed', 'On hold'].includes(p.status)).length, paid: state.milestones.filter(m => m.paid).reduce((n, m) => n + m.amountCents, 0), outstanding: state.milestones.filter(m => !m.paid).reduce((n, m) => n + m.amountCents, 0), milestones: state.milestones.filter(m => !m.done).length };
}
export function progress(state, projectId) { const list = state.milestones.filter(m => m.projectId === projectId); return list.length ? Math.round(list.filter(m => m.done).length / list.length * 100) : 0; }

export function validateState(input) {
  const fail = message => { throw new Error(message); };
  const str = (value, label, max = 160, empty = false) => { if (typeof value !== 'string' || value.length > max || (!empty && !value.trim())) fail(`Invalid ${label}.`); return value.trim(); };
  const id = value => { if (typeof value !== 'string' || !/^[a-zA-Z0-9_-]{1,80}$/.test(value)) fail('Invalid record identifier.'); return value; };
  const date = value => { if (value === '') return ''; if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value) || new Date(`${value}T12:00:00Z`).toISOString().slice(0,10) !== value) fail('Invalid deadline.'); return value; };
  const cents = value => { if (!Number.isSafeInteger(value) || value < 0 || value > 1000000000) fail('Invalid amount.'); return value; };
  const color = value => palette.includes(value) ? value : 'sage';
  const array = (key, max = 300) => { if (!Array.isArray(input?.[key]) || input[key].length > max) fail(`Invalid ${key} list.`); return input[key]; };
  const result = blankState(str(input?.name, 'workspace name', 80));
  result.clients = array('clients').map(c => ({ id: id(c.id), name: str(c.name, 'client name', 80), company: str(c.company, 'company', 100, true), email: str(c.email, 'email', 254, true), color: color(c.color) }));
  result.projects = array('projects').map(p => ({ id: id(p.id), clientId: id(p.clientId), title: str(p.title, 'project title', 100), category: str(p.category, 'category', 40), status: statuses.includes(p.status) ? p.status : fail('Invalid project status.'), due: date(p.due), budgetCents: cents(p.budgetCents), brief: str(p.brief, 'brief', 3000, true), color: color(p.color) }));
  result.milestones = array('milestones', 1000).map(m => ({ id: id(m.id), projectId: id(m.projectId), title: str(m.title, 'milestone title', 120), due: date(m.due), amountCents: cents(m.amountCents), done: m.done === true, paid: m.paid === true }));
  result.notes = array('notes', 1000).map(n => ({ id: id(n.id), projectId: id(n.projectId), text: str(n.text, 'note', 3000), date: str(n.date, 'note date', 40) }));
  result.files = array('files', 100).map(f => ({ id: id(f.id), projectId: id(f.projectId), name: str(f.name, 'filename', 160), type: str(f.type, 'file type', 100, true), size: cents(f.size), date: str(f.date, 'file date', 40) }));
  for (const key of ['clients', 'projects', 'milestones', 'notes', 'files']) { const ids = result[key].map(x => x.id); if (new Set(ids).size !== ids.length) fail('Duplicate record identifier.'); }
  for (const p of result.projects) if (!result.clients.some(c => c.id === p.clientId)) fail('Project client does not exist.');
  for (const key of ['milestones', 'notes', 'files']) for (const item of result[key]) if (!result.projects.some(p => p.id === item.projectId)) fail('Project does not exist.');
  for (const p of result.projects) if (result.milestones.filter(m => m.projectId === p.id).reduce((n,m) => n + m.amountCents, 0) > p.budgetCents) fail(`Milestone amounts exceed the budget for ${p.title}.`);
  return result;
}
