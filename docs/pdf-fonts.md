# PDF Unicode fonts

Signed-artifact text and audit pages embed **Noto Sans Regular** and **Noto
Sans Bold** directly into the generated PDF. This preserves Vietnamese
diacritics and other Unicode text; the signing flow must not transliterate or
strip characters before drawing text.

The Docker backend runtime is Debian Bookworm and installs the distribution
package `fonts-noto-core`. The default
paths are:

- `/usr/share/fonts/truetype/noto/NotoSans-Regular.ttf`
- `/usr/share/fonts/truetype/noto/NotoSans-Bold.ttf`

An operator may mount a vetted equivalent font and set
`PDF_UNICODE_FONT_PATH` and `PDF_UNICODE_BOLD_FONT_PATH` together. Both files
must be readable by the unprivileged `app` user.

Noto Sans is licensed under the [SIL Open Font License, Version
1.1](https://openfontlicense.org/). The package is used unmodified and embedded
in generated artifacts; retain the applicable license notice when distributing
custom images or bundled font files.

## Troubleshooting

If artifact generation reports that the Unicode PDF font is unavailable, verify
both configured paths inside the same backend or outbox-worker container and
ensure the non-root `app` user can read them. The worker safely transitions the
artifact to `artifact_failed`; use the existing artifact retry action only after
the font mount or configuration has been fixed. Do not replace the font with a
standard PDF font, because standard WinAnsi fonts cannot encode Vietnamese
diacritics.
