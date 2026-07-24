export class DisclosureState {
  readonly #openIds: Set<string>;

  constructor(defaultOpenIds: Iterable<string> = []) {
    this.#openIds = new Set(defaultOpenIds);
  }

  isOpen(id: string): boolean {
    return this.#openIds.has(id);
  }

  setOpen(id: string, open: boolean): void {
    if (open) this.#openIds.add(id);
    else this.#openIds.delete(id);
  }

  toggle(id: string): boolean {
    const open = !this.isOpen(id);
    this.setOpen(id, open);
    return open;
  }
}
