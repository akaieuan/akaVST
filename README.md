# akaVST

A living collection of the **aka** audio plugins, plus the site that documents them.

Three JUCE instruments, each its own repository, tracked here as submodules so they can be worked on
side by side and still push to their own remotes.

| | | |
|---|---|---|
| [**akaBleep**](bleep) | acid voice + 64-step P-lock sequencer | [akaBleep-VST](https://github.com/akaieuan/akaBleep-VST) |
| [**Enzyme**](enzyme) | 4-layer lo-fi multi-timbral synth | [akaEnzyme-VST](https://github.com/akaieuan/akaEnzyme-VST) |
| [**i4**](i4) | sculpting sampler | [akaI4-VST](https://github.com/akaieuan/akaI4-VST) |

```
akaVST/
├── web/        the site — Next.js App Router, Tailwind v4, akaSTYLE
├── bleep/      submodule
├── enzyme/     submodule
├── i4/         submodule
└── scripts/    cross-repo helpers
```

## Getting set up

```bash
git clone --recurse-submodules https://github.com/akaieuan/akaVST.git
```

Already cloned without them:

```bash
git submodule update --init --recursive
```

## Working across the repos

Each plugin directory is a full checkout of its own repository, so the normal workflow is unchanged:
`cd bleep`, commit, `git push`, and it lands in akaBleep-VST. The parent records *which* commit of
each plugin it currently describes.

`scripts/vst.sh` covers the spans and the one chore that is easy to forget:

```bash
./scripts/vst.sh status                  # working tree + ahead/behind for all three
./scripts/vst.sh pull                    # fast-forward every plugin
./scripts/vst.sh push                    # push every plugin that is ahead
./scripts/vst.sh sync                    # restage parent pointers after a plugin moves
./scripts/vst.sh foreach git log --oneline -3
```

The order that matters: **push the plugin first, then `sync` and commit the parent.** A parent commit
pointing at an unpushed plugin commit is the one submodule failure mode worth remembering.

## The site

```bash
cd web
pnpm install
pnpm dev
```

Runs with no environment variables. See [`web/README.md`](web/README.md).

Plugin facts on the site (versions, formats, plugin codes, platform) are derived from each
submodule's `CMakeLists.txt` rather than retyped:

```bash
cd web && pnpm sync:facts
```

That writes `web/src/content/plugins/*.generated.json` and copies any new screenshots out of the
plugin repos. The output is committed, so the production build never reads the submodules.

## Deploying

Vercel project settings: **Root Directory** must be `web`.

Vercel clones submodules by default, so its GitHub App also needs read access to `akaBleep-VST`,
`akaEnzyme-VST`, and `akaI4-VST` or the clone step fails before the build starts.

## Licence

The plugin repositories are proprietary; see each one's own `LICENSE`. The site is not licensed for
reuse.
