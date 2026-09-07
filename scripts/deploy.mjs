import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';

const run = (command, args, options = {}) => execFileSync(command, args, { stdio: 'inherit', ...options });
const npmCli = process.env.npm_execpath;
if (!npmCli) throw new Error('请使用 npm run deploy 启动发布。');
const host = resolveDeployHost();
console.log(`部署主机：${host}`);
run(process.execPath, [npmCli, 'test']);
run(process.execPath, [npmCli, 'run', 'build']);

const short = execFileSync('git', ['rev-parse', '--short', 'HEAD'], { encoding: 'utf8' }).trim();
const stamp = new Date().toISOString().replace(/[-:]/g, '').replace(/\.\d{3}Z$/, 'Z');
const release = `${stamp}-${short}`;
run('ssh', ['-o', 'BatchMode=yes', host, `mkdir -p /srv/jianghu-releases/${release}`]);
run('scp', ['-o', 'BatchMode=yes', '-rq', 'dist/.', `${host}:/srv/jianghu-releases/${release}/`]);

const remote = `set -euo pipefail
release="/srv/jianghu-releases/$1"
test -s "$release/index.html"
previous=""
if [ -L /srv/jianghu ]; then
  previous="$(readlink /srv/jianghu)"
elif [ -d /srv/jianghu ]; then
  previous="/srv/jianghu-releases/legacy-$1"
fi
rollback() {
  if [ -n "$previous" ]; then
    ln -s "$previous" /srv/jianghu-rollback-link
    mv -Tf /srv/jianghu-rollback-link /srv/jianghu
  fi
}
ln -s "$release" /srv/jianghu-next-link
if [ -d /srv/jianghu ] && [ ! -L /srv/jianghu ]; then
  mv /srv/jianghu "$previous"
fi
trap rollback ERR
mv -Tf /srv/jianghu-next-link /srv/jianghu
curl --fail --silent --show-error http://127.0.0.1:8082/ > /dev/null
if [ -n "$previous" ]; then
  ln -sfn "$previous" /srv/jianghu-previous
fi
trap - ERR
echo "Release: $release; previous: $previous"
`;
run('ssh', ['-o', 'BatchMode=yes', host, 'bash', '-s', '--', release], { input: remote, stdio: ['pipe', 'inherit', 'inherit'] });
console.log(`已部署: http://47.108.114.17:8082/ （域名: http://wuxia.47.108.114.17.sslip.io:8082/ ）`);

function sshConfigHosts() {
  const path = join(homedir(), '.ssh', 'config');
  if (!existsSync(path)) return new Set();
  const names = new Set();
  for (const line of readFileSync(path, 'utf8').split(/\r?\n/)) {
    const match = line.match(/^\s*Host\s+(.+)$/i);
    if (!match) continue;
    for (const name of match[1].trim().split(/\s+/)) if (name && name !== '*') names.add(name);
  }
  return names;
}

function sshReachable(alias) {
  try {
    execFileSync('ssh', ['-o', 'BatchMode=yes', '-o', 'ConnectTimeout=8', alias, 'true'], { stdio: 'ignore' });
    return true;
  } catch {
    return false;
  }
}

function resolveDeployHost() {
  if (process.env.JIANGHU_DEPLOY_HOST) return process.env.JIANGHU_DEPLOY_HOST;
  const candidates = ['aliyun_ecs', 'aliyun-prayer'];
  const configured = sshConfigHosts();
  const listed = candidates.filter(name => configured.has(name));
  const order = listed.length ? listed : candidates;
  const host = order.find(sshReachable);
  if (host) return host;
  throw new Error(`找不到可用部署主机。请在 ~/.ssh/config 配置 aliyun_ecs（公司）或 aliyun-prayer（家里），或设置 JIANGHU_DEPLOY_HOST。已尝试：${order.join(', ')}`);
}
