# [Expelmental and Study] fann-sql-language-server

[Expelmental and Study] Implemented [fannheyward/coc-sql](https://github.com/fannheyward/coc-sql) features in the language server.

## Overview

- "Server" by [vscode-languageserver](https://github.com/microsoft/vscode-languageserver-node) based language server
- "Client" by [coc.nvim](https://github.com/neoclide/coc.nvim) extension

## Setup

**install**:

```sh
yarn install
# or yarn build
yarn link
fann-sql-language-server --help
```

**uninstall(unlink)**:

```sh
yarn unlink
```

### Server (fann-sql-language-server)

```sh
Usage: fann-sql-language-server [options]

Options:
  -V, --version    output the version number
  --stdio          use stdio
  --node-ipc       use node-ipc
  --socket <port>  use socket. example: --socket=5000
  -h, --help       display help for command
```

### Client (coc.nvim extension)

Now `set runtimepath^=/path/to/fann-sql-language-server` in "vimrc/init.vim"

## Note

- I don't think it will work with LSP clients other than coc.nvim. (Needs adjustment)

## Thanks

- [fannheyward/coc-sql](https://github.com/fannheyward/coc-sql)
- [microsoft/vscode-languageserver-node](https://github.com/microsoft/vscode-languageserver-node)

## License

MIT
