# [Expelmental and Study] fann-sql-language-server

[Expelmental and Study] Implemented [fannheyward/coc-sql](https://github.com/fannheyward/coc-sql) features in the language server.

<img width="780" alt="fann-sql-language-server-demo" src="https://user-images.githubusercontent.com/188642/118281698-790a0e00-b508-11eb-9df8-4f44dfec4c4a.gif">

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

### Client

**coc.nvim extension**:

Now `set runtimepath^=/path/to/fann-sql-language-server` in "vimrc/init.vim"

**vim-lsp**:

```vim
if executable('fann-sql-language-server')
  augroup LspFannSql
    au!
    autocmd User lsp_setup call lsp#register_server({
        \ 'name': 'fann-sql-language-server',
        \ 'cmd': {server_info->['fann-sql-language-server', '--stdio']},
        \ 'allowlist': ['sql'],
        \ 'workspace_config': {
        \   'fann-sql': {
        \     'database': 'mysql'
        \   }
        \ },
        \ })
  augroup END
endif
```

## Thanks

- [fannheyward/coc-sql](https://github.com/fannheyward/coc-sql)
- [microsoft/vscode-languageserver-node](https://github.com/microsoft/vscode-languageserver-node)

## License

MIT
