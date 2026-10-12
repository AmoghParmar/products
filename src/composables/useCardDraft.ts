import { type Ref, computed, reactive, shallowRef, watch } from "vue"

/** Editable-card draft engine. Each detail card owns a reactive copy of its slice of server state:
 *  - reseeds from the source query ONLY while clean (a background refetch never clobbers edits;
 *    instead `staleUnderEdit` flips so the card can offer a reset)
 *  - `changes()` returns the diff-only payload for pim's PATCH semantics
 *  - a key added to the draft after seeding (e.g. a value copied from the parent) counts as an edit
 *
 *  `seeded` is a ref on purpose: the dirty/stale computeds must track it so they re-evaluate
 *  after the first async seed (a plain closure variable would leave them permanently cached).
 */
export interface CardDraft<T extends Record<string, any>> {
  draft: T
  dirty: Ref<boolean>
  staleUnderEdit: Ref<boolean>
  reset: () => void
  changes: () => Partial<T>
}

export function useCardDraft<T extends Record<string, any>>(source: Ref<T | null | undefined>): CardDraft<T> {
  const draft = reactive({}) as T
  const seeded = shallowRef<T | null>(null)

  const seed = (value: T) => {
    seeded.value = { ...value }
    for(const key of Object.keys(draft)) {delete (draft as any)[key]}
    Object.assign(draft, value)
  }

  if(source.value) {seed(source.value)}

  const draftKeys = (base: T) => new Set([...Object.keys(base), ...Object.keys(draft)])

  const dirty = computed(() => {
    if(!seeded.value) {return false}

    return [...draftKeys(seeded.value)].some((key) => !valueEquals((draft as any)[key], (seeded.value as any)[key]))
  })

  const staleUnderEdit = computed(() => {
    if(!source.value || !seeded.value || !dirty.value) {return false}

    return Object.keys(seeded.value).some((key) => !valueEquals((seeded.value as any)[key], (source.value as any)[key]))
  })

  watch(
    source,
    (next) => {
      if(!next) {return}
      if(!seeded.value || !dirty.value) {seed(next)}
      // dirty → hold the draft; the staleUnderEdit computed surfaces the conflict
    },
    { deep: false }
  )

  const reset = () => {
    if(source.value) {seed(source.value)}
  }

  const changes = (): Partial<T> => {
    if(!seeded.value) {return {}}
    const diff: Partial<T> = {}
    for(const key of draftKeys(seeded.value) as Set<keyof T>) {
      if(!valueEquals(draft[key], (seeded.value as any)[key])) {diff[key] = draft[key]}
    }

    return diff
  }

  return { draft, dirty, staleUnderEdit, reset, changes }
}

function valueEquals(a: unknown, b: unknown): boolean {
  if(a === b) {return true}
  if((a == null || a === "") && (b == null || b === "")) {return true}
  if(typeof a === "number" && typeof b === "string") {return String(a) === b}
  if(typeof a === "string" && typeof b === "number") {return a === String(b)}

  return false
}
