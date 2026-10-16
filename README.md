# herdr-user-secrets

A [Herdr](https://herdr.dev) plugin that opens the [.NET user secrets](https://learn.microsoft.com/aspnet/core/security/app-secrets) (`secrets.json`) of the project you are working on, straight in your editor (Neovim by default). No more hunting for `UserSecretsId` GUIDs in hidden folders.

## Install

```sh
herdr plugin install carandev/herdr-user-secrets
```

Requires Herdr >= 0.9.5, Node.js >= 22 and git on `PATH`. No npm dependencies.

Plugins cannot register keybindings themselves. Add one to your Herdr `config.toml` and run `herdr server reload-config`:

```toml
[[keys.command]]
key = "prefix+alt+s"
type = "plugin_action"
command = "user-secrets.open"
description = "open .NET user-secrets"
```

## Usage

Run the `open` action. It starts from the directory of the focused pane:

- **Inside a project** that declares `<UserSecretsId>`, its `secrets.json` opens directly.
- **In a solution or repository** with several such projects (or inside one without secrets), a popup lists them:

  ```
  Projects with user secrets (↑/↓ or j/k, 1-9, Enter, Esc)
    1) CRM.Backoffice.Web
  ❯ 2) CRM.Data
    3) CRM.WebAPI
  ```

The search walks up to the nearest `.sln`/`.slnx` or git root. In a git repository the project list comes from `git ls-files`, so it is instant, honours `.gitignore` and never descends into nested worktrees. Outside git, `bin`, `obj`, `node_modules`, `.vs` and similar folders are skipped.

If `secrets.json` does not exist yet, it is created as `{}` in the same location `dotnet user-secrets` uses:

| OS | Path |
| --- | --- |
| Windows | `%APPDATA%\Microsoft\UserSecrets\<id>\secrets.json` |
| Linux / macOS | `~/.microsoft/usersecrets/<id>/secrets.json` |

Projects without `<UserSecretsId>` are ignored; run `dotnet user-secrets init` in them first.

## Editor

The first non-empty variable wins: `USER_SECRETS_EDITOR`, `VISUAL`, `EDITOR`, then `nvim`. The value runs through the shell, so arguments work (`code --wait`). The variables must be set in the environment of the Herdr server.

## Development

```sh
herdr plugin link .
npm test
node bin/picker.mjs path/to/solution   # run the picker without Herdr
```

## License

Apache-2.0
