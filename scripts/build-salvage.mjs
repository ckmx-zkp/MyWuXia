import { readFile, writeFile } from 'node:fs/promises';
const file=new URL('../public/salvage-v1.html',import.meta.url);
const marker='<!-- SALVAGE_EXTENSION -->';
const html=await readFile(file,'utf8');
const base=(html.includes(marker)?html.slice(0,html.indexOf(marker)):html.replace(/<\/body>\s*<\/html>\s*$/,''))
  .replace(/<title>[^<]*<\/title>/,'<title>失落港区 · 第一人称搜打撤</title>')
  .replace('<div class="boot-mark">几猫</div>','<div class="boot-mark">失落港区</div>');
const extension=await readFile(new URL('./salvage-extension.js',import.meta.url),'utf8');
await writeFile(file,`${base}${marker}\n<script>\n${extension}\n</script>\n</body>\n</html>\n`);
console.log('Standalone extraction game built: public/salvage-v1.html');
