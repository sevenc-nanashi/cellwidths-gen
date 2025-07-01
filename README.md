# cellwidths-gen / CLI tool for generating Vim's `setcellwidths` configuration

`cellwidths-gen` is a CLI tool that generates a Vim script to configure character widths for a given TrueType font file (`.ttf`). This script helps Vim correctly distinguish between half-width and full-width characters, which is essential for proper alignment and display of text, especially in CJK environments.

## Features

- Parses TrueType font files to extract character width information.
- Generates a Vim script that defines character width rules using the `setcellwidths()` function.
- Automatically detects the font name and creates a self-contained Vim script that applies the settings only when the specified font is in use.

## Usage

```bash
cellwidths-gen <path-to-font-file> [options]
```

### Arguments

- `<path-to-font-file>`: The path to the TrueType font file (`.ttf`) you want to process.

### Options

- `-o, --output <path>`: The path to the output Vim script file. (Default: `./cellwidths.vim`)
- `-h, --help`: Show help.

### Example

```bash
cellwidths-gen /path/to/your/font.ttf -o ~/.vim/plugin/cellwidths_myfont.vim
```
Or, if you're using Neovim:

```bash
cellwidths-gen /path/to/your/font.ttf -o ~/.config/nvim/plugin/cellwidths_myfont.vim
```

This command will generate a `cellwidths.vim` file in your Vim's `plugin` directory. When you start Vim, this script will automatically be loaded. It will check if the `guifont` option is set to the font you specified, and if so, it will apply the correct character width settings.

## How it works

The tool reads the `hmtx` (Horizontal Metrics) and `cmap` (Character to Glyph Mapping) tables from the TrueType font file. It determines the advance width of each character and groups them into two categories: half-width and full-width. Based on this information, it generates a Vim script that uses the `setcellwidths()` function to tell Vim how to treat each character.

The generated script is designed to be "smart" - it only applies the settings when the `guifont` option matches the font name extracted from the font file. This means you can have multiple `cellwidths.vim` files for different fonts, and the correct one will be used automatically.

## License

This project is licensed under the MIT License. See the [LICENSE](LICENSE) file for details.

