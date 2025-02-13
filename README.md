# plateau

A virtual tabletop (VTT) playground based on Babylon.js

# Features

- [x] Table top Physics (Havok)
- [x] Parametrizable color dice (D6)
- [ ] Other dices (D4, D8, D10, D20, ...)
- [ ] Automatic dice count after throw
- [ ] Dice value on hover
- [ ] Dices gathering system when dragging only dices
- [x] Selection Outline (customized shader)
- [x] Selection box
- [x] Hover visualization (simple highlight)
- [x] Simple lifting animation
- [x] Throwing interaction (drag/drop while lifting)
- [x] Multiple objects manipulation
- [x] Ghost view of picked object to preview position on drop zone
- [x] Flipping object(s)
- [x] Cards deck mechanism
- [x] Fixed object (Locking)
- [ ] Detect shake movement
- [x] Predefined poses (oriented)
- [x] Handling events (lift, dropped, thrown...)
- [x] PBR materials
- [ ] System to retrieve fallen objects
- [ ] Contextual menu
- [ ] File save/restore system
- [x] external http textures (usings CORS extension on browser or backend)
- [x] Object dropping onto another events system
- [ ] Long/Short click system and associated events
- [ ] Multiple touches interactions
- [ ] XR and XR interactions
- [ ] Measure tools
- [x] 3D pointer while interacting
- [x] Soft Shadows
- [x] Loading Overlay
- [x] PDF Viewer
  - [x] Keyboard interactions
  - [x] 3D Display
  - [ ] 3D Buttons
  - [ ] Screen display option
- [x] Close Isolate view (shift)
  - [ ] Orientation object dependant
  - [ ] Mouse centered if possible

## Backend

- [x] Url caching
  - [x] Images
  - [x] Models
  - [x] PDFs
- [ ] File save/write

## TTS Import

- [ ] Custom Tables
- [x] Custom Models
  - [ ] Physic joints
- [x] Custom Models Stacks
- [/] Custom Dices
  - [x] D6
  - [x] Texture
  - [ ] Custom Mesh ?
  - [ ] Face orientations
- [x] Custom Tiles
  - [x] Rectangle
  - [x] Hexagon
  - [x] Circle
  - [x] Rounded Rectangle
- [x] Custom Tokens
  - [x] Attached Snap Points
  - [ ] Multiple States ?
  - [ ] Multiple Textures
- [x] Custom Tokens Stacks (simple)
- [x] Custom Boards
  - [ ] Borders
- [x] Backgammon pieces (white)
- [x] Cards
  - [ ] Back image not the last of the deck
  - [x] Rounded rectangular cards
  - [ ] Hexagonal Cards
  - [ ] Circle Cards
  - [ ] Rectangular Cards
- [x] Decks
- [x] Bags / Infinite bags / Custom models bag
- [x] 3D Text
- [ ] Grid
- [ ] Decals?
- [ ] Vector Lines?
- [x] HandTrigger / ScriptingTrigger
- [ ] Sky environment maps
- [x] Player Pawn
- [x] Custom PDF
- [ ] Figurine
- [x] Figurine_Custom
  - [ ] Different Back Image
- [x] Notecard (Basic)
- [ ] Notebook ?
- [ ] Rules ?

# Todo

- [x] Refactoring animations
- [ ] Deck deletion on emptying ?
- [ ] Deck creation on cards gathering ?
- [ ] Draw Top or down cards

# Bugs

- [ ] Error when dragging if ray does not intersect ground
