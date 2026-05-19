# Modal Credentials Mount

Both the `api` and `worker` containers bind-mount your Modal config file into
`/root/.modal.toml` so the Modal SDK can authenticate without baking secrets
into the image.

The source path on the host is controlled by `VIVADEO_MODAL_CONFIG_PATH` in
`.env`. The default fallback is `./.modal.toml` (relative to the project root).

## First-time setup

If you have not authenticated Modal yet, run this on your host machine first:

```bash
modal setup
```

This generates `~/.modal.toml` with your credentials.

## Setting `VIVADEO_MODAL_CONFIG_PATH`

Add the variable to your `.env` file using the correct format for your platform:

| Platform | Value |
|---|---|
| Linux / macOS | `/home/<you>/.modal.toml` |
| WSL | `/home/<you>/.modal.toml` |
| Windows (Docker Desktop) | `/c/Users/<you>/.modal.toml` |

### Windows note

Docker Desktop exposes the `C:` drive under `/c/`, so you must use
forward-slash Unix notation — **not** the native `C:\Users\...` form.
Using the Windows path causes a "too many colons" error from the Docker daemon.

```text
# .env
VIVADEO_MODAL_CONFIG_PATH=/c/Users/you/.modal.toml
```

### WSL note

When running Docker from inside WSL, point to the Linux home path, not the
Windows one:

```text
# .env
VIVADEO_MODAL_CONFIG_PATH=/home/you/.modal.toml
```

If your Modal token is only on the Windows side you can copy it over once:

```bash
cp /mnt/c/Users/you/.modal.toml ~/.modal.toml
```

## Common pitfall — Docker creates a directory instead of a file

If `VIVADEO_MODAL_CONFIG_PATH` is not set and `./.modal.toml` does not exist
when `docker compose up` runs, Docker will **create a directory** at that path
instead of a file. The containers start, but the Modal SDK crashes at import
time with:

```
[Errno 21] Is a directory: '/root/.modal.toml'
```

The fix is to delete the rogue directory and ensure the file exists before
restarting:

```bash
# remove the directory Docker created
rm -rf .modal.toml

# then either copy your credentials here...
cp ~/.modal.toml .modal.toml

# ...or set VIVADEO_MODAL_CONFIG_PATH in .env to point at the real file
echo "VIVADEO_MODAL_CONFIG_PATH=/home/you/.modal.toml" >> .env
```

Then restart the stack.
