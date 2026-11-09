// Builds a text description of the practice phone's screen for Nora, like an
// accessibility tree: every element marked with data-nora gets an id, a type and a label.
// Typed text is never included; text boxes only report whether they are filled in.

function collapse(text: string, max = 140): string {
  const flat = text.replace(/\s+/g, " ").trim();
  return flat.length > max ? `${flat.slice(0, max - 1)}…` : flat;
}

export function labelOf(el: HTMLElement): string {
  const explicit = el.dataset.noraLabel ?? el.getAttribute("aria-label");
  if (explicit) return collapse(explicit);
  if (el instanceof HTMLInputElement || el instanceof HTMLSelectElement || el instanceof HTMLTextAreaElement) {
    const label = el.labels?.[0]?.textContent;
    if (label) return collapse(label);
    if ("placeholder" in el && el.placeholder) return collapse(el.placeholder);
  }
  return collapse(el.innerText || el.textContent || "");
}

function typeOf(el: HTMLElement): string {
  if (el.dataset.noraType) return el.dataset.noraType;
  if (el instanceof HTMLInputElement) {
    if (el.type === "checkbox") return "checkbox";
    return "text box";
  }
  if (el instanceof HTMLTextAreaElement) return "text box";
  if (el instanceof HTMLSelectElement) return "drop-down menu";
  if (el instanceof HTMLButtonElement) return "button";
  if (el instanceof HTMLAnchorElement) return "link";
  return "text";
}

function stateOf(el: HTMLElement): string {
  const states: string[] = [];
  if (el instanceof HTMLInputElement && el.type === "checkbox") {
    states.push(el.checked ? "checked" : "not checked");
  } else if (el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement) {
    states.push(el.value.trim() ? "filled in" : "empty");
  } else if (el instanceof HTMLSelectElement) {
    states.push(`currently "${el.selectedOptions[0]?.text ?? ""}"`);
  }
  if ((el as HTMLButtonElement).disabled) states.push("disabled");
  return states.length ? ` (${states.join(", ")})` : "";
}

/** Label used in the step log when the person taps or types somewhere. */
export function describeTapTarget(target: HTMLElement): string {
  const marked = target.closest<HTMLElement>("[data-nora]");
  if (marked) return `"${labelOf(marked)}"`;
  const text = collapse(target.innerText || "", 60);
  return text ? `an unlabeled spot showing "${text}"` : "an empty spot with nothing to tap";
}

export function describeScreen(phone: HTMLElement, screen: HTMLElement): string {
  const view = screen.getBoundingClientRect();
  const screenName = phone.querySelector<HTMLElement>("[data-nora-screen]")?.dataset.noraScreen ?? "Unknown screen";
  const dialog = [...phone.querySelectorAll<HTMLElement>('[role="dialog"]')].find((d) => !d.closest("[data-nora-ui]"));

  const lines = [`Screen: ${screenName}`];
  if (dialog) {
    lines.push(
      `A pop-up is open on top ("${labelOf(dialog)}"). Only the pop-up's elements can be tapped until it is closed.`,
    );
  }

  const visible: string[] = [];
  const below: string[] = [];
  const above: string[] = [];
  const root = dialog ?? phone;

  root.querySelectorAll<HTMLElement>("[data-nora]").forEach((el) => {
    if (el.closest("[data-nora-ui]")) return;
    const r = el.getBoundingClientRect();
    if (r.width === 0 && r.height === 0) return;

    const line = `- ${el.dataset.nora} | ${typeOf(el)} | ${labelOf(el)}${stateOf(el)}`;
    if (!screen.contains(el) || (r.bottom > view.top + 4 && r.top < view.bottom - 4)) visible.push(line);
    else if (r.top >= view.bottom - 4) below.push(line);
    else above.push(line);
  });

  lines.push("Visible on screen (id | type | label):", ...(visible.length ? visible : ["- (nothing)"]));
  if (below.length) lines.push("Further down, needs scrolling down to see:", ...below);
  if (above.length) lines.push("Further up, needs scrolling up to see:", ...above);
  return lines.join("\n");
}
