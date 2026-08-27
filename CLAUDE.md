# SuperNav AI — project rules

## UI rules

- **Every feature that opens a window/modal/overlay must open centered on
  screen** (vertically and horizontally) — never as a bottom sheet, never
  off-center. This applies to any popup triggered by a button: barcode
  scanning, photo/camera capture, favorites, product detail, and any future
  modal.
  - Implementation: use the shared `.modal-backdrop` / `.modal` classes in
    `src/App.css` (`align-items: center` on the backdrop). Don't introduce a
    one-off overlay style for a new feature — reuse these classes so the
    centering rule applies automatically everywhere.
