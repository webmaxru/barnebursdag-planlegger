// Ambient type declarations for the WebMCP browser API.
//
// WebMCP is a proposed web standard (not yet in lib.dom.d.ts) that lets a page
// expose imperative "tools" to AI agents through `document.modelContext`. These
// declarations cover only the imperative surface used in `src/lib/webmcp.ts`.
// Full contract: `.agents/skills/webmcp/references/webmcp-reference.md`.
export {};

declare global {
  interface ModelContextClient {
    /** Run a user-facing step for tool flows that need explicit interaction. */
    requestUserInteraction(callback: () => Promise<unknown>): Promise<unknown>;
  }

  interface ModelContextToolAnnotations {
    /** True for tools that only read state and never mutate the page. */
    readOnlyHint?: boolean;
    /** True when the tool output may contain data from untrusted sources. */
    untrustedContentHint?: boolean;
  }

  interface ModelContextTool {
    /** 1–128 chars, ASCII alphanumeric plus `_`, `-`, `.`; unique per document. */
    name: string;
    /** Optional human-readable label shown in user-agent UI. */
    title?: string;
    description: string;
    /** JSON Schema describing the accepted input object. */
    inputSchema?: Record<string, unknown>;
    /** JSON Schema describing the structured result the tool returns. */
    outputSchema?: Record<string, unknown>;
    annotations?: ModelContextToolAnnotations;
    execute(input: any, client: ModelContextClient): unknown | Promise<unknown>;
  }

  interface ModelContextRegisterOptions {
    /** Aborting this signal unregisters the tool (Chrome 148+). */
    signal?: AbortSignal;
    /** Origins allowed to see the tool across the frame tree. */
    exposedTo?: string[];
  }

  interface ModelContext {
    /** Returns void on older builds, `Promise<void>` on Chrome 151+. */
    registerTool(
      tool: ModelContextTool,
      options?: ModelContextRegisterOptions,
    ): void | Promise<void>;
    /** Removed in Chrome 148+ in favour of the AbortSignal option. */
    unregisterTool?(name: string): void;
    ontoolchange?: ((this: ModelContext, ev: Event) => unknown) | null;
  }

  interface Document {
    /** Current WebMCP surface (Chrome 150+). */
    readonly modelContext?: ModelContext;
  }

  interface Navigator {
    /** Deprecated WebMCP surface (Chrome 146–149); kept as a fallback. */
    readonly modelContext?: ModelContext;
  }
}
