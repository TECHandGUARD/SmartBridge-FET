import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const read=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8');
test('Tutor can discover Live Classroom without having an existing booking',()=>{
 const actions=read('src/components/tutor/TutorQuickActions.jsx');
 const sections=read('src/lib/useDashboardSection.js');
 const dashboard=read('src/pages/TutorDashboard.jsx');
 const hub=read('src/components/tutor/TutorLiveClassroomHub.jsx');
 assert.match(actions,/key: 'classroom'/);
 assert.match(sections,/tutor: \['classroom'/);
 assert.match(dashboard,/activeSection === 'classroom'/);
 assert.match(dashboard,/activeSection === 'sessions'/);
 assert.match(dashboard,/<TutorLiveClassroomHub/);
 assert.match(hub,/No confirmed upcoming sessions yet/);
 assert.match(hub,/Choose platform in Booking Requests/);
 assert.match(hub,/Open Classroom/);
});
