# skills/

AI-agent skills, namespaced by vendor: everything nanocosmos publishes
lives under [`nanocosmos/`](nanocosmos/) — one folder per skill.

- Which skill for which question, folder layout, and support (including the
  prefilled ticket form): [`nanocosmos/README.md`](nanocosmos/README.md)
- Install instructions and license: the [repository README](../README.md)

Don't copy skills from this path by hand unless you have to — the repo
root's `install.sh` flattens each chosen skill to `<skills-root>/<name>/`,
which is where Claude Code discovers them (the folder name is the
invocation name).
