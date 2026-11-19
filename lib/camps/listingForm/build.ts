/**
 * Builds one camp's form from facts we already have. No model call.
 * A section 3 answer we already have moves up into "Check what we have".
 */
import { ASK_FIELDS, CHECK_FIELDS, GAP_LABEL, GAP_ORDER, STALE_BEFORE, type FieldDef } from "@/lib/camps/listingForm/fields";
import type { BuiltForm, CampRecord, ExtraQuestion, Fact, FormField, ProgramBlock } from "@/lib/camps/listingForm/types";

export function isLastYear(fact: Fact): boolean {
  if (fact.value?.includes("(2025–26)") || fact.value?.includes("(2025-26)")) return true;
  return Boolean(fact.checkedOn) && fact.checkedOn! < STALE_BEFORE;
}

export function fieldFrom(def: FieldDef, fact: Fact | undefined, key: string): FormField {
  const value = fact?.value?.trim() ? fact.value.trim() : null;
  return {
    key,
    fieldKey: def.key,
    label: def.label,
    column: def.column,
    help: def.help,
    mode: value ? "confirm" : "fill",
    prefilled: value,
    lastYear: Boolean(value) && Boolean(fact) && isLastYear(fact!),
    maxLength: def.maxLength,
  };
}

function factMap(facts: Fact[]): Map<string, Fact> {
  return new Map(facts.map((fact) => [fact.key, fact]));
}

function blockFields(block: ProgramBlock, parent: Map<string, Fact>): FormField[] {
  const own = factMap(block.facts);
  const fields = CHECK_FIELDS.map((def) => fieldFrom(def, own.get(def.key), `${block.id}.${def.key}`));
  for (const def of ASK_FIELDS) {
    const fact = parent.get(def.key);
    if (!fact?.value?.trim()) continue;
    fields.push(fieldFrom(def, fact, `${block.id}.${def.key}`));
  }
  return fields;
}

function locationQuestions(programs: ProgramBlock[]): string[] {
  const labels = new Map(CHECK_FIELDS.map((field) => [field.key, field.label]));
  const grouped = new Map<string, Map<string, string[]>>();
  for (const program of programs) {
    for (const fact of program.facts) {
      const value = fact.value?.trim();
      if (!value) continue;
      const values = grouped.get(fact.key) ?? new Map<string, string[]>();
      const places = values.get(value) ?? [];
      places.push(program.location);
      values.set(value, places);
      grouped.set(fact.key, values);
    }
  }
  const prompts: string[] = [];
  for (const [key, values] of grouped) {
    if (values.size < 2) continue;
    const [first, second] = [...values.entries()];
    const label = labels.get(key) ?? key;
    prompts.push(`${label} is ${first[0]} at ${first[1][0]} but ${second[0]} at ${second[1][0]}. Is that right?`);
  }
  return prompts;
}

export function extraQuestions(camp: CampRecord, customQuestions: string[]): ExtraQuestion[] {
  const questions: ExtraQuestion[] = [];
  for (const text of customQuestions.map((item) => item.trim()).filter(Boolean).slice(0, 3)) {
    questions.push({ id: `custom-${questions.length + 1}`, kind: "custom", fieldKey: `custom_${questions.length + 1}`, prompt: text });
  }
  for (const change of camp.pendingChanges) {
    questions.push({
      id: `watcher-${questions.length + 1}`,
      kind: "watcher",
      fieldKey: `watcher_${questions.length + 1}`,
      prompt: `We noticed ${change.field} changed from ${change.from} to ${change.to}. Which is right?`,
    });
  }
  if (camp.sources.length > 0 && camp.sources.every((source) => source.adapter === "page" || source.adapter === "manual")) {
    questions.push({
      id: "spots",
      kind: "spots",
      fieldKey: "spots",
      prompt: "Where can parents see how many spots are left? Do you keep a waitlist?",
    });
  }
  for (const prompt of locationQuestions(camp.programs)) {
    questions.push({ id: `locations-${questions.length + 1}`, kind: "locations", fieldKey: `locations_${questions.length + 1}`, prompt });
  }
  return questions.slice(0, 3);
}

export function buildForm(camp: CampRecord, customQuestions: string[] = []): BuiltForm {
  const parent = factMap(camp.parentFacts);
  const moved = new Set(ASK_FIELDS.filter((def) => parent.get(def.key)?.value?.trim()).map((def) => def.key));
  const blocks = camp.programs.map((program) => ({
    id: program.id,
    title: `${program.breakLabel} · ${program.location}`,
    fields: blockFields(program, parent),
  }));
  const ask = ASK_FIELDS.filter((def) => !moved.has(def.key)).map((def) => fieldFrom(def, undefined, def.key));
  const fillInCount = blocks.reduce((count, block) => count + block.fields.filter((field) => field.mode === "fill").length, 0) + ask.length;
  return { blocks, ask, questions: extraQuestions(camp, customQuestions), fillInCount };
}

export function gapLabels(camp: CampRecord, form: BuiltForm): string[] {
  const missing = new Set<string>();
  for (const block of form.blocks) {
    for (const field of block.fields) if (field.mode === "fill") missing.add(field.fieldKey);
  }
  for (const field of form.ask) missing.add(field.fieldKey);
  if (missing.has("before_care") || missing.has("after_care")) missing.add("care");
  if (!camp.hasPhotos) missing.add("photos");
  return GAP_ORDER.filter((key) => missing.has(key)).map((key) => GAP_LABEL[key]).slice(0, 4);
}

export function minutesFor(fillInCount: number): 2 | 5 {
  return fillInCount <= 3 ? 2 : 5;
}
