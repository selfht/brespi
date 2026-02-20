#!/bin/sh
set -eu

usage() {
    printf "Usage: %s <command> [arguments]\n" "$(basename "$0")"
    printf "\nCommands:\n"
    printf "  image create [options]    Build a production Docker image\n"
    printf "  version list              List all available versions\n"
    printf "\nOptions for 'image create':\n"
    printf "  --postgresql              Include postgresql-client in the image\n"
    printf "  --mariadb                 Include mariadb-client in the image\n"
    printf "  --dockerfile <path>       Use a custom Dockerfile (mutually exclusive with --postgresql/--mariadb)\n"
    exit 1
}

require_commands() {
    for cmd in "$@"; do
        if ! command -v "$cmd" >/dev/null 2>&1; then
            printf "Error: required command not found: %s\n" "$cmd"
            exit 1
        fi
    done
}

cmd_image_create() {
    flag_postgresql=false
    flag_mariadb=false
    custom_dockerfile=""
    stage="prod"

    while [ $# -gt 0 ]; do
        case "$1" in
            --postgresql)
                flag_postgresql=true
                shift
                ;;
            --mariadb)
                flag_mariadb=true
                shift
                ;;
            --dockerfile)
                if [ $# -lt 2 ] || [ -z "$2" ] || case "$2" in -*) true;; *) false;; esac; then
                    printf "Error: --dockerfile requires a file path argument\n\n"
                    usage
                fi
                custom_dockerfile="$2"
                shift 2
                ;;
            --stage)
                if [ $# -lt 2 ] || [ -z "$2" ] || case "$2" in -*) true;; *) false;; esac; then
                    printf "Error: --stage requires a value\n"
                    exit 1
                fi
                stage="$2"
                shift 2
                ;;
            *)
                printf "Error: unknown option '%s'\n\n" "$1"
                usage
                ;;
        esac
    done

    # Validate stage
    if [ ! -f ".env.${stage}" ]; then
        printf "Error: no .env.%s file found (available:" "$stage"
        for f in .env.*; do
            printf " %s" "${f#.env.}"
        done
        printf ")\n"
        exit 1
    fi

    # Validate mutual exclusivity
    if [ -n "$custom_dockerfile" ] && { [ "$flag_postgresql" = true ] || [ "$flag_mariadb" = true ]; }; then
        printf "Error: --dockerfile is mutually exclusive with --postgresql and --mariadb\n\n"
        usage
    fi

    # Validate custom dockerfile exists
    if [ -n "$custom_dockerfile" ] && [ ! -f "$custom_dockerfile" ]; then
        printf "Error: dockerfile not found: %s\n" "$custom_dockerfile"
        exit 1
    fi

    tmpfile="./dist/brespi.Dockerfile"
    mkdir -p ./dist

    brespi_root=$(grep '^X_BRESPI_ROOT=' ".env.${stage}" | cut -d= -f2-)
    if [ -z "$brespi_root" ]; then
        printf "Error: X_BRESPI_ROOT not found in .env.%s\n" "$stage"
        exit 1
    fi

    commit=$(git rev-parse HEAD)

    # Determine version from git tags
    exact_tag=$(git tag --points-at HEAD | head -n 1)
    if [ -n "$exact_tag" ]; then
        version="$exact_tag"
    else
        closest_tag=$(git describe --tags --abbrev=0 2>/dev/null || true)
        if [ -n "$closest_tag" ]; then
            version="${closest_tag}-snapshot"
        else
            version="0.0.0"
        fi
    fi

    # Builder stage (shared)
    cat > "$tmpfile" <<'EOF'
FROM oven/bun:alpine AS builder
WORKDIR /app
COPY package.json bun.lock* tsconfig.json bunfig.toml bun-env.d.ts drizzle.config.ts .env.dev .env.e2e .env.prod ./
ARG BRESPI_VERSION
ARG BRESPI_COMMIT
RUN bun -e "const p='./package.json'; const j=await Bun.file(p).json(); j.version='$BRESPI_VERSION'; j.commit='$BRESPI_COMMIT'; await Bun.write(p, JSON.stringify(j, null, 2))"
RUN bun install --frozen-lockfile --production
COPY src/ src/
COPY dist/ dist/
EOF

    if [ -n "$custom_dockerfile" ]; then
        # Append user's custom runtime stage
        printf "\n" >> "$tmpfile"
        cat "$custom_dockerfile" >> "$tmpfile"
    else
        # Generate default runtime stage
        cat >> "$tmpfile" <<'EOF'

FROM oven/bun:alpine
RUN apk update && apk add --no-cache bash
EOF

        if [ "$flag_postgresql" = true ]; then
            printf "RUN apk add --no-cache postgresql-client\n" >> "$tmpfile"
        fi
        if [ "$flag_mariadb" = true ]; then
            printf "RUN apk add --no-cache mariadb-client\n" >> "$tmpfile"
        fi

        # Since we don't have `bash`, this is the `sh` way of checking if a string starts with forward slash
        # (i.e.: checking if it's an absolute path)
        case "$brespi_root" in
            /*) printf "RUN mkdir -p %s && chown bun:bun %s\n" "$brespi_root" "$brespi_root" >> "$tmpfile" ;;
        esac

        cat >> "$tmpfile" <<EOF
WORKDIR /app
COPY --from=builder --chown=bun:bun /app .
USER bun
EXPOSE 3000
CMD ["sh", "-c", "umask 000 && exec bun start:${stage}"]
EOF
    fi

    tag="brespi:${version}"
    old_image_id=$(docker images -q "$tag" 2>/dev/null || true)
    old_latest_id=$(docker images -q brespi:latest 2>/dev/null || true)

    printf "Building image > %s\n" "$tag"
    docker build -f "$tmpfile" --build-arg BRESPI_VERSION="$version" --build-arg BRESPI_COMMIT="$commit" -t "$tag" -t brespi:latest .
    if [ -n "$old_image_id" ]; then
        docker rmi "$old_image_id" >/dev/null 2>&1 || true
    fi
    if [ -n "$old_latest_id" ]; then
        docker rmi "$old_latest_id" >/dev/null 2>&1 || true
    fi
    printf "Created image > %s\n" "$tag"
}

cmd_version_list() {
    git --no-pager tag --sort=-version:refname 2>/dev/null || true
    printf "0.0.0\n"
}

# --- routing ---

require_commands git docker

if [ $# -lt 1 ]; then
    usage
fi

command="$1"
shift

case "$command" in
    image)
        if [ $# -lt 1 ] || [ "$1" != "create" ]; then
            printf "Error: expected 'image create'\n\n"
            usage
        fi
        shift
        cmd_image_create "$@"
        ;;
    version)
        if [ $# -lt 1 ] || [ "$1" != "list" ]; then
            printf "Error: expected 'version list'\n\n"
            usage
        fi
        shift
        cmd_version_list "$@"
        ;;
    *)
        printf "Error: unknown command '%s'\n\n" "$command"
        usage
        ;;
esac
