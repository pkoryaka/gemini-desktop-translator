# NativeLingo Architecture - BPMN 2.0 Visual Specification Refinement

## Context & Objectives
- Upgraded system architecture documentation from text/mermaid charts to a formal, publication-grade BPMN 2.0 SVG specification (`public/bpmn-architecture.svg` and `src/assets/bpmn-architecture.svg`).
- Resolved routing collisions, overlapping labels, and lines slicing through diagram nodes.

## Architectural Layout & Corridor Routing
1. **Pool Hierarchy**:
   - **Pool 1: User App Pool (`y: 74..188`)**: Start Event (Hotkey Trigger `Ctrl+Alt+1..3, T, J`) -> User Task (Text Highlighted in App) -> Receiving Workspace (Text Replaced at Caret via Ctrl+V).
   - **Pool 2: NativeLingo Core Engine (`y: 202..470`)**:
     - Service Task (Win32 Keystroke Capture via `CopyNative.exe`)
     - Exclusive Gateway (Action Type Selection: In-Place Slot vs Floating HUD)
     - In-Place Prompt Slot Directive (`x: 595..800, y: 218..272`)
     - Interactive HUD Context Builder (`x: 595..800, y: 286..340`)
     - LRU Cache Data Store (`x: 655..740, y: 367..415`) connected to Interactive HUD bottom edge
     - Service Task 3A (Synthesize Ctrl+V Paste) -> End Event A (In-Place Done)
     - Service Task 3B (Position HUD at Cursor) -> End Event B (HUD Displayed)
   - **Pool 3: BYOM AI Router Layer (`y: 484..742`)**:
     - Exclusive Gateway (AI Engine Selector: Local Ollama, Gemini Cloud, OpenAI Gateway)
     - Service Task (Validate & Parse Output)
     - Exclusive Gateway (Delivery Mode: In-Place Slot vs HUD Mode)

2. **Clean Orthogonal Routing Corridors**:
   - **Dispatch Prompt Directive Bus**: Merges from Task 2A/2B at `x=818`, drops to clear boundary corridor at `y=450`, runs left to `x=78`, drops to `y=613`, entering West vertex of AI Engine Gateway. Completely avoids all task figures.
   - **In-Place Delivery Route**: Exits Delivery Mode Gateway North vertex `(885, 588)`, jogs left to vertical corridor at `x=850`, travels straight up through the 40px open channel between task columns, and enters Service Task 3A West vertex at `(888, 247)`. Zero collision with Task 3B or LRU Cache.
   - **HUD Mode Delivery Route**: Exits Delivery Mode Gateway East vertex `(910, 613)` horizontally to `x=1005`, then travels vertically up entering the bottom edge of Service Task 3B directly at `(1005, 362)`.
   - **Dual Independent End Events**: Distinct End Event A (In-Place Done) and End Event B (HUD Displayed) eliminate duplicate stacked circles.
