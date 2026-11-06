// quick scan: check top-left corner brightness variance (text areas) — just list sizes instead
import fs from 'fs';
for (const f of fs.readdirSync('/home/z/my-project/public/img')) console.log(f, Math.round(fs.statSync('/home/z/my-project/public/img/'+f).size/1024)+'KB');
