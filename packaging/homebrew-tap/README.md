# MinhyeongSon/emprint — Homebrew tap

```bash
brew tap MinhyeongSon/emprint
brew install --cask emprint
```

`Casks/emprint.rb` is updated automatically on each release. Do not edit checksums by hand.

The cask `postflight` hook removes `com.apple.quarantine` and re-applies ad-hoc signing (`codesign --sign -`) on `Emprint.app`. CI builds already use `identity: '-'` in `electron-builder.yml`; postflight refreshes the signature after copy to `/Applications`.
