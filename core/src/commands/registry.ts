import type { CommandDefinition, CommandPaletteEntry, CommandScope } from './types'

export class CommandRegistry {
  private readonly commands = new Map<string, CommandDefinition>()

  register(command: CommandDefinition): () => void {
    if (this.commands.has(command.id)) {
      throw new Error(`Duplicate command id: ${command.id}`)
    }
    this.commands.set(command.id, command)
    return () => {
      this.commands.delete(command.id)
    }
  }

  get(id: string): CommandDefinition | undefined {
    return this.commands.get(id)
  }

  list(options?: { scope?: CommandScope }): CommandDefinition[] {
    const scope = options?.scope
    return [...this.commands.values()].filter((command) => {
      if (scope && command.scopes && !command.scopes.includes(scope)) return false
      if (command.when && !command.when()) return false
      return true
    })
  }

  toPaletteEntries(options?: { scope?: CommandScope }): CommandPaletteEntry[] {
    return this.list(options).map((command) => {
      const entry: CommandPaletteEntry = {
        id: command.id,
        label: command.label
      }
      if (command.hint) entry.hint = command.hint
      if (command.meta) entry.meta = command.meta
      return entry
    })
  }

  async execute(id: string): Promise<void> {
    const command = this.commands.get(id)
    if (!command) {
      throw new Error(`Unknown command: ${id}`)
    }
    await command.execute()
  }
}

export function createCommandRegistry(): CommandRegistry {
  return new CommandRegistry()
}
