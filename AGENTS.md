Documents
- `_docs/process.md` - how work is organized

Commands
- `uv sync` - install dependencies
- `uv run pytest` - the whole suite

Rules
- Dependencies are added in `pyproject.toml`. Do not add one without asking.
- Configuration comes from the environment. A new setting means a new env var and line in `.env.example`, never a hardcoded value or a checked-in secret.
- Tests live in `tests/`. `config/settings_test.py` supplies their environment, so production settings stay strict.
- GitHub issue titles do not repeat the issue number. GitHub already shows it.
- Original backlog issues are labeled `MVP`. Work the PM role splits out as out-of-scope is labeled `fast-follow`, never `MVP` — it stays out of the MVP by definition.