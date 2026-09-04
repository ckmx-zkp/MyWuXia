#!/usr/bin/env bash
# 江湖长夜 · 构建并部署到阿里云 aliyun-prayer（nginx /srv/jianghu，端口 8082）
set -euo pipefail
cd "$(dirname "$0")/.."
npm run test
npm run build
test -s dist/index.html
release="$(date -u +%Y%m%dT%H%M%SZ)-$(git rev-parse --short HEAD)"
ssh -o BatchMode=yes aliyun-prayer "mkdir -p /srv/jianghu-releases/$release"
scp -o BatchMode=yes -rq dist/. "aliyun-prayer:/srv/jianghu-releases/$release/"
ssh -o BatchMode=yes aliyun-prayer bash -s -- "$release" <<'REMOTE'
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
