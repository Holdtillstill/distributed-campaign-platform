#!/bin/sh
set -eu

js_bool() {
  case "${1:-false}" in
    true|TRUE|1|yes|YES) printf true ;;
    *) printf false ;;
  esac
}

js_string() {
  printf "%s" "$1" | sed "s/'/\\\\'/g"
}

api_base_url="$(js_string "${WEB_UI_API_BASE_URL:-/api}")"
enable_design_routes="$(js_bool "${WEB_UI_ENABLE_DESIGN_ROUTES:-false}")"
static_portfolio_host="$(js_bool "${WEB_UI_STATIC_PORTFOLIO_HOST:-false}")"

cat > /usr/share/nginx/html/env.js <<EOF
window.__APP_CONFIG__ = {
  apiBaseUrl: '${api_base_url}',
  enableDesignRoutes: ${enable_design_routes},
  staticPortfolioHost: ${static_portfolio_host}
};
EOF
