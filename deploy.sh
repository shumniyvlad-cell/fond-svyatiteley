#!/usr/bin/env bash
# Деплой сайта на сервер: заливает файлы, жмёт статику, перезагружает nginx.
# Запуск из папки проекта:  ./deploy.sh
set -euo pipefail

HOST="${FOND_HOST:-root@159.194.211.227}"
KEY="${FOND_KEY:-$HOME/.ssh/id_ed25519_fond}"
REMOTE_DIR="/var/www/fond-svyatiteley"
SRC="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

SSH_OPTS=(-i "$KEY" -o IdentitiesOnly=yes -o StrictHostKeyChecking=accept-new)

echo "→ Заливаю $SRC на $HOST:$REMOTE_DIR"
rsync -az --delete --delete-excluded \
  -e "ssh ${SSH_OPTS[*]}" \
  --exclude '.git/' \
  --exclude '.gitignore' \
  --exclude '.nojekyll' \
  --exclude 'legal/' \
  --exclude 'deck/' \
  --exclude 'forum/' \
  --exclude 'node_modules/' \
  --exclude 'deploy.sh' \
  --exclude '.DS_Store' \
  --exclude '*.log' \
  "$SRC/" "$HOST:$REMOTE_DIR/"

echo "→ Сжимаю статику и перезагружаю nginx"
ssh "${SSH_OPTS[@]}" "$HOST" bash -s <<'REMOTE'
set -euo pipefail
cd /var/www/fond-svyatiteley

# Пересобираем .gz рядом с текстовыми файлами — nginx отдаёт их через gzip_static
find . -name '*.gz' -delete
find . -type f \( -name '*.html' -o -name '*.css' -o -name '*.js' -o -name '*.svg' -o -name '*.json' -o -name '*.xml' -o -name '*.txt' \) \
  -exec gzip -9 -k -f {} \;

chown -R www-data:www-data /var/www/fond-svyatiteley
find /var/www/fond-svyatiteley -type d -exec chmod 755 {} \;
find /var/www/fond-svyatiteley -type f -exec chmod 644 {} \;

nginx -t
systemctl reload nginx
echo "Файлов: $(find /var/www/fond-svyatiteley -type f ! -name '*.gz' | wc -l), объём: $(du -sh /var/www/fond-svyatiteley | cut -f1)"
REMOTE

echo "→ Готово: http://159.194.211.227/"
