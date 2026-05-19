#!/usr/bin/env bash
# Push rendered Homebrew tap + Scoop bucket to their GitHub repos.
# Requires PACKAGE_MANAGERS_KEY or RELEASE_REPO_KEY with repo write access.
set -euo pipefail

SOURCE_ROOT="${1:-packaging}"
TOKEN="${PACKAGE_MANAGERS_KEY:-${RELEASE_REPO_KEY:-}}"
HOMEBREW_TAP_REPO="${HOMEBREW_TAP_REPO:-devminson/homebrew-emprint}"
SCOOP_BUCKET_REPO="${SCOOP_BUCKET_REPO:-devminson/scoop-emprint}"
APP_VERSION="${APP_VERSION:?APP_VERSION is required}"
RELEASE_TAG="${RELEASE_TAG:?RELEASE_TAG is required}"

if [ -z "${TOKEN}" ]; then
  echo "PACKAGE_MANAGERS_KEY or RELEASE_REPO_KEY must be set."
  exit 1
fi

git_identity() {
  git -c user.name="github-actions[bot]" \
    -c user.email="41898282+github-actions[bot]@users.noreply.github.com" \
    "$@"
}

publish_tree() {
  local repo="$1"
  local source_dir="$2"
  local commit_prefix="$3"

  if [ ! -d "${source_dir}" ]; then
    echo "Missing source directory: ${source_dir}"
    exit 1
  fi

  local work
  work="$(mktemp -d)"

  if git clone --depth 1 "https://x-access-token:${TOKEN}@github.com/${repo}.git" "${work}/repo" 2>/dev/null; then
    :
  else
    echo "Initializing new repository ${repo}"
    mkdir -p "${work}/repo"
    (
      cd "${work}/repo"
      git init -b main
      git remote add origin "https://x-access-token:${TOKEN}@github.com/${repo}.git"
    )
  fi

  # --exclude .git: without it, --delete removes the clone's .git (not in source tree).
  rsync -a --delete --exclude '.git' "${source_dir}/" "${work}/repo/"

  (
    cd "${work}/repo"
    git add -A
    if git diff --staged --quiet; then
      echo "No changes for ${repo}"
      return 0
    fi
    git_identity commit -m "${commit_prefix} Emprint ${APP_VERSION} (${RELEASE_TAG})"
    git push origin HEAD:main
  )

  echo "Published to https://github.com/${repo}"
  rm -rf "${work}"
}

publish_tree "${HOMEBREW_TAP_REPO}" "${SOURCE_ROOT}/homebrew-tap" "chore(cask):"
publish_tree "${SCOOP_BUCKET_REPO}" "${SOURCE_ROOT}/scoop-bucket" "chore(scoop):"
