import { Policy } from "../../core/interfaces";

/**
 * Simple glob-like pattern matcher (no external dependencies)
 */
function matchGlob(path: string, pattern: string): boolean {
  // Normalize path separators
  path = path.replace(/\\/g, "/");
  pattern = pattern.replace(/\\/g, "/");

  // Handle ** (match any depth)
  if (pattern.startsWith("**/")) {
    const suffix = pattern.slice(3);
    // Match basename or any path ending with the pattern
    const basename = path.split("/").pop() || "";
    if (suffix.includes("*")) {
      const suffixRegex = new RegExp(
        "^" + suffix.replace(/\./g, "\\.").replace(/\*/g, ".*") + "$"
      );
      return suffixRegex.test(basename);
    }
    return path.endsWith(suffix) || path.includes("/" + suffix) || basename === suffix;
  }

  // Handle simple wildcards
  const regexPattern = pattern
    .replace(/\./g, "\\.")
    .replace(/\*\*/g, ".*")
    .replace(/\*/g, "[^/]*")
    .replace(/\?/g, ".");

  return (
    new RegExp(`^${regexPattern}$`).test(path) ||
    new RegExp(`/${regexPattern}$`).test(path)
  );
}

/**
 * CODE SAFETY POLICIES
 * Políticas de governança para agentes de codificação (Antigravity, Cursor, etc.)
 * Modo: Shadow (log only) por padrão - altere para 'gatekeeper' para bloquear
 */

// Configuração
const MODE: "shadow" | "gatekeeper" = "shadow";

// Arquivos protegidos (glob patterns)
const PROTECTED_FILE_PATTERNS = [
  "**/.env*", // Arquivos de ambiente
  "**/config.prod.*", // Configs de produção
  "**/config.production.*",
  "**/*.key", // Chaves privadas
  "**/*.pem", // Certificados
  "**/secrets/**", // Diretório de segredos
  "**/credentials/**",
  "**/.ssh/**",
  "**/id_rsa*",
];

// Comandos bloqueados (regex)
const BLOCKED_COMMAND_PATTERNS = [
  /rm\s+(-[rf]+\s+)*\//, // rm -rf /
  /rm\s+-rf\s+\*/, // rm -rf *
  /DROP\s+(TABLE|DATABASE)/i, // SQL destrutivo
  /TRUNCATE\s+TABLE/i,
  /DELETE\s+FROM\s+\w+\s*;?\s*$/i, // DELETE sem WHERE
  /chmod\s+777/, // Permissões abertas
  /curl.*\|.*sh/, // Pipe para shell
  /wget.*\|.*sh/,
  /npm\s+publish/, // Publicação acidental
  /git\s+push\s+.*--force/, // Force push
  /git\s+reset\s+--hard/, // Reset destrutivo
];

// Limite de linhas por edição
const MAX_LINES_PER_EDIT = 500;

// Helper: decide ação baseado no modo
function decide(reason: string): "DENY" | "ALLOW" {
  if (MODE === "shadow") {
    console.warn(`[ABS Shadow] Would DENY: ${reason}`);
    return "ALLOW"; // Shadow mode: loga mas permite
  }
  return "DENY";
}

export const CODE_SAFETY_POLICIES: Policy[] = [
  {
    name: "protected-files",
    description:
      "Blocks modifications to sensitive files (.env, secrets, keys)",
    evaluate: (proposal, event) => {
      const payload = event.payload as {
        file_path?: string;
        operation?: string;
      };
      const filePath = payload?.file_path;

      if (!filePath) return "ALLOW";

      for (const pattern of PROTECTED_FILE_PATTERNS) {
        if (matchGlob(filePath, pattern)) {
          return {
            decision: decide(`Protected file: ${filePath}`),
            reason: `File matches protected pattern: ${pattern}`,
          };
        }
      }
      return "ALLOW";
    },
  },
  {
    name: "blocked-commands",
    description:
      "Blocks dangerous terminal commands (rm -rf, DROP TABLE, etc.)",
    evaluate: (proposal, event) => {
      const payload = event.payload as { command?: string };
      const command = payload?.command;

      if (!command) return "ALLOW";

      for (const pattern of BLOCKED_COMMAND_PATTERNS) {
        if (pattern.test(command)) {
          return {
            decision: decide(`Blocked command: ${command}`),
            reason: `Command matches blocked pattern: ${pattern.source}`,
          };
        }
      }
      return "ALLOW";
    },
  },
  {
    name: "edit-size-limit",
    description: `Limits edits to ${MAX_LINES_PER_EDIT} lines per operation`,
    evaluate: (proposal, event) => {
      const payload = event.payload as { line_count?: number };
      const lineCount = payload?.line_count;

      if (!lineCount || lineCount <= MAX_LINES_PER_EDIT) return "ALLOW";

      return {
        decision: decide(`Edit too large: ${lineCount} lines`),
        reason: `Edit exceeds limit of ${MAX_LINES_PER_EDIT} lines (got ${lineCount})`,
      };
    },
  },
  {
    name: "no-secrets-in-code",
    description: "Detects potential secrets being written to code files",
    evaluate: (proposal, event) => {
      const payload = event.payload as { content_preview?: string };
      const content = payload?.content_preview || "";

      // Padrões de segredos comuns
      const secretPatterns = [
        /(?:api[_-]?key|apikey)\s*[:=]\s*["']?[a-zA-Z0-9]{20,}/i,
        /(?:secret|password|passwd|pwd)\s*[:=]\s*["']?[^\s"']{8,}/i,
        /(?:sk|pk)[-_](?:live|test)[-_][a-zA-Z0-9]{20,}/i, // Stripe keys
        /ghp_[a-zA-Z0-9]{36}/, // GitHub PAT
        /xoxb-[a-zA-Z0-9-]+/, // Slack tokens
      ];

      for (const pattern of secretPatterns) {
        if (pattern.test(content)) {
          return {
            decision: decide("Potential secret in code"),
            reason: "Content appears to contain hardcoded secrets",
          };
        }
      }
      return "ALLOW";
    },
  },
];

// Export para registro automático
export default CODE_SAFETY_POLICIES;
