#!/usr/bin/env bash
# 江湖长夜：构建并部署到阿里云（nginx /srv/jianghu，端口 8082）
set -euo pipefail
cd "$(dirname "$0")/.."
ssh_config_hosts() {
  local config="${HOME}/.ssh/config"
  [ -f "$config" ] || return 0
  awk 'tolower($1)=="host" { for (i=2;i<=NF;i++) if ($i!="*") print $i }' "$config"
}
ssh_reachable() {
  ssh -o BatchMode=yes -o ConnectTimeout=8 "$1" true >/dev/null 2>&1
}
resolve_deploy_host() {
  if [ -n "${JIANGHU_DEPLOY_HOST:-}" ]; then
    printf '%s\n' "$JIANGHU_DEPLOY_HOST"
    return
  fi
  local candidates="aliyun_ecs aliyun-prayer" host="" listed=""
  listed="$(ssh_config_hosts)"
  for host in $candidates; do
    echo "$listed" | grep -qx "$host" || continue
    ssh_reachable "$host" && { printf '%s\n' "$host"; return; }
  done
  for host in $candidates; do
    ssh_reachable "$host" && { printf '%s\n' "$host"; return; }
  done
  echo "找不到可用部署主机。请在 ~/.ssh/config 配置 aliyun_ecs（公司）或 aliyun-prayer（家里），或设置 JIANGHU_DEPLOY_HOST。" >&2
  exit 1
}
deploy_host="$(resolve_deploy_host)"
echo "部署主机：${deploy_host}"
npm run test
npm run build
test -s dist/index.html
release="$(date -u +%Y%m%dT%H%M%SZ)-$(git rev-parse --short HEAD)"
ssh -o BatchMode=yes "$deploy_host" "mkdir -p /srv/jianghu-releases/$release"
scp -o BatchMode=yes -rq dist/. "${deploy_host}:/srv/jianghu-releases/$release/"
ssh -o BatchMode=yes "$deploy_host" bash -s -- "$release" <<'REMOTE'
set -euo pipefail
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
REMOTE
echo "已部署: http://47.108.114.17:8082/ （域名: http://wuxia.47.108.114.17.sslip.io:8082/ ）"
