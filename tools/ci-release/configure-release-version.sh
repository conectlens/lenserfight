#!/usr/bin/env bash
# Resolve npm dist-tag, SemVer preid, and Nx version specifier from release channel.
# SemVer 2.0: https://semver.org — pre-release identifiers match channel names.
# npm dist-tags: https://docs.npmjs.com/adding-dist-tags-to-packages
set -euo pipefail

usage() {
  echo "Usage: $0 --channel <stable|beta|rc|nightly|alpha> --specifier <auto|patch|...> --ref <git-ref> [--allow-major true|false]" >&2
  exit 2
}

channel=''
specifier=''
ref=''
allow_major='false'

while [[ $# -gt 0 ]]; do
  case "$1" in
    --channel) channel="${2:-}"; shift 2 ;;
    --specifier) specifier="${2:-}"; shift 2 ;;
    --ref) ref="${2:-}"; shift 2 ;;
    --allow-major) allow_major="${2:-}"; shift 2 ;;
    -h|--help) usage ;;
    *) echo "Unknown argument: $1" >&2; exit 2 ;;
  esac
done

[[ -n "$channel" && -n "$specifier" && -n "$ref" ]] || usage

case "$channel" in
  stable)
    dist_tag='latest'
    preid=''
    if [[ "$ref" != 'main' ]]; then
      echo '::error::Stable releases must run from main.' >&2
      exit 1
    fi
    ;;
  beta)
    dist_tag='beta'
    preid='beta'
    if [[ "$ref" != 'main' && "$ref" != 'development' && "$ref" != release/* ]]; then
      echo '::error::Beta releases must run from main, development, or release/*.' >&2
      exit 1
    fi
    ;;
  rc)
    dist_tag='rc'
    preid='rc'
    if [[ "$ref" != 'main' && "$ref" != release/* ]]; then
      echo '::error::Release candidates must run from main or release/*.' >&2
      exit 1
    fi
    ;;
  nightly)
    dist_tag='nightly'
    preid='nightly'
    if [[ "$ref" != 'main' && "$ref" != 'development' ]]; then
      echo '::error::Nightly releases must run from main or development.' >&2
      exit 1
    fi
    ;;
  alpha)
    dist_tag='alpha'
    preid='alpha'
    if [[ "$ref" != 'main' ]]; then
      echo '::error::Alpha releases must run from main.' >&2
      exit 1
    fi
    ;;
  *)
    echo "::error::Unknown release channel: $channel" >&2
    exit 1
    ;;
esac

# Non-stable channels: conventional "auto" resolves to the next prerelease bump.
if [[ "$channel" != 'stable' && "$specifier" == 'auto' ]]; then
  specifier='prerelease'
fi

if [[ "$specifier" == 'major' || "$specifier" == 'premajor' ]]; then
  if [[ "$allow_major" != 'true' ]]; then
    echo '::error::Major releases require allow_major=true.' >&2
    exit 1
  fi
fi

printf 'dist_tag=%s\n' "$dist_tag"
printf 'preid=%s\n' "$preid"
printf 'specifier=%s\n' "$specifier"
