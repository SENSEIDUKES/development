# Making `.spp` packages

- **Created:** 2026-10-11
- **Ownership:** host tooling (`scripts/makeSpp.mjs`); the packages it makes are read by the host's existing SPP intake

A `.spp` is a zip with a `manifest.json` that names every file, its type and its
fingerprint, so the app can check nothing was changed or damaged. You never
write the manifest: make a folder, put your files in it, and turn the folder
into a package.

## Make one

1. Make a folder. Its name becomes the package's name.
2. Put the files in it (see below for a Sound Words or CAPA package).
3. Right-click the folder › **Send to** › **SEIHouse Package (.spp)**
   (set up once, below), or run `npm run spp -- "path/to/the folder"`.
4. The package appears beside the folder as `<name> v1.0.0.spp`.

The first build adds an `spp.json` to the folder with the package's id. Keep it:
it is what makes the next version the same package. Make the package again after
any change and it becomes the next version (v1.0.1, v1.0.2…) on its own, because
a version someone has installed never changes.

### Sound Words

A folder with a `words.txt`: one word per line, at most 30, each one to three
plain lowercase words (`temple bell`). Lines starting with `#` are notes. The
build refuses a misspelled, repeated or 31st word and says which line.
In the app: Story Settings › Sound Words › **Import .spp**.

`Library Sound Words/` is the template: the Library's own 30 words.
Copy the folder, rename it (`Cultivation Sound Words`), delete its `spp.json`
so it becomes a new package, change the words, and make it.

### A CAPA skill

Add an `spp.json` with `"kind": "capa"` and its slot, and the instruction file
(`.md`, `.txt` or `.docx`):

```json
{ "name": "Grand Style", "kind": "capa", "slot": "style" }
```

In the app: Story Settings › the slot › **Upload SPP to …**. It is kept on this
device and equipped in that slot.

### Sound Cues (your own recordings)

Add an `spp.json` with `"kind": "sound-cues"`, and one folder per sound word
holding its recordings (`.mp3`, `.wav`, `.ogg`, `.m4a`, `.aac`, `.flac`, `.opus`):

```
Temple Sounds/
  spp.json          { "name": "Temple Sounds", "kind": "sound-cues", "categories": { "growl": "beasts" } }
  temple bell/      bell 1.mp3, bell 2.mp3
  growl/            low growl.wav
```

`categories` is optional (artifacts, atmosphere, beasts, factions, locations,
system or weapons; atmosphere otherwise). In the app: Story Settings › Media
Loadout › **Import .spp**. The pack is kept on this device and equipped as the
story's Sound Cues, in place of the Library's; add its words to the story's
Sound Words so the writer uses them.

### Soundscapes (your own music)

The same, with `"kind": "soundscapes"` and one folder per mood (`mystical/`,
`battle/`), each holding its pieces. A file's name, without its ending, is the
piece's name. Each chapter chooses its music by mood from the Library's
Soundscapes and yours.

Audio packages can be up to 1 GB, with each file up to 512 MB (the SPP safety
ceiling; skills and word lists keep the small 64 MB default). The whole package
is read into memory while it is installed, so on a phone keep packs smaller.

### Atmospheres (your own place sounds)

The same, with `"kind": "atmospheres"` and one folder per atmosphere word
(`forest/`, `temple hall/`), each holding its looping beds. A file's name,
without its ending, is the bed's name (`Forest 2`); beds that share a word take
turns from chapter to chapter. In the app: Story Settings › Media Loadout ›
**Import .spp**. The pack is equipped in the story's Atmospheres slot, in place
of the Library's own: the writer chooses each chapter's atmosphere from its
words, and Create mode and Reader Settings offer its beds.

### Anything else

Any other folder is packaged as plain files, for a host that knows what to do
with them.

### `spp.json`

All optional: `name` (the folder's name), `description`, `version` (`1.0.0`),
`publisher` (SEIHouse Productions LLC), `kind` (`sound-words`, `capa`,
`sound-cues`, `soundscapes` or `atmospheres`), `slot` (for `capa`), `categories` (for
`sound-cues`), and `id`, written by the first build.

## Set up Send To (once, per computer)

Send To runs `scripts/Make SPP.cmd` in your main checkout. In PowerShell:

```powershell
$link = (New-Object -ComObject WScript.Shell).CreateShortcut("$env:APPDATA\Microsoft\Windows\SendTo\SEIHouse Package (.spp).lnk")
$link.TargetPath = "<path to your checkout>\scripts\Make SPP.cmd"
$link.Save()
```

Delete that shortcut to remove it. It needs Node and the repository's
`npm install`.

## History

- **2026-10-12:** Audio: `atmospheres` packages from a folder per atmosphere word, for the Media Loadout's new Atmospheres slot (SENSEI: atmospheres are made in the Library's studios like music and Sound Cues).
- **2026-10-11:** Audio: `sound-cues` and `soundscapes` packages from a folder per sound word or mood, up to the SPP safety ceiling (1 GB, 512 MB a file), installed from Story Settings and kept on the device. Skill packages install from each Story Settings slot in the app.
- **2026-10-11:** Created with `scripts/makeSpp.mjs`, `Make SPP.cmd` and the Library Sound Words template (v1.0.0, its 30 words).
