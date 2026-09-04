#!/usr/bin/env bash
# 江湖长夜 · 构建并部署到阿里云 aliyun-prayer（nginx /srv/jianghu，端口 8082）
set -e
cd "$(dirname "$0")/.."
npm run build
scp -o BatchMode=yes -rq dist aliyun-prayer:/srv/jianghu-tmp
ssh -o BatchMode=yes aliyun-prayer "rm -rf /srv/jianghu && mv /srv/jianghu-tmp /srv/jianghu"
echo "已部署: http://47.108.114.17:8082/ （域名: http://wuxia.47.108.114.17.sslip.io:8082/ ）"
