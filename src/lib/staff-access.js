export const STAFF_DUTIES = [
 {key:'resources',label:'Resource reviews',description:'Approve or reject uploaded learning resources.'},
 {key:'assessments',label:'Assessment moderation',description:'Review tutor assessment questions and record approval decisions.'},
 {key:'study_moderation',label:'Study-room moderation',description:'Review pending posts, replies and content reports.'},
 {key:'announcements',label:'Announcements',description:'Publish, activate and delete platform announcements.'},
 {key:'universities',label:'University directory',description:'Add, edit, activate and delete directory entries.'},
];
export function staffPermissions(access){
 return access?.enabled===true && Array.isArray(access.permissions)
  ? STAFF_DUTIES.filter(d=>access.permissions.includes(d.key)).map(d=>d.key) : [];
}
