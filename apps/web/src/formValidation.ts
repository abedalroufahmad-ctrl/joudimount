/** CSS class for boxed field wrappers (TransactionForm, AutocompleteField). */
export const INVALID_BOX_CLASS = "form-field-box--invalid";

export function clearInvalidFieldMarks(root: ParentNode) {
  root.querySelectorAll(`.${INVALID_BOX_CLASS}`).forEach((el) => {
    el.classList.remove(INVALID_BOX_CLASS);
  });
  root.querySelectorAll(".is-invalid").forEach((el) => {
    el.classList.remove("is-invalid");
  });
}

function markElementInvalid(el: HTMLElement) {
  el.classList.add("is-invalid");
  el.closest(".form-field-box, .autocomplete-field")?.classList.add(INVALID_BOX_CLASS);
}

/** Mark empty/invalid required fields red. Returns true when the form is valid. */
export function markInvalidFields(form: HTMLFormElement): boolean {
  clearInvalidFieldMarks(form);
  const valid = form.checkValidity();
  if (!valid) {
    form.querySelectorAll(":invalid").forEach((el) => {
      if (el instanceof HTMLElement) markElementInvalid(el);
    });
  }
  return valid;
}

/** Mark specific fields by data-field-key (e.g. API missing_fields). */
export function markInvalidFieldsByKeys(root: ParentNode, keys: string[]) {
  clearInvalidFieldMarks(root);
  for (const key of keys) {
    root.querySelectorAll(`[data-field-key="${key}"]`).forEach((node) => {
      if (!(node instanceof HTMLElement)) return;
      if (node.matches("input, select, textarea")) {
        markElementInvalid(node);
      } else {
        node.classList.add(INVALID_BOX_CLASS);
        node.querySelectorAll("input, select, textarea").forEach((el) => {
          if (el instanceof HTMLElement) markElementInvalid(el);
        });
      }
    });
  }
}

/** Mark document category selects that were left blank on save. */
export function markInvalidDocCategories(form: HTMLFormElement) {
  form.querySelectorAll('[data-field-key="documentCategory"]').forEach((node) => {
    if (!(node instanceof HTMLSelectElement)) return;
    if (!node.value.trim()) markElementInvalid(node);
  });
}

/** Clear red styling when the user edits a field. */
export function setupInvalidFieldClear(form: HTMLFormElement): () => void {
  const onInput = (event: Event) => {
    const target = event.target;
    if (!(target instanceof HTMLElement)) return;
    target.classList.remove("is-invalid");
    target.closest(".form-field-box, .autocomplete-field")?.classList.remove(INVALID_BOX_CLASS);
  };
  form.addEventListener("input", onInput);
  form.addEventListener("change", onInput);
  return () => {
    form.removeEventListener("input", onInput);
    form.removeEventListener("change", onInput);
  };
}
