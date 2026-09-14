# Vivadeo Workflow-First Product Plan

## Direction

Vivadeo should be positioned as a video workflow product with an intelligent
assistant, rather than as a chat product with video capabilities. The primary
experience should help users complete recognizable jobs against their video
archive. Chat remains important, but it should support those jobs contextually
instead of being the application's main information architecture.

## Initial workflow set

The first release should introduce four core workflows:

### 1. Ingest & Organize

Bring video into a workspace, add useful context, and monitor preparation until
the source is searchable.

Typical actions:

- Upload a local video or import a permitted URL.
- Add or edit source metadata.
- Track processing and resolve failures.
- Confirm when the video is ready for search.

### 2. Find Evidence

Search the archive for specific spoken or visual moments and return timestamped,
workspace-authorized evidence.

Typical actions:

- Describe the topic, phrase, person, object, or moment to find.
- Choose or accept the appropriate search mode.
- Review ranked matches and timestamp citations.
- Narrow or refine the search.

### 3. Review & Verify

Inspect retrieved moments and decide which evidence is reliable and relevant.

Typical actions:

- Play the cited moment in context.
- Mark evidence as relevant, not relevant, or uncertain.
- Ask a focused follow-up about a selected moment.
- Preserve the verified evidence and its source attribution.

### 4. Create Output

Turn verified evidence into a useful deliverable. Initial outputs should focus
on summaries, briefs, structured findings, and exports. Automated editing or
clip generation should remain deferred until the evidence workflow is mature.

Typical actions:

- Select verified moments or findings.
- Choose an output format such as a concise summary, report, or structured list.
- Generate an output with source citations and timestamps.
- Export or save the result for follow-up work.

## Chat's role

Chat should be available inside every workflow as the natural-language control
surface and assistant. It should inherit the user's current workspace, video
scope, selected evidence, and workflow state.

Examples:

- In Ingest & Organize: “What is still processing?”
- In Find Evidence: “Find every mention of the pricing discussion.”
- In Review & Verify: “Show only moments where the speaker faces the camera.”
- In Create Output: “Turn these verified findings into a one-page brief.”

The global “Ask Vivadeo” action can remain available, but it should route the
user into the most relevant workflow rather than making an unbounded chat
thread the default destination for every task.

## Proposed navigation

- Overview
- Workflows
- Library
- Jobs
- History

Workflows should provide a small set of opinionated templates and saved runs.
Do not begin with a general-purpose drag-and-drop workflow builder. Templates
make the product understandable, while saved runs provide repeatability without
introducing a large orchestration surface too early.

## MVP interaction model

Each workflow should follow the same basic structure:

1. Choose a workflow.
2. Select the workspace, videos, or evidence in scope.
3. Provide a goal or workflow-specific options.
4. Run the workflow and show progress when work is asynchronous.
5. Review the result, evidence, and source attribution.
6. Refine, save, or export the result.

Natural-language goal entry should be supported within workflows so they do
not feel like rigid forms. The workflow supplies scope, state, and safety; Chat
supplies flexibility.

## Product principles

- Lead with user outcomes, not model capabilities.
- Make video evidence and timestamps visible in every research result.
- Preserve workspace authorization and provenance through every workflow.
- Keep asynchronous processing states clear and recoverable.
- Let users correct weak evidence and refine results without losing history.
- Keep the interface editorial, warm, and operational rather than resembling a
  generic chat application or admin dashboard.

## Scope boundaries

Included in the initial direction:

- Four first-class workflow templates.
- Contextual Chat within each workflow.
- Persistent workflow runs and useful history.
- Evidence review, verification, and source attribution.
- Summaries, briefs, structured findings, and exports.

Deferred:

- A fully programmable workflow builder.
- Autonomous editing or clip generation from unverified evidence.
- Large workflow-specific dashboard surfaces that duplicate Chat evidence UI.
- Broad specialized workflows before the four core workflows are validated.

## Success criteria

The direction is working when:

- A new user can choose an intended outcome without knowing what to ask first.
- Users can move from ingest to searchable evidence to a deliverable in a
  coherent path.
- Chat is useful at each step without requiring users to manage a separate chat
  thread as their primary project structure.
- Results retain timestamped evidence, provenance, and workspace boundaries.
- Users can repeat a successful workflow without rebuilding it from scratch.
- The product feels like Vivadeo: a premium video archive and workflow tool,
  not a generic AI chat interface.

## Relationship to existing product work

This is a product-direction proposal layered over the existing ingest, jobs,
library, search, evidence, and chat capabilities. It does not require removing
the current transcript-grounded chat implementation. The next implementation
step should be an information-architecture and workflow-shell slice that
connects existing capabilities before adding new backend orchestration.
